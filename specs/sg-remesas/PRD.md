# Proyecto 02 — Sistema de Gestión Operativo para Negocio de Remesas

> **Versión:** 2.0  
> **Fecha:** 2026-06-24  
> **Autor:** Rafael Marín  
> **Estado:** Borrador

---

## 1. Descripción General

Sistema web completo para una empresa que procesa remesas, retiros y cobros entre distintas cuentas y monedas. El sistema tiene dos capas:

- **Landing page pública** — sitio de marketing donde se presentan los servicios de la empresa. Los clientes pueden registrarse y crear su cuenta desde aquí.
- **Dashboard privado** — panel de gestión con acceso diferenciado por rol: el cliente consulta y solicita operaciones sobre sus propias cuentas; los operadores registran y procesan transacciones; el administrador gestiona todo el sistema; el auditor revisa sin modificar.

**Problema que resuelve:** Las empresas de remesas y transferencias en LATAM suelen operar con Excel y WhatsApp, lo que genera errores, falta de trazabilidad, lentitud en los procesos y ausencia de reportes en tiempo real. Este sistema provee una plataforma web segura, auditable y con cara pública para atraer y gestionar clientes.

---

## 2. Alcance

### 2.1 Incluido en este proyecto
- Landing page con secciones: hero, servicios, tarifas, cobertura, registro y contacto
- Registro de clientes desde la landing (email + contraseña, verificación de email)
- Autenticación y autorización con 4 roles: Cliente, Operador, Administrador, Auditor
- **Acceso para visitantes (Guest) con credenciales de solo lectura para demostración segura**
- **Soporte multi-idioma (Español e Inglés) seleccionable desde la interfaz**
- Panel del cliente: ver sus cuentas, historial de transacciones propias, solicitar operaciones
- Panel del operador: registrar y procesar transacciones, atender solicitudes de clientes
- Gestión de cuentas (bancarias, digitales, efectivo) en múltiples monedas
- Registro y seguimiento de transacciones (remesas, retiros, cobros, transferencias internas)
- Dashboard administrativo con métricas en tiempo real
- Módulo de reportes: exportación CSV/PDF por rango de fechas, cuenta o tipo
- Log de auditoría completo (quién hizo qué y cuándo)
- API REST documentada con Swagger/OpenAPI
- Consulta de tasas de cambio en tiempo real mediante API externa (Frankfurter API): el usuario puede ver cuánto equivale 1 USD en MXN, CAD en PEN, etc. desde el dashboard y la landing
- Sistema de tickets de soporte: el cliente crea tickets con preguntas o reportes; el operador o admin responde. El operador puede abrir un ticket a nombre de un cliente cuando la interacción ocurre por teléfono u otro canal externo. Cada ticket mantiene un hilo de mensajes con trazabilidad completa

### 2.2 Fuera de alcance
- Integración directa con APIs bancarias o sistemas de pago externos (Visa, SWIFT, etc.)
- App móvil nativa
- Módulo contable o fiscal
- Chat interno entre operadores

---

## 3. Actores del Sistema

| Actor | Descripción | Acceso |
|-------|-------------|--------|
| Cliente | Persona que contrata los servicios de remesas. Se registra desde la landing page | Ver sus propias cuentas y transacciones, solicitar operaciones, actualizar su perfil |
| Operador | Personal interno que procesa operaciones diarias | Crear y actualizar transacciones, atender solicitudes de clientes, ver todas las cuentas. No puede eliminar ni acceder a configuración |
| Administrador | Dueño o gerente del negocio. Gestión total del sistema | CRUD completo: cuentas, transacciones, usuarios, clientes, configuración, reportes |
| Auditor | Rol de solo lectura para revisión interna o contable | Ver todas las transacciones, logs y reportes. Sin crear ni modificar nada |
| Visitante (Guest) | Usuario de prueba preconfigurado para explorar el sistema | Acceso de solo lectura al panel de cliente, con bloqueo de transacciones, tickets o perfil (BR-37) |

---

## 4. Requerimientos Funcionales (RF)

### 4.1 Landing page y registro

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-01 | Landing page | Página pública con secciones: hero con CTA, servicios ofrecidos, cobertura de países, tarifas/comisiones, formulario de contacto y enlace a registro | Visitante | Alta |
| RF-02 | Registro de cliente | El visitante crea su cuenta desde la landing con dos opciones: (a) email + contraseña, recibe verificación por email; (b) OAuth con Google — el email queda verificado automáticamente. En ambos casos se solicita nombre completo y país antes de acceder al dashboard | Cliente | Alta |
| RF-03 | Verificación de email | Los registros por email + contraseña reciben un enlace de verificación. Sin verificar, el cliente no puede acceder al dashboard. Los registros via OAuth no requieren verificación manual | Sistema | Alta |

### 4.2 Autenticación y sesión

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-04 | Autenticación JWT + OAuth | Dos métodos de login: (a) email + contraseña con JWT (access token + refresh token, expiración configurable); (b) OAuth con Google — el backend intercambia el código de autorización por el perfil del usuario y emite su propio JWT. El dashboard renderiza vistas distintas según el rol incluido en el token | Todos | Alta |
| RF-04b | Acceso de visitante (Guest) | El sistema expone un usuario demo preconfigurado (username: `Guest`, password: `Guest123!_User` o similar) para explorar la plataforma sin registrarse. Este usuario tiene permisos de Cliente con restricciones estrictas de solo lectura (BR-37) | Visitante | Alta |
| RF-04c | Selector de idioma (Internacionalización) | La interfaz permite cambiar dinámicamente entre Español e Inglés en la landing y el dashboard. La preferencia del idioma se persiste en LocalStorage y se transmite al backend para los mensajes de la API | Todos | Alta |
| RF-05 | Recuperación de contraseña | El cliente solicita reset de contraseña ingresando su email. El sistema envía un enlace con token de un solo uso que expira en 1 hora. Solo aplica a cuentas registradas con email + contraseña; las cuentas OAuth no tienen contraseña que recuperar | Cliente | Alta |

### 4.3 Panel del cliente

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-06 | Perfil del cliente | El cliente puede ver y actualizar: nombre, teléfono, dirección y documentos de identidad cargados. El admin valida/aprueba los documentos | Cliente | Alta |
| RF-07 | Ver cuentas propias | El cliente ve únicamente las cuentas que le fueron asignadas: saldo actual, moneda, tipo y enlace al historial de movimientos de esa cuenta | Cliente | Alta |
| RF-08 | Últimas transacciones del cliente | Menú propio "Mis transacciones" con las últimas operaciones del cliente en orden cronológico descendente. Cada fila muestra: tipo de operación, monto enviado con su moneda de origen, monto equivalente en moneda destino (ej. 500 USD → 8.617 MXN), tasa de cambio aplicada, estado y fecha. Filtros por rango de fechas y estado. Paginación de 20 registros por página | Cliente | Alta |
| RF-08b | Mis tickets | Menú "Mis tickets" donde el cliente ve todos los tickets que ha abierto (o que el operador abrió a su nombre): estado, categoría, fecha de apertura y último mensaje. Puede abrir el hilo completo de cada ticket y responder | Cliente | Alta |
| RF-09 | Solicitar operación | El cliente puede crear una solicitud de remesa o retiro indicando: monto, moneda, cuenta destino y beneficiario. La solicitud queda en estado "pendiente" hasta que un operador la procese | Cliente / Operador | Alta |

