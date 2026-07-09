import { Request, Response } from 'express';
import Joi from 'joi';
import * as complianceRepository from '../repositories/compliance.repository.js';
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
    comment: Joi.string().max(500).required(), // Comentario obligatorio
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    // Verificar si la alerta existe
    const result = await pool.query('SELECT * FROM compliance_alerts WHERE id = $1', [id]);
    if (!result.rows.length) {
      res.status(404).json({ status: 'error', message: 'Alerta AML no encontrada' });
      return;
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
