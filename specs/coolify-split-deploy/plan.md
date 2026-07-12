# Plan - Coolify Split Deploy

1. Retirar la configuracion de stack unico del repositorio.
2. Parametrizar frontend con `VITE_API_BASE_URL`.
3. Reemplazar URLs hardcodeadas a `localhost:5000`.
4. Remover proxy Nginx interno hacia `backend`.
5. Agregar healthchecks en Dockerfiles.
6. Ajustar CORS del backend para aceptar uno o varios origenes desde `FRONTEND_URL`.
7. Documentar el flujo de Coolify y las variables por recurso.
8. Validar build/typecheck de frontend y backend.
