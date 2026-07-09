import { Request, Response } from 'express';
import Joi from 'joi';
import * as userRepository from '../repositories/user.repository.js';
import { hashPassword } from '../utils/crypto.js';
import pool from '../config/db.js';

/**
 * Obtiene todos los usuarios y clientes (Admin)
 */
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, u.auth_provider, u.commission_eligible, u.is_active, u.email_verified, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL
      ORDER BY u.created_at DESC;
    `;
    const result = await pool.query(query);
    res.status(200).json({ status: 'ok', data: result.rows });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Obtiene únicamente los usuarios internos: admin, operador, auditor (Admin)
 */
export async function getInternalUsers(req: Request, res: Response): Promise<void> {
  try {
    const query = `
      SELECT u.id, u.name, u.email, u.role_id, r.name as role_name, u.auth_provider, u.commission_eligible, u.is_active, u.email_verified, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.deleted_at IS NULL AND u.role_id IN (1, 2, 3)
      ORDER BY u.created_at DESC;
    `;
    const result = await pool.query(query);
    res.status(200).json({ status: 'ok', data: result.rows });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Lista únicamente los perfiles de cliente (Operador/Admin)
 */
export async function getClients(req: Request, res: Response): Promise<void> {
  try {
    const clients = await userRepository.listClients();
    res.status(200).json({ status: 'ok', data: clients });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Asigna un rol a un usuario (Admin) (BR-24)
 */
export async function updateUserRole(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    role_id: Joi.number().integer().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }


  const id = req.params.id as string;

  try {
    const targetUser = await userRepository.findUserById(id);
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
      return;
    }

    // BR-23: Solo el administrador principal del sistema (seed) es inmutable
    const SYSTEM_ADMIN_ID = 'a0000000-0000-0000-0000-000000000001';
    if (targetUser.id === SYSTEM_ADMIN_ID) {
      res.status(403).json({ status: 'error', message: 'No es posible modificar el rol del administrador principal del sistema (BR-23)' });
      return;
    }

    await userRepository.updateUserRole(id, value.role_id);
    res.status(200).json({ status: 'ok', message: 'Rol de usuario actualizado e invalidada la sesión activa con éxito.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Activa o desactiva un usuario (Admin)
 */
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
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
    const targetUser = await userRepository.findUserById(id);
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
      return;
    }

    // BR-23: Solo el admin principal del sistema no se puede desactivar
    const SYSTEM_ADMIN_ID = 'a0000000-0000-0000-0000-000000000001';
    if (targetUser.id === SYSTEM_ADMIN_ID && !value.is_active) {
      res.status(403).json({ status: 'error', message: 'No es posible desactivar al administrador principal del sistema' });
      return;
    }

    const query = `
      UPDATE users 
      SET is_active = $1, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `;
    await pool.query(query, [value.is_active, id]);

    res.status(200).json({ status: 'ok', message: `Usuario ${value.is_active ? 'activado' : 'desactivado'} correctamente.` });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Crea un nuevo usuario interno: operador o auditor (Admin) (BR-15)
 */
export async function createInternalUser(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    name: Joi.string().max(100).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role_id: Joi.number().integer().valid(2, 3).required(), // 2: operador, 3: auditor
    commission_eligible: Joi.boolean().default(false),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const existingUser = await userRepository.findUserByEmail(value.email);
    if (existingUser) {
      res.status(400).json({ status: 'error', message: 'El correo electrónico ya está registrado' });
      return;
    }

    const passwordHash = await hashPassword(value.password);

    const newUser = await userRepository.createUser({
      name: value.name,
      email: value.email,
      password_hash: passwordHash,
      role_id: value.role_id,
      email_verified: true, // Usuarios internos se marcan verificados por defecto
    });

    // Actualizar configuración must_change_password y elegibilidad de comisión
    await pool.query(
      "UPDATE users SET must_change_password = true, commission_eligible = $1 WHERE id = $2",
      [value.commission_eligible, newUser.id]
    );

    res.status(201).json({
      status: 'ok',
      message: 'Usuario interno creado con contraseña temporal. Se le obligará a cambiarla en su primer login (BR-15).',
      userId: newUser.id,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Administrador establece contraseña temporal para operadores/auditores (BR-15, BR-16)
 */
export async function resetPasswordTemp(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    password: Joi.string().min(6).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;

  try {
    const targetUser = await userRepository.findUserById(id);
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
      return;
    }

    // BR-16: Admin no puede gestionar contraseñas de clientes
    if (targetUser.role_name === 'cliente') {
      res.status(403).json({ status: 'error', message: 'Acceso denegado: El administrador no puede cambiar la contraseña de clientes (BR-16)' });
      return;
    }

    const passwordHash = await hashPassword(value.password);
    await userRepository.updateUserPassword(id, passwordHash, true); // mustChangePassword = true (BR-15)

    res.status(200).json({
      status: 'ok',
      message: 'Contraseña temporal establecida. El usuario deberá cambiarla en su próximo login.',
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}

/**
 * Elimina un usuario de forma lógica (soft delete) (Admin)
 */
export async function softDeleteUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  try {
    const targetUser = await userRepository.findUserById(id);
    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
      return;
    }

    // No permitir eliminar al administrador principal del sistema
    const SYSTEM_ADMIN_ID = 'a0000000-0000-0000-0000-000000000001';
    if (targetUser.id === SYSTEM_ADMIN_ID) {
      res.status(403).json({ status: 'error', message: 'No es posible eliminar al administrador principal del sistema' });
      return;
    }

    const query = `
      UPDATE users 
      SET deleted_at = CURRENT_TIMESTAMP, is_active = false, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    await pool.query(query, [id]);

    res.status(200).json({ status: 'ok', message: 'Usuario eliminado correctamente.' });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
}
