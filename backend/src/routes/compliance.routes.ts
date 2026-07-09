import { Router } from 'express';
import * as complianceController from '../controllers/compliance.controller.js';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas de cumplimiento requieren sesión activa
router.use(authenticateToken);

// Rutas de alertas AML (sólo Auditores y Admins)
router.get('/alerts', requirePermission('audit.view'), complianceController.getAlerts);
router.get('/alerts/pending', requirePermission('audit.view'), complianceController.getPendingAlerts);
router.post('/alerts/:id/review', requirePermission('audit.view'), complianceController.reviewAlert);

// Rutas de configuración de reglas AML (sólo Admins)
router.get('/rules', requirePermission('audit.view'), complianceController.getRules);
router.put('/rules/:id', requirePermission('users.roles_manage'), complianceController.updateRule);

export default router;
