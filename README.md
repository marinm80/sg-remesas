# SG Remesas

SG Remesas es una plataforma full-stack para gestionar operaciones de remesas, clientes, KYC, alertas AML, comisiones, tickets y reportes operativos.

El deploy oficial del proyecto en Coolify se maneja con tres recursos independientes:

- Frontend: React/Vite servido por Nginx.
- Backend: API REST en Node.js, Express y TypeScript.
- Base de datos: PostgreSQL 16 administrado como recurso separado en Coolify.

## Estructura

```text
backend/   API REST, migraciones SQL y Dockerfile del backend
frontend/  App React/Vite, Nginx y Dockerfile del frontend
specs/     Documentacion SDD del proyecto
docs/      Guias operativas complementarias
```

## Stack

- Frontend: React, Vite, Tailwind CSS, Zustand.
- Backend: Node.js 20, Express, TypeScript, PostgreSQL `pg`, JWT, Passport.
- Base de datos: PostgreSQL 16.
- Deploy: Coolify con frontend, backend y DB como recursos separados.

## Deploy En Coolify

### 1. Crear PostgreSQL

En Coolify crea un recurso de base de datos PostgreSQL.

Variables:

```env
POSTGRES_USER=remesas_user
POSTGRES_PASSWORD=<password_larga>
POSTGRES_DB=sg_remesas_db
```

Activa almacenamiento persistente para PostgreSQL en:

```text
/var/lib/postgresql/data
```

Cuando la base este arriba, carga las migraciones desde el VPS:

```bash
cd ~/projects/sg-remesas
docker ps --format "{{.Names}}" | grep postgres
docker exec -i NOMBRE_POSTGRES psql -U remesas_user -d sg_remesas_db < backend/src/migrations/001_schema_init.sql
docker exec -i NOMBRE_POSTGRES psql -U remesas_user -d sg_remesas_db < backend/src/migrations/002_indexes_and_constraints.sql
docker exec -i NOMBRE_POSTGRES psql -U remesas_user -d sg_remesas_db < backend/src/migrations/003_seed_data.sql
```

Usuario seed:

```text
admin@sgremesas.com
Admin1234!
```

### 2. Crear Backend

En Coolify crea un recurso desde repositorio usando Dockerfile.

Configuracion:

```text
Base directory: /backend
Dockerfile: /backend/Dockerfile
Port: 5000
Healthcheck path: /api/health
```

Variables requeridas:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://remesas_user:<password_larga>@<host_postgres>:5432/sg_remesas_db
JWT_SECRET=<secret_largo>
JWT_REFRESH_SECRET=<secret_largo>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
FRONTEND_URL=https://<dominio_frontend>
```

Variables opcionales:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://<dominio_backend>/api/auth/google/callback
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@sgremesas.com
```

Verificacion:

```bash
curl https://<dominio_backend>/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "message": "Servidor y base de datos activos"
}
```

### 3. Crear Frontend

En Coolify crea otro recurso desde el mismo repositorio usando Dockerfile.

Configuracion:

```text
Base directory: /frontend
Dockerfile: /frontend/Dockerfile
Port: 80
```

Build variable requerida:

```env
VITE_API_BASE_URL=https://<dominio_backend>/api
```

Importante: `VITE_API_BASE_URL` se aplica durante el build de Vite. Si cambia el dominio del backend, hay que hacer redeploy del frontend.

### 4. Orden Correcto De Deploy

1. Crear PostgreSQL.
2. Cargar migraciones SQL.
3. Crear backend con `DATABASE_URL` apuntando al PostgreSQL correcto.
4. Verificar `/api/health`.
5. Crear frontend con `VITE_API_BASE_URL` apuntando al backend publico.
6. Probar login con el usuario seed.

## Desarrollo Local

Backend:

```bash
cd backend
cp .env.example .env
pnpm install
pnpm dev
```

Frontend:

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
```

El frontend local usa proxy de Vite para enviar `/api` hacia `http://localhost:5000`.

## Builds

Backend:

```bash
cd backend
pnpm build
```

Frontend:

```bash
cd frontend
pnpm build
```

## Seguridad Y Operacion

- No subir `.env`, passwords, `DATABASE_URL` reales ni secretos JWT.
- Usar secretos largos y diferentes para `JWT_SECRET` y `JWT_REFRESH_SECRET`.
- Configurar backups automaticos del recurso PostgreSQL en Coolify.
- Confirmar el contenedor PostgreSQL correcto antes de correr migraciones.
- Mantener `FRONTEND_URL` alineado con el dominio publico real del frontend.
- Mantener `VITE_API_BASE_URL` alineado con el dominio publico real del backend.

## Documentacion Complementaria

- Guia operativa: [docs/coolify-split-deploy.md](docs/coolify-split-deploy.md)
- SDD de migracion: [specs/coolify-split-deploy](specs/coolify-split-deploy)
