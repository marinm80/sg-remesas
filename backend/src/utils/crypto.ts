import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_secret_key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_jwt_refresh_secret_key';

/**
 * Cifra una contraseña de texto plano usando bcryptjs
 */
export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 12);
}

/**
 * Compara una contraseña en texto plano contra su hash cifrado
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

/**
 * Genera un Access Token JWT de corta duración
 */
export function generateAccessToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: (process.env.JWT_EXPIRATION || '15m') as any });
}

/**
 * Genera un Refresh Token JWT de larga duración
 */
export function generateRefreshToken(payload: object): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as any });
}

/**
 * Verifica y decodifica un Access Token JWT
 */
export function verifyAccessToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Verifica y decodifica un Refresh Token JWT
 */
export function verifyRefreshToken(token: string): any {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
