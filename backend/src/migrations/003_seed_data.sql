-- Migración 003: Semilla de datos iniciales (Seed)
-- Generado: 2026-06-26

-- 1. Insertar roles de sistema
INSERT INTO roles (id, name, description, is_system, is_active) VALUES
(1, 'admin', 'Administrador general con control total del sistema', true, true),
(2, 'operador', 'Operador de caja y gestor de operaciones de remesas', true, true),
(3, 'auditor', 'Auditor de cumplimiento normativo y logs de auditoría', true, true),
(4, 'cliente', 'Cliente que solicita envíos de remesas y consulta sus cuentas', true, true)
ON CONFLICT (id) DO NOTHING;

-- Ajustar la secuencia de roles para evitar conflictos con SERIAL
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));

-- 2. Insertar catálogo de permisos
INSERT INTO permissions (code, description, module) VALUES
-- Módulo Transacciones
('transactions.view', 'Permite visualizar el historial de transacciones', 'transactions'),
('transactions.create', 'Permite registrar nuevas transacciones en el sistema', 'transactions'),
('transactions.status_change', 'Permite cambiar el estado de una transacción', 'transactions'),
('transactions.revert', 'Permite revertir una transacción completada', 'transactions'),

-- Módulo Clientes
('clients.view', 'Permite ver la lista de clientes registrados y sus detalles', 'clients'),
('clients.create', 'Permite registrar nuevos clientes', 'clients'),
('clients.edit', 'Permite editar datos de clientes', 'clients'),
('clients.kyc_review', 'Permite revisar y aprobar solicitudes KYC', 'clients'),

-- Módulo Reportes
('reports.view', 'Permite visualizar reportes del sistema', 'reports'),
('reports.export', 'Permite exportar reportes a formatos CSV y PDF', 'reports'),

-- Módulo Comisiones
('commissions.view', 'Permite visualizar reglas de comisiones', 'commissions'),
('commissions.edit', 'Permite configurar comisiones y tramos', 'commissions'),

-- Módulo Usuarios
('users.view', 'Permite ver usuarios internos del sistema', 'users'),
('users.create', 'Permite crear nuevos usuarios internos', 'users'),
('users.edit', 'Permite modificar datos de usuarios internos', 'users'),
('users.roles_manage', 'Permite crear y configurar roles y permisos', 'users'),

-- Módulo Auditoría
('audit.view', 'Permite visualizar el log de auditoría', 'audit'),

-- Módulo Tickets
('tickets.view', 'Permite ver los tickets de soporte', 'tickets'),
('tickets.create', 'Permite abrir un nuevo ticket de soporte', 'tickets'),
('tickets.reply', 'Permite responder mensajes de los tickets', 'tickets'),
('tickets.close', 'Permite resolver y cerrar tickets de soporte', 'tickets')
ON CONFLICT (code) DO NOTHING;

-- 3. Asociar permisos a roles (role_permissions)
-- Admin: Todos los permisos existentes
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

-- Operador: Gestión diaria de transacciones, clientes y soporte
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE code IN (
    'transactions.view', 'transactions.create', 'transactions.status_change', 'transactions.revert',
    'clients.view', 'clients.create', 'clients.edit',
    'tickets.view', 'tickets.create', 'tickets.reply', 'tickets.close'
)
ON CONFLICT DO NOTHING;

-- Auditor: Solo lectura de transacciones, clientes, reportes, auditoría y alertas AML
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE code IN (
    'transactions.view', 'clients.view',
    'reports.view', 'reports.export',
    'audit.view', 'tickets.view'
)
ON CONFLICT DO NOTHING;

-- Cliente: Acceso a sus transacciones, datos y tickets propios
INSERT INTO role_permissions (role_id, permission_id)
SELECT 4, id FROM permissions WHERE code IN (
    'transactions.view', 'clients.edit',
    'tickets.view', 'tickets.create', 'tickets.reply'
)
ON CONFLICT DO NOTHING;

-- 4. Crear usuario administrador inicial (contraseña por defecto: remesas_admin_2026)
INSERT INTO users (id, name, email, password_hash, role_id, email_verified, is_active) VALUES
('a0000000-0000-0000-0000-000000000001', 'Administrador General', 'admin@sgremesas.com', '$2b$12$1zO37/gnyzZ1TCyTNogFguABGdQg4/hNRw8ejyDXV68j9HxyfyjLu', 1, true, true)
ON CONFLICT (email) DO NOTHING;

-- Asociar el creador del rol admin al propio usuario administrador
UPDATE roles SET created_by = 'a0000000-0000-0000-0000-000000000001' WHERE id = 1;

-- 5. Crear reglas predefinidas de cumplimiento AML
INSERT INTO compliance_rules (code, description, threshold_amount_usd, window_hours, transaction_count, is_active) VALUES
('threshold_amount', 'Dispara alerta si una transacción individual es >= $3.000 USD', 3000.00, NULL, NULL, true),
('structuring', 'Dispara alerta por posible fraccionamiento de 3+ transacciones al mismo beneficiario en menos de 24h que sumen >= $2.000 USD', 2000.00, 24, 3, true),
('new_client_high_value', 'Dispara alerta si un cliente nuevo (< 30 días) realiza una transacción >= $1.500 USD', 1500.00, 720, NULL, true)
ON CONFLICT (code) DO NOTHING;

-- 6. Configuraciones globales del sistema (config)
INSERT INTO config (key, value) VALUES
('commission_default_percent', '2.50'),
('commission_default_min_fixed', '3.00'),
('commission_default_min_fixed_currency', 'USD'),
('kyc0_max_monthly_usd', '500.00'),
('kyc0_max_single_usd', '200.00'),
('kyc1_max_monthly_usd', '5000.00'),
('kyc1_max_single_usd', '1500.00')
ON CONFLICT (key) DO NOTHING;
