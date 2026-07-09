# Tasks: Sistema de Gestión de Remesas y Panel Operativo FullStack

> Slug: `sg-remesas` · Generado: 2026-06-26 · Basado en: plan.md
> Total de tareas: 30 · Esfuerzo estimado: 48 horas

## Convenciones
- **Estado:** `pending` | `in_progress` | `done` | `blocked` | `skipped`
- **Esfuerzo:** en horas (0.5, 1, 2, 4)
- **Dependencias:** lista de IDs T-NNN que deben completarse antes

---

## T-001 — Configuración inicial del repositorio y proyectos frontend/backend

- **Estado:** done
- **Esfuerzo:** 1.0h
- **Depende de:** ninguna
- **Archivos esperados:** `/frontend/package.json`, `/frontend/tsconfig.json`, `/backend/package.json`, `/backend/tsconfig.json`, `package.json` (raíz, opcional)
- **Criterio de done:**
  - Existencia de los directorios `/frontend` y `/backend`.
  - Instalación exitosa de TypeScript en ambos directorios.
  - Compilación inicial exitosa (`tsc`) con un archivo hello world en cada carpeta.
- **Notas:** Configurar dependencias base para Express en backend y React en frontend.

---

## T-002 — Configuración del entorno de base de datos con Docker Compose

- **Estado:** done
- **Esfuerzo:** 0.5h
- **Depende de:** ninguna
- **Archivos esperados:** `/docker-compose.yml`, `/backend/.env.example`
- **Criterio de done:**
  - `docker compose up -d` arranca un contenedor de PostgreSQL 16 correctamente.
  - Conexión exitosa al puerto 5432.
  - `.env.example` en backend incluye las variables `DATABASE_URL` y variables de entorno del servidor.
- **Notas:** Usar credenciales seguras por defecto pero parametrizables.

---

## T-003 — Migración 001: Esquema de base de datos DDL inicial

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-002
- **Archivos esperados:** `/backend/src/migrations/001_schema_init.sql`
- **Criterio de done:**
  - Ejecución manual del script SQL sobre la base de datos sin errores de sintaxis.
  - Verificación de la creación de las tablas de usuarios, roles, permisos, cuentas, transacciones y demás entidades especificadas con sus llaves foráneas correspondientes.
- **Notas:** Asegurar que las tablas indicadas en el plan usen UUID v4 (`gen_random_uuid()`) o SERIAL de forma correcta.

---

## T-004 — Migración 002: Índices de base de datos y restricciones parciales

- **Estado:** done
- **Esfuerzo:** 1.0h
- **Depende de:** T-003
- **Archivos esperados:** `/backend/src/migrations/002_indexes_and_constraints.sql`
- **Criterio de done:**
  - Creación exitosa de los índices de performance para transacciones, notificaciones, alertas AML y cuentas.
  - Aplicación de la restricción UNIQUE parcial para reglas de comisiones activas por par de monedas.
- **Notas:** Seguir al pie de la letra los índices definidos en la propuesta del plan de base de datos.

---

## T-005 — Migración 003: Semilla de datos iniciales (Seed)

- **Estado:** done
- **Esfuerzo:** 1.0h
- **Depende de:** T-004
- **Archivos esperados:** `/backend/src/migrations/003_seed_data.sql`
- **Criterio de done:**
  - Inserción sin errores de los roles base (`admin`, `operador`, `auditor`, `cliente`), permisos por defecto y asociación de todos los permisos al rol `admin`.
  - Inserción de un usuario administrador inicial con clave encriptada (seed) y las configuraciones globales básicas en `config`.
- **Notas:** Clave del administrador inicial encriptada usando un hash bcrypt válido pregenerado para la semilla.

---

## T-006 — Backend: Inicialización del servidor Express y conexión a PostgreSQL

- **Estado:** done
- **Esfuerzo:** 1.5h
- **Depende de:** T-001, T-005
- **Archivos esperados:** `/backend/src/config/db.ts`, `/backend/src/index.ts`
- **Criterio de done:**
  - Conexión exitosa a la base de datos PostgreSQL desde Node.js usando un Pool de `pg`.
  - El servidor Express se levanta en un puerto (ej. 5000) y responde a un endpoint `/api/health` con estado 200 y mensaje JSON.
- **Notas:** Manejar adecuadamente variables de entorno y errores de conexión con el pool de base de datos.

---

## T-007 — Backend: Utilidades de seguridad (bcrypt, JWT) y configuración de Nodemailer