### 4.4 Panel interno (Operador / Admin / Auditor)

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-10 | Gestión de usuarios y clientes | El admin crea, edita, activa/desactiva usuarios internos (operadores, auditores) y clientes. Asigna roles. Aprueba documentos de identidad de clientes. Puede resetear la contraseña de usuarios internos directamente desde el panel; no puede ver ni modificar la contraseña de clientes | Admin | Alta |
| RF-11 | Gestión de cuentas | El admin registra cuentas con: nombre, tipo (banco, digital, efectivo), moneda, saldo inicial, cliente asociado (si aplica) y estado | Admin / Operador | Alta |
| RF-12 | Registro de transacciones | El operador registra transacciones: tipo, cuenta origen, cuenta destino, monto, moneda, tasa de cambio, beneficiario, referencia y notas. Puede vincularla a una solicitud de cliente | Operador / Admin | Alta |
| RF-13 | Estados de transacción | Una transacción pasa por: pendiente → en proceso → completada / fallida / revertida. Cada cambio se registra con usuario y timestamp | Operador / Admin | Alta |
| RF-14 | Actualización de saldo | Al completar una transacción, los saldos de las cuentas involucradas se actualizan automáticamente dentro de una transacción PostgreSQL. Al revertir, los saldos vuelven al estado anterior | Sistema | Alta |
| RF-15 | Dashboard administrativo | Vista con: saldo por cuenta, total del día, transacciones pendientes, volumen semanal (gráfico) y solicitudes de clientes sin atender | Admin / Operador | Alta |
| RF-16 | Módulo de reportes (Admin / Auditor) | Menú dedicado con los siguientes reportes generables y exportables a CSV y PDF: (1) **Reporte de transacciones** — filtros por rango de fechas, cuenta, tipo, estado, moneda, operador y cliente; (2) **Reporte de clientes** — total de clientes registrados, clientes activos/inactivos, nuevos por período, con o sin transacciones; (3) **Trazabilidad de tickets** — tickets por estado, categoría, tiempo promedio de resolución, operador asignado y cliente; (4) **Reporte de auditoría** — historial de acciones del sistema por usuario, entidad y rango de fechas; (5) **Resumen ejecutivo diario/semanal/mensual** — volumen total procesado, número de transacciones, cantidad de clientes activos y tickets abiertos. El alcance real de cada reporte está limitado por los datos que se persisten en la BD | Admin / Auditor | Media |
| RF-17 | Log de auditoría | Cada acción (create, update, delete, login, cambio de estado) queda registrada con: usuario, acción, entidad, valores antes/después y timestamp | Sistema | Alta |
| RF-18 | Configuración del sistema | El admin configura: monedas habilitadas, nombre del negocio, textos de la landing | Admin | Baja |

### 4.5 Sistema de tickets de soporte

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-20 | Crear ticket (cliente) | El cliente abre un ticket desde su dashboard: asunto, categoría (consulta, reclamo, problema técnico, otro) y descripción. El ticket queda en estado "abierto" | Cliente | Alta |
| RF-21 | Crear ticket a nombre de cliente (operador) | El operador puede crear un ticket seleccionando un cliente de la lista, indicando que la interacción fue por teléfono u otro canal externo. El ticket queda vinculado al cliente y visible en su dashboard | Operador / Admin | Alta |
| RF-22 | Responder ticket | El operador o admin agrega mensajes al hilo del ticket. El cliente también puede responder para continuar la conversación. Cada mensaje registra autor y timestamp | Cliente / Operador / Admin | Alta |
| RF-23 | Cambiar estado del ticket | El operador o admin puede cambiar el estado: abierto → en revisión → resuelto / cerrado. El cliente puede reabrir un ticket cerrado si el problema persiste | Operador / Admin / Cliente | Alta |
| RF-24 | Listado y filtros de tickets | El cliente ve solo sus propios tickets. El operador y admin ven todos los tickets con filtros por estado, categoría, cliente y rango de fechas | Todos | Media |
| RF-25 | Notificación interna de nuevo mensaje | El dashboard muestra una alerta cuando hay tickets con mensajes sin leer (operador/admin: todos los tickets; cliente: los suyos) | Todos | Media |

### 4.6 Tasas de cambio en tiempo real

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-19 | Consulta de tasas de cambio en tiempo real | El sistema consume la Frankfurter API para mostrar la equivalencia entre monedas. Disponible en la landing (widget público) y en el dashboard (panel de referencia). Ejemplos: 1 USD → MXN, 1 CAD → PEN, 1 EUR → COP. El operador puede usar la tasa sugerida como valor base al registrar una transacción o ingresarla manualmente | Todos | Media |

### 4.7 Sistema de comisiones

> Modelo **fee + spread** (igual al usado por Western Union, Remitly y similares): porcentaje sobre el monto enviado con un mínimo fijo garantizado, más cargos adicionales opcionales por envío. El admin tiene control total desde un panel dedicado.

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-26 | Panel de gestión de comisiones | El admin accede a un panel dedicado para configurar el sistema de comisiones. Puede establecer una **comisión base global** (porcentaje y monto mínimo fijo en moneda de referencia), y crear **reglas específicas por par de monedas** (currency_from / currency_to) que sobreescriben la base. Cada regla puede activarse o desactivarse individualmente sin eliminarla | Admin | Alta |
| RF-27 | Cálculo automático de comisión | Al registrar una transacción, el sistema calcula la comisión aplicando la regla del par correspondiente; si no existe regla activa para ese par, usa la comisión base global. Fórmula aplicada: `comisión = MAX(monto × tasa_%, mínimo_fijo) + Σ(cargos_adicionales)` El resultado queda almacenado de forma inmutable en la transacción | Sistema | Alta |
| RF-28 | Vista previa de costos antes de confirmar | Antes de confirmar una transacción, el operador (y el cliente desde su solicitud) visualiza un desglose detallado: monto enviado, tasa de cambio aplicada, comisión calculada (% aplicado y monto resultante), cargos adicionales itemizados y **monto total que se débita al cliente**. No es posible confirmar sin haber generado este preview | Operador / Cliente | Alta |
| RF-29 | Cargos adicionales por transacción | El admin puede definir cargos adicionales reutilizables (ej. "Fee de envío: $2.00 USD") con nombre, monto y moneda. Al registrar una transacción, el operador o admin puede seleccionar uno o más cargos para aplicarlos. Los cargos se suman a la comisión base y se almacenan en el campo `additional_charges (JSONB)` de la transacción para trazabilidad histórica | Admin / Operador | Media |

### 4.8 Gestión dinámica de roles y permisos (RBAC)

> El sistema implementa **Role-Based Access Control (RBAC) configurable**: los roles no son constantes en el código sino entidades en la base de datos. El admin puede crear roles personalizados (ej. Supervisor, Contador, Gerente Regional) y asignarles permisos granulares de un catálogo predefinido. Esto permite adaptar el sistema a cualquier estructura jerárquica empresarial sin cambios en el código.

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-30 | Gestión de roles | El admin puede crear, editar y desactivar roles personalizados con nombre y descripción. Los cuatro roles base del sistema (`admin`, `operador`, `auditor`, `cliente`) son de solo lectura — no pueden eliminarse ni renombrarse, pero el admin puede crear variantes adicionales (ej. `supervisor`, `contador`, `gerente`) | Admin | Alta |
| RF-31 | Asignación de permisos por rol | Al crear o editar un rol, el admin selecciona los permisos habilitados de un catálogo predefinido organizado por módulos: **Transacciones** (ver, crear, cambiar estado, revertir), **Clientes** (ver, crear, editar, aprobar documentos), **Reportes** (ver reportes propios, exportar), **Comisiones** (ver configuración, editar), **Usuarios** (ver, crear, asignar roles), **Auditoría** (ver log), **Tickets** (ver todos, responder, cambiar estado). La interfaz muestra los permisos como checkboxes agrupados por módulo | Admin | Alta |
| RF-32 | Navegación dinámica por permisos | El sidebar y los menús del dashboard se renderizan en base a los permisos incluidos en el JWT, no al nombre del rol. Cada ítem del menú requiere un permiso específico. Si el usuario no tiene el permiso, el ítem no aparece (ni tampoco el endpoint responde — doble validación: frontend + backend middleware) | Sistema | Alta |
| RF-33 | Asignación de rol a usuario | El admin asigna un rol a cualquier usuario interno desde el panel de gestión de usuarios. El cambio de rol invalida el JWT activo del usuario — en su próximo request recibirá 401 y deberá hacer login de nuevo para obtener un token con los permisos actualizados | Admin | Alta |

