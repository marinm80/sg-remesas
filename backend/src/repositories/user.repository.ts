import pool from '../config/db.js';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  role_id: number;
  token_version: number;
  auth_provider: string;
  provider_id: string | null;
  commission_eligible: boolean;
  is_active: boolean;
  email_verified: boolean;
  email_verify_token: string | null;
  reset_token: string | null;
  reset_token_expires: Date | null;
  must_change_password: boolean;
  created_at: Date;
  deleted_at: Date | null;
  role_name?: string; // Nombre del rol resuelto por join
}

export interface ClientProfile {
  id: string;
  user_id: string;
  phone: string | null;
  country: string;
  address: string | null;
  kyc_level: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Crea un nuevo usuario en la base de datos
 */
export async function createUser(
  user: {
    name: string;
    email: string;
    password_hash: string | null;
    role_id: number;
    auth_provider?: string;
    provider_id?: string | null;
    email_verified?: boolean;
    email_verify_token?: string | null;
  },
  clientTx?: any
): Promise<User> {
  const { name, email, password_hash, role_id, auth_provider = 'local', provider_id = null, email_verified = false, email_verify_token = null } = user;
  
  const query = `
    INSERT INTO users (name, email, password_hash, role_id, auth_provider, provider_id, email_verified, email_verify_token)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *;
  `;
  const values = [name, email, password_hash, role_id, auth_provider, provider_id, email_verified, email_verify_token];
  
  const executor = clientTx || pool;
  const result = await executor.query(query, values);
  return result.rows[0];
}

/**
 * Crea un perfil de cliente asociado a un usuario
 */
export async function createClientProfile(
  profile: {
    user_id: string;
    phone?: string | null;
    country: string;
    address?: string | null;
    kyc_level?: number;
  },
  clientTx?: any
): Promise<ClientProfile> {
  const { user_id, phone = null, country, address = null, kyc_level = 0 } = profile;
  
  const query = `
    INSERT INTO client_profiles (user_id, phone, country, address, kyc_level)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const values = [user_id, phone, country, address, kyc_level];
  
  const executor = clientTx || pool;
  const result = await executor.query(query, values);
  return result.rows[0];
}

/**
 * Busca un usuario por su ID resolviendo el nombre de su rol
 */
export async function findUserById(id: string): Promise<User | null> {
  const query = `
    SELECT u.*, r.name as role_name 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = $1 AND u.deleted_at IS NULL;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Busca un usuario por su email resolviendo el nombre de su rol
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const query = `
    SELECT u.*, r.name as role_name 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.email = $1 AND u.deleted_at IS NULL;
  `;
  const result = await pool.query(query, [email]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Busca el perfil del cliente por el ID de usuario
 */
export async function findClientProfileByUserId(userId: string): Promise<ClientProfile | null> {
  const query = `
    SELECT * FROM client_profiles WHERE user_id = $1;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Actualiza el rol del usuario e incrementa token_version para invalidar JWTs activos (BR-24)
 */
export async function updateUserRole(userId: string, roleId: number): Promise<void> {
  const query = `
    UPDATE users 
    SET role_id = $1, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND deleted_at IS NULL;
  `;
  await pool.query(query, [roleId, userId]);
}

/**
 * Actualiza el estado de verificación de correo
 */
export async function updateUserEmailVerified(userId: string, emailVerified: boolean): Promise<void> {
  const query = `
    UPDATE users 
    SET email_verified = $1, email_verify_token = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2;
  `;
  await pool.query(query, [emailVerified, userId]);
}

/**
 * Busca usuario por token de verificación
 */
export async function findUserByVerifyToken(token: string): Promise<User | null> {
  const query = `
    SELECT * FROM users WHERE email_verify_token = $1 AND deleted_at IS NULL;
  `;
  const result = await pool.query(query, [token]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Guarda los tokens de restablecimiento de contraseña
 */
export async function updateUserResetToken(userId: string, token: string | null, expires: Date | null): Promise<void> {
  const query = `
    UPDATE users 
    SET reset_token = $1, reset_token_expires = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3;
  `;
  await pool.query(query, [token, expires, userId]);
}

/**
 * Busca usuario por token de recuperación activo
 */
export async function findUserByResetToken(token: string): Promise<User | null> {
  const query = `
    SELECT * FROM users 
    WHERE reset_token = $1 
      AND reset_token_expires > CURRENT_TIMESTAMP 
      AND deleted_at IS NULL;
  `;
  const result = await pool.query(query, [token]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Actualiza la contraseña de un usuario
 */
export async function updateUserPassword(userId: string, passwordHash: string, mustChange: boolean = false): Promise<void> {
  const query = `
    UPDATE users 
    SET password_hash = $1, must_change_password = $2, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3;
  `;
  await pool.query(query, [passwordHash, mustChange, userId]);
}

/**
 * Actualiza el nivel KYC de un cliente (BR-32)
 */
export async function updateKycLevel(userId: string, level: number): Promise<void> {
  const query = `
    UPDATE client_profiles 
    SET kyc_level = $1, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $2;
  `;
  await pool.query(query, [level, userId]);
}

/**
 * Lista todos los clientes registrados
 */
export async function listClients(): Promise<any[]> {
  const query = `
    SELECT u.id, u.name, u.email, u.is_active, cp.phone, cp.country, cp.address, cp.kyc_level, u.created_at
    FROM users u
    JOIN client_profiles cp ON u.id = cp.user_id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}