- **Estado:** done
- **Esfuerzo:** 1.5h
- **Depende de:** T-006
- **Archivos esperados:** `/backend/src/utils/crypto.ts`, `/backend/src/utils/mailer.ts`
- **Criterio de done:**
  - Funciones auxiliares para hashear y verificar contraseñas con bcrypt (salt rounds = 12).
  - Funciones para firmar y validar tokens JWT.
  - Configuración de Nodemailer usando Ethereal Email que genera una cuenta de prueba automática si no hay credenciales SMTP reales en el `.env`.
- **Notas:** El mailer de Ethereal debe imprimir en la consola del backend la URL para ver el correo simulado enviado.

---

## T-008 — Backend: Configuración de Passport.js y Google OAuth 2.0

- **Estado:** done
- **Esfuerzo:** 1.5h
- **Depende de:** T-007
- **Archivos esperados:** `/backend/src/config/passport.ts`
- **Criterio de done:**
  - Configuración básica de Passport con la estrategia de Google OAuth 2.0.
  - Implementación del flujo que recupera o crea la cuenta del cliente basándose en su email de Google y genera el token de sesión JWT del backend.
- **Notas:** Habilitar el flujo OAuth con credenciales mock/reales.

---

## T-009 — Backend: Capa de Repositorios (Parte 1: Usuarios y Perfiles)

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-006
- **Archivos esperados:** `/backend/src/repositories/user.repository.ts`
- **Criterio de done:**
  - Implementación del CRUD de usuarios y perfiles usando SQL directo.
  - Métodos específicos para buscar por email, incrementar `token_version` (BR-24) y verificar email.
- **Notas:** Retornar modelos limpios, libres de metadatos del driver de base de datos.

---

## T-010 — Backend: Capa de Repositorios (Parte 2: Cuentas y Transacciones)

- **Estado:** done
- **Esfuerzo:** 3.0h
- **Depende de:** T-009
- **Archivos esperados:** `/backend/src/repositories/account.repository.ts`, `/backend/src/repositories/transaction.repository.ts`
- **Criterio de done:**
  - Métodos CRUD para cuentas y transacciones.
  - Implementación transaccional robusta (BEGIN / COMMIT / ROLLBACK) para el registro de transacciones que afecten saldos de cuentas de origen y destino de manera atómica (BR-01, BR-14).
  - Métodos para revertir transacciones creando el espejo correspondiente (BR-02).
- **Notas:** Las consultas que editan saldos deben ejecutarse de forma secuencial y atómica en el mismo pool client.

---

## T-011 — Backend: Capa de Repositorios (Parte 3: Comisiones, Tramos e Incentivos)

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-006
- **Archivos esperados:** `/backend/src/repositories/commission.repository.ts`, `/backend/src/repositories/operator.repository.ts`
- **Criterio de done:**
  - Repositorio para reglas de comisiones (búsqueda por par de divisas y comisiones por defecto).
  - Repositorio para tramos de operador (búsqueda de tramos por id de operador y tramos globales).
  - Repositorio para log de incentivos y ajustes negativos por reversión de transacciones.
- **Notas:** Asegurar que las consultas de tramos filtren correctamente valores activos.

---

## T-012 — Backend: Capa de Repositorios (Parte 4: KYC, Beneficiarios, Tickets y Alertas)

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-006
- **Archivos esperados:** `/backend/src/repositories/kyc.repository.ts`, `/backend/src/repositories/beneficiary.repository.ts`, `/backend/src/repositories/ticket.repository.ts`, `/backend/src/repositories/compliance.repository.ts`
- **Criterio de done:**
  - Repositorio para libreta de beneficiarios, documentos KYC, historial de cambios de nivel.
  - Repositorio para tickets y mensajes de soporte.
  - Repositorio para reglas de cumplimiento AML y alertas generadas.
- **Notas:** Garantizar que todas las consultas de beneficiarios y tickets apliquen filtros obligatorios de privacidad de cliente.

---

## T-013 — Backend: Servicio de Autenticación, Middleware de Sesión y RBAC

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-007, T-009
- **Archivos esperados:** `/backend/src/services/auth.service.ts`, `/backend/src/middleware/auth.middleware.ts`
- **Criterio de done:**
  - Middleware que valida el token JWT y comprueba que `token_version` coincida con la base de datos (BR-24).
  - Middleware de control de acceso dinámico por permisos en base de datos (RBAC).
- **Notas:** Retornar 401 si el JWT es inválido o expirado y 403 si carece de permisos.

