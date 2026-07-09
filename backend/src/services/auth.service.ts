import crypto from 'crypto';
import pool from '../config/db.js';
import * as userRepository from '../repositories/user.repository.js';
import { hashPassword, comparePassword, generateAccessToken, generateRefreshToken } from '../utils/crypto.js';
import { sendMail } from '../utils/mailer.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Registra un cliente local en el sistema de manera atómica (con transacción)
 */
export async function registerClient(clientData: {
  name: string;
  email: string;
  password?: string;
  country: string;
  phone?: string | null;
  address?: string | null;
}): Promise<userRepository.User> {
  const { name, email, password, country, phone = null, address = null } = clientData;

  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw new Error('El correo electrónico ya se encuentra registrado');
  }

  // Generar token para verificación de email
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const passwordHash = password ? await hashPassword(password) : null;

  // Ejecutar en una transacción ACID
  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // 1. Crear usuario con rol de Cliente (role_id = 4)
    const newUser = await userRepository.createUser(
      {
        name,
        email,
        password_hash: passwordHash,
        role_id: 4, // Cliente
        email_verify_token: verifyToken,
        email_verified: false,
      },
      dbClient
    );

    // 2. Crear perfil del cliente
    await userRepository.createClientProfile(
      {
        user_id: newUser.id,
        phone,
        country,
        address,
        kyc_level: 0, // Nivel inicial sin documentos
      },
      dbClient
    );

    await dbClient.query('COMMIT');

    // 3. Enviar correo de verificación (fuera de la transacción de BD)
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${verifyToken}`;
    await sendMail({
      to: email,
      subject: 'Verifica tu cuenta de correo - SG Remesas',
      text: `Hola ${name},\n\nPor favor verifica tu correo haciendo clic en el siguiente enlace: ${verifyUrl}\n\nGracias,\nEquipo de SG Remesas`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e4e7; border-radius: 8px;">
          <h2 style="color: #1B3F72;">Bienvenido a SG Remesas</h2>
          <p>Hola <strong>${name}</strong>,</p>
          <p>Gracias por registrarte en nuestra plataforma de remesas. Para comenzar a operar, necesitamos que verifiques tu cuenta de correo electrónico:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #2ABFA3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Verificar mi Correo</a>
          </p>
          <p style="color: #6b6375; font-size: 13px;">Si el botón no funciona, puedes copiar y pegar el siguiente enlace en tu navegador:<br>${verifyUrl}</p>
          <hr style="border: 0; border-top: 1px solid #e5e4e7; margin: 20px 0;">
          <p style="font-size: 12px; color: #9ca3af;">Este es un correo automático. Por favor no respondas a este mensaje.</p>
        </div>
      `,
    });

    return newUser;
  } catch (error) {
    await dbClient.query('ROLLBACK');
    throw error;
  } finally {
    dbClient.release();
  }
}

/**
 * Autentica un usuario (login local)
 */
export async function loginUser(credentials: {
  email: string;
  password?: string;
}): Promise<{
  user: userRepository.User;
  accessToken: string;
  refreshToken: string;
}> {
  const { email, password } = credentials;

  const user = await userRepository.findUserByEmail(email);
  
  if (!user) {
    throw new Error('Credenciales incorrectas');
  }

  if (!user.is_active) {
    throw new Error('La cuenta de usuario se encuentra desactivada');
  }

  // Si se registró con OAuth
  if (user.auth_provider === 'google' && !user.password_hash) {
    throw new Error('Esta cuenta usa inicio de sesión con Google. Por favor ingresa usando Google.');
  }

  if (password && user.password_hash) {
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Credenciales incorrectas');
    }
  } else {
    throw new Error('Credenciales incorrectas');
  }

  if (!user.email_verified) {
    throw new Error('Debes verificar tu dirección de correo electrónico antes de iniciar sesión');
  }

  // Generar tokens
  const payload = { id: user.id, role_name: user.role_name, token_version: user.token_version };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return { user, accessToken, refreshToken };
}

/**
 * Verifica el email de un cliente usando el token recibido
 */
export async function verifyClientEmail(token: string): Promise<void> {
  const user = await userRepository.findUserByVerifyToken(token);
  if (!user) {
    throw new Error('El enlace de verificación es inválido o ha expirado');
  }

  await userRepository.updateUserEmailVerified(user.id, true);
}

/**
 * Genera y envía el correo para restablecer contraseña
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    // Retornamos silenciosamente por seguridad
    return;
  }

  if (user.auth_provider === 'google') {
    throw new Error('Esta cuenta utiliza inicio de sesión con Google (OAuth). No requiere restablecer contraseña local.');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expires = new Date();
  expires.setHours(expires.getHours() + 1); // Token expira en 1 hora (RF-05)

  await userRepository.updateUserResetToken(user.id, resetToken, expires);

  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendMail({
    to: email,
    subject: 'Recuperación de contraseña - SG Remesas',
    text: `Hola ${user.name},\n\nPara restablecer tu contraseña, haz clic en el siguiente enlace (expira en 1 hora): ${resetUrl}\n\nSi no solicitaste esto, ignora este correo.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e4e7; border-radius: 8px;">
        <h2 style="color: #1B3F72;">Recuperación de Contraseña</h2>
        <p>Hola <strong>${user.name}</strong>,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en SG Remesas. Haz clic en el botón de abajo para ingresar una nueva clave (el enlace expira en 1 hora):</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #E07A00; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Restablecer mi Contraseña</a>
        </p>
        <p style="color: #6b6375; font-size: 13px;">Si no solicitaste este cambio, ignora este correo. Tu contraseña actual no será modificada.</p>
        <hr style="border: 0; border-top: 1px solid #e5e4e7; margin: 20px 0;">
        <p style="font-size: 12px; color: #9ca3af;">Este es un correo automático. Por favor no respondas a este mensaje.</p>
      </div>
    `,
  });
}

/**
 * Restablece la contraseña de un usuario mediante el token de recuperación
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await userRepository.findUserByResetToken(token);
  if (!user) {
    throw new Error('El token de recuperación es inválido o ha expirado');
  }

  const passwordHash = await hashPassword(newPassword);
  
  // Guardar la nueva contraseña, desmarcar must_change_password (si aplica) y limpiar los tokens de reset
  await userRepository.updateUserPassword(user.id, passwordHash, false);
  await userRepository.updateUserResetToken(user.id, null, null);
}
