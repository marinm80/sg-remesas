import pool from '../config/db.js';
import type { PoolClient } from 'pg';

export interface Account {
  id: string;
  name: string;
  type: string; // bank/digital/cash
  currency: string;
  balance: number;
  client_id: string | null; // null = cuenta interna de la empresa
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  deleted_at: Date | null;
}

/**
 * Crea una nueva cuenta (interna o de cliente)
 */
export async function createAccount(account: {
  name: string;
  type: string;
  currency: string;
  balance?: number;
  client_id?: string | null;
  created_by?: string | null;
}): Promise<Account> {
  const { name, type, currency, balance = 0.00, client_id = null, created_by = null } = account;
  
  const query = `
    INSERT INTO accounts (name, type, currency, balance, client_id, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const values = [name, type, currency, balance, client_id, created_by];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Busca una cuenta por su ID
 */
export async function findAccountById(id: string): Promise<Account | null> {
  const query = `
    SELECT * FROM accounts WHERE id = $1 AND deleted_at IS NULL;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Busca una cuenta por su ID utilizando un cliente de transacción específico para concurrencia / bloqueo
 */
export async function findAccountByIdForUpdate(id: string, client: any): Promise<Account | null> {
  const query = `
    SELECT * FROM accounts WHERE id = $1 AND deleted_at IS NULL FOR UPDATE;
  `;
  const result = await client.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Obtiene todas las cuentas de un cliente específico
 */
export async function findAccountsByClientId(clientId: string): Promise<Account[]> {
  const query = `
    SELECT * FROM accounts 
    WHERE client_id = $1 AND deleted_at IS NULL
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [clientId]);
  return result.rows;
}

/**
 * Obtiene todas las cuentas del sistema (internas y de clientes)
 */
export async function findAllAccounts(): Promise<any[]> {
  const query = `
    SELECT a.*, u.name as client_name, u.email as client_email
    FROM accounts a
    LEFT JOIN users u ON a.client_id = u.id
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Actualiza el saldo de una cuenta. 
 * Soporta un cliente de transacción opcional para garantizar atomicidad ACID.
 */
export async function updateAccountBalance(
  id: string, 
  newBalance: number, 
  clientTx?: PoolClient
): Promise<void> {
  const query = `
    UPDATE accounts 
    SET balance = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2;
  `;
  const executor = clientTx || pool;
  await executor.query(query, [newBalance, id]);
}

/**
 * Actualiza el estado activo/inactivo de una cuenta
 */
export async function updateAccountStatus(id: string, isActive: boolean): Promise<void> {
  const query = `
    UPDATE accounts 
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2;
  `;
  await pool.query(query, [isActive, id]);
}

/**
 * Realiza un borrado lógico (soft delete) de una cuenta
 */
export async function softDeleteAccount(id: string): Promise<void> {
  const query = `
    UPDATE accounts 
    SET deleted_at = CURRENT_TIMESTAMP, is_active = false
    WHERE id = $1;
  `;
  await pool.query(query, [id]);
}
