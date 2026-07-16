-- Migracion 004: Datos demo para portfolio
-- Generado: 2026-07-16
--
-- Ejecutar despues de:
--   001_schema_init.sql
--   002_indexes_and_constraints.sql
--   003_seed_data.sql
--
-- Cuentas demo:
--   operador.demo@sgremesas.com / DemoOperator2026!
--   auditor.demo@sgremesas.com  / DemoAuditor2026!
--   maria.gonzalez@example.com  / DemoClient2026!
--   james.wilson@example.com    / DemoClient2026!
--   sofia.ramirez@example.com   / DemoClient2026!
--   carlos.mendoza@example.com  / DemoClient2026!
--   amina.hassan@example.com    / DemoClient2026!

BEGIN;

-- 1. Usuarios internos demo
INSERT INTO users (
    id, name, email, password_hash, role_id, auth_provider,
    commission_eligible, is_active, email_verified, must_change_password,
    created_at, updated_at
) VALUES
('b0000000-0000-0000-0000-000000000001', 'Laura Bennett', 'operador.demo@sgremesas.com', '$2b$12$G2IYaVAybjXrz9lWbXGbYuY9btIlHfFz5ej2yuha1c08lHPfQ4u7C', 2, 'local', true, true, true, false, CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('b0000000-0000-0000-0000-000000000002', 'Ricardo Silva', 'auditor.demo@sgremesas.com', '$2b$12$BHhsyC2nwStDQ54Lq8vk5OAa.ss7iVLMaD7BrbjOpC9Xlrr3aqwai', 3, 'local', false, true, true, false, CURRENT_TIMESTAMP - INTERVAL '88 days', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role_id = EXCLUDED.role_id,
    commission_eligible = EXCLUDED.commission_eligible,
    is_active = true,
    email_verified = true,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Clientes demo
INSERT INTO users (
    id, name, email, password_hash, role_id, auth_provider,
    commission_eligible, is_active, email_verified, must_change_password,
    created_at, updated_at
) VALUES
('c0000000-0000-0000-0000-000000000001', 'Maria Gonzalez', 'maria.gonzalez@example.com', '$2b$12$ChbG8ggCzyFN7CoW8bKm2e6YriN2HPcWPCkmmsupYEfkR/Za1YFqq', 4, 'local', false, true, true, false, CURRENT_TIMESTAMP - INTERVAL '72 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('c0000000-0000-0000-0000-000000000002', 'James Wilson', 'james.wilson@example.com', '$2b$12$ChbG8ggCzyFN7CoW8bKm2e6YriN2HPcWPCkmmsupYEfkR/Za1YFqq', 4, 'local', false, true, true, false, CURRENT_TIMESTAMP - INTERVAL '65 days', CURRENT_TIMESTAMP - INTERVAL '4 days'),
('c0000000-0000-0000-0000-000000000003', 'Sofia Ramirez', 'sofia.ramirez@example.com', '$2b$12$ChbG8ggCzyFN7CoW8bKm2e6YriN2HPcWPCkmmsupYEfkR/Za1YFqq', 4, 'local', false, true, true, false, CURRENT_TIMESTAMP - INTERVAL '43 days', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('c0000000-0000-0000-0000-000000000004', 'Carlos Mendoza', 'carlos.mendoza@example.com', '$2b$12$ChbG8ggCzyFN7CoW8bKm2e6YriN2HPcWPCkmmsupYEfkR/Za1YFqq', 4, 'local', false, true, true, false, CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('c0000000-0000-0000-0000-000000000005', 'Amina Hassan', 'amina.hassan@example.com', '$2b$12$ChbG8ggCzyFN7CoW8bKm2e6YriN2HPcWPCkmmsupYEfkR/Za1YFqq', 4, 'local', false, true, true, false, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role_id = 4,
    is_active = true,
    email_verified = true,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO client_profiles (id, user_id, phone, country, address, kyc_level, created_at, updated_at) VALUES
('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '+1 305 555 0184', 'United States', '742 SW 8th St, Miami, FL', 2, CURRENT_TIMESTAMP - INTERVAL '72 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '+1 212 555 0149', 'United States', '18 Hudson Yards, New York, NY', 1, CURRENT_TIMESTAMP - INTERVAL '65 days', CURRENT_TIMESTAMP - INTERVAL '4 days'),
('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', '+34 611 234 987', 'Spain', 'Calle de Alcala 120, Madrid', 2, CURRENT_TIMESTAMP - INTERVAL '43 days', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', '+52 55 4321 9087', 'Mexico', 'Av. Insurgentes Sur 901, CDMX', 1, CURRENT_TIMESTAMP - INTERVAL '12 days', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', '+44 20 7946 0920', 'United Kingdom', '24 King Street, London', 0, CURRENT_TIMESTAMP - INTERVAL '8 days', CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT (user_id) DO UPDATE SET
    phone = EXCLUDED.phone,
    country = EXCLUDED.country,
    address = EXCLUDED.address,
    kyc_level = EXCLUDED.kyc_level,
    updated_at = CURRENT_TIMESTAMP;

-- 3. Cuentas internas y cuentas de clientes
INSERT INTO accounts (id, name, type, currency, balance, client_id, is_active, created_by, created_at) VALUES
('e0000000-0000-0000-0000-000000000001', 'Caja Principal USD - SG Remesas', 'cash', 'USD', 45750.00, NULL, true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '120 days'),
('e0000000-0000-0000-0000-000000000002', 'Banco Operativo MXN - SG Remesas', 'bank', 'MXN', 786420.00, NULL, true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '120 days'),
('e0000000-0000-0000-0000-000000000003', 'Banco Operativo EUR - SG Remesas', 'bank', 'EUR', 28560.00, NULL, true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '120 days'),
('e0000000-0000-0000-0000-000000000004', 'Wallet Digital USDT - SG Remesas', 'digital', 'USD', 12980.75, NULL, true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '95 days'),
('e0000000-0000-0000-0000-000000000011', 'Maria Gonzalez - Cuenta USD', 'bank', 'USD', 1850.00, 'c0000000-0000-0000-0000-000000000001', true, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '70 days'),
('e0000000-0000-0000-0000-000000000012', 'James Wilson - Cuenta USD', 'bank', 'USD', 920.50, 'c0000000-0000-0000-0000-000000000002', true, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '63 days'),
('e0000000-0000-0000-0000-000000000013', 'Sofia Ramirez - Cuenta EUR', 'bank', 'EUR', 2410.00, 'c0000000-0000-0000-0000-000000000003', true, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '41 days'),
('e0000000-0000-0000-0000-000000000014', 'Carlos Mendoza - Cuenta MXN', 'bank', 'MXN', 16350.00, 'c0000000-0000-0000-0000-000000000004', true, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '10 days'),
('e0000000-0000-0000-0000-000000000015', 'Amina Hassan - Cuenta GBP', 'bank', 'GBP', 780.00, 'c0000000-0000-0000-0000-000000000005', true, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '7 days')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    currency = EXCLUDED.currency,
    balance = EXCLUDED.balance,
    client_id = EXCLUDED.client_id,
    is_active = true;

-- 4. Beneficiarios
INSERT INTO beneficiaries (id, client_id, name, bank_name, account_number, account_type, country, currency, is_active, created_at, updated_at) VALUES
('f0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Jose Gonzalez', 'BBVA Mexico', '012180001234567890', 'clabe', 'MX', 'MXN', true, CURRENT_TIMESTAMP - INTERVAL '69 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Ana Lucia Perez', 'Banco de Credito del Peru', '194-23567890-0-11', 'savings', 'PE', 'PEN', true, CURRENT_TIMESTAMP - INTERVAL '61 days', CURRENT_TIMESTAMP - INTERVAL '8 days'),
('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Emily Carter', 'Chase Bank', '8892031145', 'checking', 'US', 'USD', true, CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '4 days'),
('f0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'Valentina Rojas', 'Bancolombia', '55100933772', 'savings', 'CO', 'COP', true, CURRENT_TIMESTAMP - INTERVAL '38 days', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('f0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004', 'Rosa Mendoza', 'Banco Azteca', '1270045609812', 'savings', 'MX', 'MXN', true, CURRENT_TIMESTAMP - INTERVAL '9 days', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('f0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000005', 'Youssef Hassan', 'Attijariwafa Bank', 'MA64011519001201234567890123', 'iban', 'MA', 'MAD', true, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    bank_name = EXCLUDED.bank_name,
    account_number = EXCLUDED.account_number,
    account_type = EXCLUDED.account_type,
    country = EXCLUDED.country,
    currency = EXCLUDED.currency,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

-- 5. Reglas de comisiones e incentivos
INSERT INTO commission_rules (id, currency_from, currency_to, rate_percent, min_fixed_amount, min_fixed_currency, is_active, created_by, created_at, updated_at) VALUES
(10, 'USD', 'MXN', 2.2500, 4.00, 'USD', true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(11, 'USD', 'PEN', 2.7500, 5.00, 'USD', true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(12, 'EUR', 'COP', 2.9500, 4.50, 'EUR', true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(13, 'GBP', 'MAD', 3.1000, 4.00, 'GBP', true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(14, 'MXN', 'USD', 2.4000, 70.00, 'MXN', true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

INSERT INTO operator_commission_tiers (id, operator_id, min_amount_usd, max_amount_usd, rate_percent, is_active, created_by, created_at, updated_at) VALUES
(10, NULL, 0.00, 999.99, 0.2500, true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(11, NULL, 1000.00, 2999.99, 0.4000, true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(12, NULL, 3000.00, NULL, 0.6000, true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '80 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
(13, 'b0000000-0000-0000-0000-000000000001', 0.00, NULL, 0.7500, true, 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '20 days', CURRENT_TIMESTAMP - INTERVAL '5 days')
ON CONFLICT (id) DO UPDATE SET
    rate_percent = EXCLUDED.rate_percent,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

-- 6. Solicitudes de clientes
INSERT INTO client_requests (id, client_id, type, amount, currency, destination_account_info, beneficiary, notes, status, processed_by, created_at, updated_at) VALUES
('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'remesa', 450.00, 'USD', '{"bank":"BBVA Mexico","country":"MX","currency":"MXN","account":"012180001234567890"}', '{"name":"Jose Gonzalez","relationship":"Padre","city":"Guadalajara"}', 'Envio mensual familiar', 'completed', 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '26 days', CURRENT_TIMESTAMP - INTERVAL '25 days'),
('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'remesa', 1250.00, 'USD', '{"bank":"Chase Bank","country":"US","currency":"USD","account":"8892031145"}', '{"name":"Emily Carter","relationship":"Sister","city":"Boston"}', 'Transferencia para gastos universitarios', 'completed', 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '18 days', CURRENT_TIMESTAMP - INTERVAL '17 days'),
('10000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'remesa', 780.00, 'EUR', '{"bank":"Bancolombia","country":"CO","currency":"COP","account":"55100933772"}', '{"name":"Valentina Rojas","relationship":"Madre","city":"Medellin"}', 'Pago de tratamiento medico', 'processing', 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
('10000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'retiro', 3500.00, 'MXN', '{"method":"cash_pickup","branch":"Sucursal Reforma CDMX","currency":"MXN"}', '{"name":"Carlos Mendoza","relationship":"Titular","city":"Ciudad de Mexico"}', 'Retiro en caja solicitado desde portal', 'pending', NULL, CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('10000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'remesa', 3200.00, 'GBP', '{"bank":"Attijariwafa Bank","country":"MA","currency":"MAD","account":"MA64011519001201234567890123"}', '{"name":"Youssef Hassan","relationship":"Brother","city":"Casablanca"}', 'Monto alto pendiente de revision AML', 'processing', 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 hour')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    processed_by = EXCLUDED.processed_by,
    updated_at = CURRENT_TIMESTAMP;

-- 7. Transacciones
INSERT INTO transactions (
    id, type, account_origin_id, account_destination_id, amount, currency, exchange_rate,
    beneficiary_id, beneficiary_snapshot, reference, tracking_code, status, notes,
    client_request_id, commission_rate_applied, commission_amount, additional_charges,
    total_charged, created_by, created_at, updated_at
) VALUES
('20000000-0000-0000-0000-000000000001', 'remesa', 'e0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000002', 450.00, 'USD', 18.250000, 'f0000000-0000-0000-0000-000000000001', '{"name":"Jose Gonzalez","bank":"BBVA Mexico","country":"MX","currency":"MXN"}', 'FAM-MX-450', 'SGR-26001', 'completed', 'Remesa liquidada y notificada al beneficiario', '10000000-0000-0000-0000-000000000001', 2.2500, 10.13, '[{"label":"Entrega express","amount":2.50,"currency":"USD"}]', 462.63, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '25 days', CURRENT_TIMESTAMP - INTERVAL '25 days'),
('20000000-0000-0000-0000-000000000002', 'remesa', 'e0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000001', 1250.00, 'USD', 1.000000, 'f0000000-0000-0000-0000-000000000003', '{"name":"Emily Carter","bank":"Chase Bank","country":"US","currency":"USD"}', 'EDU-US-1250', 'SGR-26002', 'completed', 'Transferencia nacional completada', '10000000-0000-0000-0000-000000000002', 1.5000, 18.75, '[]', 1268.75, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '17 days', CURRENT_TIMESTAMP - INTERVAL '17 days'),
('20000000-0000-0000-0000-000000000003', 'remesa', 'e0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000003', 780.00, 'EUR', 4210.500000, 'f0000000-0000-0000-0000-000000000004', '{"name":"Valentina Rojas","bank":"Bancolombia","country":"CO","currency":"COP"}', 'MED-CO-780', 'SGR-26003', 'processing', 'Pago en proceso de confirmacion bancaria', '10000000-0000-0000-0000-000000000003', 2.9500, 23.01, '[{"label":"Validacion prioritaria","amount":4.50,"currency":"EUR"}]', 807.51, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
('20000000-0000-0000-0000-000000000004', 'retiro', 'e0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000001', 3500.00, 'MXN', 0.054000, NULL, '{"name":"Carlos Mendoza","method":"cash_pickup","country":"MX"}', 'CASH-MX-3500', 'SGR-26004', 'pending', 'Pendiente por aprobacion de caja', '10000000-0000-0000-0000-000000000004', 2.4000, 84.00, '[]', 3584.00, NULL, CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
('20000000-0000-0000-0000-000000000005', 'remesa', 'e0000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000004', 3200.00, 'GBP', 12.730000, 'f0000000-0000-0000-0000-000000000006', '{"name":"Youssef Hassan","bank":"Attijariwafa Bank","country":"MA","currency":"MAD"}', 'SUP-MA-3200', 'SGR-26005', 'processing', 'Revision AML requerida por monto alto', '10000000-0000-0000-0000-000000000005', 3.1000, 99.20, '[{"label":"Revision documental","amount":6.00,"currency":"GBP"}]', 3305.20, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 hour'),
('20000000-0000-0000-0000-000000000006', 'remesa', 'e0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000002', 210.00, 'USD', 18.100000, 'f0000000-0000-0000-0000-000000000001', '{"name":"Jose Gonzalez","bank":"BBVA Mexico","country":"MX","currency":"MXN"}', 'FAM-MX-210', 'SGR-26006', 'failed', 'Banco destino rechazo el numero de cuenta', NULL, 2.2500, 4.73, '[]', 214.73, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '11 days', CURRENT_TIMESTAMP - INTERVAL '11 days'),
('20000000-0000-0000-0000-000000000007', 'remesa', 'e0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000001', 510.00, 'USD', 1.000000, 'f0000000-0000-0000-0000-000000000003', '{"name":"Emily Carter","bank":"Chase Bank","country":"US","currency":"USD"}', 'TRV-US-510', 'SGR-26007', 'reversed', 'Reversion solicitada por duplicidad del cliente', NULL, 1.5000, 7.65, '[]', 517.65, 'b0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '6 days')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    notes = EXCLUDED.notes,
    commission_amount = EXCLUDED.commission_amount,
    total_charged = EXCLUDED.total_charged,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO transaction_status_log (id, transaction_id, previous_status, new_status, changed_by, notes, changed_at) VALUES
(100, '20000000-0000-0000-0000-000000000001', NULL, 'pending', 'b0000000-0000-0000-0000-000000000001', 'Solicitud registrada desde portal cliente', CURRENT_TIMESTAMP - INTERVAL '26 days'),
(101, '20000000-0000-0000-0000-000000000001', 'pending', 'processing', 'b0000000-0000-0000-0000-000000000001', 'Fondos confirmados en cuenta origen', CURRENT_TIMESTAMP - INTERVAL '25 days 5 hours'),
(102, '20000000-0000-0000-0000-000000000001', 'processing', 'completed', 'b0000000-0000-0000-0000-000000000001', 'Pago finalizado en banco destino', CURRENT_TIMESTAMP - INTERVAL '25 days'),
(103, '20000000-0000-0000-0000-000000000003', NULL, 'pending', NULL, 'Solicitud recibida', CURRENT_TIMESTAMP - INTERVAL '2 days'),
(104, '20000000-0000-0000-0000-000000000003', 'pending', 'processing', 'b0000000-0000-0000-0000-000000000001', 'Validando datos bancarios del beneficiario', CURRENT_TIMESTAMP - INTERVAL '4 hours'),
(105, '20000000-0000-0000-0000-000000000006', 'processing', 'failed', 'b0000000-0000-0000-0000-000000000001', 'Numero de cuenta rechazado por banco destino', CURRENT_TIMESTAMP - INTERVAL '11 days'),
(106, '20000000-0000-0000-0000-000000000007', 'completed', 'reversed', 'b0000000-0000-0000-0000-000000000001', 'Reversion aprobada por duplicidad comprobada', CURRENT_TIMESTAMP - INTERVAL '6 days')
ON CONFLICT (id) DO UPDATE SET
    notes = EXCLUDED.notes,
    changed_at = EXCLUDED.changed_at;

-- 8. Comisiones ganadas por operador
INSERT INTO operator_commission_log (id, transaction_id, operator_id, transaction_amount_usd, tier_id, rate_percent_applied, commission_amount_usd, adjustment_ref_id, created_at) VALUES
(100, '20000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 450.00, 13, 0.7500, 3.38, NULL, CURRENT_TIMESTAMP - INTERVAL '25 days'),
(101, '20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 1250.00, 13, 0.7500, 9.38, NULL, CURRENT_TIMESTAMP - INTERVAL '17 days'),
(102, '20000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 850.20, 13, 0.7500, 6.38, NULL, CURRENT_TIMESTAMP - INTERVAL '4 hours'),
(103, '20000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 510.00, 13, 0.7500, -3.83, 101, CURRENT_TIMESTAMP - INTERVAL '6 days')
ON CONFLICT (id) DO UPDATE SET
    commission_amount_usd = EXCLUDED.commission_amount_usd,
    created_at = EXCLUDED.created_at;

-- 9. KYC: documentos e historial
INSERT INTO kyc_documents (id, client_id, level_requested, document_type, file_url, status, reviewed_by, reviewer_comment, submitted_at, reviewed_at) VALUES
('30000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 2, 'passport', 'https://demo.sgremesas.local/kyc/maria-passport.pdf', 'approved', 'b0000000-0000-0000-0000-000000000002', 'Documento vigente y datos consistentes', CURRENT_TIMESTAMP - INTERVAL '70 days', CURRENT_TIMESTAMP - INTERVAL '69 days'),
('30000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 1, 'id_card', 'https://demo.sgremesas.local/kyc/james-id.pdf', 'approved', 'b0000000-0000-0000-0000-000000000002', 'Identidad validada', CURRENT_TIMESTAMP - INTERVAL '63 days', CURRENT_TIMESTAMP - INTERVAL '62 days'),
('30000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 2, 'proof_of_address', 'https://demo.sgremesas.local/kyc/sofia-address.pdf', 'approved', 'b0000000-0000-0000-0000-000000000002', 'Comprobante aceptado', CURRENT_TIMESTAMP - INTERVAL '40 days', CURRENT_TIMESTAMP - INTERVAL '39 days'),
('30000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 2, 'id_card', 'https://demo.sgremesas.local/kyc/carlos-id.pdf', 'pending', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('30000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 1, 'passport', 'https://demo.sgremesas.local/kyc/amina-passport.pdf', 'correction_needed', 'b0000000-0000-0000-0000-000000000002', 'La imagen esta borrosa; solicitar nueva captura', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '4 days')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewer_comment = EXCLUDED.reviewer_comment,
    reviewed_at = EXCLUDED.reviewed_at;

INSERT INTO kyc_history (id, client_id, previous_level, new_level, action, performed_by, comment, created_at) VALUES
('31000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1, 2, 'approved', 'b0000000-0000-0000-0000-000000000002', 'Cliente habilitada para limites ampliados', CURRENT_TIMESTAMP - INTERVAL '69 days'),
('31000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 0, 1, 'approved', 'b0000000-0000-0000-0000-000000000002', 'Identidad basica verificada', CURRENT_TIMESTAMP - INTERVAL '62 days'),
('31000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 1, 2, 'approved', 'b0000000-0000-0000-0000-000000000002', 'Domicilio confirmado', CURRENT_TIMESTAMP - INTERVAL '39 days'),
('31000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 0, 0, 'correction_needed', 'b0000000-0000-0000-0000-000000000002', 'Documento requiere mejor resolucion', CURRENT_TIMESTAMP - INTERVAL '4 days')
ON CONFLICT (id) DO UPDATE SET
    action = EXCLUDED.action,
    comment = EXCLUDED.comment;

-- 10. Tickets y mensajes
INSERT INTO tickets (id, client_id, created_by, subject, category, status, opened_via, created_at, updated_at, closed_at) VALUES
('40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Confirmacion de pago en Mexico', 'consulta', 'resolved', 'web', CURRENT_TIMESTAMP - INTERVAL '24 days', CURRENT_TIMESTAMP - INTERVAL '23 days', CURRENT_TIMESTAMP - INTERVAL '23 days'),
('40000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Banco destino solicita referencia adicional', 'consulta', 'in_review', 'web', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL),
('40000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'No puedo completar verificacion KYC', 'problema_tecnico', 'open', 'email', CURRENT_TIMESTAMP - INTERVAL '16 hours', CURRENT_TIMESTAMP - INTERVAL '16 hours', NULL)
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP,
    closed_at = EXCLUDED.closed_at;

INSERT INTO ticket_messages (id, ticket_id, author_id, body, created_at) VALUES
('41000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Hola, necesito confirmar si mi familia ya puede retirar el dinero.', CURRENT_TIMESTAMP - INTERVAL '24 days'),
('41000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'El pago fue completado. Te compartimos el tracking SGR-26001.', CURRENT_TIMESTAMP - INTERVAL '23 days'),
('41000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'Bancolombia me pidio agregar el numero de identificacion de la beneficiaria.', CURRENT_TIMESTAMP - INTERVAL '2 days'),
('41000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Gracias, estamos actualizando la referencia y te avisaremos al confirmar.', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
('41000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000005', 'El sistema rechaza la foto del pasaporte aunque esta vigente.', CURRENT_TIMESTAMP - INTERVAL '16 hours')
ON CONFLICT (id) DO UPDATE SET
    body = EXCLUDED.body,
    created_at = EXCLUDED.created_at;

-- 11. Alertas AML y notificaciones
INSERT INTO compliance_alerts (id, transaction_id, client_id, rule_code, triggered_amount_usd, status, reviewed_by, reviewer_comment, created_at, reviewed_at) VALUES
('50000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', 'threshold_amount', 4096.00, 'pending', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', NULL),
('50000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'new_client_high_value', 1250.00, 'reviewed', 'b0000000-0000-0000-0000-000000000002', 'Actividad consistente con perfil declarado', CURRENT_TIMESTAMP - INTERVAL '17 days', CURRENT_TIMESTAMP - INTERVAL '16 days')
ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    reviewed_by = EXCLUDED.reviewed_by,
    reviewer_comment = EXCLUDED.reviewer_comment,
    reviewed_at = EXCLUDED.reviewed_at;

INSERT INTO notifications (id, user_id, type, title, body, entity_type, entity_id, is_read, created_at) VALUES
('60000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'transaction_status', 'Remesa completada', 'Tu envio SGR-26001 fue pagado al beneficiario.', 'transaction', '20000000-0000-0000-0000-000000000001', true, CURRENT_TIMESTAMP - INTERVAL '25 days'),
('60000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'ticket_reply', 'Respuesta de soporte', 'Un operador respondio tu ticket sobre la referencia bancaria.', 'ticket', '40000000-0000-0000-0000-000000000002', false, CURRENT_TIMESTAMP - INTERVAL '3 hours'),
('60000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'compliance_alert', 'Alerta AML pendiente', 'La transaccion SGR-26005 requiere revision por umbral de monto.', 'compliance_alert', '50000000-0000-0000-0000-000000000001', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),
('60000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'kyc_update', 'Correccion requerida', 'Necesitamos una imagen mas nitida de tu pasaporte.', 'kyc_document', '30000000-0000-0000-0000-000000000005', false, CURRENT_TIMESTAMP - INTERVAL '4 days'),
('60000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'transaction_status', 'Operacion en proceso', 'La remesa SGR-26003 sigue esperando confirmacion bancaria.', 'transaction', '20000000-0000-0000-0000-000000000003', false, CURRENT_TIMESTAMP - INTERVAL '4 hours')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    is_read = EXCLUDED.is_read,
    created_at = EXCLUDED.created_at;

-- 12. Configuracion demo visible para administracion
INSERT INTO config (key, value, updated_by, updated_at) VALUES
('portfolio_demo_mode', 'true', 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP),
('support_email', 'soporte@sgremesas.com', 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP),
('business_display_name', 'SG Remesas', 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP),
('default_settlement_hours', '24', 'a0000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_by = EXCLUDED.updated_by,
    updated_at = CURRENT_TIMESTAMP;

-- 13. Ajustar secuencias despues de IDs manuales
SELECT setval('commission_rules_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM commission_rules), 1));
SELECT setval('operator_commission_tiers_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM operator_commission_tiers), 1));
SELECT setval('operator_commission_log_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM operator_commission_log), 1));
SELECT setval('transaction_status_log_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM transaction_status_log), 1));
SELECT setval('config_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM config), 1));

COMMIT;
