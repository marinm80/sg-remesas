import { Request, Response } from 'express';
import Joi from 'joi';
import * as accountRepository from '../repositories/account.repository.js';

/**
 * Lista las cuentas según el rol del usuario (Cliente ve solo suyas, Admin/Operador/Auditor ven todo)
 */
export async function getAccounts(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ status: 'error', message: 'No autenticado' });
    return;
  }

  try {
    if (user.role_name === 'cliente') {
      // Clientes solo pueden ver sus cuentas propias (BR-Multi-tenant / Aislamiento)
      const accounts = await accountRepository.findAccountsByClientId(user.id);
      res.status(200).json({ status: 'ok', data: accounts });
    } else {
      // Operador, Auditor y Admin pueden ver todas o filtrar por cliente
      const clientId = req.query.clientId as string;
      if (clientId) {
        const accounts = await accountRepository.findAccountsByClientId(clientId);
        res.status(200).json({ status: 'ok', data: accounts });
      } else {
        const accounts = await accountRepository.findAllAccounts();
        res.status(200).json({ status: 'ok', data: accounts });
      }
    }
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Crea una nueva cuenta (Admin únicamente)
 */
export async function createAccount(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role_name !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado: Se requiere rol de Administrador' });
    return;
  }

  const schema = Joi.object({
    name: Joi.string().max(100).required(),
    type: Joi.string().valid('bank', 'digital', 'cash').required(),
    currency: Joi.string().length(3).uppercase().required(),
    balance: Joi.number().min(0).default(0.00),
    client_id: Joi.string().uuid().allow(null),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const account = await accountRepository.createAccount({
      name: value.name,
      type: value.type,
      currency: value.currency,
      balance: value.balance,
      client_id: value.client_id,
      created_by: user.id,
    });

    res.status(201).json({
      status: 'ok',
      message: 'Cuenta creada exitosamente',
      data: account,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Actualiza el estado activo/inactivo de una cuenta (Admin únicamente)
 */
export async function updateAccountStatus(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role_name !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado: Se requiere rol de Administrador' });
    return;
  }

  const schema = Joi.object({
    is_active: Joi.boolean().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;

  try {
    const account = await accountRepository.findAccountById(id);
    if (!account) {
      res.status(404).json({ status: 'error', message: 'Cuenta no encontrada' });
      return;
    }

    await accountRepository.updateAccountStatus(id, value.is_active);
    res.status(200).json({
      status: 'ok',
      message: `Cuenta ${value.is_active ? 'activada' : 'desactivada'} correctamente`,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Borrado lógico de cuenta (Admin únicamente) (BR-06)
 */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!user || user.role_name !== 'admin') {
    res.status(403).json({ status: 'error', message: 'Acceso denegado: Se requiere rol de Administrador' });
    return;
  }

  const id = req.params.id as string;

  try {
    const account = await accountRepository.findAccountById(id);
    if (!account) {
      res.status(404).json({ status: 'error', message: 'Cuenta no encontrada' });
      return;
    }

    await accountRepository.softDeleteAccount(id);
    res.status(200).json({
      status: 'ok',
      message: 'Cuenta eliminada (borrado lógico) exitosamente',
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
