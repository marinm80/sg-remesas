import pool from '../config/db.js';

export interface CommissionRule {
  id: number;
  currency_from: string;
  currency_to: string;
  rate_percent: number;
  min_fixed_amount: number;
  min_fixed_currency: string;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Crea una nueva regla de comisiones
 */
export async function createCommissionRule(rule: {
  currency_from: string;
  currency_to: string;
  rate_percent: number;
  min_fixed_amount: number;
  min_fixed_currency: string;
  created_by?: string | null;
}): Promise<CommissionRule> {
  const { currency_from, currency_to, rate_percent, min_fixed_amount, min_fixed_currency, created_by = null } = rule;
  
  const query = `
    INSERT INTO commission_rules (currency_from, currency_to, rate_percent, min_fixed_amount, min_fixed_currency, is_active, created_by)
    VALUES ($1, $2, $3, $4, $5, true, $6)
    RETURNING *;
  `;
  const values = [currency_from.toUpperCase(), currency_to.toUpperCase(), rate_percent, min_fixed_amount, min_fixed_currency.toUpperCase(), created_by];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Busca una regla de comisión activa para un par específico de monedas (BR-17)
 */
export async function findActiveRuleByCurrencies(currencyFrom: string, currencyTo: string): Promise<CommissionRule | null> {
  const query = `
    SELECT * FROM commission_rules 
    WHERE currency_from = $1 AND currency_to = $2 AND is_active = true;
  `;
  const result = await pool.query(query, [currencyFrom.toUpperCase(), currencyTo.toUpperCase()]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Desactiva lógicamente una regla de comisión activa (BR-21)
 */
export async function deactivateRule(id: number): Promise<void> {
  const query = `
    UPDATE commission_rules 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1;
  `;
  await pool.query(query, [id]);
}

/**
 * Lista todas las reglas de comisiones configuradas (activas e inactivas)
 */
export async function listAllRules(): Promise<any[]> {
  const query = `
    SELECT r.*, u.name as creator_name
    FROM commission_rules r
    LEFT JOIN users u ON r.created_by = u.id
    ORDER BY r.is_active DESC, r.created_at DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Obtiene el valor de una clave de la configuración global
 */
export async function getGlobalConfigValue(key: string): Promise<string | null> {
  const query = `
    SELECT value FROM config WHERE key = $1;
  `;
  const result = await pool.query(query, [key]);
  return result.rows.length ? result.rows[0].value : null;
}

/**
 * Actualiza el valor de una clave de la configuración global
 */
export async function updateGlobalConfigValue(key: string, value: string, updatedBy: string): Promise<void> {
  const query = `
    INSERT INTO config (key, value, updated_by, updated_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO UPDATE 
    SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP;
  `;
  await pool.query(query, [key, value, updatedBy]);
}

/**
 * Retorna toda la configuración del sistema (config)
 */
export async function listGlobalConfig(): Promise<any[]> {
  const query = `
    SELECT c.*, u.name as updater_name
    FROM config c
    LEFT JOIN users u ON c.updated_by = u.id;
  `;
  const result = await pool.query(query);
  return result.rows;
}
