-- Migracion 007: Reparar reservas de solicitudes pendientes creadas antes del bloqueo de saldo.
-- Completa originAccountId/reservedAmount cuando se puede identificar la cuenta por cliente, nombre y moneda.

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS reserved_balance DECIMAL(15,2) DEFAULT 0.00 NOT NULL;

ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

WITH matched_requests AS (
    SELECT
        cr.id AS request_id,
        a.id AS account_id,
        a.name AS account_name
    FROM client_requests cr
    JOIN accounts a
      ON a.client_id = cr.client_id
     AND a.name = cr.destination_account_info->>'originAccountName'
     AND a.currency = cr.currency
     AND a.deleted_at IS NULL
    WHERE cr.status IN ('pending', 'processing')
      AND NULLIF(cr.destination_account_info->>'originAccountId', '') IS NULL
)
UPDATE client_requests cr
SET destination_account_info =
    cr.destination_account_info
    || jsonb_build_object(
        'originAccountId', matched_requests.account_id,
        'originAccountName', matched_requests.account_name,
        'originAccountCurrency', cr.currency,
        'reservedAmount', COALESCE((cr.destination_account_info->>'reservedAmount')::decimal, cr.amount),
        'requestedAmount', cr.amount
    ),
    updated_at = CURRENT_TIMESTAMP
FROM matched_requests
WHERE cr.id = matched_requests.request_id;

UPDATE accounts
SET reserved_balance = 0.00,
    updated_at = CURRENT_TIMESTAMP;

WITH pending_reservations AS (
    SELECT
        (destination_account_info->>'originAccountId')::uuid AS account_id,
        SUM(COALESCE((destination_account_info->>'reservedAmount')::decimal, amount)) AS total_reserved
    FROM client_requests
    WHERE status IN ('pending', 'processing')
      AND NULLIF(destination_account_info->>'originAccountId', '') IS NOT NULL
    GROUP BY (destination_account_info->>'originAccountId')::uuid
)
UPDATE accounts a
SET reserved_balance = LEAST(a.balance, pending_reservations.total_reserved),
    updated_at = CURRENT_TIMESTAMP
FROM pending_reservations
WHERE a.id = pending_reservations.account_id;
