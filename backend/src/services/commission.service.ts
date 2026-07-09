import * as commissionRepository from '../repositories/commission.repository.js';

export interface CommissionCalculation {
  rateApplied: number; // Tasa decimal (ej. 0.0250 para 2.5%)
  commissionAmount: number; // Monto de la comisión en divisa origen
  additionalCharges: any[];
  totalCharged: number; // Monto bruto + comisión + adicionales
  currency: string; // Divisa origen de la transacción
}

/**
 * Calcula la comisión de manera automática basándose en las reglas activas o la configuración base (BR-17)
 */
export async function calculateCommission(
  amountSent: number,
  currencyFrom: string,
  currencyTo: string,
  additionalCharges: any[] = []
): Promise<CommissionCalculation> {
  const currencyFromUpper = currencyFrom.toUpperCase();
  const currencyToUpper = currencyTo.toUpperCase();

  let ratePercent = 0;
  let minFixedAmount = 0;

  // 1. Buscar regla activa para el par de divisas
  const activeRule = await commissionRepository.findActiveRuleByCurrencies(currencyFromUpper, currencyToUpper);

  if (activeRule) {
    ratePercent = parseFloat(activeRule.rate_percent.toString());
    minFixedAmount = parseFloat(activeRule.min_fixed_amount.toString());
  } else {
    // 2. Si no hay regla específica, usar valores por defecto de config (BR-17)
    const defaultPercentStr = await commissionRepository.getGlobalConfigValue('commission_default_percent');
    const defaultMinFixedStr = await commissionRepository.getGlobalConfigValue('commission_default_min_fixed');

    ratePercent = defaultPercentStr ? parseFloat(defaultPercentStr) : 0;
    minFixedAmount = defaultMinFixedStr ? parseFloat(defaultMinFixedStr) : 0;
  }

  // 3. Aplicar fórmula de comisión: MAX(monto * tasa_%, mínimo_fijo)
  const percentageAmount = amountSent * (ratePercent / 100);
  const commissionAmount = Math.max(percentageAmount, minFixedAmount);

  // 4. Sumar cargos adicionales (BR-20)
  let additionalChargesSum = 0;
  for (const charge of additionalCharges) {
    if (!charge.label || typeof charge.amount !== 'number' || charge.amount <= 0 || !charge.currency) {
      throw new Error('Formato de cargo adicional inválido (requiere label, amount > 0 y currency) (BR-20)');
    }
    // Nota: Asumimos que los cargos adicionales vienen en la misma moneda origen.
    // Si la moneda difiere, idealmente requeriría conversión, pero el PRD simplifica que se sumen en divisa origen.
    additionalChargesSum += parseFloat(charge.amount.toString());
  }

  // Redondear a 2 decimales para evitar problemas de flotantes
  const roundedCommission = Math.round(commissionAmount * 100) / 100;
  const roundedTotal = Math.round((amountSent + roundedCommission + additionalChargesSum) * 100) / 100;
  const rateAppliedDecimal = Math.round((ratePercent / 100) * 10000) / 10000;

  return {
    rateApplied: rateAppliedDecimal,
    commissionAmount: roundedCommission,
    additionalCharges,
    totalCharged: roundedTotal,
    currency: currencyFromUpper,
  };
}

/**
 * Valida si el snapshot enviado por el cliente coincide exactamente con las reglas vigentes en backend (BR-19)
 */
export async function validateCommissionSnapshot(
  amountSent: number,
  currencyFrom: string,
  currencyTo: string,
  additionalCharges: any[],
  clientSnapshot: {
    rateApplied: number;
    commissionAmount: number;
    totalCharged: number;
  }
): Promise<boolean> {
  const backendCalculation = await calculateCommission(amountSent, currencyFrom, currencyTo, additionalCharges);

  const isRateValid = Math.abs(backendCalculation.rateApplied - clientSnapshot.rateApplied) < 0.0001;
  const isCommissionValid = Math.abs(backendCalculation.commissionAmount - clientSnapshot.commissionAmount) < 0.01;
  const isTotalValid = Math.abs(backendCalculation.totalCharged - clientSnapshot.totalCharged) < 0.01;

  if (!isRateValid || !isCommissionValid || !isTotalValid) {
    console.warn('[Comisiones] Mismatch de comisión detectado entre frontend y backend:', {
      backend: backendCalculation,
      client: clientSnapshot,
    });
    return false;
  }

  return true;
}
