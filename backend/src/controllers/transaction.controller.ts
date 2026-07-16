import { Request, Response } from 'express';
import Joi from 'joi';
import pool from '../config/db.js';
import * as transactionService from '../services/transaction.service.js';
import * as transactionRepository from '../repositories/transaction.repository.js';
import * as requestRepository from '../repositories/request.repository.js';
import * as accountRepository from '../repositories/account.repository.js';
import * as complianceRepository from '../repositories/compliance.repository.js';
import * as commissionService from '../services/commission.service.js';

/**
 * Vista previa de comisiones y límites KYC para el simulador/formulario de envío (RF-18)
 */
export async function previewTransaction(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    clientId: Joi.string().uuid().required(),
    type: Joi.string().valid('remesa', 'retiro', 'cobro', 'transfer').required(),
    amount: Joi.number().greater(0).required(),
    currencyFrom: Joi.string().length(3).uppercase().required(),
    currencyTo: Joi.string().length(3).uppercase().required(),
    additionalCharges: Joi.array().items(
      Joi.object({
        label: Joi.string().required(),
        amount: Joi.number().greater(0).required(),
        currency: Joi.string().length(3).uppercase().required(),
      })
    ).default([]),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const preview = await transactionService.previewTransaction(value);
    res.status(200).json({ status: 'ok', data: preview });
  } catch (err: any) {
    res.status(422).json({ status: 'error', message: err.message });
  }
}

/**
 * Crea/registra una transacción oficial en el sistema (Operador/Admin) (RF-01, RF-14)
 */