### 4.9 Sistema de incentivos para operadores

> Modelo de **comisión por tramos progresivos** (similar a esquemas de incentivo de ventas): el operador gana un porcentaje del monto que procesa, con tramos que aumentan la tasa a medida que crece el valor de la transacción. Existe un monto mínimo de **$100 USD equivalente** para que una transacción genere comisión. El admin controla quién participa y cómo se estructuran los tramos — incluyendo configuración individual por operador.

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-34 | Panel de incentivos de operadores | El admin accede a un panel dedicado donde puede: (1) configurar **tramos de comisión globales** (monto mínimo USD, monto máximo USD opcional, tasa porcentual) que aplican a cualquier operador sin configuración propia; (2) definir **tramos individuales por operador** que sobreescriben los globales — monto mínimo, monto máximo y tasa configurables de forma independiente para cada operador; (3) habilitar o deshabilitar la elegibilidad de comisión por operador individualmente; (4) ver el historial de tramos por operador. Esto permite que el admin incentive de forma diferenciada a operadores según su nivel de experiencia o rendimiento | Admin | Alta |
| RF-35 | Cálculo automático de incentivo al operador | Al completar una transacción, el sistema verifica si el operador es elegible (`commission_eligible = true`) y si el monto normalizado a USD equivalente es ≥ al mínimo configurado para ese operador (default $100 USD). Busca primero los tramos del propio operador; si no tiene tramos propios, usa los globales. Identifica el tramo por rango de monto y calcula: `incentivo_operador = monto_usd × tasa_tramo_%`. El resultado queda registrado en `operator_commission_log` con el tramo aplicado | Sistema | Alta |
| RF-36 | Reporte de incentivos por operador | El admin puede generar un reporte por período (semana / mes) que muestra, por cada operador elegible: número de transacciones que generaron comisión, monto total procesado, tasa promedio aplicada e **importe total a pagar**. Exportable a CSV y PDF | Admin | Media |

### 4.10 KYC por niveles y límites operativos

> En el sector de remesas, los reguladores exigen verificar la identidad del cliente antes de permitir operaciones significativas. El sistema implementa **tres niveles KYC** con límites de transacción escalonados. El admin aprueba o rechaza las verificaciones. Sin KYC aprobado, el cliente opera con restricciones.

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-37 | Niveles KYC y límites operativos | El sistema mantiene tres niveles: **KYC-0** (email verificado, sin documento): puede enviar hasta $500 USD/mes y $200 USD por transacción; **KYC-1** (documento de identidad cargado y aprobado): hasta $5.000 USD/mes y $1.500 por transacción; **KYC-2** (verificación completa — documento + comprobante de domicilio): sin límite operativo configurable. Los umbrales son configurables desde `config` | Admin / Sistema | Alta |
| RF-38 | Gestión de solicitudes KYC | El cliente sube sus documentos (foto de cédula/pasaporte, comprobante de domicilio) desde su dashboard. El admin y auditor ven una bandeja de solicitudes pendientes con los documentos adjuntos y pueden aprobar, rechazar o solicitar corrección con un comentario. El cliente recibe notificación del resultado | Admin / Auditor / Cliente | Alta |
| RF-39 | Bloqueo automático por límite KYC | Antes de confirmar una transacción el sistema verifica el gasto mensual acumulado del cliente en USD equivalente. Si la nueva transacción superaría el límite de su nivel KYC, el sistema la rechaza con un mensaje claro que indica el saldo disponible del mes y cómo subir de nivel | Sistema | Alta |

### 4.11 Libreta de beneficiarios

> El cliente guarda sus destinatarios frecuentes para no llenar el formulario completo cada vez. Común en todas las apps de remesas.

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-40 | Gestión de beneficiarios | El cliente puede crear, editar y eliminar beneficiarios con: nombre completo, país de destino, banco, número de cuenta/CLABE/IBAN, tipo de cuenta y moneda. Al registrar una transacción, el operador o el cliente puede seleccionar un beneficiario guardado en lugar de llenar los datos manualmente | Cliente / Operador | Alta |
| RF-41 | Uso de beneficiario en solicitud | Al crear una solicitud desde el dashboard del cliente, el formulario ofrece un selector de beneficiarios guardados. Si se selecciona uno, los campos de destino se precargan automáticamente. El cliente puede sobrescribir los valores sin modificar el beneficiario guardado | Cliente | Media |

### 4.12 Módulo de cumplimiento y alertas AML

> Compliance básico que cualquier empresa de remesas necesita demostrar ante reguladores. El auditor revisa las alertas generadas automáticamente por el sistema.

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-42 | Generación automática de alertas de cumplimiento | El sistema evalúa cada transacción completada contra un conjunto de reglas configurables y genera una alerta si se cumple alguna: (1) **Umbral de monto** — transacción individual ≥ $3.000 USD equivalente; (2) **Fraccionamiento** — 3 o más transacciones al mismo beneficiario en menos de 24 horas cuya suma supera $2.000 USD; (3) **Primer envío de alto monto** — cliente nuevo (< 30 días de registro) con transacción ≥ $1.500 USD. Los umbrales son configurables desde el panel de admin | Sistema | Alta |
| RF-43 | Revisión de alertas por auditor | El auditor accede a una bandeja de alertas con filtros por estado (pendiente / revisada / descartada), tipo de regla, cliente y rango de fechas. Puede marcar una alerta como revisada o descartada agregando un comentario obligatorio. Las alertas pendientes aparecen como badge en el sidebar del auditor y del admin | Auditor / Admin | Alta |
| RF-44 | Configuración de reglas AML | El admin puede modificar los umbrales de las reglas de cumplimiento (monto, período de tiempo, número de transacciones) y activarlas o desactivarlas individualmente desde el panel de configuración | Admin | Media |

### 4.13 Rastreo público de transacciones

> El cliente puede compartir el estado de su envío con el beneficiario usando solo el código de seguimiento — sin necesidad de login.

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-45 | Código de seguimiento público | Cada transacción tiene un `tracking_code` alfanumérico único (ej. `REM-2024-AB3X7`) generado al crearla. El sistema expone un endpoint público `GET /track/:code` que devuelve: estado actual, fecha de creación, monto enviado (sin datos del remitente ni del operador). El cliente ve el código en el detalle de su transacción y puede copiarlo para compartirlo | Cliente / Público | Media |
| RF-46 | Página pública de rastreo | La landing page incluye una sección de búsqueda por código de seguimiento accesible sin login. Muestra el estado de la transacción con un indicador visual de progreso (pendiente → en proceso → completada). No expone datos personales del cliente ni del beneficiario | Público | Media |

