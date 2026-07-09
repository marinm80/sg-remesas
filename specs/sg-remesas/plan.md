# Plan: Sistema de Gestión de Remesas y Panel Operativo FullStack

> Slug: `sg-remesas` · Generado: 2026-06-26 · Basado en: spec.md, tech-spec.md
> **ESTE DOCUMENTO REQUIERE REVISIÓN HUMANA ANTES DE PASAR A TASK-DECOMPOSER**

## Resumen ejecutivo
El sistema se construirá como una aplicación monorepo estructurada en dos carpetas independientes: `/frontend` para el cliente de React (Vite, Tailwind, shadcn/ui y Zustand) y `/backend` para la API REST de Node.js + Express. La base de datos PostgreSQL 16 se levantará localmente usando Docker Compose. Toda la persistencia y la lógica transaccional de saldo se gestionará mediante queries SQL puras utilizando `node-postgres` dentro de una capa dedicada de repositorios, asegurando el control absoluto de las transacciones ACID financieras sin la sobrecarga de un ORM.

## Stack final
- **Lenguaje:** TypeScript (Frontend y Backend).
- **Framework Frontend:** React 18 + Vite.
- **Framework Backend:** Node.js + Express.
- **Base de Datos:** PostgreSQL 16 (despliegue local con Docker Compose).
- **Librerías principales:**
  - Frontend: `zustand` (estado global), `react-router-dom` (rutas), `tailwind-css` + `shadcn/ui` (UI), `recharts` (gráficos), `lucide-react` (íconos).
  - Backend: `pg` (node-postgres para consultas SQL puras), `jsonwebtoken` (JWT), `bcrypt` (cifrado de claves), `passport` + `passport-google-oauth20` (OAuth Google), `nodemailer` (envío de correos vía Ethereal en desarrollo).
- **Servicios externos:** Frankfurter API (tasas de cambio de referencia gratuitas).

---

## Decisiones arquitectónicas (ADRs)

### D-01: Estructura del Monorepo
- **Contexto:** Organización de los proyectos frontend y backend en el mismo repositorio de Git.
- **Opciones consideradas:**
  - a) Monorepo formal con `pnpm-workspaces` compartiendo dependencias y tipados.
  - b) Separación de código en carpetas `/client` y `/server`.
  - c) Separación de código en carpetas `/frontend` y `/backend` independientes.
- **Decisión:** Opción **c** (`/frontend` y `/backend` independientes).
- **Razón:** Simplifica el entendimiento del espacio de trabajo al usar nombres explícitos y estándar, y evita la sobrecomplejidad de workspaces de pnpm para despliegues rápidos en el VPS.
- **Trade-offs:** Los tipos compartidos entre frontend y backend deberán duplicarse o escribirse de forma manual en archivos de declaración `.ts`.

### D-02: Estrategia de Identificadores (Primary Keys)
- **Contexto:** Definición de tipos de dato para PKs de la base de datos PostgreSQL.
- **Opciones consideradas:**
  - a) `SERIAL` / `BIGSERIAL` (enteros secuenciales) para todas las tablas.
  - b) `UUID` (v4) para todas las tablas.
  - c) `UUID` para tablas orientadas al usuario y públicas; `SERIAL`/`INT` para tablas internas y de configuración.
- **Decisión:** Opción **c** (Estrategia híbrida).
- **Razón:** Evita la vulnerabilidad de enumeración de ID en endpoints públicos y URLs (ej. transacciones, perfiles, tickets, documentos KYC) al usar UUIDs robustos, pero mantiene el rendimiento de joins rápidos y el orden secuencial en configuraciones internas (roles, permisos, reglas de comisiones).
- **Trade-offs:** Requiere que el backend maneje inserciones con generación de UUID v4 en la base de datos o en código Express, y una leve diferencia sintáctica entre tipos de relaciones en SQL.

### D-03: Manejo del Estado en el Frontend
- **Contexto:** Gestión de la sesión, permisos de usuario y datos globales en React.
- **Opciones consideradas:**
  - a) Context API nativo de React.
  - b) Zustand.
  - c) Redux Toolkit.
- **Decisión:** Opción **b** (Zustand).
- **Razón:** Ofrece una sintaxis limpia, excelente rendimiento al evitar re-renders innecesarios en el árbol de componentes y simplifica la persistencia de la sesión en `localStorage` con su middleware nativo.
- **Trade-offs:** Introduce una dependencia externa adicional (ligera: ~1KB).