export async function createTransaction(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    type: Joi.string().valid('remesa', 'retiro', 'cobro', 'transfer').required(),
    accountOriginId: Joi.string().uuid().allow(null),
    accountDestinationId: Joi.string().uuid().allow(null),
    amount: Joi.number().greater(0).required(),
    currency: Joi.string().length(3).uppercase().required(),
    exchangeRate: Joi.number().greater(0).default(1.0),
    beneficiaryId: Joi.string().uuid().allow(null),
    beneficiarySnapshot: Joi.object().allow(null),
    reference: Joi.string().max(100).allow(null, ''),
    notes: Joi.string().allow(null, ''),
    clientRequestId: Joi.string().uuid().allow(null),
    commissionSnapshot: Joi.object({
      rateApplied: Joi.number().required(),
      commissionAmount: Joi.number().required(),
      totalCharged: Joi.number().required(),
    }).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const txInput = {
      ...value,
      createdBy: user.id,
    };
    const transaction = await transactionService.executeTransaction(txInput);
    res.status(201).json({
      status: 'ok',
      message: 'Transacción procesada y completada con éxito',
      data: transaction,
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}

/**
 * Revierte una transacción completada mediante la creación de un espejo (Admin/Operador) (BR-02, BR-29)
 */
export async function revertTransaction(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    notes: Joi.string().min(5).required(), // BR-07: Comentario obligatorio
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;

  try {
    const result = await transactionService.revertTransaction(id, user.id, value.notes);
    res.status(200).json({
      status: 'ok',
      message: 'Transacción revertida con éxito',
      data: result,
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}

/**
 * Actualiza el estado operativo de una transacciÃ³n existente.
 * Usado para enviar a auditorÃ­a, aprobar o declinar transacciones pendientes.
 */
export async function updateTransactionStatus(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    status: Joi.string().valid('processing', 'audit_review', 'completed', 'failed').required(),
    notes: Joi.string().allow(null, ''),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const transaction = await transactionRepository.findTransactionByIdForUpdate(id, client);
    if (!transaction) {
      res.status(404).json({ status: 'error', message: 'TransacciÃ³n no encontrada' });
      await client.query('ROLLBACK');
      return;
    }

    if (transaction.status === 'reversed') {
      res.status(400).json({ status: 'error', message: 'No se puede cambiar el estado de una transacciÃ³n revertida.' });
      await client.query('ROLLBACK');
      return;
    }

    if (transaction.status === 'completed' && value.status !== 'audit_review') {
      res.status(400).json({ status: 'error', message: 'Una transacciÃ³n completada solo puede enviarse a auditorÃ­a o revertirse.' });
      await client.query('ROLLBACK');
      return;
    }

    const note = value.notes || `Estado actualizado a ${value.status}`;
    await transactionRepository.updateTransactionStatus(
      id,
      value.status,
      transaction.status,
      user.id,
      note,
      client
    );

    if (value.status === 'audit_review') {
      const alertContext = await client.query(
        `SELECT COALESCE(ao.client_id, ad.client_id, t.created_by) as client_id,
                t.amount,
                t.currency
         FROM transactions t
         LEFT JOIN accounts ao ON t.account_origin_id = ao.id
         LEFT JOIN accounts ad ON t.account_destination_id = ad.id
         WHERE t.id = $1`,
        [id]
      );
      const row = alertContext.rows[0];
      if (row?.client_id) {
        await complianceRepository.createComplianceAlert({
          transaction_id: id,
          client_id: row.client_id,
          rule_code: 'manual_review',
          triggered_amount_usd: Number(row.amount),
        });
      }
    }

    await client.query('COMMIT');
    res.status(200).json({ status: 'ok', message: 'Estado de transacciÃ³n actualizado correctamente.' });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}

/**
 * Obtiene el listado de transacciones con filtros aplicados (Aislamiento de clientes)
 */
export async function getTransactions(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
  const status = req.query.status as string;
  const type = req.query.type as string;
  const startDate = req.query.startDate as string;
  const endDate = req.query.endDate as string;
  
  let clientId = req.query.clientId as string;

  // Aislamiento: El cliente solo puede listar sus propias transacciones
  if (user.role_name === 'cliente') {
    clientId = user.id;
  }

  try {
    const transactions = await transactionRepository.listAllTransactions({
      clientId,
      status,
      type,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.status(200).json({ status: 'ok', data: transactions });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Obtiene los detalles de una transacción por ID (Verificación de privacidad)
 */
export async function getTransactionDetails(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = req.params.id as string;

  try {
    const transaction = await transactionRepository.findTransactionById(id);
    if (!transaction) {
      res.status(404).json({ status: 'error', message: 'Transacción no encontrada' });
      return;
    }

    // Aislamiento: Clientes solo pueden ver sus propios detalles de transacción
    if (user.role_name === 'cliente') {
      let isAuthorized = false;
      
      if (transaction.account_origin_id) {
        const origin = await accountRepository.findAccountById(transaction.account_origin_id);
        if (origin && origin.client_id === user.id) isAuthorized = true;
      }
      if (transaction.account_destination_id) {
        const dest = await accountRepository.findAccountById(transaction.account_destination_id);
        if (dest && dest.client_id === user.id) isAuthorized = true;
      }

      if (!isAuthorized) {
        res.status(403).json({ status: 'error', message: 'Acceso denegado' });
        return;
      }
    }

    const history = await transactionRepository.getTransactionStatusHistory(id);

    res.status(200).json({
      status: 'ok',
      data: {
        transaction,
        statusHistory: history,
      },
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Rastrear el estado de una transacción sin requerir autenticación (Consulta pública) (RF-13, Criterios de Aceptación)
 */
export async function trackTransaction(req: Request, res: Response): Promise<void> {
  const code = req.params.code as string;

  try {
    const transaction = await transactionRepository.findTransactionByTrackingCode(code);
    if (!transaction) {
      res.status(404).json({ status: 'error', message: 'Código de seguimiento no encontrado o inválido' });
      return;
    }

    // Retorna sólo campos públicos no sensibles (RF-13)
    res.status(200).json({
      status: 'ok',
      data: {
        tracking_code: transaction.tracking_code,
        status: transaction.status,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        created_at: transaction.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Crea una solicitud de remesa/retiro (Cliente)
 */
export async function createClientRequest(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    type: Joi.string().valid('remesa', 'retiro').required(),
    accountOriginId: Joi.string().uuid().required(),
    amount: Joi.number().greater(0).required(),
    currency: Joi.string().length(3).uppercase().required(),
    destinationAccountInfo: Joi.object().required(),
    beneficiary: Joi.object().required(),
    notes: Joi.string().allow(null, ''),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const originAccount = await accountRepository.findAccountById(value.accountOriginId);
    if (!originAccount || originAccount.client_id !== user.id) {
      res.status(400).json({ status: 'error', message: 'La cuenta origen no existe o no pertenece al cliente.' });
      return;
    }

    if (!originAccount.is_active) {
      res.status(400).json({ status: 'error', message: 'La cuenta origen estÃ¡ inactiva.' });
      return;
    }

    if (originAccount.currency !== value.currency) {
      res.status(400).json({ status: 'error', message: 'La moneda de la cuenta origen debe coincidir con la moneda de la solicitud.' });
      return;
    }

    const commissionCalc = await commissionService.calculateCommission(
      value.amount,
      value.currency,
      value.beneficiary?.currency || value.currency,
      []
    );
    const amountToReserve = commissionCalc.totalCharged;

    const availableBalance = parseFloat((originAccount.available_balance ?? originAccount.balance).toString());
    if (availableBalance < amountToReserve) {
      res.status(400).json({ status: 'error', message: 'La cuenta origen no tiene saldo suficiente para esta solicitud.' });
      return;
    }

    const client = await pool.connect();
    let clientReq: any;
    try {
      await client.query('BEGIN');

      const lockedOriginAccount = await accountRepository.findAccountByIdForUpdate(value.accountOriginId, client);
      if (!lockedOriginAccount || lockedOriginAccount.client_id !== user.id) {
        throw new Error('La cuenta origen no existe o no pertenece al cliente.');
      }

      const lockedAvailableBalance = parseFloat((lockedOriginAccount.available_balance ?? lockedOriginAccount.balance).toString());
      if (lockedAvailableBalance < amountToReserve) {
        throw new Error('La cuenta origen no tiene saldo disponible suficiente para esta solicitud.');
      }

      await accountRepository.adjustReservedBalance(lockedOriginAccount.id, amountToReserve, client);

      clientReq = await requestRepository.createRequest({
        client_id: user.id,
        type: value.type,
        amount: value.amount,
        currency: value.currency,
        destination_account_info: {
          ...value.destinationAccountInfo,
          originAccountId: lockedOriginAccount.id,
          originAccountName: lockedOriginAccount.name,
          originAccountCurrency: lockedOriginAccount.currency,
          reservedAmount: amountToReserve,
          requestedAmount: value.amount,
          commissionAmount: commissionCalc.commissionAmount,
          totalCharged: commissionCalc.totalCharged,
        },
        beneficiary: value.beneficiary,
        notes: value.notes,
      }, client);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({
      status: 'ok',
      message: 'Solicitud enviada con éxito. Un operador la procesará en breve.',
      data: clientReq,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Lista las solicitudes creadas (Cliente ve las suyas, Operador/Admin ven todas)
 */
export async function getClientRequests(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const status = req.query.status as string;

  try {
    if (user.role_name === 'cliente') {
      const requests = await requestRepository.findRequestsByClientId(user.id);
      res.status(200).json({ status: 'ok', data: requests });
    } else {
      const requests = await requestRepository.findAllRequests(status);
      res.status(200).json({ status: 'ok', data: requests });
    }
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Actualiza el estado de una solicitud (Aprobación/Rechazo por Operador/Admin)
 */
export async function updateClientRequestStatus(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    status: Joi.string().valid('processing', 'audit_review', 'rejected').required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const clientReq = await requestRepository.findRequestByIdForUpdate(id, client);
      if (!clientReq) {
        res.status(404).json({ status: 'error', message: 'Solicitud no encontrada' });
        await client.query('ROLLBACK');
        return;
      }

      if (!['pending', 'processing', 'audit_review'].includes(clientReq.status)) {
        res.status(400).json({ status: 'error', message: 'Solo se pueden actualizar solicitudes pendientes, en proceso o auditorÃ­a.' });
        await client.query('ROLLBACK');
        return;
      }

      if (value.status === 'rejected') {
        const originAccountId = clientReq.destination_account_info?.originAccountId;
        const reservedAmount = parseFloat((clientReq.destination_account_info?.reservedAmount ?? clientReq.amount).toString());
        if (originAccountId && reservedAmount > 0) {
          await accountRepository.releaseReservedBalance(originAccountId, reservedAmount, client);
        }
      }

      await requestRepository.updateRequestStatus(id, value.status, user.id, client);

      if (value.status === 'audit_review') {
        await complianceRepository.createComplianceAlert({
          client_request_id: id,
          client_id: clientReq.client_id,
          rule_code: 'manual_review',
          triggered_amount_usd: Number(clientReq.amount),
        });
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(200).json({
      status: 'ok',
      message: `Solicitud marcada en estado ${value.status} correctamente.`,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Cancela una solicitud pendiente/en proceso y libera el saldo reservado.
 */
export async function cancelClientRequest(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = req.params.id as string;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const clientReq = await requestRepository.findRequestByIdForUpdate(id, client);
    if (!clientReq) {
      res.status(404).json({ status: 'error', message: 'Solicitud no encontrada' });
      await client.query('ROLLBACK');
      return;
    }

    const canCancel =
      clientReq.client_id === user.id ||
      user.role_name === 'admin' ||
      user.role_name === 'operador';

    if (!canCancel) {
      res.status(403).json({ status: 'error', message: 'Acceso denegado' });
      await client.query('ROLLBACK');
      return;
    }

    if (!['pending', 'processing'].includes(clientReq.status)) {
      res.status(400).json({ status: 'error', message: 'Solo se pueden cancelar solicitudes pendientes o en proceso.' });
      await client.query('ROLLBACK');
      return;
    }

    const originAccountId = clientReq.destination_account_info?.originAccountId;
    const reservedAmount = parseFloat((clientReq.destination_account_info?.reservedAmount ?? clientReq.amount).toString());
    if (originAccountId && reservedAmount > 0) {
      await accountRepository.releaseReservedBalance(originAccountId, reservedAmount, client);
    }

    await requestRepository.updateRequestStatus(id, 'cancelled', user.id, client);
    await client.query('COMMIT');

    res.status(200).json({
      status: 'ok',
      message: 'Solicitud cancelada y saldo reservado liberado correctamente.',
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
}
