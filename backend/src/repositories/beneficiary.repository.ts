import pool from '../config/db.js';

export interface Beneficiary {
  id: string;
  client_id: string;
  name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  country: string;
  currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * Crea un beneficiario en la libreta de direcciones del cliente
 */
export async function createBeneficiary(beneficiary: {
  client_id: string;
  name: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  country: string;
  currency: string;
}): Promise<Beneficiary> {
  const { client_id, name, bank_name, account_number, account_type, country, currency } = beneficiary;
  
  const query = `
    INSERT INTO beneficiaries (client_id, name, bank_name, account_number, account_type, country, currency)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [client_id, name, bank_name, account_number, account_type, country.toUpperCase(), currency.toUpperCase()];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Busca un beneficiario por ID (con control de privacidad de cliente BR-33)
 */
export async function findBeneficiaryById(id: string): Promise<Beneficiary | null> {
  const query = `
    SELECT * FROM beneficiaries WHERE id = $1 AND deleted_at IS NULL;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Obtiene la lista de beneficiarios de un cliente específico
 */
export async function findBeneficiariesByClientId(clientId: string): Promise<Beneficiary[]> {
  const query = `
    SELECT * FROM beneficiaries 
    WHERE client_id = $1 AND deleted_at IS NULL
    ORDER BY name ASC;
  `;
  const result = await pool.query(query, [clientId]);
  return result.rows;
}

/**
 * Actualiza los datos de un beneficiario
 */
export async function updateBeneficiary(
  id: string,
  beneficiary: {
    name: string;
    bank_name: string;
    account_number: string;
    account_type: string;
    country: string;
    currency: string;
  }
): Promise<void> {
  const { name, bank_name, account_number, account_type, country, currency } = beneficiary;
  
  const query = `
    UPDATE beneficiaries 
    SET name = $1, bank_name = $2, account_number = $3, account_type = $4, country = $5, currency = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7 AND deleted_at IS NULL;
  `;
  const values = [name, bank_name, account_number, account_type, country.toUpperCase(), currency.toUpperCase(), id];
  await pool.query(query, values);
}

/**
 * Borrado lógico de un beneficiario (soft delete)
 */
export async function softDeleteBeneficiary(id: string): Promise<void> {
  const query = `
    UPDATE beneficiaries 
    SET deleted_at = CURRENT_TIMESTAMP, is_active = false
    WHERE id = $1;
  `;
  await pool.query(query, [id]);
}
