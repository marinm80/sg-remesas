-- Migracion 006: Reserva de saldo para solicitudes pendientes
-- Permite bloquear saldo al crear una solicitud y liberarlo/confirmarlo segun el flujo.

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS reserved_balance DECIMAL(15,2) DEFAULT 0.00 NOT NULL;

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

UPDATE accounts
SET reserved_balance = 0.00
WHERE reserved_balance IS NULL;

WITH pending_reservations AS (
    SELECT
        (destination_account_info->>'originAccountId')::uuid AS account_id,
        SUM(COALESCE((destination_account_info->>'reservedAmount')::decimal, amount)) AS total_reserved
    FROM client_requests
    WHERE status IN ('pending', 'processing')
      AND destination_account_info ? 'originAccountId'
    GROUP BY (destination_account_info->>'originAccountId')::uuid
)
UPDATE accounts a
SET reserved_balance = LEAST(a.balance, pending_reservations.total_reserved),
    updated_at = CURRENT_TIMESTAMP
FROM pending_reservations
WHERE a.id = pending_reservations.account_id;