---

## T-014 — Backend: Servicio de Comisiones y Validación de Cargos Adicionales

- **Estado:** done
- **Esfuerfo:** 2.0h
- **Depende de:** T-010, T-011
- **Archivos esperados:** `/backend/src/services/commission.service.ts`
- **Criterio de done:**
  - Función de cálculo automático de comisión aplicando regla del par de divisas o la base de `config` (BR-17).
  - Validación del snapshot de comisión en el backend antes del guardado formal de una transacción (BR-19).
- **Notas:** Comprobar que se aplica la comisión máxima entre la tasa porcentual y el monto mínimo fijo.

---

## T-015 — Backend: Servicio de Cumplimiento AML y Generación de Alertas

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-012
- **Archivos esperados:** `/backend/src/services/aml.service.ts`
- **Criterio de done:**
  - Motor que evalúa reglas AML en cada transacción completada: (1) Umbral individual ≥ $3.000 USD; (2) Fraccionamiento (3+ tx en 24h que sumen ≥ $2.000 USD) al mismo beneficiario; (3) Primer envío de alto monto (≥ $1.500 USD en < 30 días de registro).
  - Generación automática de registros en `compliance_alerts` si se dispara alguna regla.
- **Notas:** Las alertas AML deben ser informativas y no detener la transacción directamente (BR-35).

---

## T-016 — Backend: Servicio de Incentivos para Operadores

- **Estado:** done
- **Esfuerzo:** 1.5h
- **Depende de:** T-011
- **Archivos esperados:** `/backend/src/services/incentive.service.ts`
- **Criterio de done:**
  - Algoritmo que normaliza el monto a USD (usando tasas de Frankfurter API), identifica el tramo del operador (o global) y calcula el incentivo porcentual (BR-26, BR-27).
  - Registro automático del incentivo al completar una transacción de un operador elegible.
- **Notas:** Validar que transacciones menores a $100 USD no generen incentivos.

---

## T-017 — Backend: Servicio de Soporte (Tickets) y Notificaciones Internas

- **Estado:** done
- **Esfuerzo:** 1.5h
- **Depende de:** T-012
- **Archivos esperados:** `/backend/src/services/ticket.service.ts`, `/backend/src/services/notification.service.ts`
- **Criterio de done:**
  - Lógica para responder tickets, cambiar estado y notificar.
  - Creación de notificaciones internas en la tabla `notifications` evitando duplicados por evento (BR-36).
- **Notas:** Enlazar notificaciones a la ruta correspondiente del dashboard.

---

## T-018 — Backend: Controladores y Rutas de Auth y Gestión de Usuarios

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-013
- **Archivos esperados:** `/backend/src/controllers/auth.controller.ts`, `/backend/src/routes/auth.routes.ts`, `/backend/src/controllers/user.controller.ts`, `/backend/src/routes/user.routes.ts`
- **Criterio de done:**
  - Rutas de registro, login (local + Google), verificación de email y reset de contraseña funcionando correctamente.
  - Rutas para que el administrador gestione usuarios, asigne roles y apruebe documentos.
- **Notas:** Incluir validaciones de request con Joi o express-validator.

---

## T-019 — Backend: Controladores y Rutas de Cuentas, Solicitudes y Transacciones

- **Estado:** done
- **Esfuerzo:** 2.5h
- **Depende de:** T-010, T-014, T-016
- **Archivos esperados:** `/backend/src/controllers/account.controller.ts`, `/backend/src/routes/account.routes.ts`, `/backend/src/controllers/transaction.controller.ts`, `/backend/src/routes/transaction.routes.ts`
- **Criterio de done:**
  - Endpoints para listar cuentas, crear solicitudes de remesas, calcular vista previa de comisiones (preview) y registrar transacciones oficiales.
  - Endpoint de reversión y endpoint de consulta pública de rastreo (`GET /api/track/:code`).
- **Notas:** Garantizar que la reversión valide permisos de operador/admin.

---

## T-020 — Backend: Controladores y Rutas de KYC, Beneficiarios, Tickets y Cumplimiento AML

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-012, T-015, T-017
- **Archivos esperados:** `/backend/src/controllers/kyc.controller.ts`, `/backend/src/routes/kyc.routes.ts`, `/backend/src/controllers/ticket.controller.ts`, `/backend/src/routes/ticket.routes.ts`, `/backend/src/controllers/compliance.controller.ts`, `/backend/src/routes/compliance.routes.ts`
- **Criterio de done:**
  - Subida de archivos KYC (usando multer a `/uploads`) y revisión de solicitudes de verificación.
  - Endpoints para libreta de beneficiarios, hilos de mensajes de tickets y bandeja de alertas AML para el Auditor.
