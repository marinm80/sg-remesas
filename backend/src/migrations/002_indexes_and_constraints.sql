-- Migración 002: Índices de base de datos y restricciones parciales
-- Generado: 2026-06-26

-- 1. Restricción UNIQUE parcial: Sólo una regla de comisiones activa por par de divisas (BR-21)
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_rules_active 
ON commission_rules(currency_from, currency_to) 
WHERE is_active = true;

-- 2. Índice de performance para resolución rápida de roles en inicio de sesión
CREATE INDEX IF NOT EXISTS idx_users_role_id 
ON users(role_id) 
WHERE deleted_at IS NULL;

-- 3. Índice para acelerar consulta de cuentas de un cliente específico
CREATE INDEX IF NOT EXISTS idx_accounts_client_id 
ON accounts(client_id) 
WHERE deleted_at IS NULL;

-- 4. Índice para enlazar transacciones con solicitudes de remesas/retiros
CREATE INDEX IF NOT EXISTS idx_transactions_client_request_id 
ON transactions(client_request_id);

-- 5. Índice para acelerar la bandeja de transacciones filtrada por estado y fecha
CREATE INDEX IF NOT EXISTS idx_transactions_status_created 
ON transactions(status, created_at DESC) 
WHERE deleted_at IS NULL;

-- 6. Índice para la generación rápida de reportes de incentivos por operador
CREATE INDEX IF NOT EXISTS idx_operator_commission_log_operator 
ON operator_commission_log(operator_id, created_at DESC);

-- 7. Índice para la bandeja de alertas AML pendientes del Auditor
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status 
ON compliance_alerts(status) 
WHERE status = 'pending';

-- 8. Índice para el badge de notificaciones no leídas de los usuarios
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) 
WHERE is_read = false;