### 4.14 Notificaciones internas

> Badge en el dashboard + historial de notificaciones. Sin push externo — implementación interna simple y funcional.

| ID | Nombre | Descripción | Actor | Prioridad |
|----|--------|-------------|-------|-----------|
| RF-47 | Generación de notificaciones internas | El sistema genera notificaciones automáticas ante los siguientes eventos: cambio de estado en una transacción del cliente, nueva respuesta en un ticket, aprobación o rechazo de documento KYC, alerta de cumplimiento nueva (para auditor/admin). Las notificaciones se persisten en la tabla `notifications` con referencia a la entidad asociada | Sistema | Alta |
| RF-48 | Centro de notificaciones en el dashboard | El sidebar muestra un badge con el conteo de notificaciones no leídas. Al acceder al centro de notificaciones, el usuario ve la lista ordenada por fecha con: icono por tipo, título, descripción corta y enlace directo a la entidad (ej. clic → abre el ticket o la transacción). Puede marcar como leídas individualmente o todas a la vez | Todos | Alta |

---

## 5. Requerimientos No Funcionales (RNF)

| ID | Categoría | Descripción |
|----|-----------|-------------|
| RNF-01 | Seguridad | JWT con firma HS256. Contraseñas con bcrypt (salt rounds ≥ 12). Rate limiting en endpoints de auth. CORS restringido al dominio del cliente. Rutas del dashboard inaccesibles sin token válido |
| RNF-02 | Integridad de datos | Las operaciones que afectan saldos se ejecutan dentro de transacciones PostgreSQL (BEGIN / COMMIT / ROLLBACK). Un fallo parcial hace rollback completo |
| RNF-03 | Rendimiento | El dashboard carga en menos de 2 segundos. Consultas de reportes con más de 10.000 registros completan en menos de 5 segundos con índices PostgreSQL adecuados |
| RNF-04 | Aislamiento de datos | Un cliente solo puede ver sus propias cuentas y transacciones. El filtro por `client_id` se aplica en el servidor, nunca solo en el frontend |
| RNF-05 | Trazabilidad | Toda modificación de datos queda en el log de auditoría. Ningún registro se elimina físicamente (soft delete con `deleted_at`) |
| RNF-06 | Mantenibilidad | Arquitectura en capas: rutas → controladores → servicios → repositorio. Separación clara entre lógica de negocio y persistencia |
| RNF-07 | Usabilidad | Interfaz en español. Tablas paginadas. Formularios con validación en frontend y backend. Mensajes de error claros |
| RNF-08 | Escalabilidad | La API REST puede conectarse a otros clientes (app móvil, integraciones) sin cambios en el backend |
| RNF-09 | Disponibilidad | Desplegado en VPS Linux con PM2 + Nginx como reverse proxy. Reinicio automático ante caídas |
| RNF-10 | 2FA — opcional y configurable | La autenticación de dos factores (TOTP vía Google Authenticator / Authy) queda **fuera del alcance de la entrega base**. Si el cliente lo solicita como extensión, se implementa con `speakeasy` + `qrcode` en el backend. El admin puede habilitarlo globalmente o por rol desde la configuración del sistema. No afecta el diseño del núcleo de auth |

---

## 6. Lógica de Negocio / Reglas de Negocio (BR)

