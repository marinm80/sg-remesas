import { Request, Response } from 'express';
import Joi from 'joi';
import pool from '../config/db.js';
import * as operatorRepository from '../repositories/operator.repository.js';

/**
 * Reporte de comisiones acumuladas por operadores en un rango de fechas (Auditor/Admin) (RF-36)
 */
export async function getOperatorCommissions(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    startDate: Joi.string().isoDate().required(),
    endDate: Joi.string().isoDate().required(),
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const report = await operatorRepository.getOperatorCommissionReport(value.startDate, value.endDate);
    res.status(200).json({ status: 'ok', data: report });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Resumen ejecutivo de volumen transaccional y comisiones del negocio (Auditor/Admin) (RF-36)
 */
export async function getTransactionsSummary(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    startDate: Joi.string().isoDate().required(),
    endDate: Joi.string().isoDate().required(),
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const query = `
      SELECT 
        status,
        COUNT(id) as total_count,
        COALESCE(SUM(amount / exchange_rate), 0.00) as total_volume_usd,
        COALESCE(SUM(commission_amount / exchange_rate), 0.00) as total_commission_usd
      FROM transactions
      WHERE deleted_at IS NULL
        AND created_at >= $1 AND created_at <= $2
      GROUP BY status;
    `;
    const result = await pool.query(query, [value.startDate, value.endDate]);
    res.status(200).json({ status: 'ok', data: result.rows });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Reporte detallado de auditoría (logs de estado, registros KYC, etc.) (RF-42)
 */
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    startDate: Joi.string().isoDate().required(),
    endDate: Joi.string().isoDate().required(),
  });

  const { error, value } = schema.validate(req.query);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const query = `
      SELECT 
        log.id,
        log.transaction_id,
        log.previous_status,
        log.new_status,
        log.changed_at as created_at,
        t.tracking_code,
        u.name as performed_by_name,
        u.email as performed_by_email,
        log.notes as action_description
      FROM transaction_status_log log
      JOIN transactions t ON log.transaction_id = t.id
      LEFT JOIN users u ON log.changed_by = u.id
      WHERE log.changed_at >= $1 AND log.changed_at <= $2
      ORDER BY log.changed_at DESC;
    `;
    const result = await pool.query(query, [value.startDate, value.endDate]);
    res.status(200).json({ status: 'ok', data: result.rows });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
