import pool from '../config/db.js';

export interface ComplianceRule {
  id: number;
  code: string;
  description: string | null;
  threshold_amount_usd: number;
  window_hours: number | null;
  transaction_count: number | null;
  is_active: boolean;
  updated_by: string | null;
  updated_at: Date;
}

export interface ComplianceAlert {
  id: string;
  transaction_id: string | null;
  client_request_id: string | null;
  client_id: string;
  rule_code: string;
  triggered_amount_usd: number;
  status: string; // pending/reviewed/dismissed
  reviewed_by: string | null;
  reviewer_comment: string | null;
  created_at: Date;
  reviewed_at: Date | null;
}

/**
 * Obtiene todas las reglas de cumplimiento AML configuradas (RF-44)
 */
export async function getComplianceRules(): Promise<ComplianceRule[]> {
  const query = `
    SELECT * FROM compliance_rules ORDER BY id ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Actualiza la regla de cumplimiento AML en el panel de administración
 */
export async function updateComplianceRule(
  id: number,
  rule: {
    threshold_amount_usd: number;
    window_hours: number | null;
    transaction_count: number | null;
    is_active: boolean;
    updated_by: string;
  }
): Promise<void> {
  const { threshold_amount_usd, window_hours, transaction_count, is_active, updated_by } = rule;
  
  const query = `
    UPDATE compliance_rules 
    SET threshold_amount_usd = $1, 
        window_hours = $2, 
        transaction_count = $3, 
        is_active = $4, 
        updated_by = $5, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $6;
  `;
  const values = [threshold_amount_usd, window_hours, transaction_count, is_active, updated_by, id];
  await pool.query(query, values);
}

/**
 * Crea una alerta de lavado de dinero asociada a una transacción
 */
export async function createComplianceAlert(alert: {
  transaction_id?: string | null;
  client_request_id?: string | null;
  client_id: string;
  rule_code: string;
  triggered_amount_usd: number;
}): Promise<void> {
  const { transaction_id = null, client_request_id = null, client_id, rule_code, triggered_amount_usd } = alert;
  
  const query = `
    INSERT INTO compliance_alerts (transaction_id, client_request_id, client_id, rule_code, triggered_amount_usd, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    ON CONFLICT DO NOTHING;
  `;
  await pool.query(query, [transaction_id, client_request_id, client_id, rule_code, triggered_amount_usd]);
}

/**
 * Cuenta la cantidad de transacciones completadas hacia un beneficiario en una ventana de horas (para fraccionamiento)
 */
export async function countBeneficiaryTransactionsInWindow(
  clientId: string,
  beneficiaryId: string | null,
  windowHours: number
): Promise<{ count: number; sum_usd: number }> {
  // Calculamos la suma normalizada en USD usando el tipo de cambio de la transacción
  const query = `
    SELECT COUNT(t.id) as count, COALESCE(SUM(t.amount / t.exchange_rate), 0.00) as sum_usd
    FROM transactions t
    LEFT JOIN accounts ao ON t.account_origin_id = ao.id
    WHERE ao.client_id = $1 
      AND t.beneficiary_id = $2
      AND t.status = 'completed'
      AND t.created_at >= NOW() - INTERVAL '1 hour' * $3;
  `;
  
  // Si beneficiary_id es nulo, no evaluamos fraccionamiento específico
  if (!beneficiaryId) return { count: 0, sum_usd: 0 };
  
  const result = await pool.query(query, [clientId, beneficiaryId, windowHours]);
  return {
    count: parseInt(result.rows[0].count),
    sum_usd: parseFloat(result.rows[0].sum_usd)
  };
}

/**
 * Retorna las alertas pendientes para el badge e interfaz del auditor (RF-43)
 */
export async function findPendingComplianceAlerts(): Promise<any[]> {
  const query = `
    SELECT a.*, 
           u.name as client_name, u.email as client_email,
           t.tracking_code,
           COALESCE(t.amount, cr.amount) as tx_amount,
           COALESCE(t.currency, cr.currency) as tx_currency,
           cr.type as request_type
    FROM compliance_alerts a
    JOIN users u ON a.client_id = u.id
    LEFT JOIN transactions t ON a.transaction_id = t.id
    LEFT JOIN client_requests cr ON a.client_request_id = cr.id
    WHERE a.status = 'pending'
    ORDER BY a.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Lista todas las alertas AML del sistema con filtros
 */
export async function listAllComplianceAlerts(filters: {
  status?: string;
  ruleCode?: string;
  clientEmail?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { status, ruleCode, clientEmail, limit = 20, offset = 0 } = filters;
  
  let query = `
    SELECT a.*, 
           u.name as client_name, u.email as client_email,
           t.tracking_code,
           COALESCE(t.amount, cr.amount) as tx_amount,
           COALESCE(t.currency, cr.currency) as tx_currency,
           cr.type as request_type,
           cr.destination_account_info,
           cr.beneficiary,
           cr.status as request_status,
           t.status as transaction_status,
           auditor.name as reviewer_name
    FROM compliance_alerts a
    JOIN users u ON a.client_id = u.id
    LEFT JOIN transactions t ON a.transaction_id = t.id
    LEFT JOIN client_requests cr ON a.client_request_id = cr.id
    LEFT JOIN users auditor ON a.reviewed_by = auditor.id
    WHERE 1=1
  `;
  
  const values: any[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND a.status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (ruleCode) {
    query += ` AND a.rule_code = $${paramIndex}`;
    values.push(ruleCode);
    paramIndex++;
  }

  if (clientEmail) {
    query += ` AND u.email = $${paramIndex}`;
    values.push(clientEmail);
    paramIndex++;
  }

  query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
}

export async function findComplianceAlertById(id: string): Promise<any | null> {
  const query = `
    SELECT a.*,
           t.status as transaction_status,
           t.type as transaction_type,
           t.amount as transaction_amount,
           t.currency as transaction_currency,
           t.account_origin_id,
           t.account_destination_id,
           t.beneficiary_id,
           t.beneficiary_snapshot,
           t.exchange_rate,
           t.commission_rate_applied,
           t.commission_amount,
           t.total_charged,
           cr.status as request_status,
           cr.type as request_type,
           cr.amount as request_amount,
           cr.currency as request_currency,
           cr.destination_account_info,
           cr.beneficiary
    FROM compliance_alerts a
    LEFT JOIN transactions t ON a.transaction_id = t.id
    LEFT JOIN client_requests cr ON a.client_request_id = cr.id
    WHERE a.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Resuelve una alerta AML por parte del auditor/administrador (RF-43)
 */
export async function reviewComplianceAlert(
  id: string,
  status: string,
  reviewedBy: string,
  comment: string
): Promise<void> {
  const query = `
    UPDATE compliance_alerts 
    SET status = $1, 
        reviewed_by = $2, 
        reviewer_comment = $3, 
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = $4;
  `;
  await pool.query(query, [status, reviewedBy, comment, id]);
}
