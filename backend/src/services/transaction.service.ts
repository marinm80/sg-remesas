import pool from '../config/db.js';
import type { PoolClient } from 'pg';
import * as transactionRepository from '../repositories/transaction.repository.js';
import * as accountRepository from '../repositories/account.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import * as amlService from './aml.service.js';
import * as incentiveService from './incentive.service.js';
import * as notificationService from './notification.service.js';
import * as commissionService from './commission.service.js';

/**
 * Obtiene el volumen transaccionado acumulado por un cliente en el mes calendario actual (en USD)
 */
export async function getClientMonthlyVolumeUsd(clientId: string, clientTx?: PoolClient): Promise<number> {
  const query = `
    SELECT COALESCE(SUM(t.amount / t.exchange_rate), 0.00) as monthly_volume_usd
    FROM transactions t
    JOIN accounts ao ON t.account_origin_id = ao.id
    WHERE ao.client_id = $1
      AND t.status IN ('completed', 'processing', 'pending')
      AND t.deleted_at IS NULL
      AND t.created_at >= DATE_TRUNC('month', CURRENT_DATE);
  `;
  const executor = clientTx || pool;
  const result = await executor.query(query, [clientId]);
  return parseFloat(result.rows[0].monthly_volume_usd);
}

/**
 * Genera un código de seguimiento único para transacciones (ej: REM-2026-XF83A)
 */
export function generateTrackingCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const year = new Date().getFullYear();
  return `REM-${year}-${rand}`;
}

export interface TransactionPreviewInput {
  clientId: string;
  type: string; // remesa/retiro/cobro/transfer
  amount: number; // monto enviado
  currencyFrom: string;
  currencyTo: string;
  additionalCharges?: any[];
}

/**
 * Genera la vista previa de la transacción calculando la comisión y validando límites KYC
 */
