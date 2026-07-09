import { Request, Response } from 'express';
import Joi from 'joi';
import * as beneficiaryRepository from '../repositories/beneficiary.repository.js';

/**
 * Registra un beneficiario en la libreta de direcciones (Cliente) (RF-26)
 */
export async function createBeneficiary(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    name: Joi.string().max(100).required(),
    bankName: Joi.string().max(100).required(),
    accountNumber: Joi.string().max(50).required(),
    accountType: Joi.string().valid('checking', 'savings', 'clabe', 'iban').required(),
    country: Joi.string().length(2).uppercase().required(),
    currency: Joi.string().length(3).uppercase().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const beneficiary = await beneficiaryRepository.createBeneficiary({
      client_id: user.id,
      name: value.name,
      bank_name: value.bankName,
      account_number: value.accountNumber,
      account_type: value.accountType,
      country: value.country,
      currency: value.currency,
    });

    res.status(201).json({
      status: 'ok',
      message: 'Beneficiario registrado exitosamente en tu libreta de direcciones.',
      data: beneficiary,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Lista los beneficiarios del cliente (Aislamiento de datos)
 */
export async function getBeneficiaries(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  let clientId = req.query.clientId as string;

  if (user.role_name === 'cliente') {
    clientId = user.id;
  }

  if (!clientId) {
    res.status(400).json({ status: 'error', message: 'Se requiere el parámetro clientId' });
    return;
  }

  try {
    const beneficiaries = await beneficiaryRepository.findBeneficiariesByClientId(clientId);
    res.status(200).json({ status: 'ok', data: beneficiaries });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Actualiza los datos de un beneficiario existente
 */
export async function updateBeneficiary(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = req.params.id as string;

  const schema = Joi.object({
    name: Joi.string().max(100).required(),
    bankName: Joi.string().max(100).required(),
    accountNumber: Joi.string().max(50).required(),
    accountType: Joi.string().valid('checking', 'savings', 'clabe', 'iban').required(),
    country: Joi.string().length(2).uppercase().required(),
    currency: Joi.string().length(3).uppercase().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const existing = await beneficiaryRepository.findBeneficiaryById(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Beneficiario no encontrado' });
      return;
    }

    // Aislamiento: Cliente solo edita sus propios beneficiarios
    if (user.role_name === 'cliente' && existing.client_id !== user.id) {
      res.status(403).json({ status: 'error', message: 'Acceso denegado' });
      return;
    }

    await beneficiaryRepository.updateBeneficiary(id, {
      name: value.name,
      bank_name: value.bankName,
      account_number: value.accountNumber,
      account_type: value.accountType,
      country: value.country,
      currency: value.currency,
    });

    res.status(200).json({
      status: 'ok',
      message: 'Datos del beneficiario actualizados correctamente.',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Borrado lógico de un beneficiario de la libreta (soft delete BR-06)
 */
export async function deleteBeneficiary(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = req.params.id as string;

  try {
    const existing = await beneficiaryRepository.findBeneficiaryById(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Beneficiario no encontrado' });
      return;
    }

    // Aislamiento: Cliente solo borra sus propios beneficiarios
    if (user.role_name === 'cliente' && existing.client_id !== user.id) {
      res.status(403).json({ status: 'error', message: 'Acceso denegado' });
      return;
    }

    await beneficiaryRepository.softDeleteBeneficiary(id);
    res.status(200).json({
      status: 'ok',
      message: 'Beneficiario eliminado de la libreta de direcciones exitosamente.',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
