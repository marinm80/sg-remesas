# Spec: Sistema de Gestión de Remesas y Panel Operativo FullStack

> Slug: `sg-remesas` · Modo de entrada: C (Documento existente) · Generado: 2026-06-26

## Historia de usuario
* **Como Administrador**, quiero gestionar cuentas, usuarios, comisiones, tramos de operadores y visualizar reportes ejecutivos, para tener control total de la rentabilidad, el cumplimiento normativo y la operativa general del negocio.
* **Como Operador**, quiero registrar transacciones (remesas, retiros, cobros y transferencias) y procesar solicitudes de clientes de forma ágil, para garantizar la correcta ejecución de las operaciones diarias.
* **Como Cliente**, quiero solicitar remesas, guardar beneficiarios frecuentes, realizar el seguimiento de mis transacciones y abrir tickets de soporte, para enviar dinero de manera confiable y transparente.
* **Como Auditor**, quiero inspeccionar las transacciones, revisar logs de auditoría e investigar alertas AML, para verificar el cumplimiento de las regulaciones y la integridad del sistema.

## Alcance
### Incluye
- **Landing Page Pública:** Presentación de servicios, formulario de contacto, widget de simulación de tasas (vía Frankfurter API) y página pública de rastreo de remesas sin requerimiento de login.
- **Registro y Autenticación:** Registro local con verificación de correo (Nodemailer) y OAuth con Google (intercambio de tokens JWT). Recuperación de contraseñas para cuentas locales.
- **Dashboard Privado Dinámico:** Renderizado basado en permisos de JWT para 4 roles base (`admin`, `operador`, `auditor`, `cliente`) y roles personalizados ilimitados.
- **Gestión de Cuentas:** Registro y actualización de cuentas multimoneda (banco, digital, efectivo) y saldos asociados a nivel interno o vinculadas a clientes.
- **Procesamiento de Transacciones:** Registro y actualización de transacciones (remesas, retiros, cobros, transferencias internas). Las transacciones pasan por estados: `pending` → `processing` → `completed` / `failed` / `reversed`.
- **Cálculo de Comisiones:** Aplicación de comisiones fijas y porcentuales (modelo fee + spread) por par de monedas y adición de cargos variables almacenados en JSONB.
- **Incentivos a Operadores:** Cálculo automático de comisiones por tramos globales o tramos específicos definidos por operador (normalizado a USD) a partir de transacciones ≥ $100 USD.
- **Verificación KYC por Niveles:** Niveles KYC-0 (límite $500 USD/mes, $200 USD/tx), KYC-1 ($5.000 USD/mes, $1.500 USD/tx) y KYC-2 (sin límites operativos). Gestión de solicitudes por admin/auditor.
- **Libreta de Beneficiarios:** CRUD de destinatarios frecuentes por cliente para autocompletar solicitudes y transacciones.
- **Cumplimiento AML (Prevención de Lavado de Dinero):** Generación automática de alertas por umbrales de monto individual (≥ $3.000 USD), fraccionamiento (3+ tx en < 24h que sumen ≥ $2.000 USD) y primer envío de alto monto (≥ $1.500 USD en los primeros 30 días).
- **Sistema de Tickets de Soporte:** Hilos de tickets de soporte técnico/consultas con notificaciones internas de nuevos mensajes y actualización de estados.
- **Módulo de Reportes y Logs:** Reportes filtrados por fechas/estados exportables a CSV/PDF y log inmutable de auditoría (acciones CREATE, UPDATE, DELETE con valores antes/después).

### NO incluye (out of scope)
- Integración real con pasarelas de pago o APIs bancarias (Visa, MasterCard, SWIFT, SPEI). El sistema registra depósitos y retiros conciliados manualmente fuera de la plataforma.
- Aplicación móvil nativa (el frontend web es responsivo y se adapta a dispositivos móviles).
- Módulo contable o de facturación fiscal.
- Chat en tiempo real (instantáneo) entre operadores (los tickets son el canal de soporte oficial).
- Autenticación de doble factor (2FA) (fuera del alcance de la entrega base).