- **Notas:** Proteger la carpeta `/uploads` y servir archivos mediante endpoint autenticado.

---

## T-021 — Frontend: Configuración de Vite, Tailwind CSS y shadcn/ui

- **Estado:** done
- **Esfuerzo:** 1.5h
- **Depende de:** T-001
- **Archivos esperados:** `/frontend/tailwind.config.js`, `/frontend/src/index.css`, `/frontend/components.json`
- **Criterio de done:**
  - Configuración exitosa de Tailwind CSS en Vite.
  - Inicialización de shadcn/ui y descarga básica de componentes (Button, Input, Card, Dialog, Table, Alert, DropdownMenu).
- **Notas:** Seguir la paleta de colores definida en el PRD (Wise/Vercel: Primary #1B3F72, Accent #2ABFA3).

---

## T-022 — Frontend: Enrutamiento y Tienda de Autenticación Zustand

- **Estado:** done
- **Esfuerzo:** 1.5h
- **Depende de:** T-021
- **Archivos esperados:** `/frontend/src/store/useAuthStore.ts`, `/frontend/src/App.tsx`
- **Criterio de done:**
  - Tienda Zustand con persistencia en localStorage para almacenar JWT y rol del usuario.
  - React Router configurado con rutas públicas y rutas protegidas filtradas por rol del usuario.
- **Notas:** Incluir logout automático si la API responde con error 401 (cambio de token_version).

---

## T-023 — Frontend: Landing Page, Widget Simulador y Tracking Público

- **Estado:** done
- **Esfuerzo:** 2.5h
- **Depende de:** T-022
- **Archivos esperados:** `/frontend/src/pages/Landing.tsx`
- **Criterio de done:**
  - Visualización de secciones hero, servicios, tarifas y contacto con la estética premium requerida (Wise).
  - Widget simulador de tasas funcional consumiendo Frankfurter API directamente.
  - Buscador público de transacciones por tracking code mostrando progreso (pendiente -> en proceso -> completada) sin exponer nombres de clientes.
- **Notas:** El simulador debe permitir ingresar monto y previsualizar conversión a monedas LATAM configuradas.

---

## T-024 — Frontend: Autenticación Local, OAuth Google y Verificación de Email

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-022
- **Archivos esperados:** `/frontend/src/pages/Login.tsx`, `/frontend/src/pages/Register.tsx`, `/frontend/src/pages/VerifyEmail.tsx`
- **Criterio de done:**
  - Formulario de registro local, formulario de inicio de sesión con alertas y botón de Google Login funcional.
  - Vista de confirmación de token de email visualizando feedback visual del backend.
- **Notas:** Validar formatos de entrada en los formularios antes del envío a la API.

---

## T-025 — Frontend: Layout de Dashboard, Sidebar Dinámico y Notificaciones

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-022
- **Archivos esperados:** `/frontend/src/layouts/DashboardLayout.tsx`
- **Criterio de done:**
  - Sidebar con ítems dinámicos según permisos del JWT (D-01 del PRD).
  - Topbar con avatar de usuario y centro de notificaciones dropdown (con el contador de notificaciones no leídas).
- **Notas:** Diseño limpio tipo Vercel con alta legibilidad.

---

## T-026 — Frontend: Panel de Cliente (Cuentas, Solicitudes, Beneficiarios, Tickets)

- **Estado:** done
- **Esfuerzo:** 3.0h
- **Depende de:** T-025
- **Archivos esperados:** `/frontend/src/pages/Dashboard/ClientDashboard.tsx`, `/frontend/src/pages/Dashboard/Beneficiaries.tsx`, `/frontend/src/pages/Dashboard/ClientTickets.tsx`
- **Criterio de done:**
  - Vista de saldos de cuentas propias e historial de últimas transacciones paginadas.
  - CRUD de libreta de beneficiarios frecuentes y formulario de solicitud de remesa/retiro con precarga.
  - Pantalla para abrir y responder tickets de soporte propios.
- **Notas:** Garantizar que no se muestre información de otros clientes.

---

## T-027 — Frontend: Panel de Operador (Caja, Solicitudes Pendientes, Transacciones)

- **Estado:** done
- **Esfuerzo:** 3.0h
- **Depende de:** T-025
- **Archivos esperados:** `/frontend/src/pages/Dashboard/OperatorDashboard.tsx`, `/frontend/src/pages/Dashboard/PendingRequests.tsx`, `/frontend/src/pages/Dashboard/TicketsManagement.tsx`
- **Criterio de done:**
  - Vista de transacciones diarias globales y caja.
  - Bandeja para registrar transacciones formales en base a solicitudes de clientes (con preview obligatorio de comisiones).
  - Bandeja para abrir tickets en nombre de clientes y responder soporte global.
- **Notas:** Bloquear opciones de eliminación de transacciones.

---

## T-028 — Frontend: Panel de Administrador (Roles, Comisiones, Tramos, Reportes)

- **Estado:** done
- **Esfuerzo:** 3.5h
- **Depende de:** T-025
- **Archivos esperados:** `/frontend/src/pages/Dashboard/AdminDashboard.tsx`, `/frontend/src/pages/Dashboard/CommissionsConfig.tsx`, `/frontend/src/pages/Dashboard/Reports.tsx`
- **Criterio de done:**
  - CRUD de roles y asignación de permisos (Checkboxes por módulo).
  - Configuración de comisiones por par de divisas y tramos de incentivos por operador (global e individuales).
  - Módulo de generación de reportes ejecutivos exportables a CSV/PDF.
- **Notas:** Los reportes incluyen filtros por fechas y descarga del archivo.

---

## T-029 — Frontend: Panel de Auditor (Log de Auditoría, Alertas AML)

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-025
- **Archivos esperados:** `/frontend/src/pages/Dashboard/AuditorDashboard.tsx`, `/frontend/src/pages/Dashboard/AmlAlerts.tsx`
- **Criterio de done:**
  - Bandeja de visualización del log de auditoría global del sistema (con filtros por usuario y fechas).
  - Bandeja de revisión de alertas de cumplimiento AML (con opción de marcar como revisada/descartada con comentario).
- **Notas:** Todo el panel debe ser de solo lectura.

---

## T-030 — Pruebas de Integración E2E, Swagger y Manual de Instalación

- **Estado:** done
- **Esfuerzo:** 2.0h
- **Depende de:** T-018, T-019, T-020, T-029
- **Archivos esperados:** `/backend/src/swagger.json`, `/README.md`
- **Criterio de done:**
  - Configuración de Swagger/OpenAPI con documentación interactiva de endpoints.
  - Ejecución de pruebas básicas de flujos en Postman sin errores.
  - Manual detallado de instalación, variables de entorno, arranque de Docker y comandos de PM2 en el README.md principal.
- **Notas:** El README.md debe ser claro y paso a paso para despliegue en VPS Linux.

---

## Resumen

| Bloque | Tareas | Esfuerzo |
|---|---|---|
| Fundación | T-001, T-002 | 1.5h |
| Modelo de datos | T-003, T-004, T-005 | 4.0h |
| Backend Base & Utilidades | T-006, T-007, T-008 | 4.5h |
| Backend Repositorios | T-009, T-010, T-011, T-012 | 9.0h |
| Backend Servicios | T-013, T-014, T-015, T-016, T-017 | 9.0h |
| Backend Rutas y Controllers | T-018, T-019, T-020 | 6.5h |
| Frontend Base & Estilos | T-021, T-022 | 3.0h |
| Frontend Vistas Públicas | T-023, T-024 | 4.5h |
| Frontend Dashboards & Vistas | T-025, T-026, T-027, T-028, T-029 | 14.0h |
| Pruebas & Documentación | T-030 | 2.0h |
| **TOTAL** | 30 tareas | **58.0h** |

## Ruta crítica
T-001 → T-002 → T-003 → T-006 → T-009 → T-013 → T-018 → T-021 → T-022 → T-025 → T-028 → T-030

## Tareas paralelizables
- `T-004` y `T-005` se pueden paralelizar tras completar `T-003`.
- Los repositorios `T-009`, `T-010`, `T-011`, `T-012` pueden implementarse de forma independiente tras levantar `T-006`.
- Los controladores `T-018`, `T-019`, `T-020` pueden implementarse en paralelo una vez definida la capa de servicios.
- El diseño de los diferentes paneles de dashboard `T-026`, `T-027`, `T-028`, `T-029` en el frontend se puede realizar en paralelo una vez configurado el layout base `T-025`.

## Próximo paso
Proceder a la ejecución e implementación progresiva de las tareas. Empezando por la inicialización de carpetas y proyectos (`T-001`).
