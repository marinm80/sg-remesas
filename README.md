# Sistema de Gestión Operativo para Negocio de Remesas (SG-Remesas v2.0)

SG-Remesas es un sistema full-stack premium diseñado para la gestión integral de operaciones de envío y retiro de remesas. Cuenta con una landing page pública inspirada en Wise (con simulador de tasas en tiempo real y rastreador público de transacciones) y paneles privados dinámicos adaptados para cuatro roles principales (Administrador, Operador, Auditor y Cliente).

El diseño visual está alineado con la paleta de colores corporativos **Wise/Vercel** (`#1B3F72` como color primario y `#2ABFA3` como acento verde azulado) ofreciendo una experiencia altamente interactiva y responsiva con transiciones fluidas.

---

## 🏛️ Arquitectura de Software

El proyecto sigue una estructura limpia, separando claramente el frontend del backend:

```text
├── /backend                 # Backend en Node.js, Express y PostgreSQL
│   ├── /src
│   │   ├── /config          # Conexión DB y estrategias de Passport.js
│   │   ├── /controllers     # Controladores de la API REST
│   │   ├── /middleware      # Seguridad, autenticación JWT y RBAC
│   │   ├── /migrations      # Scripts SQL DDL para base de datos (001, 002, 003)
│   │   ├── /repositories    # Capa de acceso a datos (Consultas SQL directas)
│   │   ├── /routes          # Rutas REST registradas en Express
│   │   ├── /services        # Lógica de negocio (AML, Comisiones, Incentivos, Tickets)
│   │   ├── /utils           # Funciones de criptografía y mailer simulado
│   │   ├── index.ts         # Punto de entrada de la aplicación
│   │   └── swagger.json     # Especificación OpenAPI/Swagger de la API
│   ├── package.json
│   └── tsconfig.json
│
├── /frontend                # Frontend en React, Vite y Tailwind CSS v4
│   ├── /src
│   │   ├── /components      # Componentes UI reutilizables
│   │   ├── /layouts         # Layout general de Dashboards con sidebar dinámico
│   │   ├── /pages           # Vistas (Landing, Login, Registro, Dashboards de Roles)
│   │   ├── /services        # Cliente fetch API unificado
│   │   └── /store           # Estado global persistente mediante Zustand
│   ├── package.json
│   └── tsconfig.json
│
└── docker-compose.yml       # Entorno de base de datos PostgreSQL
```

### Decisiones Clave de Diseño y Seguridad:
1. **Cero ORMs (Raw SQL)**: Todas las consultas se realizan con SQL nativo parametrizado en la capa `/repositories`, asegurando máximo rendimiento y control total de transacciones (utilizando `BEGIN / COMMIT / ROLLBACK` atómicos).
2. **Invalidación Dinámica de JWT (BR-24)**: Si se actualiza el rol de un usuario o su estado de suspensión, el campo `token_version` en la base de datos se incrementa. En cada petición, el middleware verifica la coincidencia del token, invalidando las sesiones activas en segundos si hay una discrepancia.
3. **Servicio Seguro de Documentos (Aislamiento de Privacidad)**: Los archivos KYC se guardan localmente en `/uploads` (no expuesto como estático). El acceso a los mismos se realiza mediante un endpoint autenticado (`GET /api/kyc/documents/view/:id`) que valida si el solicitante es el dueño del documento o tiene permisos de auditoría.
4. **Motor AML Automatizado**: Cada transacción gatilla validaciones AML automáticas:
   - Alertas por montos mayores o iguales a $3,000 USD.
   - Fraccionamiento (3+ transacciones al mismo beneficiario en 24 horas que sumen $2,000+ USD).
   - Alertas para usuarios nuevos (primer envío de $1,500+ USD en los primeros 30 días).

---

## 🛠️ Requisitos Previos