| ID | Regla | Descripción |
|----|-------|-------------|
| BR-01 | Saldo insuficiente | Un retiro o remesa no puede completarse si el saldo de la cuenta origen es menor al monto de la operación |
| BR-02 | Transacción inmutable | Una transacción en estado "completada" no puede editarse ni eliminarse. Solo puede revertirse creando una transacción opuesta con referencia a la original |
| BR-03 | Moneda consistente | En una transferencia entre cuentas de distinta moneda se requiere una tasa de cambio. El sistema sugiere la tasa actual desde Frankfurter API pero el operador puede sobrescribirla. No se permite tasa = 0 |
| BR-04 | Rol único | Un usuario tiene un solo rol activo. Cambiar el rol revoca el anterior |
| BR-05 | Cuenta inactiva | No se pueden crear transacciones sobre una cuenta inactiva |
| BR-06 | Soft delete | Ningún registro de transacción, cuenta, usuario o cliente se elimina físicamente. Se marca con `deleted_at` y `is_active = false` |
| BR-07 | Nota obligatoria en cambio de estado | Todo cambio de estado en una transacción requiere un comentario en el campo `notes` |
| BR-08 | Solicitud de cliente | Una solicitud de cliente en estado "pendiente" solo puede ser procesada por un operador o admin. El cliente no puede marcarla como completada |
| BR-09 | Verificación obligatoria | Un cliente con email no verificado no puede acceder al dashboard ni crear solicitudes |
| BR-10 | Aislamiento de tickets | Un cliente solo puede ver y responder sus propios tickets. El acceso a tickets de otros clientes devuelve 403 |
| BR-11 | Reapertura de ticket | Un cliente puede reabrir un ticket con estado "cerrado" solo si han pasado menos de 30 días desde el cierre. Pasado ese plazo debe abrir uno nuevo |
| BR-12 | Trazabilidad de canal | Cuando el operador crea un ticket a nombre de un cliente, el campo `opened_via` debe registrar el canal real (phone, email, etc.) para preservar la trazabilidad |
| BR-13 | Colisión de email OAuth | Si un usuario intenta registrarse con Google usando un email que ya existe como cuenta local, el sistema no crea una cuenta duplicada. En su lugar, muestra un mensaje indicando que ese email ya tiene cuenta y debe iniciar sesión con email + contraseña |
| BR-14 | Recuperación solo para cuentas locales | El endpoint de reset de contraseña verifica que `auth_provider = local`. Si el email corresponde a una cuenta OAuth, responde con un mensaje indicando que la cuenta usa Google para iniciar sesión |
| BR-15 | Admin puede resetear contraseña de usuarios internos | El admin puede establecer una nueva contraseña temporal para operadores y auditores desde el panel. Al hacerlo, el sistema marca `must_change_password = true` y obliga al usuario a cambiarla en su próximo login |
| BR-16 | Admin no puede gestionar contraseñas de clientes | El endpoint de cambio de contraseña por admin valida que el usuario objetivo tenga `role != cliente`. Intentar cambiar la contraseña de un cliente devuelve 403. Los clientes gestionan su propia contraseña mediante el flujo de recuperación (RF-05) |
| BR-17 | Cascada de comisiones | Al calcular la comisión de una transacción, el sistema busca primero una regla activa en `commission_rules` para el par `(currency_from, currency_to)`. Si no existe, usa los valores `commission_default_percent` y `commission_default_min_fixed` de la tabla `config`. Si ambos están en cero, la transacción procede sin comisión y se deja constancia en el campo `commission_rate_applied = 0` |
| BR-18 | Comisión inmutable una vez completada | Cuando una transacción alcanza estado "completada", los campos `commission_rate_applied`, `commission_amount`, `additional_charges` y `total_charged` no pueden modificarse. Son parte del registro histórico e irreversible |
| BR-19 | Vista previa obligatoria antes de confirmar | El backend no acepta crear una transacción sin que el frontend envíe el `commission_snapshot` calculado. El backend valida que el snapshot sea consistente con las reglas vigentes en ese momento antes de persistir; si las reglas cambiaron entre el preview y la confirmación, rechaza la operación con 409 y obliga a recalcular |
| BR-20 | Cargo adicional requiere nombre y monto | Todo cargo adicional aplicado a una transacción debe incluir: `label` (nombre descriptivo), `amount` (monto numérico > 0) y `currency` (código ISO 4217). El JSONB `additional_charges` no acepta entradas incompletas |
| BR-21 | Unicidad de regla activa por par de monedas | La tabla `commission_rules` tiene un constraint UNIQUE parcial sobre `(currency_from, currency_to)` donde `is_active = true`. Para modificar una regla vigente, el admin la desactiva y crea una nueva, preservando el historial de tasas aplicadas |
| BR-22 | Roles base son inmutables | Los roles `admin`, `operador`, `auditor` y `cliente` tienen `is_system = true`. No pueden eliminarse, desactivarse ni renombrarse. Cualquier intento desde la API devuelve 403 |
| BR-23 | El rol `admin` tiene todos los permisos y no puede reducirse | No es posible quitar permisos al rol `admin`. La tabla `role_permissions` tiene una restricción que impide eliminar registros donde `role.is_system = true AND role.name = 'admin'` |
| BR-24 | Cambio de rol invalida el JWT activo | Al reasignar el rol de un usuario, el sistema incrementa el campo `token_version` en la tabla `users`. El middleware de auth valida que el `token_version` del JWT coincida con el de la BD; si no coincide, rechaza con 401 |
| BR-25 | Un usuario con rol desactivado no puede autenticarse | El endpoint de login verifica que `role.is_active = true`. Si el rol fue desactivado, el usuario recibe 403 con mensaje descriptivo aunque sus credenciales sean válidas |
| BR-26 | Cascada de tramos de incentivo por operador | Para calcular el incentivo al operador el sistema aplica: (1) busca tramos activos en `operator_commission_tiers` donde `operator_id = id_del_operador`; (2) si no existen, usa los tramos globales donde `operator_id IS NULL`; (3) dentro del set de tramos aplicable, identifica el tramo cuyo rango (`min_amount_usd` ≤ monto < `max_amount_usd`) coincida con el monto de la transacción normalizado a USD; (4) si ningún tramo cubre el monto, no se genera incentivo |
| BR-27 | Monto mínimo para generar incentivo | Una transacción solo genera incentivo al operador si su monto equivalente en USD es ≥ al valor `min_amount_usd` del primer tramo activo del operador (o del primer tramo global si no tiene tramos propios). El mínimo por defecto es $100 USD. El admin puede configurar un mínimo diferente por operador definiendo su primer tramo a partir de otro valor |
| BR-28 | Incentivo calculado sobre monto bruto | El incentivo del operador se calcula sobre el monto de la transacción (`amount`), **no** sobre el `total_charged` del cliente ni sobre la comisión cobrada. Son dos flujos económicos independientes: uno es ingreso del negocio, el otro es costo de nómina |
| BR-29 | Incentivo inmutable una vez registrado | Un registro en `operator_commission_log` no puede modificarse después de crearse. Si una transacción es revertida, se crea un registro de ajuste con monto negativo referenciando el log original, preservando el historial completo |
| BR-30 | Límite KYC verificado antes de confirmar | Antes de persistir una transacción el backend calcula el gasto mensual del cliente en USD (suma de `total_charged` de transacciones completadas en el mes calendario). Si `gasto_actual + nueva_transacción > límite_kyc_nivel`, rechaza con 422 e incluye en la respuesta el saldo disponible restante y el nivel KYC requerido para subir el límite |
| BR-31 | KYC-0 no puede crear transacciones de alto valor | Un cliente con `kyc_level = 0` no puede registrar transacciones individuales que superen el umbral configurado (default $200 USD equivalente). El operador tampoco puede crear transacciones a nombre de un cliente KYC-0 que excedan este límite |
| BR-32 | Historial KYC auditado | Cada cambio de nivel KYC (aprobación, rechazo, solicitud de corrección) queda registrado en `kyc_history` con el usuario que tomó la acción, el estado anterior y el nuevo, y el comentario obligatorio del revisor |
| BR-33 | Beneficiario privado por cliente | Un cliente solo puede ver y usar sus propios beneficiarios. El operador puede ver los beneficiarios de un cliente al gestionar una transacción a su nombre, pero no puede ver los de otros clientes |
| BR-34 | Tracking code único e inmutable | El `tracking_code` de una transacción se genera al crearla y nunca cambia, incluso si la transacción es revertida. El endpoint `/track/:code` no requiere autenticación y responde aunque la transacción esté en cualquier estado |
| BR-35 | Alerta AML no bloquea la transacción | Una alerta de cumplimiento es informativa — no detiene la transacción automáticamente. La decisión de actuar sobre ella es del auditor. Si el auditor o admin desea bloquear futuras operaciones de un cliente, debe hacerlo explícitamente desactivando la cuenta desde el panel de usuarios |
| BR-36 | Notificación entregada una sola vez por evento | El sistema verifica que no exista ya una notificación no leída del mismo tipo + entidad antes de crear una nueva. Esto evita duplicar notificaciones si el mismo evento se dispara más de una vez por error |
| BR-37 | Restricciones de escritura para el usuario Guest | El usuario demo 'Guest' tiene prohibido realizar cualquier acción de creación, actualización o eliminación (POST, PUT, DELETE) en la base de datos. Al intentar realizar una solicitud de remesa, crear beneficiarios, enviar mensajes, abrir tickets, modificar perfil o subir documentos, el backend debe retornar 403 Forbidden y el frontend bloquear el envío y mostrar un aviso |
| BR-38 | Consistencia de idioma en API | El backend debe usar la cabecera `Accept-Language` de la petición HTTP para formatear las respuestas de error y mensajes informativos en el idioma del cliente (Español o Inglés). Si no se proporciona, se usará Español como idioma por defecto |

---

## 7. Modelo de Datos Preliminar

### Entidades principales