### D-04: Acceso a Datos y SQL Puro
- **Contexto:** Lógica de acceso a PostgreSQL desde Express.
- **Opciones consideradas:**
  - a) ORM como Prisma o Sequelize.
  - b) SQL directo escrito directamente en la capa de Servicios.
  - c) Capa de repositorios dedicada (`/repositories`) con SQL puro usando `node-postgres` (`pg`).
- **Decisión:** Opción **c** (Repositorios con SQL puro).
- **Razón:** El PRD prohíbe explícitamente el uso de ORMs para garantizar transacciones ACID eficientes y control completo sobre consultas complejas de reportes y de incentivos. El uso de repositorios aísla la sintaxis SQL de la lógica de negocio (Servicios).
- **Trade-offs:** Requiere escribir y documentar manualmente todo el código DDL de las tablas, consultas SQL y mapeo de columnas a objetos JS.

### D-05: Entorno de Base de Datos para Desarrollo
- **Contexto:** Configuración inicial del motor PostgreSQL para programar localmente.
- **Opciones consideradas:**
  - a) Instalación nativa de PostgreSQL en la máquina del desarrollador.
  - b) Contenedor local mediante `docker-compose.yml`.
  - c) Instancia en la nube de Neon o Supabase.
- **Decisión:** Opción **b** (`docker-compose.yml`).
- **Razón:** Asegura que cualquier desarrollador pueda iniciar el entorno PostgreSQL 16 idéntico con un comando (`docker compose up -d`) de forma aislada y reproducible.
- **Trade-offs:** Requiere tener instalado Docker en el entorno local del desarrollador.

---

## Modelo de datos

### Tablas con UUID Primary Key
- `users`: ID `UUID DEFAULT gen_random_uuid()` PK, nombre, email, password_hash, role_id (FK), token_version, auth_provider, provider_id, commission_eligible, is_active, email_verified, email_verify_token, reset_token, reset_token_expires, must_change_password, created_at, deleted_at.
- `client_profiles`: ID `UUID DEFAULT gen_random_uuid()` PK, user_id (`UUID` FK users.id UNIQUE), phone, country, address, kyc_level, created_at, updated_at.
- `accounts`: ID `UUID DEFAULT gen_random_uuid()` PK, name, type, currency, balance, client_id (`UUID` FK users.id nullable), is_active, created_by (`UUID` FK users.id), created_at, deleted_at.
- `transactions`: ID `UUID DEFAULT gen_random_uuid()` PK, type, account_origin_id (`UUID` FK accounts.id nullable), account_destination_id (`UUID` FK accounts.id nullable), amount, currency, exchange_rate, beneficiary_id (`UUID` FK beneficiaries.id nullable), beneficiary_snapshot (`JSONB`), reference, tracking_code (`VARCHAR` UNIQUE), status, notes, client_request_id (`UUID` FK client_requests.id nullable), commission_rate_applied, commission_amount, additional_charges (`JSONB`), total_charged, created_by (`UUID` FK users.id), created_at, updated_at, deleted_at.
- `client_requests`: ID `UUID DEFAULT gen_random_uuid()` PK, client_id (`UUID` FK users.id), type, amount, currency, destination_account_info (`JSONB`), beneficiary (`JSONB`), notes, status, processed_by (`UUID` FK users.id nullable), created_at, updated_at.
- `tickets`: ID `UUID DEFAULT gen_random_uuid()` PK, client_id (`UUID` FK users.id), created_by (`UUID` FK users.id), subject, category, status, opened_via, created_at, updated_at, closed_at.
- `ticket_messages`: ID `UUID DEFAULT gen_random_uuid()` PK, ticket_id (`UUID` FK tickets.id), author_id (`UUID` FK users.id), body, created_at.
- `kyc_documents`: ID `UUID DEFAULT gen_random_uuid()` PK, client_id (`UUID` FK users.id), level_requested, document_type, file_url, status, reviewed_by (`UUID` FK users.id), reviewer_comment, submitted_at, reviewed_at.
- `kyc_history`: ID `UUID DEFAULT gen_random_uuid()` PK, client_id (`UUID` FK users.id), previous_level, new_level, action, performed_by (`UUID` FK users.id), comment, created_at.
- `beneficiaries`: ID `UUID DEFAULT gen_random_uuid()` PK, client_id (`UUID` FK users.id), name, bank_name, account_number, account_type, country, currency, is_active, created_at, updated_at, deleted_at.
- `compliance_alerts`: ID `UUID DEFAULT gen_random_uuid()` PK, transaction_id (`UUID` FK transactions.id), client_id (`UUID` FK users.id), rule_code, triggered_amount_usd, status, reviewed_by (`UUID` FK users.id), reviewer_comment, created_at, reviewed_at.
- `notifications`: ID `UUID DEFAULT gen_random_uuid()` PK, user_id (`UUID` FK users.id), type, title, body, entity_type, entity_id (`UUID`), is_read, created_at.

