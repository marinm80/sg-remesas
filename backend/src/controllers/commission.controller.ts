import { Request, Response } from 'express';
import Joi from 'joi';
import * as commissionRepository from '../repositories/commission.repository.js';
import * as operatorRepository from '../repositories/operator.repository.js';

/**
 * Obtiene todas las reglas de comisiones (Admin/Operador)
 */
export async function getRules(req: Request, res: Response): Promise<void> {
  try {
    const rules = await commissionRepository.listAllRules();
    res.status(200).json({ status: 'ok', data: rules });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Crea una nueva regla de comisiones por par (Admin) (BR-21)
 */
export async function createRule(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role_name !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado: Se requiere rol de Administrador' });
    return;
  }

  const schema = Joi.object({
    currencyFrom: Joi.string().length(3).uppercase().required(),
    currencyTo: Joi.string().length(3).uppercase().required(),
    ratePercent: Joi.number().min(0).max(100).required(),
    minFixedAmount: Joi.number().min(0).required(),
    minFixedCurrency: Joi.string().length(3).uppercase().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    // Verificar si ya existe una regla activa para este par
    const existing = await commissionRepository.findActiveRuleByCurrencies(value.currencyFrom, value.currencyTo);
    if (existing) {
      res.status(400).json({ status: 'error', message: 'Ya existe una regla de comisión activa para este par de monedas. Desactívela primero.' });
      return;
    }

    const rule = await commissionRepository.createCommissionRule({
      currency_from: value.currencyFrom,
      currency_to: value.currencyTo,
      rate_percent: value.ratePercent,
      min_fixed_amount: value.minFixedAmount,
      min_fixed_currency: value.minFixedCurrency,
      created_by: user.id,
    });

    res.status(201).json({
      status: 'ok',
      message: 'Regla de comisión creada exitosamente.',
      data: rule,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Desactiva una regla de comisión (Admin)
 */
export async function deactivateRule(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role_name !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado: Se requiere rol de Administrador' });
    return;
  }

  const id = parseInt(req.params.id as string);

  try {
    await commissionRepository.deactivateRule(id);
    res.status(200).json({ status: 'ok', message: 'Regla de comisión desactivada correctamente.' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Obtiene los tramos de operadores (Admin/Operador)
 */
export async function getTiers(req: Request, res: Response): Promise<void> {
  const operatorId = req.query.operatorId as string;

  try {
    let tiers;
    if (operatorId) {
      tiers = await operatorRepository.findTiersByOperatorId(operatorId);
    } else {
      tiers = await operatorRepository.findGlobalTiers();
    }
    res.status(200).json({ status: 'ok', data: tiers });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Crea un nuevo tramo de comisión para operadores (Admin) (BR-26)
 */
export async function createTier(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role_name !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado: Se requiere rol de Administrador' });
    return;
  }

  const schema = Joi.object({
    operatorId: Joi.string().uuid().allow(null),
    minAmountUsd: Joi.number().min(0).required(),
    maxAmountUsd: Joi.number().min(0).allow(null),
    ratePercent: Joi.number().min(0).max(100).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const tier = await operatorRepository.createOperatorTier({
      operator_id: value.operatorId,
      min_amount_usd: value.minAmountUsd,
      max_amount_usd: value.maxAmountUsd,
      rate_percent: value.ratePercent,
      created_by: user.id,
    });

    res.status(201).json({
      status: 'ok',
      message: 'Tramo de incentivo de operador creado exitosamente.',
      data: tier,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Desactiva un tramo de comisiones para operadores (Admin)
 */
export async function deactivateTier(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role_name !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado: Se requiere rol de Administrador' });
    return;
  }

  const id = parseInt(req.params.id as string);

  try {
    await operatorRepository.deactivateOperatorTier(id);
    res.status(200).json({ status: 'ok', message: 'Tramo de comisión de operador desactivado correctamente.' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Obtiene la configuración global del sistema (Admin/Auditor/Operador)
 */
export async function getGlobalConfig(req: Request, res: Response): Promise<void> {
  try {
    const configs = await commissionRepository.listGlobalConfig();
    res.status(200).json({ status: 'ok', data: configs });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Actualiza la configuración global del sistema (Admin)
 */
export async function updateGlobalConfig(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role_name !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado: Se requiere rol de Administrador' });
    return;
  }

  const schema = Joi.object({
    key: Joi.string().required(),
    value: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    await commissionRepository.updateGlobalConfigValue(value.key, value.value, user.id);
    res.status(200).json({
      status: 'ok',
      message: `Configuración '${value.key}' actualizada correctamente a '${value.value}'.`,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