- **roles:** id, name (único), description, is_system (boolean — true para admin/operador/auditor/cliente: protegidos, no eliminables), is_active, created_by (FK), created_at, updated_at
- **permissions:** id, code (ej. `transactions.create`, `reports.export`, `commissions.edit`), description, module (transactions/clients/reports/commissions/users/audit/tickets), created_at
- **role_permissions:** role_id (FK), permission_id (FK) — PRIMARY KEY compuesto
- **users:** id, name, email, password_hash (nullable — null en cuentas OAuth), **role_id (FK → roles.id)**, **token_version (integer, default 0 — se incrementa al cambiar rol para invalidar JWT activo)**, auth_provider (local/google), provider_id (nullable — ID de Google para cuentas OAuth), **commission_eligible (boolean, default false — habilita cálculo de incentivo para operadores)**, is_active, email_verified, email_verify_token, reset_token, reset_token_expires, must_change_password (boolean, default false), created_at, deleted_at
- **client_profiles:** id, user_id (FK), phone, country, address, **kyc_level (0/1/2, default 0)**, created_at, updated_at
- **accounts:** id, name, type (bank/digital/cash), currency, balance, client_id (FK, nullable — null = cuenta interna), is_active, created_by, created_at, deleted_at
- **transactions:** id, type (remesa/retiro/cobro/transfer), account_origin_id, account_destination_id, amount, currency, exchange_rate, beneficiary_id (FK nullable — si se usó beneficiario guardado), beneficiary_snapshot (JSONB — copia de los datos del beneficiario al momento del envío), reference, **tracking_code** (VARCHAR 20, único, generado al crear), status (pending/processing/completed/failed/reversed), notes, client_request_id (FK, nullable), **commission_rate_applied** (DECIMAL 5,4), **commission_amount** (DECIMAL 12,2), **additional_charges** (JSONB, default '[]'), **total_charged** (DECIMAL 12,2), created_by, created_at, updated_at, deleted_at
- **transaction_status_log:** id, transaction_id, previous_status, new_status, changed_by, notes, changed_at
- **client_requests:** id, client_id (FK), type (remesa/retiro), amount, currency, destination_account_info, beneficiary, notes, status (pending/processing/completed/rejected), processed_by (FK, nullable), created_at, updated_at
- **audit_log:** id, user_id, action (CREATE/UPDATE/DELETE/LOGIN/STATUS_CHANGE), entity, entity_id, old_values (JSONB), new_values (JSONB), ip_address, created_at
- **tickets:** id, client_id (FK), created_by (FK — puede ser el cliente o un operador), subject, category (consulta/reclamo/problema_tecnico/otro), status (open/in_review/resolved/closed), opened_via (web/phone/email/other), created_at, updated_at, closed_at
- **ticket_messages:** id, ticket_id (FK), author_id (FK), body, created_at
- **commission_rules:** id, currency_from (CHAR 3, ej. USD), currency_to (CHAR 3, ej. MXN), rate_percent (DECIMAL 5,4 — ej. 2.50 para 2.5%), min_fixed_amount (DECIMAL 12,2), min_fixed_currency (CHAR 3), is_active (boolean, default true), created_by (FK), created_at, updated_at
- **operator_commission_tiers:** id, **operator_id (FK nullable — NULL = tramo global, valor = tramo específico del operador)**, min_amount_usd (DECIMAL 12,2), max_amount_usd (DECIMAL 12,2 nullable — NULL = sin límite superior), rate_percent (DECIMAL 5,4), is_active (boolean, default true), created_by (FK), created_at, updated_at
- **operator_commission_log:** id, transaction_id (FK), operator_id (FK), transaction_amount_usd (DECIMAL 12,2 — monto normalizado a USD al momento del cálculo), tier_id (FK — referencia al tramo aplicado), rate_percent_applied (DECIMAL 5,4), commission_amount_usd (DECIMAL 12,2), adjustment_ref_id (FK nullable — apunta al log original si este registro es un ajuste por reversión), created_at
- **kyc_documents:** id, client_id (FK), level_requested (1/2), document_type (id_card/passport/proof_of_address), file_url, status (pending/approved/rejected/correction_needed), reviewed_by (FK nullable), reviewer_comment, submitted_at, reviewed_at
- **kyc_history:** id, client_id (FK), previous_level, new_level, action (approved/rejected/correction_needed), performed_by (FK), comment, created_at
- **beneficiaries:** id, client_id (FK), name, bank_name, account_number, account_type (checking/savings/clabe/iban), country (ISO 3166), currency (CHAR 3), is_active, created_at, updated_at, deleted_at
- **compliance_rules:** id, code (threshold_amount/structuring/new_client_high_value), description, threshold_amount_usd (DECIMAL 12,2), window_hours (integer nullable), transaction_count (integer nullable), is_active, updated_by, updated_at
- **compliance_alerts:** id, transaction_id (FK), client_id (FK), rule_code, triggered_amount_usd (DECIMAL 12,2), status (pending/reviewed/dismissed), reviewed_by (FK nullable), reviewer_comment, created_at, reviewed_at
- **notifications:** id, user_id (FK), type (transaction_status/ticket_reply/kyc_update/compliance_alert), title, body, entity_type (transaction/ticket/kyc_document/compliance_alert), entity_id, is_read (boolean, default false), created_at
- **config:** id, key, value, updated_by, updated_at — *claves de comisión: `commission_default_percent`, `commission_default_min_fixed`, `commission_default_min_fixed_currency`; claves KYC: `kyc0_max_monthly_usd`, `kyc0_max_single_usd`, `kyc1_max_monthly_usd`, `kyc1_max_single_usd`; claves AML: configuradas en `compliance_rules`*

### Relaciones clave

```
users 1 ──── 1 client_profiles (solo role=cliente)
users 1 ──── N accounts (created_by)
accounts 1 ──── N transactions (origin / destination)
transactions 1 ──── N transaction_status_log
client_requests 1 ──── 1 transactions (cuando se procesa)
users 1 ──── N tickets (client_id)
users 1 ──── N tickets (created_by — operador abriendo a nombre del cliente)
tickets 1 ──── N ticket_messages
users 1 ──── N audit_log
users N ──── 1 roles (role_id)
roles N ──── N permissions (via role_permissions)
client_profiles 1 ──── N kyc_documents
client_profiles 1 ──── N kyc_history
users 1 ──── N beneficiaries (client_id)
transactions N ──── 1 beneficiaries (beneficiary_id, nullable)
transactions 1 ──── N compliance_alerts
users 1 ──── N notifications
commission_rules N ──── 1 users (created_by)
operator_commission_tiers N ──── 1 users (operator_id, nullable → global)
transactions 1 ──── 1 operator_commission_log (si operador elegible)
```

### Ejemplo de `additional_charges` en transacción

```json
[
  { "label": "Fee de envío", "amount": 2.00, "currency": "USD" },
  { "label": "Cargo urgencia", "amount": 5.00, "currency": "USD" }
]
```

### Ejemplo de cálculo de comisión al cliente (BR-17)

```
Transacción: 500 USD → MXN
Regla activa USD→MXN: rate_percent=2.50%, min_fixed=3.00 USD
commission = MAX(500 × 0.025, 3.00) = MAX(12.50, 3.00) = 12.50 USD
additional_charges = [{ "label": "Fee de envío", "amount": 2.00, "currency": "USD" }]
total_charged = 500 + 12.50 + 2.00 = 514.50 USD
```

### Ejemplo de tramos de incentivo para operadores (BR-22)

```
Tramos configurados para Operador A (override individual):
  Tramo 1: $100 – $499 USD → 0.60%
  Tramo 2: $500 – $999 USD → 0.90%
  Tramo 3: $1.000+ USD    → 1.25%   (max_amount_usd = NULL)

Tramos globales (aplicables a operadores sin configuración propia):
  Tramo 1: $100 – $499 USD → 0.50%
  Tramo 2: $500 – $999 USD → 0.75%
  Tramo 3: $1.000+ USD    → 1.00%

Caso: Operador A procesa transacción de 750 USD
→ Usa tramos propios → Tramo 2 aplica (500–999)
→ incentivo = 750 × 0.009 = 6.75 USD registrado en operator_commission_log

Caso: Operador B (sin tramos propios) procesa transacción de 1.200 USD
→ Usa tramos globales → Tramo 3 aplica (1.000+)
→ incentivo = 1.200 × 0.01 = 12.00 USD registrado en operator_commission_log

Caso: Cualquier operador procesa transacción de 80 USD
→ Monto < mínimo del primer tramo ($100) → no genera incentivo
```

---