## Actores
| Rol | Descripción | Permisos relevantes |
|---|---|---|
| **Administrador** | Dueño o gerente del negocio. | CRUD completo de todas las tablas: usuarios, cuentas, transacciones, roles, comisiones, reportes ejecutivos. |
| **Operador** | Personal interno a cargo del procesamiento diario. | Crear transacciones, actualizar estados, ver cuentas y clientes, atender solicitudes de remesas, crear y responder tickets. Sin permisos de eliminación ni acceso a configuraciones globales del sistema. |
| **Cliente** | Usuario final que envía dinero. | Ver sus propias cuentas y transacciones, crear solicitudes de remesas, gestionar sus beneficiarios y tickets de soporte. |
| **Auditor** | Rol interno de cumplimiento normativo y control. | Acceso de solo lectura a transacciones, reportes de comisiones/incentivos, log de auditoría completo y bandeja de alertas AML. |

## Precondiciones
- El cliente debe tener su cuenta verificada por correo o ingresar mediante Google OAuth para acceder al dashboard.
- Para transacciones que involucren cambio de divisa, debe haber una tasa de cambio válida en el sistema (provista por Frankfurter API o ingresada manualmente por el operador).
- El cliente debe cumplir con el nivel KYC requerido para el monto que desea enviar en el mes calendario actual.

## Postcondiciones
- Toda transacción completada modifica el saldo de las cuentas involucradas de forma atómica y consistente mediante una transacción de base de datos SQL.
- Cada cambio de estado de transacción o acción administrativa genera un registro inmutable en el `audit_log`.
- Se genera un registro de incentivo en `operator_commission_log` si la transacción fue completada por un operador elegible y cumple con el monto mínimo.
- Las alertas AML se disparan inmediatamente si la transacción cumple con los criterios de riesgo del motor interno.

## Flujo principal (Caso Feliz)
1. El **Cliente** inicia sesión y selecciona un beneficiario guardado en su libreta para solicitar una remesa de $300 USD a pesos mexicanos (MXN).
2. El sistema recupera la tasa de cambio actual desde Frankfurter API y muestra una vista previa del costo: comisión calculada y cargos de envío.
3. El **Cliente** confirma la solicitud. Esta se crea con estado `pending`.
4. El **Operador** visualiza la solicitud pendiente en su bandeja, verifica que el cliente cuenta con saldo o depósito verificado externamente, y procede a registrar la transacción formal en el sistema vinculada a la solicitud.
5. El sistema calcula la comisión definitiva y el operador confirma la transacción.
6. El estado pasa a `completed`, los saldos se actualizan automáticamente y el cliente recibe una notificación interna en su dashboard.
7. Se genera el `tracking_code` único (ej. `REM-2026-XF83A`) para el seguimiento de la operación.
8. Si el operador es elegible y la transacción supera los $100 USD, se calcula e ingresa su incentivo en `operator_commission_log`.

## Flujos alternativos
### Alt-1: Transacción rechazada por límites KYC
1. En el paso 3 del flujo principal, el cliente intenta solicitar un envío de $600 USD.
2. El sistema detecta que el nivel KYC del cliente es **KYC-0** (límite mensual de $500 USD o individual de $200 USD).
3. El sistema bloquea el envío y muestra un mensaje informando el límite excedido y los pasos para cargar documentos para subir a **KYC-1**.

### Alt-2: Generación de Alerta AML por fraccionamiento
1. Un cliente realiza 3 transacciones de $700 USD al mismo beneficiario en un periodo de 12 horas.
2. Al completarse la tercera transacción, el motor de cumplimiento evalúa las reglas.
3. La suma total es de $2.100 USD (excede el umbral de fraccionamiento de $2.000 USD en 24 horas).
4. El sistema crea la transacción exitosamente pero genera una alerta en la bandeja del **Auditor** con estado `pending` y `rule_code = structuring`.

### Alt-3: Reversión de transacción completada
1. El **Administrador** u **Operador** necesita corregir un error en una transacción ya marcada como `completed`.
2. Dado que las transacciones completadas son inmutables (BR-02), selecciona la opción "Revertir".
3. El sistema crea una transacción espejo con signo opuesto, vinculada a la transacción original.
4. Los saldos de las cuentas involucradas se restauran a su estado previo en una transacción SQL.
5. Se crea un registro de ajuste negativo en `operator_commission_log` para anular el incentivo previamente generado.