Asegúrate de contar con los siguientes componentes en tu sistema de desarrollo:
- **Node.js** (versión v18 o superior)
- **pnpm** (recomendado) o **npm** / **yarn**
- **Docker** y **Docker Compose**
- **PostgreSQL** client (opcional, para conectarse manualmente a la DB)

---

## 🚀 Instalación y Configuración del Entorno

### Opción A: Levantar Todo el Stack en Docker (Recomendado)

Si deseas levantar la base de datos, el backend y el frontend de forma integrada en contenedores:

1. **Crear archivo de entorno del Backend**:
   Crea el archivo `.env` en la carpeta `/backend` a partir de la plantilla:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. **Levantar todo el stack**:
   Desde la raíz del proyecto, ejecuta:
   ```bash
   docker compose up -d --build
   ```
3. **Ejecutar migraciones y semilla de la Base de Datos**:
   Carga los esquemas DDL y las semillas dentro del contenedor PostgreSQL:
   ```bash
   # Crear el esquema base de tablas
   docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/001_schema_init.sql

   # Aplicar restricciones e índices de performance
   docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/002_indexes_and_constraints.sql

   # Insertar datos semilla (Roles, permisos por defecto y usuario administrador inicial)
   docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/003_seed_data.sql
   ```
   Una vez hecho esto, los servicios estarán disponibles en:
   *   **Frontend (React + Nginx):** [http://localhost:5173](http://localhost:5173)
   *   **Backend (API Express):** [http://localhost:5000](http://localhost:5000)
   *   **Docs API (Swagger UI):** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

> [!NOTE]
> El usuario Administrador inicial sembrado por defecto es:
> - **Correo:** `admin@sgremesas.com`
> - **Contraseña:** `Admin1234!`

---

### Opción B: Ejecución Híbrida (Base de Datos en Docker + Ejecución Local Nativa)

Esta opción es ideal para desarrollo activo en el código, ya que permite la recarga rápida en caliente (Hot Reloading) de los archivos del frontend y backend de manera inmediata.

1. **Levantar únicamente PostgreSQL en Docker**:
   ```bash
   docker compose up -d postgres
   ```
2. **Ejecutar las Migraciones y Seed en la Base de Datos**:
   ```bash
   docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/001_schema_init.sql
   docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/002_indexes_and_constraints.sql
   docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/003_seed_data.sql
   ```
3. **Configurar y correr el Backend**:
   En la carpeta `/backend`:
   ```bash
   pnpm install
   pnpm dev
   ```
   El backend arrancará en `http://localhost:5000`.
4. **Configurar y correr el Frontend**:
   En una nueva terminal, dentro de la carpeta `/frontend`:
   ```bash
   pnpm install
   pnpm dev
   ```
   El frontend arrancará en `http://localhost:5173`.

---

## 🧪 Compilación de Producción (Production Build)

Para validar que el código no contenga errores de compilación y empaquetar la aplicación para despliegue:

### Compilar el Backend:
```bash
cd backend
pnpm build
```
Esto generará los archivos compilados en Javascript moderno en la carpeta `/backend/dist`. Para arrancar el servidor compilado:
```bash
pnpm start
```

### Compilar el Frontend:
```bash
cd frontend
pnpm build
```
Esto creará el bundle HTML, CSS y JS optimizado en la carpeta `/frontend/dist`. Para previsualizar el bundle localmente:
```bash
pnpm preview
```

---

## 📄 Especificación de Endpoints y Roles

### 🧑‍💻 Usuarios Sembrados (Seeds) para Pruebas:
| Rol | Correo de Acceso | Contraseña | Permisos Clave |
|---|---|---|---|
| **Admin** | `admin@sgremesas.com` | `Admin1234!` | Control total, asignación de roles, configuración global, tramos de operador |
| **Operador** | `operador1@sgremesas.com` | `Operador1234!` | Registrar transacciones, caja, procesar solicitudes, responder soporte |
| **Auditor** | `auditor1@sgremesas.com` | `Auditor1234!` | Solo lectura, log de auditoría global, bandeja de alertas de cumplimiento AML |
| **Cliente** | `cliente1@sgremesas.com` | `Cliente1234!` | Solicitar remesas, CRUD de destinatarios frecuentes, soporte personal, ver saldos |

---

## 🌐 Guía de Despliegue en Servidor VPS Linux (Producción)

A continuación se detalla cómo desplagar la aplicación completa en una instancia VPS Linux limpia (Ubuntu 22.04 LTS).

### 1. Actualizar el Sistema e Instalar Dependencias del OS
Conéctate por SSH e instala Node.js (v18+), PostgreSQL, Nginx y herramientas necesarias:
```bash
sudo apt update && sudo apt upgrade -y
# Instalar Node.js v18 (usando NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
# Instalar Git, Nginx y Docker
sudo apt install -y git nginx ufw docker.io docker-compose
```

### 2. Clonar y Configurar el Repositorio
Clona el repositorio en `/var/www/sg-remesas` y establece permisos:
```bash
sudo mkdir -p /var/www/sg-remesas
sudo chown -R $USER:$USER /var/www/sg-remesas
cd /var/www/sg-remesas
git clone <tu-repositorio-url> .
```

### 3. Levantar PostgreSQL y Configurar las Migraciones
Utiliza el `docker-compose.yml` para levantar la base de datos de producción:
```bash
docker-compose up -d
# Cargar los esquemas y la semilla SQL utilizando el mismo método del docker exec anterior
docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/001_schema_init.sql
docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/002_indexes_and_constraints.sql
docker exec -i sg_remesas_postgres psql -U remesas_user -d sg_remesas_db < backend/src/migrations/003_seed_data.sql
```

### 4. Configurar variables de entorno y compilar el Backend
Crea el archivo `.env` de producción en `/backend`:
```bash
cd backend
cp .env.example .env
nano .env
```
> [!IMPORTANT]
> En producción, asegúrate de cambiar `JWT_SECRET`, `JWT_REFRESH_SECRET` a strings largos y seguros, y configura credenciales de correo SMTP reales. Cambia `NODE_ENV=production`.

Instala las dependencias y compila:
```bash
pnpm install
pnpm build
```

### 5. Configurar el Gestor de Procesos PM2
Instala PM2 de forma global para mantener el servidor Node.js corriendo en segundo plano:
```bash
sudo npm install -g pm2
pm2 start dist/index.js --name "sg-remesas-backend"
# Configurar PM2 para que inicie automáticamente tras reiniciar el servidor VPS
pm2 startup
pm2 save
```

### 6. Compilar y Servir el Frontend
Entra a `/frontend`, instala dependencias y compila:
```bash
cd ../frontend
pnpm install
pnpm build
```
Los archivos de distribución quedarán en `/var/www/sg-remesas/frontend/dist`. Nginx se encargará de servirlos como contenido estático de alto rendimiento.

### 7. Configurar Nginx y SSL (Certbot)
Crea una nueva configuración de Nginx en `/etc/nginx/sites-available/sg-remesas`:
```bash
sudo nano /etc/nginx/sites-available/sg-remesas
```

Agrega el siguiente contenido (reemplaza `tu-dominio.com` por tu dominio configurado en el DNS):
```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Frontend Estático
    location / {
        root /var/www/sg-remesas/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API Proxy para el Backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 6M; # Ajustado para los archivos KYC de hasta 5MB
    }
}
```

Habilita el sitio y reinicia Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/sg-remesas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Instalar SSL con Let's Encrypt Certbot:
```bash
sudo apt install snapd
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```
Certbot modificará la configuración de Nginx para redirigir todo el tráfico HTTP a HTTPS de manera segura y automática.

---

## 🛡️ Soporte y Auditoría
Para cualquier duda de integración o auditorías AML pendientes, puedes consultar los logs generados en tiempo real desde la consola de PM2:
```bash
pm2 logs sg-remesas-backend
```
o mediante las vistas dedicadas en el **Panel del Auditor** del frontend.