## 8. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend (landing) | React 18 + Vite + React Router | SPA con rutas públicas (landing) y privadas (dashboard) |
| Frontend (dashboard) | React 18 + Context API / Zustand | Estado global de sesión y rol. Vistas condicionadas por rol |
| UI Library | Tailwind CSS + shadcn/ui | Diseño limpio y componentes accesibles |
| Gráficos | Recharts | Gráfico de barras para volumen semanal en dashboard |
| Backend | Node.js + Express | API REST. Middleware para auth y control de roles |
| Autenticación | JWT (jsonwebtoken) + bcrypt + Passport.js | JWT para sesiones. Passport.js con `passport-google-oauth20` para OAuth. bcrypt solo para cuentas email+contraseña |
| OAuth provider | Google OAuth 2.0 | Login/registro social desde la landing. Credenciales en Google Cloud Console |
| Email | Nodemailer + SMTP | Verificación de cuenta y recuperación de contraseña |
| Gestor de paquetes | pnpm | Más rápido que npm, workspace-friendly para monorepo `/client` + `/server` |
| Base de datos | PostgreSQL 16 | Transacciones ACID. JSONB para audit_log. Índices para reportes |
| Query Builder | pg (node-postgres) + SQL directo | Control total de queries. Sin overhead de ORM en lógica financiera |
| Tasas de cambio | Frankfurter API (`api.frankfurter.app`) | Gratuita, sin API key, datos del BCE. Endpoint: `/latest?from=USD&to=MXN,PEN,COP` |
| Documentación API | Swagger / OpenAPI 3.0 | Endpoints documentados con ejemplos para el cliente |
| Despliegue | VPS Linux (Ubuntu 22.04) + Nginx + PM2 | Misma arquitectura que entornos productivos en LATAM |
| Control de versiones | Git + GitHub | Repositorio privado |

---

## 9. Criterios de Aceptación

| RF | Criterio | Verificación |
|----|----------|--------------|
| RF-01 | La landing page es accesible sin sesión y muestra todas sus secciones | Navegar a la raíz `/` sin token |
| RF-02 | Un visitante puede registrarse y recibe email de verificación | Completar formulario → revisar bandeja de entrada |
| RF-03 | Sin verificar email, el login al dashboard devuelve 403 | Intentar login antes de verificar → error esperado |
| RF-04 | Login genera JWT válido. Token expirado es rechazado con 401 | Test con Postman |
| RF-07/08 | El cliente solo ve sus propias cuentas y transacciones, nunca las de otros | Crear 2 clientes con transacciones distintas y verificar aislamiento |
| RF-09 | Solicitud del cliente aparece como "pendiente" hasta que un operador la procesa | Crear solicitud como cliente → verificar en panel de operador |
| RF-13 | Al completar una transacción los saldos se actualizan correctamente | Comparar saldo antes/después en PostgreSQL |
| RF-13 | Si la transacción falla, el saldo NO cambia (rollback) | Simular error en el servicio → verificar que no hay cambio de saldo |
| RF-16 | La exportación CSV contiene exactamente los registros del filtro aplicado | Comparar CSV con query SQL manual |
| RF-17 | Cada acción aparece en audit_log con timestamp y usuario correcto | Realizar acciones y revisar tabla `audit_log` |
| BR-01 | El sistema rechaza retiros cuando el saldo es insuficiente | Intentar retiro mayor al saldo → debe retornar 422 |
| BR-02 | No es posible editar una transacción completada | PUT /transactions/:id con estado "completada" → debe retornar 403 |
| BR-09 | Cliente con email no verificado no puede acceder al dashboard | Verificar respuesta 403 en cualquier endpoint protegido |
| RF-26/27 | El sistema aplica la regla del par correcta o la base si no existe | Crear regla USD→MXN al 3%. Registrar transacción USD→MXN → `commission_rate_applied = 0.03`. Registrar transacción USD→COP sin regla → usa la base de `config` |
| RF-27 | El mínimo fijo se aplica cuando el porcentaje es inferior | Transacción de 50 USD con regla 2%, mínimo $3 → comisión debe ser $3, no $1 |
| RF-28 | No es posible confirmar sin enviar `commission_snapshot` | POST /transactions sin el campo `commission_snapshot` → debe retornar 422 |
| RF-29 | Los cargos adicionales se persisten fielmente en la transacción | Aplicar fee de $2 → verificar en `transactions.additional_charges` que el JSONB contiene `label`, `amount` y `currency` |
| BR-19 | Si la tasa cambió entre preview y confirmación, el backend rechaza | Cambiar la regla mientras el operador tiene el preview abierto → confirmar → debe retornar 409 |
| RF-35 | Solo se genera incentivo si el monto ≥ al mínimo del primer tramo | Procesar transacción de $80 USD → `operator_commission_log` no debe tener nuevo registro |
| RF-35 | Tramos propios tienen prioridad sobre tramos globales | Configurar tramos para Operador A y tramos globales → procesar transacción → verificar que el tramo aplicado en `operator_commission_log.tier_id` pertenece a Operador A |
| RF-36 | El reporte de incentivos totaliza correctamente por operador | Procesar 3 transacciones con el mismo operador → reporte debe mostrar suma exacta de `commission_amount_usd` |
| BR-25 | Al revertir una transacción se crea ajuste negativo en el log | Revertir transacción con incentivo generado → verificar nuevo registro en `operator_commission_log` con `amount` negativo y `adjustment_ref_id` apuntando al original |
| RF-30/31 | El admin puede crear un rol personalizado con permisos seleccionados | Crear rol "Supervisor" con permisos `transactions.view`, `transactions.status_change`, `reports.view` → verificar en `role_permissions` |
| RF-32 | El sidebar muestra solo los ítems autorizados por los permisos del JWT | Hacer login con rol "Supervisor" → verificar que el menú no muestra "Gestión de usuarios" ni "Comisiones" |
| RF-33 | Cambiar el rol de un usuario invalida su JWT vigente | Reasignar rol mientras el usuario está activo → siguiente request con token antiguo debe retornar 401 |
| RF-30 | Los roles base no pueden ser eliminados | DELETE /roles/admin → debe retornar 403 |
| RF-37/BR-30 | Transacción rechazada cuando supera el límite KYC del cliente | Cliente KYC-0 intenta enviar $600 USD (límite $500/mes) → debe retornar 422 con `available_limit` en la respuesta |
| RF-38 | Subida de documento KYC actualiza el estado del cliente | Cliente sube documento → `kyc_documents.status = pending` → admin aprueba → `client_profiles.kyc_level` sube a 1 → `kyc_history` registra el cambio |
| RF-40 | Beneficiario guardado precarga el formulario de transacción | Crear beneficiario → iniciar nueva transacción seleccionándolo → campos de destino deben venir precargados del beneficiario |
| RF-42 | Alerta AML se genera para transacción que supera el umbral | Registrar transacción de $4.000 USD (umbral default $3.000) → verificar nuevo registro en `compliance_alerts` con `rule_code = threshold_amount` |
| RF-42 | Regla de fraccionamiento detecta el patrón | Registrar 3 transacciones al mismo beneficiario en < 24h cuya suma supera $2.000 → verificar alerta generada con `rule_code = structuring` |
| RF-45 | El tracking code es único y el endpoint no requiere auth | POST /transactions → verificar `tracking_code` en respuesta → GET /track/:code sin token → debe retornar estado de la transacción sin datos sensibles |
| RF-47/48 | Cambio de estado de transacción genera notificación al cliente | Operador cambia estado de transacción a "completada" → badge del cliente debe incrementarse en 1 → al abrir el centro, aparece la notificación con enlace a la transacción |
| RF-04b | Acceso Guest de solo lectura | Iniciar sesión como `Guest` con clave `Guest123!_User` → dashboard debe cargar con datos del cliente demo. Al intentar POST /transactions o POST /tickets con este token → debe retornar 403 Forbidden |
| RF-04c | Cambio de idioma dinámico en UI y API | Cambiar idioma a Inglés en el selector de la UI → textos e inputs deben cambiar a inglés. Petición con Accept-Language: en con datos incorrectos → la API debe retornar mensajes de error en inglés |

