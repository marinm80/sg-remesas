-- Migración 001: Esquema de base de datos DDL inicial
-- Generado: 2026-06-26

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de roles (SERIAL PK)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID, -- Se resolverá FK después de crear la tabla users
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Tabla de permisos (SERIAL PK)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Tabla relacional role_permissions (Composite PK, SERIAL FKs)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Tabla de usuarios (UUID PK)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    role_id INT REFERENCES roles(id) NOT NULL,
    token_version INT DEFAULT 0 NOT NULL,
    auth_provider VARCHAR(20) DEFAULT 'local' NOT NULL,
    provider_id VARCHAR(255) NULL,
    commission_eligible BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    email_verified BOOLEAN DEFAULT false NOT NULL,
    email_verify_token VARCHAR(255) NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expires TIMESTAMP NULL,
    must_change_password BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Añadir FK creada recursivamente en roles para users
ALTER TABLE roles ADD CONSTRAINT fk_roles_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 5. Tabla de perfiles de cliente (UUID PK, UUID FK)
CREATE TABLE IF NOT EXISTS client_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    phone VARCHAR(20) NULL,
    country VARCHAR(50) NOT NULL,
    address TEXT NULL,
    kyc_level INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Tabla de cuentas (UUID PK, UUID FKs)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- bank/digital/cash
    currency CHAR(3) NOT NULL, -- USD, MXN, PEN, etc.
    balance DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL indica cuenta interna de la empresa
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

-- 7. Tabla de beneficiarios (UUID PK, UUID FK)
CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_type VARCHAR(30) NOT NULL, -- checking/savings/clabe/iban
    country CHAR(2) NOT NULL, -- ISO 3166-1 (MX, US, PE, etc.)
    currency CHAR(3) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

-- 8. Tabla de solicitudes de cliente (UUID PK, UUID FKs)
CREATE TABLE IF NOT EXISTS client_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(20) NOT NULL, -- remesa/retiro
    amount DECIMAL(15,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    destination_account_info JSONB NOT NULL,
    beneficiary JSONB NOT NULL,
    notes TEXT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending/processing/completed/rejected
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Tabla de transacciones (UUID PK, UUID FKs)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL, -- remesa/retiro/cobro/transfer
    account_origin_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    account_destination_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    exchange_rate DECIMAL(15,6) DEFAULT 1.000000 NOT NULL,
    beneficiary_id UUID REFERENCES beneficiaries(id) ON DELETE SET NULL,
    beneficiary_snapshot JSONB NULL,
    reference VARCHAR(100) NULL,
    tracking_code VARCHAR(20) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending/processing/completed/failed/reversed
    notes TEXT NULL,
    client_request_id UUID REFERENCES client_requests(id) ON DELETE SET NULL,
    commission_rate_applied DECIMAL(5,4) DEFAULT 0.0000 NOT NULL,
    commission_amount DECIMAL(15,2) DEFAULT 0.00 NOT NULL,
    additional_charges JSONB DEFAULT '[]'::jsonb NOT NULL,
    total_charged DECIMAL(15,2) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP NULL
);

-- 10. Tabla de logs de estado de transacciones (SERIAL PK, UUID FK)
CREATE TABLE IF NOT EXISTS transaction_status_log (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
    previous_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 11. Tabla de reglas de comisiones (SERIAL PK, UUID FK)
CREATE TABLE IF NOT EXISTS commission_rules (
    id SERIAL PRIMARY KEY,
    currency_from CHAR(3) NOT NULL,
    currency_to CHAR(3) NOT NULL,
    rate_percent DECIMAL(5,4) NOT NULL, -- Ej: 2.5000 para 2.5%
    min_fixed_amount DECIMAL(15,2) NOT NULL,
    min_fixed_currency CHAR(3) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 12. Tabla de tramos de incentivo para operadores (SERIAL PK, UUID FK)
CREATE TABLE IF NOT EXISTS operator_commission_tiers (
    id SERIAL PRIMARY KEY,
    operator_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL representa tramo global
    min_amount_usd DECIMAL(15,2) NOT NULL,
    max_amount_usd DECIMAL(15,2) NULL, -- NULL representa sin límite superior
    rate_percent DECIMAL(5,4) NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 13. Tabla de log de incentivo del operador (SERIAL PK, UUID FKs, SERIAL FK)
CREATE TABLE IF NOT EXISTS operator_commission_log (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
    operator_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    transaction_amount_usd DECIMAL(15,2) NOT NULL,
    tier_id INT REFERENCES operator_commission_tiers(id) ON DELETE SET NULL,
    rate_percent_applied DECIMAL(5,4) NOT NULL,
    commission_amount_usd DECIMAL(15,2) NOT NULL,
    adjustment_ref_id INT REFERENCES operator_commission_log(id) ON DELETE SET NULL, -- Contracargos por reversión
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 14. Tabla de documentos KYC (UUID PK, UUID FKs)
CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    level_requested INT NOT NULL, -- 1 o 2
    document_type VARCHAR(30) NOT NULL, -- id_card/passport/proof_of_address
    file_url VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending/approved/rejected/correction_needed
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_comment TEXT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP NULL
);

-- 15. Tabla de historial KYC (UUID PK, UUID FKs)
CREATE TABLE IF NOT EXISTS kyc_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    previous_level INT NOT NULL,
    new_level INT NOT NULL,
    action VARCHAR(30) NOT NULL, -- approved/rejected/correction_needed
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 16. Tabla de tickets (UUID PK, UUID FKs)
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(150) NOT NULL,
    category VARCHAR(30) NOT NULL, -- consulta/reclamo/problema_tecnico/otro
    status VARCHAR(20) DEFAULT 'open' NOT NULL, -- open/in_review/resolved/closed
    opened_via VARCHAR(20) DEFAULT 'web' NOT NULL, -- web/phone/email/other
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at TIMESTAMP NULL
);

-- 17. Tabla de mensajes de tickets (UUID PK, UUID FKs)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 18. Tabla de reglas de cumplimiento AML (SERIAL PK, UUID FK)
CREATE TABLE IF NOT EXISTS compliance_rules (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- threshold_amount/structuring/new_client_high_value
    description TEXT,
    threshold_amount_usd DECIMAL(15,2) NOT NULL,
    window_hours INT NULL,
    transaction_count INT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 19. Tabla de alertas de cumplimiento AML (UUID PK, UUID FKs)
CREATE TABLE IF NOT EXISTS compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    rule_code VARCHAR(50) NOT NULL,
    triggered_amount_usd DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending/reviewed/dismissed
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    reviewed_at TIMESTAMP NULL
);

-- 20. Tabla de notificaciones internas (UUID PK, UUID FK, UUID entity_id)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(30) NOT NULL, -- transaction_status/ticket_reply/kyc_update/compliance_alert
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    entity_type VARCHAR(30) NOT NULL, -- transaction/ticket/kyc_document/compliance_alert
    entity_id UUID NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 21. Tabla de configuración global (SERIAL PK, UUID FK)
CREATE TABLE IF NOT EXISTS config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
