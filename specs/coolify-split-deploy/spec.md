# Spec - Coolify Split Deploy

## Objetivo

Migrar SG Remesas hacia tres recursos independientes en Coolify: frontend, backend y PostgreSQL.

## Alcance

- Retirar la configuracion de stack unico del repositorio.
- Mantener `backend/Dockerfile` como unidad de despliegue de la API.
- Mantener `frontend/Dockerfile` como unidad de despliegue del cliente web.
- Usar PostgreSQL como recurso separado administrado por Coolify.
- Evitar secretos reales en Git.
- Documentar variables, puertos, healthchecks y orden de despliegue.

## Criterios de aceptacion

- El frontend no llama a `localhost` en produccion.
- El backend acepta CORS desde el dominio configurado del frontend.
- La API expone healthcheck en `/api/health`.
- Cada contenedor puede construirse de forma independiente desde su carpeta.
- El README y la guia de deploy describen el flujo de Coolify con tres recursos independientes.
