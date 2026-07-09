import pool from '../config/db.js';

export interface Transaction {
  id: string;
  type: string; // remesa/retiro/cobro/transfer
  account_origin_id: string | null;
  account_destination_id: string | null;
  amount: number;
  currency: string;
  exchange_rate: number;
  beneficiary_id: string | null;
  beneficiary_snapshot: any | null;
  reference: string | null;
  tracking_code: string;
  status: string; // pending/processing/completed/failed/reversed
  notes: string | null;
  client_request_id: string | null;
  commission_rate_applied: number;
  commission_amount: number;
  additional_charges: any[];
  total_charged: number;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface TransactionStatusLog {
  id: number;
  transaction_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  notes: string;
  changed_at: Date;
}

/**
 * Registra una nueva transacción en el sistema.
 * Admite cliente transaccional opcional para asegurar atomicidad.
 */
export async function createTransaction(
  tx: {
    type: string;
    account_origin_id?: string | null;
    account_destination_id?: string | null;
    amount: number;
    currency: string;
    exchange_rate?: number;
    beneficiary_id?: string | null;
    beneficiary_snapshot?: any | null;
    reference?: string | null;
    tracking_code: string;
    status?: string;
    notes?: string | null;
    client_request_id?: string | null;
    commission_rate_applied?: number;
    commission_amount?: number;
    additional_charges?: any;
    total_charged: number;
    created_by?: string | null;
  },
  clientTx?: any
): Promise<Transaction> {
  const {
    type,
    account_origin_id = null,
    account_destination_id = null,
    amount,
    currency,
    exchange_rate = 1.000000,
    beneficiary_id = null,
    beneficiary_snapshot = null,
    reference = null,
    tracking_code,
    status = 'pending',
    notes = null,
    client_request_id = null,
    commission_rate_applied = 0.0000,
    commission_amount = 0.00,
    additional_charges = [],
    total_charged,
    created_by = null
  } = tx;

  const query = `
    INSERT INTO transactions (
      type, account_origin_id, account_destination_id, amount, currency, 
      exchange_rate, beneficiary_id, beneficiary_snapshot, reference, tracking_code, 
      status, notes, client_request_id, commission_rate_applied, commission_amount, 
      additional_charges, total_charged, created_by
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING *;
  `;
  const values = [
    type, account_origin_id, account_destination_id, amount, currency,
    exchange_rate, beneficiary_id, JSON.stringify(beneficiary_snapshot), reference, tracking_code,
    status, notes, client_request_id, commission_rate_applied, commission_amount,
    JSON.stringify(additional_charges), total_charged, created_by
  ];

  const executor = clientTx || pool;
  const result = await executor.query(query, values);
  return result.rows[0];
}

/**
 * Busca una transacción por su ID, resolviendo los nombres de las cuentas origen y destino
 */
export async function findTransactionById(id: string): Promise<any | null> {
  const query = `
    SELECT t.*, 
           ao.name as account_origin_name, 
           ad.name as account_destination_name,
           u.name as creator_name
    FROM transactions t
    LEFT JOIN accounts ao ON t.account_origin_id = ao.id
    LEFT JOIN accounts ad ON t.account_destination_id = ad.id
    LEFT JOIN users u ON t.created_by = u.id
    WHERE t.id = $1 AND t.deleted_at IS NULL;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Busca una transacción por su ID con bloqueo FOR UPDATE dentro de una transacción
 */
export async function findTransactionByIdForUpdate(id: string, clientTx: any): Promise<Transaction | null> {
  const query = `
    SELECT * FROM transactions WHERE id = $1 AND deleted_at IS NULL FOR UPDATE;
  `;
  const result = await clientTx.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Busca una transacción por su código de seguimiento ( tracking_code )
 */
export async function findTransactionByTrackingCode(code: string): Promise<any | null> {
  const query = `
    SELECT status, created_at, amount, currency, tracking_code, type
    FROM transactions 
    WHERE tracking_code = $1 AND deleted_at IS NULL;
  `;
  const result = await pool.query(query, [code]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Actualiza el estado de una transacción e inserta el historial de log.
 * Debe ejecutarse dentro de un bloque transaccional clientTx (BR-07).
 */
export async function updateTransactionStatus(
  id: string,
  newStatus: string,
  previousStatus: string | null,
  changedBy: string | null,
  notes: string,
  clientTx: any
): Promise<void> {
  // 1. Actualizar el estado en la tabla de transacciones
  const updateQuery = `
    UPDATE transactions 
    SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3;
  `;
  await clientTx.query(updateQuery, [newStatus, notes, id]);

  // 2. Insertar en el log de auditoría de estados
  const logQuery = `
    INSERT INTO transaction_status_log (transaction_id, previous_status, new_status, changed_by, notes)
    VALUES ($1, $2, $3, $4, $5);
  `;
  await clientTx.query(logQuery, [id, previousStatus, newStatus, changedBy, notes]);
}

/**
 * Lista transacciones filtradas para el panel de administración/operador
 */
export async function listAllTransactions(filters: {
  clientId?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { clientId, status, type, startDate, endDate, limit = 20, offset = 0 } = filters;
  
  let query = `
    SELECT t.*, 
           ao.name as account_origin_name, 
           ad.name as account_destination_name,
           u.name as client_name,
           u.email as client_email,
           creator.name as creator_name
    FROM transactions t
    LEFT JOIN accounts ao ON t.account_origin_id = ao.id
    LEFT JOIN accounts ad ON t.account_destination_id = ad.id
    -- Si la cuenta origen o destino está vinculada a un cliente, resolvemos sus datos
    LEFT JOIN users u ON COALESCE(ao.client_id, ad.client_id) = u.id
    LEFT JOIN users creator ON t.created_by = creator.id
    WHERE t.deleted_at IS NULL
  `;
  
  const values: any[] = [];
  let paramIndex = 1;

  if (clientId) {
    query += ` AND (ao.client_id = $${paramIndex} OR ad.client_id = $${paramIndex})`;
    values.push(clientId);
    paramIndex++;
  }

  if (status) {
    query += ` AND t.status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (type) {
    query += ` AND t.type = $${paramIndex}`;
    values.push(type);
    paramIndex++;
  }

  if (startDate) {
    query += ` AND t.created_at >= $${paramIndex}`;
    values.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    query += ` AND t.created_at <= $${paramIndex}`;
    values.push(endDate);
    paramIndex++;
  }

  query += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Obtiene el historial de logs de estado de una transacción
 */
export async function getTransactionStatusHistory(transactionId: string): Promise<any[]> {
  const query = `
    SELECT l.*, u.name as changer_name, u.email as changer_email
    FROM transaction_status_log l
    LEFT JOIN users u ON l.changed_by = u.id
    WHERE l.transaction_id = $1
    ORDER BY l.changed_at DESC;
  `;
  const result = await pool.query(query, [transactionId]);
  return result.rows;
}