### Tablas con SERIAL/INT Primary Key
- `roles`: ID `SERIAL` PK, name (UNIQUE), description, is_system, is_active, created_by (`UUID` FK users.id), created_at, updated_at.
- `permissions`: ID `SERIAL` PK, code (UNIQUE), description, module, created_at.
- `role_permissions`: role_id (`INT` FK), permission_id (`INT` FK), PK compuesta `(role_id, permission_id)`.
- `transaction_status_log`: ID `SERIAL` PK, transaction_id (`UUID` FK transactions.id), previous_status, new_status, changed_by (`UUID` FK users.id), notes, changed_at.
- `commission_rules`: ID `SERIAL` PK, currency_from, currency_to, rate_percent, min_fixed_amount, min_fixed_currency, is_active, created_by (`UUID` FK users.id), created_at, updated_at.
- `operator_commission_tiers`: ID `SERIAL` PK, operator_id (`UUID` FK users.id nullable), min_amount_usd, max_amount_usd, rate_percent, is_active, created_by (`UUID` FK users.id), created_at, updated_at.
- `operator_commission_log`: ID `SERIAL` PK, transaction_id (`UUID` FK transactions.id), operator_id (`UUID` FK users.id), transaction_amount_usd, tier_id (`INT` FK operator_commission_tiers.id), rate_percent_applied, commission_amount_usd, adjustment_ref_id (`INT` FK operator_commission_log.id nullable), created_at.
- `compliance_rules`: ID `SERIAL` PK, code (UNIQUE), description, threshold_amount_usd, window_hours, transaction_count, is_active, updated_by (`UUID` FK users.id), updated_at.
- `config`: ID `SERIAL` PK, key (UNIQUE), value, updated_by (`UUID` FK users.id), updated_at.

### Migraciones Iniciales Esperadas
1.  `001_schema_init.sql`: Creación de extensiones (`uuid-ossp` o uso de `gen_random_uuid()`), definición de tablas y llaves foráneas.
2.  `002_indexes_and_constraints.sql`: Creación de índices de performance e índices UNIQUE parciales.
3.  `003_seed_data.sql`: Inserción de permisos del catálogo, roles de sistema (`admin`, `operador`, `auditor`, `cliente`), usuario administrador inicial por defecto, reglas de cumplimiento AML estándar y configuraciones básicas.

---

## Contratos de API (Endpoints principales)

### Auth
- `POST /api/auth/register` (público) -> Crea cuenta de cliente local. Retorna 201 y encola envío de email de verificación.
- `POST /api/auth/login` (público) -> Recibe email y password. Valida estado activo y verificado. Retorna JWT access_token + refresh_token.
- `POST /api/auth/google/callback` (público) -> Intercambio de perfil de Google por JWT del backend.
- `POST /api/auth/verify-email` (público) -> Valida token de email. Cambia `email_verified = true`. Retorna 200.
- `POST /api/auth/forgot-password` (público) -> Encola email con token temporal para restablecer clave.
- `POST /api/auth/reset-password` (público) -> Aplica nueva contraseña con token válido de recuperación.

### Cuentas
- `GET /api/accounts` -> Retorna cuentas asociadas (si es Cliente, solo las suyas; si es Operador/Admin, según filtros).
- `POST /api/accounts` (Admin) -> Crea cuenta bancaria, digital o efectivo.

### Transacciones
- `POST /api/transactions/preview` -> Recibe datos del envío. Retorna el desglose de comisiones, tipo de cambio y cargos aplicables para confirmación visual obligatoria.
- `POST /api/transactions` (Operador/Admin) -> Crea transacción tras validar balance y límites KYC. Ejecuta actualización de saldos dentro de transacción ACID SQL.
- `POST /api/transactions/:id/revert` (Operador/Admin) -> Crea transacción reversa y actualiza saldos. Registra ajuste negativo de incentivo a operador.
- `GET /api/track/:code` (público) -> Devuelve estado (`status`, `created_at`, `amount`, `currency`) para rastreo externo sin sesión.

### KYC y Tickets
- `POST /api/kyc/documents` (Cliente) -> Carga archivos de identificación y comprobantes (formato local `/uploads`).
- `POST /api/kyc/requests/:id/review` (Admin/Auditor) -> Aprueba o rechaza documentos. Escribe auditoría del cambio de nivel KYC.
- `POST /api/tickets` -> Abre ticket de soporte.
- `POST /api/tickets/:id/messages` -> Envía mensaje al hilo de discusión.