## Reglas de negocio
* **BR-01 (Saldo Insuficiente):** No se pueden procesar retiros o remesas si el saldo de la cuenta de origen es menor al monto total a debitar (monto enviado + comisiones + cargos adicionales).
* **BR-02 (Transacción Inmutable):** Una vez que una transacción tiene el estado `completed`, no puede ser editada ni eliminada físicamente de la base de datos. Cualquier corrección requiere una reversión.
* **BR-03 (Moneda Consistente):** En transferencias entre cuentas con monedas distintas, se requiere una tasa de cambio mayor a cero (`exchange_rate > 0`). El sistema permite al operador modificar manualmente la tasa sugerida de Frankfurter API.
* **BR-05 (Cuenta Inactiva):** No se permiten transacciones desde o hacia cuentas marcadas como inactivas.
* **BR-06 (Soft Delete):** La eliminación de registros críticos (usuarios, cuentas, clientes, transacciones) es lógica (`deleted_at` no nulo e `is_active = false`).
* **BR-07 (Nota obligatoria en cambio de estado):** Todo cambio en el estado de una transacción debe ir acompañado de un comentario obligatorio explicativo en el campo `notes`.
* **BR-09 (Verificación Obligatoria):** Los clientes que se registren por vía tradicional (email + contraseña) deben verificar su correo antes de poder acceder al dashboard.
* **BR-13 (Colisión OAuth):** Si un usuario intenta usar Google Login con un correo que ya tiene una cuenta registrada localmente, el sistema le impedirá duplicar la cuenta y le indicará que debe iniciar sesión con su contraseña.
* **BR-16 (Gestión de contraseñas de clientes):** El administrador puede redefinir contraseñas temporales para operadores y auditores, pero **nunca** para clientes. Los clientes deben utilizar el flujo de recuperación de contraseña.
* **BR-17 (Cascada de comisiones):** La comisión de la transacción busca primero una regla en `commission_rules` para el par de divisas correspondiente. Si no hay regla activa, se aplican los valores por defecto de `config`. Si estos son cero, se registra una comisión de cero.
* **BR-19 (Snapshots de comisiones):** El backend no creará transacciones sin validar que el `commission_snapshot` provisto por el frontend sea consistente con las reglas vigentes en base de datos.
* **BR-24 (Invalidación de JWT por cambio de rol):** Modificar el rol de un usuario incrementa el campo `token_version` en la base de datos, lo que fuerza el cierre de sesión en todos los clientes activos del usuario (invalidación de token JWT antiguo).
* **BR-26 (Cascada de tramos de incentivos):** Los incentivos de los operadores aplican primero los tramos configurados específicamente para el operador. Si no los hay, se aplican los tramos globales de incentivos.
* **BR-27 (Monto Mínimo de Incentivo):** Transacciones cuyo equivalente normalizado a USD sea menor a $100 USD (o el primer tramo del operador) no generarán registros en `operator_commission_log`.
* **BR-30 (Límite KYC Mensual):** Antes de guardar una transacción, el sistema suma los montos transaccionados del cliente en el mes calendario en USD equivalente. Si supera el límite permitido por su nivel KYC (`kyc_level`), la operación se bloquea.
* **BR-35 (Alertas AML No Bloqueantes):** El disparo de una alerta de cumplimiento AML no suspende ni bloquea la transacción; es una alerta informativa para revisión del Auditor. El bloqueo permanente requiere que el Administrador inactive la cuenta del usuario.

## Escenarios BDD (Gherkin)

### Escenario 1: Registro exitoso de transacción con aplicación de comisión por par específico
```gherkin
Given un operador autenticado en el sistema
And que existe una regla de comisión activa de USD a MXN con tasa de 2.00% y mínimo fijo de $3.00 USD
And que la cuenta origen en USD tiene un saldo de $500.00 USD
When el operador registra una transacción de remesa de $200.00 USD de la cuenta origen a una cuenta destino en MXN
Then el sistema calcula la comisión automática como $4.00 USD
And el monto total a cobrar al cliente es de $204.00 USD
And al completar la transacción el saldo de la cuenta origen en USD se actualiza a $296.00 USD
And se registra la transacción con estado completed
```

