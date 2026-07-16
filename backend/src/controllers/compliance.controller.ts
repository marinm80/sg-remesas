import { Request, Response } from 'express';
import Joi from 'joi';
import * as complianceRepository from '../repositories/compliance.repository.js';
import * as accountRepository from '../repositories/account.repository.js';
import * as requestRepository from '../repositories/request.repository.js';
import * as transactionRepository from '../repositories/transaction.repository.js';
import * as transactionService from '../services/transaction.service.js';
import pool from '../config/db.js';

/**
 * Obtiene todas las reglas de cumplimiento AML (Auditor/Admin)
 */
export async function getRules(req: Request, res: Response): Promise<void> {
  try {
    const rules = await complianceRepository.getComplianceRules();
    res.status(200).json({ status: 'ok', data: rules });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Actualiza los parámetros de una regla de cumplimiento (Admin únicamente)
 */
export async function updateRule(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = parseInt(req.params.id as string);

  const schema = Joi.object({
    threshold_amount_usd: Joi.number().greater(0).required(),
    window_hours: Joi.number().integer().min(1).allow(null),
    transaction_count: Joi.number().integer().min(1).allow(null),
    is_active: Joi.boolean().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    // Verificar si la regla existe
    const result = await pool.query('SELECT * FROM compliance_rules WHERE id = $1', [id]);
    if (!result.rows.length) {
      res.status(404).json({ status: 'error', message: 'Regla AML no encontrada' });
      return;
    }

    await complianceRepository.updateComplianceRule(id, {
      threshold_amount_usd: value.threshold_amount_usd,
      window_hours: value.window_hours,
      transaction_count: value.transaction_count,
      is_active: value.is_active,
      updated_by: user.id,
    });

    res.status(200).json({
      status: 'ok',
      message: 'Regla de cumplimiento AML actualizada correctamente.',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Obtiene las alertas AML pendientes (para el badge del Auditor) (RF-43)
 */
export async function getPendingAlerts(req: Request, res: Response): Promise<void> {
  try {
    const alerts = await complianceRepository.findPendingComplianceAlerts();
    res.status(200).json({ status: 'ok', data: alerts });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Lista todas las alertas AML del sistema con paginación y filtros (Auditor/Admin)
 */
export async function getAlerts(req: Request, res: Response): Promise<void> {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
  const status = req.query.status as string;
  const ruleCode = req.query.ruleCode as string;
  const clientEmail = req.query.clientEmail as string;

  try {
    const alerts = await complianceRepository.listAllComplianceAlerts({
      status,
      ruleCode,
      clientEmail,
      limit,
      offset,
    });
    res.status(200).json({ status: 'ok', data: alerts });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Permite al Auditor/Admin revisar y archivar una alerta AML (RF-43)
 */
export async function reviewAlert(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = req.params.id as string;

  const schema = Joi.object({
    status: Joi.string().valid('reviewed', 'dismissed').required(),
    resolutionAction: Joi.string().valid('none', 'approve', 'decline', 'revert').default('none'),
    comment: Joi.string().max(500).required(), // Comentario obligatorio
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const alert = await complianceRepository.findComplianceAlertById(id);
    if (!alert) {
      res.status(404).json({ status: 'error', message: 'Alerta AML no encontrada' });
      return;
    }

    if (alert.status !== 'pending') {
      res.status(400).json({ status: 'error', message: 'La alerta ya fue resuelta.' });
      return;
    }

    const action = value.resolutionAction;

    if (action !== 'none') {
      if (alert.client_request_id) {
        await resolveClientRequestAlert(alert, action, user.id, value.comment);
      } else if (alert.transaction_id) {
        await resolveTransactionAlert(alert, action, user.id, value.comment);
      } else {
        res.status(400).json({ status: 'error', message: 'La alerta no tiene una operación asociada.' });
        return;
      }
    }

    await complianceRepository.reviewComplianceAlert(id, value.status, user.id, value.comment);

    res.status(200).json({
      status: 'ok',
      message: `Alerta AML marcada como ${value.status === 'reviewed' ? 'revisada' : 'descartada'} con éxito.`,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

async function resolveClientRequestAlert(alert: any, action: string, userId: string, comment: string): Promise<void> {
  if (action === 'revert') {
    throw new Error('Una solicitud pendiente no puede revertirse; debe aprobarse o declinarse.');
  }

  if (!['pending', 'processing', 'audit_review'].includes(alert.request_status)) {
    throw new Error('La solicitud ya fue procesada, cancelada o rechazada.');
  }

  if (action === 'decline') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const clientReq = await requestRepository.findRequestByIdForUpdate(alert.client_request_id, client);
      if (!clientReq) throw new Error('Solicitud no encontrada.');

      const originAccountId = clientReq.destination_account_info?.originAccountId;
      const reservedAmount = parseFloat((clientReq.destination_account_info?.reservedAmount ?? clientReq.amount).toString());
      if (originAccountId && reservedAmount > 0) {
        await accountRepository.releaseReservedBalance(originAccountId, reservedAmount, client);
      }

      await requestRepository.updateRequestStatus(alert.client_request_id, 'rejected', userId, client);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return;
  }

  if (action === 'approve') {
    const destinationInfo = alert.destination_account_info || {};
    const beneficiary = alert.beneficiary || {};
    const totalCharged = Number(destinationInfo.totalCharged ?? destinationInfo.reservedAmount ?? alert.request_amount);
    const commissionAmount = Number(destinationInfo.commissionAmount ?? Math.max(totalCharged - Number(alert.request_amount), 0));

    await transactionService.executeTransaction({
      type: alert.request_type,
      accountOriginId: destinationInfo.originAccountId,
      accountDestinationId: destinationInfo.destinationAccountId || null,
      amount: Number(alert.request_amount),
      currency: alert.request_currency,
      exchangeRate: Number(destinationInfo.exchangeRate ?? 1),
      beneficiaryId: beneficiary.id || beneficiary.beneficiaryId || null,
      beneficiarySnapshot: beneficiary,
      reference: `Aprobada desde auditoria ${alert.id.slice(0, 8)}`,
      notes: comment,
      clientRequestId: alert.client_request_id,
      commissionSnapshot: {
        rateApplied: Number(destinationInfo.rateApplied ?? 0),
        commissionAmount,
        totalCharged,
      },
      createdBy: userId,
    });
  }
}

async function resolveTransactionAlert(alert: any, action: string, userId: string, comment: string): Promise<void> {
  if (action === 'revert') {
    await transactionService.revertTransaction(alert.transaction_id, userId, comment);
    return;
  }

  const nextStatus = action === 'approve' ? 'completed' : 'failed';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const transaction = await transactionRepository.findTransactionByIdForUpdate(alert.transaction_id, client);
    if (!transaction) throw new Error('Transacción no encontrada.');
    if (transaction.status === 'reversed') throw new Error('No se puede cambiar una transacción revertida.');
    if (transaction.status === 'completed' && nextStatus !== 'failed') {
      throw new Error('La transacción ya está aprobada.');
    }

    await transactionRepository.updateTransactionStatus(
      alert.transaction_id,
      nextStatus,
      transaction.status,
      userId,
      comment,
      client
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
