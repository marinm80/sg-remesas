import { Request, Response } from 'express';
import Joi from 'joi';
import * as authService from '../services/auth.service.js';
import { generateAccessToken, generateRefreshToken } from '../utils/crypto.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Registro de cliente local
 */
export async function register(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    name: Joi.string().max(100).required(),
    email: Joi.string().email().max(150).required(),
    password: Joi.string().min(6).required(),
    country: Joi.string().max(50).required(),
    phone: Joi.string().max(20).allow(null, ''),
    address: Joi.string().allow(null, ''),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const user = await authService.registerClient(value);
    res.status(201).json({
      status: 'ok',
      message: 'Usuario registrado con éxito. Se ha enviado un correo de verificación.',
      userId: user.id,
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}

/**
 * Login local con email y contraseña
 */
export async function login(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const { user, accessToken, refreshToken } = await authService.loginUser(value);
    res.status(200).json({
      status: 'ok',
      message: 'Inicio de sesión exitoso',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_name,
        mustChangePassword: user.must_change_password,
      },
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}

/**
 * Verificación de cuenta de correo mediante token
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    token: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    await authService.verifyClientEmail(value.token);
    res.status(200).json({ status: 'ok', message: 'Correo electrónico verificado exitosamente.' });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}

/**
 * Solicitud de restablecimiento de contraseña
 */
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    await authService.requestPasswordReset(value.email);
    res.status(200).json({
      status: 'ok',
      message: 'Si el correo electrónico existe, se ha enviado un enlace para restablecer la contraseña.',
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}

/**
 * Confirmación de restablecimiento de contraseña con token
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const schema = Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    await authService.resetPassword(value.token, value.password);
    res.status(200).json({ status: 'ok', message: 'Contraseña restablecida exitosamente.' });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}

/**
 * Callback de Google OAuth 2.0.
 * Redirecciona al frontend inyectando los tokens JWT en la URL.
 */
export async function googleCallback(req: Request, res: Response): Promise<void> {
  const user = req.user as any;
  if (!user) {
    res.redirect(`${FRONTEND_URL}/login?error=oauth_failed`);
    return;
  }

  // Si existe pero está inactivo
  if (!user.is_active) {
    res.redirect(`${FRONTEND_URL}/account-suspended`);
    return;
  }

  // Colisión de proveedor (BR-13)
  if (user.auth_provider === 'local' && user.password_hash) {
    res.redirect(`${FRONTEND_URL}/login?error=provider_collision`);
    return;
  }

  // Generar tokens de backend para la sesión activa del usuario
  const payload = { id: user.id, role_name: user.role_name || 'cliente', token_version: user.token_version };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  res.redirect(`${FRONTEND_URL}/login?token=${accessToken}&refreshToken=${refreshToken}`);
}
