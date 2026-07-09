import { Router } from 'express';
import * as commissionController from '../controllers/commission.controller.js';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas de comisiones y configuraciones requieren sesión activa
router.use(authenticateToken);

// Reglas de comisiones
router.get('/rules', requirePermission('commissions.view'), commissionController.getRules);
router.post('/rules', requirePermission('commissions.edit'), commissionController.createRule);
router.put('/rules/:id/deactivate', requirePermission('commissions.edit'), commissionController.deactivateRule);

// Tramos de operadores
router.get('/tiers', requirePermission('commissions.view'), commissionController.getTiers);
router.post('/tiers', requirePermission('commissions.edit'), commissionController.createTier);
router.put('/tiers/:id/deactivate', requirePermission('commissions.edit'), commissionController.deactivateTier);

// Configuración global
router.get('/config', requirePermission('commissions.view'), commissionController.getGlobalConfig);
router.put('/config', requirePermission('commissions.edit'), commissionController.updateGlobalConfig);

export default router;
