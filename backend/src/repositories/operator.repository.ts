import pool from '../config/db.js';

export interface OperatorTier {
  id: number;
  operator_id: string | null; // NULL para tramo global
  min_amount_usd: number;
  max_amount_usd: number | null;
  rate_percent: number;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Crea un nuevo tramo de comisión (global o personalizado de operador)
 */
export async function createOperatorTier(tier: {
  operator_id?: string | null;
  min_amount_usd: number;
  max_amount_usd?: number | null;
  rate_percent: number;
  created_by?: string | null;
}): Promise<OperatorTier> {
  const { operator_id = null, min_amount_usd, max_amount_usd = null, rate_percent, created_by = null } = tier;
  
  const query = `
    INSERT INTO operator_commission_tiers (operator_id, min_amount_usd, max_amount_usd, rate_percent, is_active, created_by)
    VALUES ($1, $2, $3, $4, true, $5)
    RETURNING *;
  `;
  const values = [operator_id, min_amount_usd, max_amount_usd, rate_percent, created_by];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Obtiene los tramos activos específicos para un operador
 */
export async function findTiersByOperatorId(operatorId: string): Promise<OperatorTier[]> {
  const query = `
    SELECT * FROM operator_commission_tiers 
    WHERE operator_id = $1 AND is_active = true 
    ORDER BY min_amount_usd ASC;
  `;
  const result = await pool.query(query, [operatorId]);
  return result.rows;
}

/**
 * Obtiene los tramos activos globales del sistema
 */
export async function findGlobalTiers(): Promise<OperatorTier[]> {
  const query = `
    SELECT * FROM operator_commission_tiers 
    WHERE operator_id IS NULL AND is_active = true 
    ORDER BY min_amount_usd ASC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Desactiva un tramo de comisión
 */
export async function deactivateOperatorTier(id: number): Promise<void> {
  const query = `
    UPDATE operator_commission_tiers 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1;
  `;
  await pool.query(query, [id]);
}

/**
 * Registra una entrada de incentivo en el log del operador.
 * Admite cliente transaccional opcional.
 */
export async function createOperatorCommissionLog(
  log: {
    transaction_id: string;
    operator_id: string;
    transaction_amount_usd: number;
    tier_id: number | null;
    rate_percent_applied: number;
    commission_amount_usd: number;
    adjustment_ref_id?: number | null;
  },
  clientTx?: any
): Promise<number> {
  const { transaction_id, operator_id, transaction_amount_usd, tier_id, rate_percent_applied, commission_amount_usd, adjustment_ref_id = null } = log;
  
  const query = `
    INSERT INTO operator_commission_log (
      transaction_id, operator_id, transaction_amount_usd, tier_id, 
      rate_percent_applied, commission_amount_usd, adjustment_ref_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id;
  `;
  const values = [transaction_id, operator_id, transaction_amount_usd, tier_id, rate_percent_applied, commission_amount_usd, adjustment_ref_id];
  const executor = clientTx || pool;
  const result = await executor.query(query, values);
  return result.rows[0].id;
}

/**
 * Busca log de comisión de operador de una transacción
 */
export async function findOperatorCommissionLogByTxId(transactionId: string): Promise<any | null> {
  const query = `
    SELECT * FROM operator_commission_log WHERE transaction_id = $1;
  `;
  const result = await pool.query(query, [transactionId]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Genera el reporte de incentivos por operador en un periodo de tiempo (RF-36)
 */
export async function getOperatorCommissionReport(startDate: string, endDate: string): Promise<any[]> {
  const query = `
    SELECT 
      u.id as operator_id,
      u.name as operator_name,
      u.email as operator_email,
      COUNT(log.id) as transactions_count,
      COALESCE(SUM(log.transaction_amount_usd), 0.00) as total_processed_usd,
      COALESCE(AVG(log.rate_percent_applied), 0.00) as avg_rate_applied,
      COALESCE(SUM(log.commission_amount_usd), 0.00) as total_commission_to_pay
    FROM users u
    JOIN operator_commission_log log ON u.id = log.operator_id
    WHERE log.created_at >= $1 AND log.created_at <= $2
    GROUP BY u.id, u.name, u.email
    ORDER BY total_commission_to_pay DESC;
  `;
  const result = await pool.query(query, [startDate, endDate]);
  return result.rows;
}