---

## 10. Restricciones y Supuestos

### Restricciones
- Sin integración con APIs bancarias externas ni procesadores de pago (Visa, SWIFT, etc.)
- Las tasas de Frankfurter API son de referencia (datos del BCE, actualizadas cada día hábil). No son tasas en tiempo real de mercado
- El despliegue requiere VPS con acceso SSH
- El envío de emails requiere credenciales SMTP (Gmail, SendGrid, etc.) provistas por el cliente

### Supuestos
- El cliente provee la lista de monedas habilitadas y las cuentas iniciales antes del desarrollo
- Hay un dominio o subdominio disponible para el sistema
- El volumen inicial no supera 50.000 registros en el primer año
- El cliente acepta que el sistema no procesa pagos reales: registra operaciones ya realizadas por canales externos

---

## 11. Entregables

| Entregable | Formato | Descripción |
|-----------|---------|-------------|
| Código fuente completo | GitHub repo privado | Monorepo con `/client` (React) y `/server` (Express + PostgreSQL) |
| Script de base de datos | .sql | Schema completo + seed de datos de prueba |
| Documentación de la API | URL Swagger en staging | Todos los endpoints con ejemplos y esquemas |
| Variables de entorno | .env.example | Template con todas las variables sin valores reales |
| Manual de despliegue | README.md | Pasos para instalar en VPS Linux desde cero |
| Demo funcional | URL staging | Panel con usuarios demo para cada rol (cliente, operador, admin, auditor) |
| Video walkthrough | Loom / MP4 | Grabación de 10–15 min recorriendo todos los paneles del sistema: landing, registro y login (local + OAuth), dashboard por cada rol (cliente, operador, admin, auditor), flujo completo de una remesa (solicitud → comisión calculada → tracking code), gestión de comisiones, KYC, tickets y notificaciones |

---

## 12. Referencias de Diseño

### 12.1 Landing page — referencia seleccionada: Wise

**Referencia:** https://wise.com  
**Uso:** Inspiración de estructura y elementos de confianza — NO copiar el diseño visual.

| Elemento a tomar de Wise | Aplicación en este proyecto |
|--------------------------|----------------------------|
| Widget de conversión de divisas integrado al hero | El widget de Frankfurter API va en el hero como CTA principal |
| Paleta clara que transmite confianza bancaria | Base blanca / gris claro, un color de acento propio (a definir) |
| Sección de países/cobertura con banderas | Adaptar con los países LATAM que cubre el negocio |
| Cifras de confianza ("X usuarios", "Y países") | Personalizar con los datos reales del cliente |
| Estructura hero → servicios → tarifas → registro | Mantener ese flujo, con copy e identidad visual propios |

**Paleta de colores definida:**

| Token | Hex | Uso |
|-------|-----|-----|
| Primary | `#1B3F72` | Hero, sidebar, botones principales |
| Accent | `#2ABFA3` | CTAs, ítem activo del sidebar, highlights |
| Surface | `#F5F7FA` | Fondo del dashboard y secciones alternas |
| Text | `#1A2332` | Texto principal |
| Tint | `#E8F8F5` | Fondos de badges y alertas de éxito |
| Warning | `#E07A00` | Contadores de pendientes |
| White | `#FFFFFF` | Cards del dashboard |

**Lo que debe ser 100% propio:**
- Nombre, logo e identidad visual del negocio
- Tipografía (sugerida: Inter o Plus Jakarta Sans — legibles, modernas, gratuitas)
- Ilustraciones o iconografía (sugerido: Tabler Icons — coherente con el stack)
- Tono del copy (más cercano y latinoamericano)

### 12.2 Dashboard — referencia seleccionada: Vercel

**Referencia:** https://vercel.com/dashboard  
**Uso:** Inspiración de layout de navegación y densidad de información — NO copiar el diseño visual.

| Elemento a tomar de Vercel | Aplicación en este proyecto |
|---------------------------|----------------------------|
| Sidebar fijo con íconos + etiquetas de texto | Menú lateral con ítems dinámicos según el rol del JWT |
| Topbar con breadcrumb + avatar de usuario | Mostrar sección activa + nombre y rol del usuario logueado |
| Navegación limpia sin sobrecarga visual | Máximo 6-7 ítems por rol, sin submenús anidados |
| Tabla principal con filtros y paginación inline | Vista de transacciones y tickets |
| Densidad media: información clara sin ser abrumadora | Balancear métricas y tablas sin amontonar |

**Lo que debe ser 100% propio:**
- Paleta de colores del dashboard (coherente con la landing)
- Componentes de métricas financieras (saldos, volumen, KPIs)
- Estados de color para transacciones (pendiente / completada / fallida)
- Diseño del hilo de tickets
- Iconografía propia o de una librería consistente (Tabler Icons recomendado)

**Layout base confirmado:**
```
┌─────────────┬──────────────────────────────────┐
│             │  Topbar: breadcrumb + rol + user  │
│  Sidebar    ├──────────────────────────────────┤
│  (nav por   │                                  │
│   rol)      │   Área de contenido principal    │
│             │   (cambia según la sección)       │
│             │                                  │
└─────────────┴──────────────────────────────────┘
```

Ítems del sidebar según rol del JWT:

| Rol | Menús visibles |
|-----|----------------|
| Cliente | Mis cuentas · Mis transacciones *(con conversión de moneda)* · Solicitudes · Mis tickets |
| Operador | Transacciones · Solicitudes pendientes · Clientes · Tickets · Cuentas · Tasas de cambio |
| Admin | Todo lo del operador + Usuarios · **Reportes** *(transacciones / clientes / tickets / auditoría)* · Configuración |
| Auditor | Transacciones *(solo lectura)* · **Reportes** *(todos)* · Log de auditoría |


---

## Requerimientos de Marca y Firma de Autor (Branding)

### 1. Firma en Código Fuente
Todos los archivos fuente principales del frontend y backend deben incluir obligatoriamente en su primera línea un bloque de comentarios con la firma del desarrollador y el enlace a su portafolio:
`javascript
/**
 * ====================================================================
 * PROYECTO: Sistema de Gestión Operativo para Negocio de Remesas
 * AUTOR: Rafael Marín
 * PORTFOLIO: https://github.com/marinm80
 * DESCRIPCIÓN: Desarrollado como proyecto práctico de nivel profesional.
 * ====================================================================
 */
`

### 2. Enlace en Frontend (Interfaz de Usuario)
La interfaz gráfica de usuario debe incluir de manera visible los siguientes elementos de redirección al portafolio personal:
- **Cintillo / Banner de Demostración (Dashboard/Panel):** Un banner estático o flotante en la parte superior o inferior del dashboard privado que indique:
  - *Español:* `✨ Estás viendo una aplicación de demostración de Rafael Marín. [Volver al Portafolio Principal ↗]`
  - *Inglés:* `✨ You are viewing a demo application by Rafael Marín. [Back to Main Portfolio ↗]`
- **Footer de Créditos (Landing Page / Web Pública):** En el pie de página de la landing page pública o sitio de inicio:
  - *Español:* `Diseñado y Desarrollado por Rafael Marín — Ver Portafolio`
  - *Inglés:* `Designed & Developed by Rafael Marín — View Portfolio`
- **Criterio de Aceptación Relacionado:** Al hacer clic en cualquiera de estos enlaces, el usuario debe ser redirigido al portafolio principal en una nueva pestaña del navegador (usando `target="_blank" rel="noopener noreferrer"`).