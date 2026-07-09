import pool from '../config/db.js';

export interface KycDocument {
  id: string;
  client_id: string;
  level_requested: number;
  document_type: string;
  file_url: string;
  status: string; // pending/approved/rejected/correction_needed
  reviewed_by: string | null;
  reviewer_comment: string | null;
  submitted_at: Date;
  reviewed_at: Date | null;
}

/**
 * Registra la subida de un documento KYC
 */
export async function uploadKycDocument(doc: {
  client_id: string;
  level_requested: number;
  document_type: string;
  file_url: string;
}): Promise<KycDocument> {
  const { client_id, level_requested, document_type, file_url } = doc;
  
  const query = `
    INSERT INTO kyc_documents (client_id, level_requested, document_type, file_url, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *;
  `;
  const result = await pool.query(query, [client_id, level_requested, document_type, file_url]);
  return result.rows[0];
}

/**
 * Busca un documento por su ID
 */
export async function findKycDocumentById(id: string): Promise<KycDocument | null> {
  const query = `
    SELECT * FROM kyc_documents WHERE id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Lista todas las solicitudes KYC pendientes (para operador/admin/auditor)
 */
export async function findPendingKycDocuments(): Promise<any[]> {
  const query = `
    SELECT d.*, u.name as client_name, u.email as client_email
    FROM kyc_documents d
    JOIN users u ON d.client_id = u.id
    WHERE d.status = 'pending'
    ORDER BY d.submitted_at ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Lista todos los documentos KYC de un cliente
 */
export async function findKycDocumentsByClientId(clientId: string): Promise<KycDocument[]> {
  const query = `
    SELECT * FROM kyc_documents WHERE client_id = $1 ORDER BY submitted_at DESC;
  `;
  const result = await pool.query(query, [clientId]);
  return result.rows;
}

/**
 * Actualiza el estado de revisión de un documento KYC
 */
export async function updateKycDocumentStatus(
  id: string,
  status: string,
  reviewedBy: string,
  comment: string | null
): Promise<void> {
  const query = `
    UPDATE kyc_documents 
    SET status = $1, reviewed_by = $2, reviewer_comment = $3, reviewed_at = CURRENT_TIMESTAMP
    WHERE id = $4;
  `;
  await pool.query(query, [status, reviewedBy, comment, id]);
}

/**
 * Registra un hito en el historial de cambios de nivel KYC del cliente (BR-32)
 */
export async function createKycHistory(history: {
  client_id: string;
  previous_level: number;
  new_level: number;
  action: string;
  performed_by: string;
  comment: string | null;
}): Promise<void> {
  const { client_id, previous_level, new_level, action, performed_by, comment } = history;
  
  const query = `
    INSERT INTO kyc_history (client_id, previous_level, new_level, action, performed_by, comment)
    VALUES ($1, $2, $3, $4, $5, $6);
  `;
  const values = [client_id, previous_level, new_level, action, performed_by, comment];
  await pool.query(query, values);
}

/**
 * Obtiene el historial completo KYC de un cliente
 */
export async function findKycHistoryByClientId(clientId: string): Promise<any[]> {
  const query = `
    SELECT h.*, u.name as reviewer_name
    FROM kyc_history h
    LEFT JOIN users u ON h.performed_by = u.id
    WHERE h.client_id = $1
    ORDER BY h.created_at DESC;
  `;
  const result = await pool.query(query, [clientId]);
  return result.rows;
}