export async function previewTransaction(input: TransactionPreviewInput): Promise<any> {
  const { clientId, type, amount, currencyFrom, currencyTo, additionalCharges = [] } = input;

  // 1. Obtener datos de perfil del cliente
  const profile = await userRepository.findClientProfileByUserId(clientId);
  if (!profile) {
    throw new Error('No se encontró el perfil del cliente para evaluar límites KYC');
  }

  // 2. Convertir monto a USD para validación KYC
  const amountInUsd = await amlService.convertToUsd(amount, currencyFrom);

  // 3. Evaluar límites KYC (BR-30)
  const kycLevel = profile.kyc_level; // 0, 1 o 2
  
  // Limites por nivel
  let singleLimitUsd = Infinity;
  let monthlyLimitUsd = Infinity;

  if (kycLevel === 0) {
    singleLimitUsd = 200;
    monthlyLimitUsd = 500;
  } else if (kycLevel === 1) {
    singleLimitUsd = 1500;
    monthlyLimitUsd = 5000;
  }

  // Límite de transacción única
  if (amountInUsd > singleLimitUsd) {
    throw new Error(`Monto excede el límite por transacción para nivel KYC-${kycLevel} ($${singleLimitUsd} USD)`);
  }

  // Límite acumulado mensual
  const currentMonthlyVolume = await getClientMonthlyVolumeUsd(clientId);
  if (currentMonthlyVolume + amountInUsd > monthlyLimitUsd) {
    const availableMonthly = Math.max(0, monthlyLimitUsd - currentMonthlyVolume);
    throw new Error(`Monto excede el límite mensual acumulado para nivel KYC-${kycLevel}. Disponible: $${availableMonthly.toFixed(2)} USD.`);
  }

  // 4. Calcular comisión
  const commissionCalc = await commissionService.calculateCommission(amount, currencyFrom, currencyTo, additionalCharges);

  // 5. Consultar tasa de cambio actual desde Frankfurter API o fallback
  let exchangeRate = 1.0;
  if (currencyFrom.toUpperCase() !== currencyTo.toUpperCase()) {
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${currencyFrom.toUpperCase()}&to=${currencyTo.toUpperCase()}`);
      if (response.ok) {
        const data = await response.json();
        exchangeRate = data.rates[currencyTo.toUpperCase()] || 1.0;
      } else {
        // Fallback aproximado
        const usdRateFrom = await amlService.convertToUsd(1.0, currencyFrom);
        const usdRateTo = await amlService.convertToUsd(1.0, currencyTo);
        exchangeRate = usdRateTo / usdRateFrom;
      }
    } catch {
      // Fallback
      const usdRateFrom = await amlService.convertToUsd(1.0, currencyFrom);
      const usdRateTo = await amlService.convertToUsd(1.0, currencyTo);
      exchangeRate = usdRateTo / usdRateFrom;
    }
  }

  return {
    amount,
    currencyFrom,
    currencyTo,
    exchangeRate,
    convertedAmount: Math.round(amount * exchangeRate * 100) / 100,
    commissionRateApplied: commissionCalc.rateApplied,
    commissionAmount: commissionCalc.commissionAmount,
    additionalCharges: commissionCalc.additionalCharges,
    totalCharged: commissionCalc.totalCharged,
    kycLevel,
    kycLimitRemainingUsd: Math.max(0, monthlyLimitUsd - (currentMonthlyVolume + amountInUsd)),
  };
}

export interface CreateTransactionInput {
  type: string; // remesa/retiro/cobro/transfer
  accountOriginId: string | null;
  accountDestinationId: string | null;
  amount: number;
  currency: string;
  exchangeRate?: number;
  beneficiaryId?: string | null;
  beneficiarySnapshot?: any | null;
  reference?: string | null;
  notes?: string | null;
  clientRequestId?: string | null;
  commissionSnapshot: {
    rateApplied: number;
    commissionAmount: number;
    totalCharged: number;
  };
  createdBy: string; // ID del operador/admin o cliente
}

/**
 * Crea una transacción de manera atómica, aplicando reglas de comisiones y saldos (ACID)
 */
export async function executeTransaction(input: CreateTransactionInput): Promise<transactionRepository.Transaction> {
  const {
    type,
    accountOriginId,
    accountDestinationId,
    amount,
    currency,
    exchangeRate = 1.0,
    beneficiaryId = null,
    beneficiarySnapshot = null,
    reference = null,
    notes = null,
    clientRequestId = null,
    commissionSnapshot,
    createdBy,
  } = input;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener y bloquear cuentas involucradas (FOR UPDATE) para prevenir race conditions
    let originAccount: any = null;
    let destinationAccount: any = null;
    let clientId: string | null = null;

    if (accountOriginId) {
      originAccount = await accountRepository.findAccountByIdForUpdate(accountOriginId, client);
      if (!originAccount) throw new Error('La cuenta de origen no existe');
      if (!originAccount.is_active) throw new Error('La cuenta de origen está inactiva (BR-05)');
      if (originAccount.currency.toUpperCase() !== currency.toUpperCase()) {
        throw new Error('La divisa de la cuenta de origen no coincide con la transacción');
      }
      clientId = originAccount.client_id;
    }

    if (accountDestinationId) {
      destinationAccount = await accountRepository.findAccountByIdForUpdate(accountDestinationId, client);
      if (!destinationAccount) throw new Error('La cuenta de destino no existe');
      if (!destinationAccount.is_active) throw new Error('La cuenta de destino está inactiva (BR-05)');
      clientId = clientId || destinationAccount.client_id;
    }

    // 2. Si el creador o dueño es cliente, validar límites KYC (BR-30)
    if (clientId) {
      const profile = await userRepository.findClientProfileByUserId(clientId);
      if (!profile) throw new Error('No se encontró el perfil del cliente');
      
      const amountInUsd = await amlService.convertToUsd(amount, currency);
      const kycLevel = profile.kyc_level;

      let singleLimitUsd = Infinity;
      let monthlyLimitUsd = Infinity;

      if (kycLevel === 0) {
        singleLimitUsd = 200;
        monthlyLimitUsd = 500;
      } else if (kycLevel === 1) {
        singleLimitUsd = 1500;
        monthlyLimitUsd = 5000;
      }

      if (amountInUsd > singleLimitUsd) {
        throw new Error(`El monto excede el límite unitario por transacción para el nivel KYC-${kycLevel} ($${singleLimitUsd} USD)`);
      }

      const currentMonthlyVolume = await getClientMonthlyVolumeUsd(clientId, client);
      if (currentMonthlyVolume + amountInUsd > monthlyLimitUsd) {
        throw new Error(`El monto excede el límite mensual acumulado para el nivel KYC-${kycLevel} ($${monthlyLimitUsd} USD)`);
      }
    }

    // 3. Validar consistencia matemática de comisiones (BR-19)
    // El total cargado es: amount + commissionAmount + (suma de cargos adicionales)
    const isCommissionValid = await commissionService.validateCommissionSnapshot(
      amount,
      currency,
      destinationAccount ? destinationAccount.currency : currency,
      [], // Asumimos cargos adicionales vacíos en creación directa si no se especifican
      commissionSnapshot
    );

    if (!isCommissionValid) {
      throw new Error('Discrepancia en el cálculo de comisión entre el cliente y el servidor (BR-19)');
    }

    // 4. Validar saldo suficiente en cuenta origen (BR-01)
    // Se debita el monto total cobrado (monto + comisión)
    const totalToDebit = commissionSnapshot.totalCharged;
    if (originAccount) {
      const originBalance = parseFloat(originAccount.balance.toString());
      if (originBalance < totalToDebit) {
        throw new Error(`Saldo insuficiente en cuenta origen (BR-01). Saldo: ${originBalance}, Requerido: ${totalToDebit}`);
      }

      // Descontar saldo de origen
      const newOriginBalance = Math.round((originBalance - totalToDebit) * 100) / 100;
      await accountRepository.updateAccountBalance(originAccount.id, newOriginBalance, client);
    }

    // 5. Incrementar saldo en cuenta destino (monto convertido según tipo de cambio)
    const convertedAmount = Math.round(amount * exchangeRate * 100) / 100;
    if (destinationAccount) {
      const destBalance = parseFloat(destinationAccount.balance.toString());
      const newDestBalance = Math.round((destBalance + convertedAmount) * 100) / 100;
      await accountRepository.updateAccountBalance(destinationAccount.id, newDestBalance, client);
    }

    // 6. Registrar la transacción
    const trackingCode = generateTrackingCode();
    const transaction = await transactionRepository.createTransaction(
      {
        type,
        account_origin_id: accountOriginId,
        account_destination_id: accountDestinationId,
        amount,
        currency,
        exchange_rate: exchangeRate,
        beneficiary_id: beneficiaryId,
        beneficiary_snapshot: beneficiarySnapshot,
        reference,
        tracking_code: trackingCode,
        status: 'completed', // Se crea directamente completada
        notes: notes || 'Transacción completada exitosamente',
        client_request_id: clientRequestId,
        commission_rate_applied: commissionSnapshot.rateApplied,
        commission_amount: commissionSnapshot.commissionAmount,
        additional_charges: [],
        total_charged: totalToDebit,
        created_by: createdBy,
      },
      client
    );

    // 7. Si hay una solicitud de cliente, marcarla como completada
    if (clientRequestId) {
      await client.query(
        "UPDATE client_requests SET status = 'completed', processed_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [createdBy, clientRequestId]
      );
    }

    // 8. Escribir log de estados inicial
    await client.query(
      `INSERT INTO transaction_status_log (transaction_id, previous_status, new_status, changed_by, notes)
       VALUES ($1, NULL, 'completed', $2, $3)`,
      [transaction.id, createdBy, notes || 'Registro inicial completado']
    );

    // 9. Calcular e ingresar incentivos de operadores si el creador es operador y califica
    const creatorUser = await userRepository.findUserById(createdBy);
    if (creatorUser && creatorUser.role_name === 'operador') {
      await incentiveService.calculateAndLogOperatorIncentive(
        transaction.id,
        createdBy,
        amount,
        currency,
        client
      );
    }

    await client.query('COMMIT');

    // 10. Evaluar reglas AML de manera asíncrona tras confirmar la transacción (BR-35)
    // No bloquea la transacción pero dispara alertas
    if (clientId) {
      // Ejecutamos en segundo plano
      amlService.evaluateAmlRules(transaction.id, clientId, amount, currency, beneficiaryId)
        .catch(err => console.error('[AML Async Error]', err.message));
    }

    // Enviar notificación al cliente
    if (clientId) {
      await notificationService.createNotification({
        user_id: clientId,
        type: 'transaction_status',
        title: 'Remesa Completada',
        body: `Tu remesa con código ${trackingCode} por ${amount} ${currency} ha sido procesada.`,
        entity_type: 'transaction',
        entity_id: transaction.id
      }).catch(err => console.error('[Notification Async Error]', err.message));
    }

    return transaction;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Revierte una transacción completada de forma atómica (BR-02, BR-29)
 */
export async function revertTransaction(transactionId: string, revertedBy: string, notes: string): Promise<any> {
  if (!notes) {
    throw new Error('Comentario obligatorio explicativo es requerido para la reversión (BR-07)');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener la transacción original y bloquearla
    const originalTx = await transactionRepository.findTransactionByIdForUpdate(transactionId, client);
    if (!originalTx) {
      throw new Error('La transacción no existe');
    }
    if (originalTx.status !== 'completed') {
      throw new Error('Solo se pueden revertir transacciones con estado completado');
    }

    // 2. Bloquear cuentas involucradas
    let originAccount: any = null;
    let destinationAccount: any = null;

    if (originalTx.account_origin_id) {
      originAccount = await accountRepository.findAccountByIdForUpdate(originalTx.account_origin_id, client);
    }
    if (originalTx.account_destination_id) {
      destinationAccount = await accountRepository.findAccountByIdForUpdate(originalTx.account_destination_id, client);
    }

    // 3. Validar saldos en reversión:
    // La reversión resta del destino y suma al origen.
    // Debemos verificar si el destino tiene saldo suficiente para devolver lo depositado.
    const amountToDeductDest = parseFloat(originalTx.amount.toString()) * parseFloat(originalTx.exchange_rate.toString());
    
    if (destinationAccount) {
      const destBalance = parseFloat(destinationAccount.balance.toString());
      if (destBalance < amountToDeductDest) {
        throw new Error(`Saldo insuficiente en la cuenta destino para proceder con la reversión. Disponible: ${destBalance}, Requerido: ${amountToDeductDest}`);
      }

      // Restar saldo de destino
      const newDestBalance = Math.round((destBalance - amountToDeductDest) * 100) / 100;
      await accountRepository.updateAccountBalance(destinationAccount.id, newDestBalance, client);
    }

    // Devolver saldo al origen
    const amountToReturnOrigin = parseFloat(originalTx.total_charged.toString()); // Se devuelve monto enviado + comisiones cobradas
    if (originAccount) {
      const originBalance = parseFloat(originAccount.balance.toString());
      const newOriginBalance = Math.round((originBalance + amountToReturnOrigin) * 100) / 100;
      await accountRepository.updateAccountBalance(originAccount.id, newOriginBalance, client);
    }

    // 4. Crear la transacción espejo
    const trackingCode = `REV-${originalTx.tracking_code}`;
    const mirrorTx = await transactionRepository.createTransaction(
      {
        type: 'reversal',
        account_origin_id: originalTx.account_destination_id, // Invertido
        account_destination_id: originalTx.account_origin_id, // Invertido
        amount: originalTx.amount,
        currency: originalTx.currency,
        exchange_rate: originalTx.exchange_rate,
        beneficiary_id: originalTx.beneficiary_id,
        beneficiary_snapshot: originalTx.beneficiary_snapshot,
        reference: `Reversión de ${originalTx.tracking_code}`,
        tracking_code: trackingCode,
        status: 'completed',
        notes: `Espejo de reversión para ${originalTx.tracking_code}. Motivo: ${notes}`,
        client_request_id: originalTx.client_request_id,
        commission_rate_applied: originalTx.commission_rate_applied,
        commission_amount: -originalTx.commission_amount, // Signo opuesto
        additional_charges: [],
        total_charged: -originalTx.total_charged, // Signo opuesto
        created_by: revertedBy,
      },
      client
    );

    // 5. Actualizar el estado de la transacción original a 'reversed' (BR-02, BR-07)
    await transactionRepository.updateTransactionStatus(
      originalTx.id,
      'reversed',
      'completed',
      revertedBy,
      `Transacción revertida mediante espejo ${trackingCode}. Motivo: ${notes}`,
      client
    );

    // 6. Aplicar ajuste negativo de incentivos al operador original (BR-29)
    await incentiveService.adjustOperatorIncentiveForReversal(originalTx.id, client);

    await client.query('COMMIT');

    // Notificar al dueño
    const clientId = originAccount ? originAccount.client_id : (destinationAccount ? destinationAccount.client_id : null);
    if (clientId) {
      await notificationService.createNotification({
        user_id: clientId,
        type: 'transaction_status',
        title: 'Transacción Revertida',
        body: `La transacción ${originalTx.tracking_code} ha sido revertida por el administrador/operador.`,
        entity_type: 'transaction',
        entity_id: originalTx.id
      }).catch(err => console.error('[Notification Async Error]', err.message));
    }

    return { originalTxId: originalTx.id, mirrorTxId: mirrorTx.id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
