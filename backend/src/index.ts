import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import pool from './config/db.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar configuraciones
import './config/passport.js';

// Importar rutas
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import accountRoutes from './routes/account.routes.js';
import transactionRoutes from './routes/transaction.routes.js';
import kycRoutes from './routes/kyc.routes.js';
import beneficiaryRoutes from './routes/beneficiary.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import complianceRoutes from './routes/compliance.routes.js';
import commissionRoutes from './routes/commission.routes.js';
import reportRoutes from './routes/report.routes.js';
import notificationRoutes from './routes/notification.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json());

// Inicializar Passport para Google OAuth
app.use(passport.initialize());

// Endpoint de salud del servidor y la base de datos
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'ok',
      message: 'Servidor y base de datos activos',
      dbTime: result.rows[0].now,
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Error al conectar con la base de datos',
      error: error.message,
    });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoints para Swagger API Docs interactivos
app.get('/api/swagger.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'swagger.json'));
});

app.get('/api/docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Documentación de API - SG-Remesas</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; }
        body { margin: 0; background: #0f172a; }
        .swagger-ui { filter: invert(0.88) hue-rotate(180deg); } /* Dark mode styling for Swagger */
        .swagger-ui .scheme-container { background: #1e293b; }
        .swagger-ui .opblock .opblock-summary { border-radius: 8px; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
      <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
      <script>
        window.onload = function() {
          const ui = SwaggerUIBundle({
            url: "/api/swagger.json",
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.api,
              SwaggerUIStandalonePreset
            ],
            plugins: [
              SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "BaseLayout"
          });
          window.ui = ui;
        };
      </script>
    </body>
    </html>
  `);
});

// Registro de endpoints de la API REST
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

app.listen(PORT, async () => {
  console.log(`[Server] Servidor backend corriendo en el puerto ${PORT}`);
  
  // Probar la conexión del pool al iniciar el servidor
  try {
    const client = await pool.connect();
    console.log('[Database] Conexión exitosa con PostgreSQL');
    client.release();
  } catch (err: any) {
    console.error('[Database] ERROR al conectar a PostgreSQL:', err.message);
  }
});
