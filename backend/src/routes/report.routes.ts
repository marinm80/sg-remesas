import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas de reportes requieren sesión activa
router.use(authenticateToken);

// Reportes ejecutivos (Auditores y Admins)
router.get('/operator-commissions', requirePermission('reports.view'), reportController.getOperatorCommissions);
router.get('/transactions-summary', requirePermission('reports.view'), reportController.getTransactionsSummary);
router.get('/audit-logs', requirePermission('audit.view'), reportController.getAuditLogs);

export default router;
