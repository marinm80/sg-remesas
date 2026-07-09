import * as complianceRepository from '../repositories/compliance.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import pool from '../config/db.js';

// Tasas de cambio fijas de respaldo ante caídas de la API (R-02 / D-06)
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1.0,
  MXN: 17.5,
  PEN: 3.7,
  COP: 4000.0,
  EUR: 0.92,
};

/**
 * Convierte un monto en cualquier divisa a su equivalente en USD
 */
export async function convertToUsd(amount: number, currency: string): Promise<number> {
  const currencyUpper = currency.toUpperCase();
  if (currencyUpper === 'USD') return amount;

  try {
    // Intentar consultar Frankfurter API
    const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currencyUpper}`);
    if (response.ok) {
      const data = await response.json();
      const rate = data.rates[currencyUpper];
      if (rate) {
        return amount / rate;
      }
    }
  } catch (error) {
    console.warn(`[AML] No se pudo conectar con Frankfurter API. Usando tasa de respaldo para ${currencyUpper}:`);
  }

  // Fallback si la API está caída
  const fallbackRate = FALLBACK_USD_RATES[currencyUpper] || 1.0;
  return amount / fallbackRate;
}

/**
 * Evalúa las reglas AML para una transacción y genera alertas si aplica (BR-35)
 */
export async function evaluateAmlRules(
  transactionId: string,
  clientId: string,
  amount: number,
  currency: string,
  beneficiaryId: string | null
): Promise<void> {
  try {
    const amountInUsd = await convertToUsd(amount, currency);

    // Obtener las reglas activas desde la BD
    const rules = await complianceRepository.getComplianceRules();
    const client = await userRepository.findUserById(clientId);

    if (!client) return;

    for (const rule of rules) {
      if (!rule.is_active) continue;

      // REGLA 1: Umbral de monto individual (threshold_amount)
      if (rule.code === 'threshold_amount') {
        const threshold = parseFloat(rule.threshold_amount_usd.toString());
        if (amountInUsd >= threshold) {
          console.warn(`[AML] Alerta activada: Transacción individual excede el umbral de $${threshold} USD`);
          await complianceRepository.createComplianceAlert({
            transaction_id: transactionId,
            client_id: clientId,
            rule_code: 'threshold_amount',
            triggered_amount_usd: amountInUsd,
          });
        }
      }

      // REGLA 2: Fraccionamiento / Estructuración (structuring)
      if (rule.code === 'structuring' && beneficiaryId) {
        const windowHours = rule.window_hours || 24;
        const thresholdSum = parseFloat(rule.threshold_amount_usd.toString());
        const targetCount = rule.transaction_count || 3;

        // Contar transacciones en las últimas N horas al mismo beneficiario
        const history = await complianceRepository.countBeneficiaryTransactionsInWindow(
          clientId,
          beneficiaryId,
          windowHours
        );

        // Sumamos la transacción actual que se acaba de completar
        const totalCount = history.count;
        const totalSumUsd = history.sum_usd;

        if (totalCount >= targetCount && totalSumUsd >= thresholdSum) {
          console.warn(`[AML] Alerta activada: Posible fraccionamiento detectado hacia beneficiario (${totalCount} txs en ${windowHours}h que suman $${totalSumUsd} USD)`);
          await complianceRepository.createComplianceAlert({
            transaction_id: transactionId,
            client_id: clientId,
            rule_code: 'structuring',
            triggered_amount_usd: totalSumUsd,
          });
        }
      }

      // REGLA 3: Primer envío de alto monto para cliente nuevo (new_client_high_value)
      if (rule.code === 'new_client_high_value') {
        const threshold = parseFloat(rule.threshold_amount_usd.toString());
        
        // Verificar si la cuenta fue creada hace menos de 30 días
        const clientCreatedAt = new Date(client.created_at);
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() - 30);

        const isNewClient = clientCreatedAt > limitDate;

        if (isNewClient && amountInUsd >= threshold) {
          console.warn(`[AML] Alerta activada: Cliente nuevo con primer envío de alto monto ($${amountInUsd} USD)`);
          await complianceRepository.createComplianceAlert({
            transaction_id: transactionId,
            client_id: clientId,
            rule_code: 'new_client_high_value',
            triggered_amount_usd: amountInUsd,
          });
        }
      }
    }
  } catch (error: any) {
    console.error('[AML] Error al evaluar reglas de cumplimiento:', error.message);
  }
}
