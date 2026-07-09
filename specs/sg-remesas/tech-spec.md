# Tech Spec: Sistema de Gestión de Remesas y Panel Operativo FullStack

> Slug: `sg-remesas` · Generado: 2026-06-26 · Spec funcional: `spec.md`

## NFRs

### Performance
- **Latencia objetivo:** 
  - Carga de vistas del Dashboard: p95 < 2.0s.
  - Consultas y exportación de reportes complejos (hasta 10.000 registros): p95 < 5.0s.
- **Throughput esperado:** Soporte inicial de hasta 10-20 requests concurrentes (bajo volumen operativo inicial de ~50.000 registros/año).
- **Picos conocidos:** Cierres de mes y quincenas, donde el volumen de remesas suele incrementarse un 150%.

### Disponibilidad
- **Uptime objetivo:** 99.5% de disponibilidad mensual.
- **Disaster Recovery (DR):** 
  - Backup diario automático de la base de datos PostgreSQL (RPO: 24 horas).
  - Tiempo de recuperación ante desastres (RTO): < 4 horas.
- **Tolerancia a downtime:** Tolerancia de mantenimiento planificado en ventanas nocturnas (02:00 a 04:00 GMT-6).
- **Multi-región:** No requerido. Instancia única en VPS.

### Compliance
- **Regulaciones aplicables:** Cumplimiento normativo básico de remesas locales y regulaciones AML/CFT (Prevención de Lavado de Dinero y Financiamiento al Terrorismo).
- **Retención de datos:** Historial transaccional y logs de auditoría retenidos de forma permanente en base de datos.
- **Derecho al olvido:** No aplica directamente a transacciones debido a requerimientos de retención fiscal y regulatoria de remesas. La desactivación se realiza mediante bloqueo lógico de usuarios (`is_active = false`).

### Deployment
- **Target:** Servidor VPS Linux (Ubuntu 22.04) con Nginx como proxy reverso y PM2 para la gestión y monitoreo del proceso de Node.js.
- **Containerización:** Opcional (se prioriza despliegue directo con PM2 según el PRD, pero compatible con Docker si es requerido).
- **IaC:** Ninguno (configuración manual o mediante scripts bash del servidor).

### Observabilidad
- **Logs:** Registro detallado de acciones críticas en la tabla `audit_log` (CREATE/UPDATE/DELETE/LOGIN/STATUS_CHANGE) con captura de valores anteriores y posteriores en formato JSONB.
- **Trazas:** Trazas básicas mediante logs estructurados en Express.
- **Métricas:** Monitoreo básico del estado del sistema a través del administrador de procesos PM2.
- **SLOs:** 99.5% de peticiones HTTP exitosas (código 2xx/3xx/4xx, excluyendo 5xx por caídas de red o fallas del backend).

### Testing
- **Niveles:** Unit testing para la lógica de comisiones, tramos de incentivos y límites KYC. Integration testing para los endpoints de la API REST.
- **Cobertura mínima:** 70% de cobertura en servicios críticos (cálculo de comisiones, alertas AML, control de saldos).
- **Herramientas preferidas:** Jest o Vitest para pruebas en backend, Postman/Newman para APIs.

### i18n / a11y
- **Idiomas:** Español como idioma nativo y exclusivo del sistema (tanto landing page como dashboard).
- **WCAG:** Accesibilidad básica (legibilidad de contraste, uso de semántica HTML y etiquetas descriptivas).
- **RTL:** No requerido.

### Cache
- **CDN:** No requerido (los activos estáticos del frontend se sirven directamente desde el servidor web o se integrará Cloudflare en modo básico para protección).
- **App cache:** Caché en memoria interna o base de datos de la tasa de Frankfurter API para evitar consultas repetitivas innecesarias ante cada visita de la landing.
- **TTL:** 12 horas para la tasa de Frankfurter API (debido a que se actualiza una vez al día hábil).

### Auth
- **Mecanismo:** Autenticación local mediante JWT (Access Token con corta duración + Refresh Token) firmado con HS256 y contraseñas cifradas con bcrypt (rounds ≥ 12). Integración de login social vía Google OAuth 2.0 (Passport.js).
- **MFA:** No obligatorio en el alcance inicial (configurable opcionalmente en el futuro).
- **Modelo de autorización:** Control de acceso basado en roles (RBAC) dinámico en base de datos. Los permisos se verifican tanto en el renderizado del sidebar como en el middleware del backend.

### Multi-tenant
- **Modelo:** Monotenant con aislamiento estricto de datos de clientes a nivel lógico. Todas las consultas de cuentas, transacciones, beneficiarios y tickets aplican un filtro obligatorio por `client_id` (o el ID del usuario cliente autenticado en el token).

### Seguridad de datos
- **Encriptación at-rest:** Respaldos de BD cifrados. Almacenamiento seguro de llaves de API Frankfurter y credenciales SMTP.
- **Encriptación in-transit:** Uso de HTTPS obligatorio (certificado SSL/TLS mediante Let's Encrypt).
- **Secret management:** Configuración mediante variables de entorno en archivo `.env` del servidor.
- **PII identificada:** Cédulas, pasaportes, comprobantes de domicilio subidos (archivos en `/uploads` restringidos), direcciones físicas, números de teléfono y números de cuenta bancaria.

---

## Restricciones explícitas (lo que NO se puede usar)
- **ORMs pesados:** No usar ORMs como Sequelize o Prisma. La interacción con la BD se debe realizar con `node-postgres` (`pg`) utilizando SQL puro para garantizar el máximo control y performance en transacciones financieras ACID.
- **Pasarelas de Pago:** No se permiten llamadas directas a APIs de dispersión monetaria real.
- **Estructura mutable de base de datos:** No se permite eliminación física (`DELETE`) en tablas de transacciones, cuentas o usuarios.

---

## Aspiraciones no negociables
- **Integridad ACID:** El saldo de las cuentas involucradas debe actualizarse obligatoriamente dentro del bloque transaccional del registro de la transacción. Cualquier error en el proceso debe hacer rollback total.
- **Invalidación de sesión activa:** Un cambio de rol del usuario debe invalidar inmediatamente su JWT actual, forzando la reautenticación en el siguiente request.

---

## TBD (decisiones pendientes que serán resueltas en plan.md)
- **Estrategia de caché para Frankfurter API:** Definición exacta de la estructura para almacenar la última tasa Frankfurter API caída y su mecanismo de fallback manual/automático.
- **Verificación de email en Staging:** Definición de si se utilizará un servicio SMTP real o un mock/capturador de correos local para la fase de desarrollo.
