import pool from '../config/db.js';
import type { PoolClient } from 'pg';

export interface ClientRequest {
  id: string;
  client_id: string;
  type: string; // remesa/retiro
  amount: number;
  currency: string;
  destination_account_info: any;
  beneficiary: any;
  notes: string | null;
  status: string; // pending/processing/completed/rejected
  processed_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Crea una nueva solicitud de remesa o retiro por parte de un cliente
 */
export async function createRequest(req: {
  client_id: string;
  type: string;
  amount: number;
  currency: string;
  destination_account_info: any;
  beneficiary: any;
  notes?: string | null;
}, clientTx?: PoolClient): Promise<ClientRequest> {
  const { client_id, type, amount, currency, destination_account_info, beneficiary, notes = null } = req;
  
  const query = `
    INSERT INTO client_requests (client_id, type, amount, currency, destination_account_info, beneficiary, notes)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [
    client_id,
    type,
    amount,
    currency.toUpperCase(),
    JSON.stringify(destination_account_info),
    JSON.stringify(beneficiary),
    notes,
  ];
  
  const executor = clientTx || pool;
  const result = await executor.query(query, values);
  return result.rows[0];
}

/**
 * Busca una solicitud por su ID
 */
export async function findRequestById(id: string): Promise<any | null> {
  const query = `
    SELECT cr.*, u.name as client_name, u.email as client_email
    FROM client_requests cr
    JOIN users u ON cr.client_id = u.id
    WHERE cr.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Busca una solicitud por ID bloqueando la fila dentro de una transacciÃ³n.
 */
export async function findRequestByIdForUpdate(id: string, clientTx: PoolClient): Promise<any | null> {
  const query = `
    SELECT cr.*, u.name as client_name, u.email as client_email
    FROM client_requests cr
    JOIN users u ON cr.client_id = u.id
    WHERE cr.id = $1
    FOR UPDATE;
  `;
  const result = await clientTx.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Obtiene las solicitudes creadas por un cliente específico
 */
export async function findRequestsByClientId(clientId: string): Promise<ClientRequest[]> {
  const query = `
    SELECT * FROM client_requests 
    WHERE client_id = $1
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [clientId]);
  return result.rows;
}

/**
 * Obtiene todas las solicitudes del sistema filtrables por estado (para Operador/Admin)
 */
export async function findAllRequests(status?: string): Promise<any[]> {
  let query = `
    SELECT cr.*, u.name as client_name, u.email as client_email, p.kyc_level
    FROM client_requests cr
    JOIN users u ON cr.client_id = u.id
    LEFT JOIN client_profiles p ON u.id = p.user_id
  `;
  const values: any[] = [];
  
  if (status) {
    query += ` WHERE cr.status = $1`;
    values.push(status);
  }
  
  query += ` ORDER BY cr.created_at DESC;`;
  
  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Actualiza el estado de una solicitud
 */
export async function updateRequestStatus(
  id: string,
  status: string,
  processedBy: string,
  clientTx?: PoolClient
): Promise<void> {
  const query = `
    UPDATE client_requests
    SET status = $1, processed_by = $2, updated_at = CURRENT_TIMESTAMP
    WHERE id = $3;
  `;
  const executor = clientTx || pool;
  await executor.query(query, [status, processedBy, id]);
}
