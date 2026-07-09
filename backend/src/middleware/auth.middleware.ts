import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/crypto.js';
import { findUserById } from '../repositories/user.repository.js';
import pool from '../config/db.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role_id: number;
    role_name: string;
    token_version: number;
  };
  permissions?: string[];
}

/**
 * Middleware para validar la autenticación mediante JWT (Access Token)
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer TOKEN

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Token de acceso ausente' });
    return;
  }

  try {
    const decoded = verifyAccessToken(token);
    
    // Buscar el usuario en la BD para verificar token_version (BR-24)
    const user = await findUserById(decoded.id);
    
    if (!user) {
      res.status(401).json({ status: 'error', message: 'Usuario no encontrado o eliminado' });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({ status: 'error', message: 'La cuenta de usuario está desactivada' });
      return;
    }

    // Si la versión del token no coincide, se fuerza el cierre de sesión (BR-24)
    if (user.token_version !== decoded.token_version) {
      res.status(401).json({ status: 'error', message: 'Token de sesión expirado por cambio de rol o contraseña' });
      return;
    }

    // Adjuntar el usuario al objeto request (cast a any)
    (req as any).user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name || '',
      token_version: user.token_version,
    };

    next();
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Token de acceso inválido o vencido' });
  }
}

/**
 * Middleware para verificar permisos dinámicos (RBAC) (RF-32)
 */
export function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ status: 'error', message: 'No autenticado' });
      return;
    }

    // BR-23: El rol 'admin' tiene todos los permisos y no puede reducirse
    if (user.role_name === 'admin') {
      return next();
    }

    try {
      // Consultar dinámicamente si el rol del usuario tiene asignado el permiso
      const query = `
        SELECT count(rp.permission_id) as has_permission
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1 AND p.code = $2;
      `;
      const result = await pool.query(query, [user.role_id, permissionCode]);
      const hasPermission = parseInt(result.rows[0].has_permission) > 0;

      if (!hasPermission) {
        res.status(403).json({
          status: 'error',
          message: `Acceso denegado: Se requiere el permiso '${permissionCode}'`,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[RBAC] Error al verificar permisos:', err);
      res.status(500).json({ status: 'error', message: 'Error interno de autorización' });
    }
  };
}
