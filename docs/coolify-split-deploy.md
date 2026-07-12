# SG Remesas - Coolify Split Deploy

En Coolify el proyecto debe quedar dividido en tres recursos independientes:

- `sg-remesas-db`: PostgreSQL administrado por Coolify.
- `sg-remesas-backend`: API Express construida con `backend/Dockerfile`.
- `sg-remesas-frontend`: React/Vite + Nginx construido con `frontend/Dockerfile`.

## 1. Base de datos PostgreSQL

Crea un recurso PostgreSQL en Coolify con:

```env
POSTGRES_USER=remesas_user
POSTGRES_PASSWORD=<password_larga>
POSTGRES_DB=sg_remesas_db
```

Activa almacenamiento persistente hacia:

```text
/var/lib/postgresql/data
```

Cuando la base este arriba, carga las migraciones en orden desde el VPS:

```bash
cd ~/projects/sg-remesas
docker ps --format "{{.Names}}" | grep postgres
docker exec -i NOMBRE_POSTGRES psql -U remesas_user -d sg_remesas_db < backend/src/migrations/001_schema_init.sql
docker exec -i NOMBRE_POSTGRES psql -U remesas_user -d sg_remesas_db < backend/src/migrations/002_indexes_and_constraints.sql
docker exec -i NOMBRE_POSTGRES psql -U remesas_user -d sg_remesas_db < backend/src/migrations/003_seed_data.sql
```

## 2. Backend

Crea un recurso Dockerfile apuntando a:

```text
Base directory: /backend
Dockerfile: /backend/Dockerfile
Port: 5000
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

Healthcheck:

```text
/api/health
```

Verificacion desde el VPS:

```bash
curl http://localhost:5000/api/health
```

## 3. Frontend

Crea un recurso Dockerfile apuntando a:

```text
Base directory: /frontend
Dockerfile: /frontend/Dockerfile
Port: 80
```

Build variable requerida:

```env
VITE_API_BASE_URL=https://<dominio_backend>/api
```

Importante: `VITE_API_BASE_URL` se usa durante el build de Vite. Si cambia el dominio del backend, hay que hacer redeploy del frontend.

## 4. Orden de despliegue

1. Crear y arrancar PostgreSQL.
2. Cargar migraciones SQL.
3. Crear backend con `DATABASE_URL` apuntando al PostgreSQL correcto.
4. Probar `GET /api/health`.
5. Crear frontend con `VITE_API_BASE_URL` apuntando al backend publico.
6. Probar login con el usuario seed.

Usuario seed:

```text
admin@sgremesas.com
Admin1234!
```

## 5. Notas de calidad

- No commitear `.env`, passwords, `DATABASE_URL` reales ni secretos JWT.
- Mantener frontend, backend y DB como recursos separados permite redeployar cada parte sin reiniciar todo el sistema.
- Para produccion, configurar backups automaticos del recurso PostgreSQL en Coolify.
- Si hay varios Postgres en el VPS, confirma el contenedor correcto con `docker ps` antes de correr migraciones.
