-- Migracion 009: Permitir que auditores controlen transacciones en revision.
-- El auditor puede enviar a auditoria, aprobar, declinar y revertir segun el flujo operativo.

ALTER TABLE compliance_alerts
    ALTER COLUMN transaction_id DROP NOT NULL;

ALTER TABLE compliance_alerts
    ADD COLUMN IF NOT EXISTS client_request_id UUID REFERENCES client_requests(id) ON DELETE CASCADE;

INSERT INTO compliance_rules (code, description, threshold_amount_usd, window_hours, transaction_count, is_active)
VALUES (
    'manual_review',
    'Caso enviado manualmente a auditoria desde operaciones para revision AML/PLD.',
    0.01,
    NULL,
    NULL,
    true
)
ON CONFLICT (code) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS ux_compliance_alerts_manual_transaction_pending
ON compliance_alerts(transaction_id, rule_code)
WHERE transaction_id IS NOT NULL AND status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS ux_compliance_alerts_manual_request_pending
ON compliance_alerts(client_request_id, rule_code)
WHERE client_request_id IS NOT NULL AND status = 'pending';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
    'transactions.view',
    'transactions.create',
    'transactions.status_change',
    'transactions.revert',
    'audit.view'
)
WHERE r.name = 'auditor'
ON CONFLICT DO NOTHING;
