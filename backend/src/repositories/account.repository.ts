import pool from '../config/db.js';
import type { PoolClient } from 'pg';

export interface Account {
  id: string;
  name: string;
  type: string; // bank/digital/cash
  currency: string;
  balance: number;
  reserved_balance: number;
  available_balance: number;
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
    WITH pending_reservations AS (
      SELECT
        COALESCE(
          NULLIF(destination_account_info->>'originAccountId', '')::uuid,
          matched_account.id
        ) AS account_id,
        SUM(COALESCE((destination_account_info->>'reservedAmount')::decimal, amount)) AS total_reserved
      FROM client_requests
      LEFT JOIN accounts matched_account
        ON matched_account.client_id = client_requests.client_id
       AND matched_account.name = destination_account_info->>'originAccountName'
       AND matched_account.currency = client_requests.currency
       AND matched_account.deleted_at IS NULL
      WHERE status IN ('pending', 'processing')
        AND (
          NULLIF(destination_account_info->>'originAccountId', '') IS NOT NULL
          OR matched_account.id IS NOT NULL
        )
      GROUP BY COALESCE(NULLIF(destination_account_info->>'originAccountId', '')::uuid, matched_account.id)
    )
    SELECT
      a.*,
      GREATEST(a.reserved_balance, COALESCE(pr.total_reserved, 0)) AS reserved_balance,
      a.balance - GREATEST(a.reserved_balance, COALESCE(pr.total_reserved, 0)) AS available_balance
    FROM accounts a
    LEFT JOIN pending_reservations pr ON pr.account_id = a.id
    WHERE a.id = $1 AND a.deleted_at IS NULL;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Busca una cuenta por su ID utilizando un cliente de transacción específico para concurrencia / bloqueo
 */
export async function findAccountByIdForUpdate(id: string, client: any): Promise<Account | null> {
  const query = `
    WITH pending_reservations AS (
      SELECT
        COALESCE(
          NULLIF(destination_account_info->>'originAccountId', '')::uuid,
          matched_account.id
        ) AS account_id,
        SUM(COALESCE((destination_account_info->>'reservedAmount')::decimal, amount)) AS total_reserved
      FROM client_requests
      LEFT JOIN accounts matched_account
        ON matched_account.client_id = client_requests.client_id
       AND matched_account.name = destination_account_info->>'originAccountName'
       AND matched_account.currency = client_requests.currency
       AND matched_account.deleted_at IS NULL
      WHERE status IN ('pending', 'processing')
        AND (
          NULLIF(destination_account_info->>'originAccountId', '') IS NOT NULL
          OR matched_account.id IS NOT NULL
        )
      GROUP BY COALESCE(NULLIF(destination_account_info->>'originAccountId', '')::uuid, matched_account.id)
    )
    SELECT
      a.*,
      GREATEST(a.reserved_balance, COALESCE(pr.total_reserved, 0)) AS reserved_balance,
      a.balance - GREATEST(a.reserved_balance, COALESCE(pr.total_reserved, 0)) AS available_balance
    FROM accounts a
    LEFT JOIN pending_reservations pr ON pr.account_id = a.id
    WHERE a.id = $1 AND a.deleted_at IS NULL
    FOR UPDATE OF a;
  `;
  const result = await client.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Obtiene todas las cuentas de un cliente específico
 */
export async function findAccountsByClientId(clientId: string): Promise<Account[]> {
  const query = `
    WITH pending_reservations AS (
      SELECT
        COALESCE(
          NULLIF(destination_account_info->>'originAccountId', '')::uuid,
          matched_account.id
        ) AS account_id,
        SUM(COALESCE((destination_account_info->>'reservedAmount')::decimal, amount)) AS total_reserved
      FROM client_requests
      LEFT JOIN accounts matched_account
        ON matched_account.client_id = client_requests.client_id
       AND matched_account.name = destination_account_info->>'originAccountName'
       AND matched_account.currency = client_requests.currency
       AND matched_account.deleted_at IS NULL
      WHERE status IN ('pending', 'processing')
        AND (
          NULLIF(destination_account_info->>'originAccountId', '') IS NOT NULL
          OR matched_account.id IS NOT NULL
        )
      GROUP BY COALESCE(NULLIF(destination_account_info->>'originAccountId', '')::uuid, matched_account.id)
    )
    SELECT
      a.*,
      GREATEST(a.reserved_balance, COALESCE(pr.total_reserved, 0)) AS reserved_balance,
      a.balance - GREATEST(a.reserved_balance, COALESCE(pr.total_reserved, 0)) AS available_balance
    FROM accounts a
    LEFT JOIN pending_reservations pr ON pr.account_id = a.id
    WHERE a.client_id = $1 AND a.deleted_at IS NULL
    ORDER BY a.created_at DESC;
  `;
  const result = await pool.query(query, [clientId]);
  return result.rows;
}

/**
 * Obtiene todas las cuentas del sistema (internas y de clientes)
 */
export async function findAllAccounts(): Promise<any[]> {
  const query = `
    WITH pending_reservations AS (
      SELECT
        COALESCE(
          NULLIF(destination_account_info->>'originAccountId', '')::uuid,
          matched_account.id
        ) AS account_id,
        SUM(COALESCE((destination_account_info->>'reservedAmount')::decimal, amount)) AS total_reserved
      FROM client_requests
      LEFT JOIN accounts matched_account
        ON matched_account.client_id = client_requests.client_id
       AND matched_account.name = destination_account_info->>'originAccountName'
       AND matched_account.currency = client_requests.currency
       AND matched_account.deleted_at IS NULL
      WHERE status IN ('pending', 'processing')
        AND (
          NULLIF(destination_account_info->>'originAccountId', '') IS NOT NULL
          OR matched_account.id IS NOT NULL
        )
      GROUP BY COALESCE(NULLIF(destination_account_info->>'originAccountId', '')::uuid, matched_account.id)
    )
    SELECT
      a.*,
      GREATEST(a.reserved_balance, COALESCE(pr.total_reserved, 0)) AS reserved_balance,
      a.balance - GREATEST(a.reserved_balance, COALESCE(pr.total_reserved, 0)) AS available_balance,
      u.name as client_name,
      u.email as client_email
    FROM accounts a
    LEFT JOIN pending_reservations pr ON pr.account_id = a.id
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
 * Ajusta el saldo reservado de una cuenta dentro de una transacciÃ³n.
 * Usa una guarda para evitar reservas negativas o mayores al saldo total.
 */
export async function adjustReservedBalance(
  id: string,
  delta: number,
  clientTx?: PoolClient
): Promise<void> {
  const query = `
    UPDATE accounts
    SET reserved_balance = reserved_balance + $1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
      AND reserved_balance + $1 >= 0
      AND balance - (reserved_balance + $1) >= 0;
  `;
  const executor = clientTx || pool;
  const result = await executor.query(query, [delta, id]);
  if (result.rowCount === 0) {
    throw new Error('No hay saldo disponible suficiente para actualizar la reserva de la cuenta.');
  }
}

/**
 * Libera saldo reservado sin fallar si la reserva materializada quedÃ³ desfasada.
 * Las consultas de cuentas recalculan la reserva efectiva desde solicitudes pendientes.
 */
export async function releaseReservedBalance(
  id: string,
  amount: number,
  clientTx?: PoolClient
): Promise<void> {
  const query = `
    UPDATE accounts
    SET reserved_balance = GREATEST(reserved_balance - $1, 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $2;
  `;
  const executor = clientTx || pool;
  await executor.query(query, [amount, id]);
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
