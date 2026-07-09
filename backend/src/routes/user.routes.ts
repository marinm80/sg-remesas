import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas requieren sesión activa
router.use(authenticateToken);

// Rutas de administración y consulta de usuarios
router.get('/', requirePermission('users.view'), userController.getAllUsers);
router.get('/internal', requirePermission('users.view'), userController.getInternalUsers);
router.get('/clients', requirePermission('clients.view'), userController.getClients);
router.put('/:id/role', requirePermission('users.roles_manage'), userController.updateUserRole);
router.put('/:id/status', requirePermission('users.edit'), userController.updateUserStatus);
router.delete('/:id', requirePermission('users.edit'), userController.softDeleteUser);
router.post('/internal', requirePermission('users.create'), userController.createInternalUser);
router.post('/:id/reset-password-temp', requirePermission('users.edit'), userController.resetPasswordTemp);

export default router;
