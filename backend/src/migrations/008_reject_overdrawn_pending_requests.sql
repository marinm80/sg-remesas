-- Migracion 008: Rechazar solicitudes pendientes que exceden el saldo de su cuenta origen.
-- Mantiene las solicitudes mas antiguas que caben en el saldo y rechaza las que dejarian la cuenta negativa.

WITH request_accounts AS (
    SELECT
        cr.id,
        cr.created_at,
        cr.amount,
        cr.destination_account_info,
        COALESCE(
            NULLIF(cr.destination_account_info->>'originAccountId', '')::uuid,
            a.id
        ) AS account_id,
        COALESCE((cr.destination_account_info->>'reservedAmount')::decimal, cr.amount) AS reserved_amount
    FROM client_requests cr
    LEFT JOIN accounts a
      ON a.client_id = cr.client_id
     AND a.name = cr.destination_account_info->>'originAccountName'
     AND a.currency = cr.currency
     AND a.deleted_at IS NULL
    WHERE cr.status IN ('pending', 'processing')
),
ranked_requests AS (
    SELECT
        request_accounts.*,
        accounts.balance,
        SUM(request_accounts.reserved_amount) OVER (
            PARTITION BY request_accounts.account_id
            ORDER BY request_accounts.created_at ASC, request_accounts.id ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS cumulative_reserved
    FROM request_accounts
    JOIN accounts ON accounts.id = request_accounts.account_id
),
overdrawn_requests AS (
    SELECT *
    FROM ranked_requests
    WHERE cumulative_reserved > balance
)
UPDATE client_requests cr
SET status = 'rejected',
    notes = CONCAT_WS(E'\n', cr.notes, 'Rechazada automaticamente: saldo insuficiente en la cuenta origen para mantener la solicitud pendiente.'),
    updated_at = CURRENT_TIMESTAMP
FROM overdrawn_requests
WHERE cr.id = overdrawn_requests.id;

UPDATE accounts
SET reserved_balance = 0.00,
    updated_at = CURRENT_TIMESTAMP;

WITH pending_reservations AS (
    SELECT
        COALESCE(
            NULLIF(cr.destination_account_info->>'originAccountId', '')::uuid,
            a.id
        ) AS account_id,
        SUM(COALESCE((cr.destination_account_info->>'reservedAmount')::decimal, cr.amount)) AS total_reserved
    FROM client_requests cr
    LEFT JOIN accounts a
      ON a.client_id = cr.client_id
     AND a.name = cr.destination_account_info->>'originAccountName'
     AND a.currency = cr.currency
     AND a.deleted_at IS NULL
    WHERE cr.status IN ('pending', 'processing')
    GROUP BY COALESCE(NULLIF(cr.destination_account_info->>'originAccountId', '')::uuid, a.id)
)
UPDATE accounts a
SET reserved_balance = LEAST(a.balance, pending_reservations.total_reserved),
    updated_at = CURRENT_TIMESTAMP
FROM pending_reservations
WHERE a.id = pending_reservations.account_id;