---

## Componentes Frontend

- `/frontend/src/store/useAuthStore.ts`: Estado de autenticación Zustand (JWT, usuario, rol y permisos).
- `/frontend/src/pages/Landing.tsx`: Landing page pública con widget simulador (Frankfurter API) y rastreador de remesas por código de seguimiento.
- `/frontend/src/pages/Login.tsx` / `Register.tsx`: Formularios de autenticación local y Google OAuth.
- `/frontend/src/layouts/DashboardLayout.tsx`: Estructura con Sidebar dinámico (basado en permisos del JWT) y Topbar con avatar e información de sesión.
- `/frontend/src/pages/Dashboard/AdminDashboard.tsx`: KPIs agregados, volumen semanal, control de comisiones e incentivos.
- `/frontend/src/pages/Dashboard/OperatorDashboard.tsx`: Bandeja de transacciones, caja diaria y atención de solicitudes de remesas.
- `/frontend/src/pages/Dashboard/ClientDashboard.tsx`: Vista de cuentas propias, libreta de beneficiarios, tickets y solicitud de envíos.
- `/frontend/src/pages/Dashboard/AuditorDashboard.tsx`: Auditoría de logs, reportes de cumplimiento y panel de alertas AML pendientes.

---

## Estructura de carpetas resultante

```
/
├── docker-compose.yml
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/             # Componentes shadcn/ui
│   │   │   └── ...
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard/
│   │   │   └── ...
│   │   ├── services/
│   │   ├── store/
│   │   │   └── useAuthStore.ts # Estado global de Zustand
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts           # Inicialización de node-postgres
│   │   │   └── passport.ts     # Configuración OAuth Google
│   │   ├── controllers/
│   │   ├── middleware/         # Middleware de validación JWT y RBAC
│   │   ├── repositories/       # Queries SQL puras y acceso directo a BD
│   │   │   ├── user.repository.ts
│   │   │   ├── transaction.repository.ts
│   │   │   └── ...
│   │   ├── routes/
│   │   ├── services/           # Lógica de negocio (comisiones, alertas AML)
│   │   │   ├── aml.service.ts
│   │   │   └── ...
│   │   ├── utils/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── specs/
    └── sg-remesas/
        ├── spec.md
        ├── tech-spec.md
        └── plan.md
```

---

## Estrategia de testing
- **Unit Testing (Backend):** Pruebas unitarias sobre la lógica de comisiones (`commission.service.ts`), evaluación de tramos de operador y alertas de lavado de dinero AML.
- **Integration Testing:** Pruebas automatizadas sobre los endpoints de la API (`/api/transactions`, `/api/auth`) usando una base de datos PostgreSQL de test limpia.
- **E2E/Manual (Frontend):** Pruebas de simulación de flujos usando Postman.

## Despliegue
- **Variables de entorno backend:** `PORT`, `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `FRONTEND_URL`.
- **Procedimiento de inicio en producción:**
  1. Correr migraciones SQL en la base de datos PostgreSQL.
  2. Levantar el backend con `pm2 start backend/dist/index.js --name sg-remesas-api`.
  3. Configurar Nginx para servir los archivos compilados en `/frontend/dist` y redirigir `/api` al puerto local de Express.

## Riesgos identificados
- **R-01: Inconsistencia matemática de saldos en fallos de red.** 
  *Mitigación:* Se implementan bloques `BEGIN` / `COMMIT` / `ROLLBACK` estrictos de SQL nativo en las funciones de repositorio para asegurar atomicidad total.
- **R-02: Bloqueo por caída de Frankfurter API.**
  *Mitigación:* El sistema guardará localmente la última tasa de Frankfurter API exitosa como backup para consulta y permitirá el ingreso 100% manual por operadores si el servicio no responde.
- **R-03: Invalidación del JWT en cambios de roles.**
  *Mitigación:* Se añade el campo `token_version` en `users`. El middleware del backend validará este campo contra la base de datos en cada request, garantizando la revocación inmediata.

## Estimación gruesa
- **Esfuerzo total estimado:** ~45 horas de desarrollo y testing.
- **Granularidad esperada:** ~25 tareas atómicas (`T-NNN`) organizadas por dependencias lógicas.

---

## Próximo paso
Este plan ha sido diseñado bajo los lineamientos aprobados en las preguntas de arquitectura. **Este plan requiere revisión y aprobación del humano** antes de proceder a la descomposición atómica de tareas.
Escribe **`aprobado`** o introduce comentarios adicionales para proceder a ejecutar el `@task-decomposer`.
