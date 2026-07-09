import { convertToUsd } from './aml.service.js';
import * as operatorRepository from '../repositories/operator.repository.js';
import * as userRepository from '../repositories/user.repository.js';

/**
 * Calcula y registra el incentivo por transacción para un operador de manera atómica (BR-26, BR-27, BR-28)
 */
export async function calculateAndLogOperatorIncentive(
  transactionId: string,
  operatorId: string,
  amount: number,
  currency: string,
  clientTx: any
): Promise<void> {
  try {
    // 1. Verificar si el operador es elegible para comisiones
    const operator = await userRepository.findUserById(operatorId);
    if (!operator || !operator.commission_eligible) {
      return; // No elegible
    }

    // 2. Normalizar el monto de la transacción a USD
    const transactionAmountUsd = await convertToUsd(amount, currency);

    // 3. Buscar los tramos aplicables (primero personalizados, luego globales) (BR-26)
    let tiers = await operatorRepository.findTiersByOperatorId(operatorId);
    if (tiers.length === 0) {
      tiers = await operatorRepository.findGlobalTiers();
    }

    if (tiers.length === 0) {
      return; // No hay tramos activos configurados
    }

    // 4. Identificar el tramo correspondiente al monto
    // BR-27: El monto mínimo por defecto para incentivar es $100 USD
    let matchedTier: operatorRepository.OperatorTier | null = null;
    for (const tier of tiers) {
      const minAmount = parseFloat(tier.min_amount_usd.toString());
      const maxAmount = tier.max_amount_usd ? parseFloat(tier.max_amount_usd.toString()) : null;

      if (transactionAmountUsd >= minAmount && (maxAmount === null || transactionAmountUsd < maxAmount)) {
        matchedTier = tier;
        break;
      }
    }

    if (!matchedTier) {
      return; // El monto no entra en ningún tramo (ej. < $100 USD)
    }

    // 5. Calcular el incentivo sobre el monto bruto normalizado a USD (BR-28)
    const ratePercent = parseFloat(matchedTier.rate_percent.toString());
    const commissionAmountUsd = transactionAmountUsd * (ratePercent / 100);

    const roundedCommission = Math.round(commissionAmountUsd * 100) / 100;
    const ratePercentDecimal = Math.round((ratePercent / 100) * 10000) / 10000;

    // 6. Registrar en el log de comisiones de operadores
    await operatorRepository.createOperatorCommissionLog(
      {
        transaction_id: transactionId,
        operator_id: operatorId,
        transaction_amount_usd: transactionAmountUsd,
        tier_id: matchedTier.id,
        rate_percent_applied: ratePercentDecimal,
        commission_amount_usd: roundedCommission,
      },
      clientTx
    );
    
    console.log(`[Incentivos] Comisión de $${roundedCommission} USD registrada para Operador ${operator.name} (Tasa: ${ratePercent}%)`);
  } catch (error: any) {
    console.error('[Incentivos] Error al registrar incentivo de operador:', error.message);
  }
}

/**
 * Anula o ajusta negativamente un incentivo registrado si la transacción es revertida (BR-29)
 */
export async function adjustOperatorIncentiveForReversal(
  transactionId: string,
  clientTx: any
): Promise<void> {
  try {
    const originalLog = await operatorRepository.findOperatorCommissionLogByTxId(transactionId);
    if (!originalLog) return; // No generó comisión original

    // Registrar contracargo negativo para trazabilidad
    await operatorRepository.createOperatorCommissionLog(
      {
        transaction_id: transactionId,
        operator_id: originalLog.operator_id,
        transaction_amount_usd: originalLog.transaction_amount_usd,
        tier_id: originalLog.tier_id,
        rate_percent_applied: originalLog.rate_percent_applied,
        commission_amount_usd: -originalLog.commission_amount_usd, // Monto negativo
        adjustment_ref_id: originalLog.id,
      },
      clientTx
    );
    
    console.log(`[Incentivos] Ajuste por reversión de -$${originalLog.commission_amount_usd} USD registrado para Operador ID ${originalLog.operator_id}`);
  } catch (error: any) {
    console.error('[Incentivos] Error al revertir incentivo de operador:', error.message);
  }
}
