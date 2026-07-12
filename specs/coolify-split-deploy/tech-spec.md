# Tech Spec - Coolify Split Deploy

## Recursos

- Frontend: React/Vite compilado en una imagen Nginx.
- Backend: Node.js 20 Alpine ejecutando `dist/index.js`.
- Database: PostgreSQL 16 Alpine creado como recurso de Coolify.

## Variables

Frontend build:

```env
VITE_API_BASE_URL=https://<backend-domain>/api
```

Backend runtime:

```env
DATABASE_URL=postgresql://remesas_user:<password>@<postgres-host>:5432/sg_remesas_db
FRONTEND_URL=https://<frontend-domain>
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
```

## Red

Coolify debe resolver la comunicacion backend -> DB mediante el host interno del recurso PostgreSQL o mediante la URL interna generada por Coolify.

El navegador del usuario debe comunicarse frontend -> backend mediante el dominio publico del backend, no mediante nombres internos de Docker.
