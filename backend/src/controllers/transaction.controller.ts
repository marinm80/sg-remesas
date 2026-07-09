import { Request, Response } from 'express';
import Joi from 'joi';
import * as transactionService from '../services/transaction.service.js';
import * as transactionRepository from '../repositories/transaction.repository.js';
import * as requestRepository from '../repositories/request.repository.js';
import * as accountRepository from '../repositories/account.repository.js';

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
    const clientReq = await requestRepository.createRequest({
      client_id: user.id,
      type: value.type,
      amount: value.amount,
      currency: value.currency,
      destination_account_info: value.destinationAccountInfo,
      beneficiary: value.beneficiary,
      notes: value.notes,
    });

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
    status: Joi.string().valid('processing', 'rejected').required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;

  try {
    const clientReq = await requestRepository.findRequestById(id);
    if (!clientReq) {
      res.status(404).json({ status: 'error', message: 'Solicitud no encontrada' });
      return;
    }

    await requestRepository.updateRequestStatus(id, value.status, user.id);
    res.status(200).json({
      status: 'ok',
      message: `Solicitud marcada en estado ${value.status} correctamente.`,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
