import { Router } from 'express';
import * as accountController from '../controllers/account.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas de cuentas requieren token de acceso verificado
router.use(authenticateToken);

router.get('/', accountController.getAccounts);
router.post('/', accountController.createAccount);
router.put('/:id/status', accountController.updateAccountStatus);
router.delete('/:id', accountController.deleteAccount);

export default router;