### Escenario 2: Bloqueo de envío por exceder el límite mensual del nivel KYC-0
```gherkin
Given un cliente autenticado en el sistema con nivel KYC-0
And que el límite mensual configurado para KYC-0 es de $500.00 USD
And que el cliente ya ha completado transacciones por un equivalente de $400.00 USD en el mes actual
When el cliente intenta crear una solicitud de remesa por un monto de $150.00 USD
Then el sistema rechaza la solicitud antes de guardarla
And retorna un código de error de validación 422
And informa al cliente que su saldo mensual disponible es de $100.00 USD y debe subir documentos para aumentar sus límites
```

### Escenario 3: Generación de alerta AML por estructuración / fraccionamiento de operaciones
```gherkin
Given un cliente que ha realizado 2 transacciones completadas al beneficiario "Juan Pérez" en las últimas 12 horas por un total de $1.500 USD
And que la regla de estructuración AML está configurada en un umbral de $2.000 USD y una ventana de 24 horas
When el operador completa una tercera transacción del mismo cliente al beneficiario "Juan Pérez" por $600 USD
Then la transacción se completa con éxito y actualiza los saldos correspondientes
And el sistema genera automáticamente una alerta de cumplimiento en la tabla compliance_alerts con estado pending
And la alerta se asocia a la tercera transacción con el código rule_code = structuring
And la alerta incrementa el contador de pendientes en la barra de navegación del auditor
```

## Criterios de Aceptación
- [ ] La landing page debe cargar sin autenticación y mostrar el simulador de divisas alimentado por Frankfurter API.
- [ ] Un usuario registrado localmente no puede iniciar sesión sin antes marcar su correo como verificado (email_verified = true).
- [ ] El dashboard debe renderizar exclusivamente las opciones del sidebar permitidas por el rol y permisos incluidos en el JWT.
- [ ] Todas las operaciones de modificación de saldo de cuentas deben ocurrir dentro de transacciones ACID en PostgreSQL, retrocediendo ante cualquier error.
- [ ] Si se intenta reasignar un rol en el panel de usuarios, el usuario afectado debe ser deslogueado del frontend en su siguiente petición HTTP.
- [ ] El reporte de incentivos de operador debe reflejar montos negativos equivalentes cuando se revierta una transacción que generó incentivos.
- [ ] Las solicitudes de KYC deben ser aprobadas o rechazadas por un Admin o Auditor escribiendo un comentario obligatorio, y actualizando el `kyc_level` del cliente.
- [ ] El endpoint `/track/:code` debe responder con información de estado de la transacción sin requerir autenticación ni revelar nombres de clientes.

## Métricas de Éxito
- **Velocidad de Respuesta:** Carga de vistas del dashboard en menos de 2.0 segundos bajo condiciones normales.
- **Rendimiento Financiero:** Cero discrepancias matemáticas entre transacciones realizadas y sumatorias de saldos de cuentas.
- **Eficiencia de Reportes:** Consultas de auditoría e incentivos sobre 10.000+ registros completadas en menos de 5.0 segundos.
- **Aislamiento de Clientes:** Cero fugas de información; los clientes solo pueden listar sus beneficiarios y cuentas propias.

## Supuestos Aprobados (Gaps Solucionados)
1. **Almacenamiento Local:** Los documentos de identidad KYC se almacenan en el sistema de archivos local del backend (carpeta `/uploads` restringida) y se sirven mediante rutas protegidas por JWT.
2. **Resiliencia de Tasas:** Ante caídas de Frankfurter API, se aplicará el ingreso manual por operadores en el dashboard y se mantendrá una caché de la última tasa exitosa en base de datos para la landing page.
3. **Restricción de Canales de Email:** El correo electrónico se reservará exclusivamente para la verificación inicial y la recuperación de contraseñas. Notificaciones de transacciones o tickets se procesarán de forma interna.
4. **Validación Visual de Email:** El enlace de verificación redirige al cliente al frontend, el cual valida el token en segundo plano y muestra feedback visual en la pantalla de login.
5. **Tamaño de Archivos KYC:** Se limita el tamaño máximo de las imágenes/PDFs de KYC a 5 MB por archivo en los formularios de carga.

## Preguntas abiertas (TBD)
- Ninguna pregunta abierta. Todos los supuestos iniciales han sido consolidados a partir del contexto del PRD y aprobados para el inicio del diseño técnico.
