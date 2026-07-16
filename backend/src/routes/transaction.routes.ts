import { Router } from 'express';
import * as transactionController from '../controllers/transaction.controller.js';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Ruta pública (no requiere autenticación) (RF-13, Criterios de Aceptación)
router.get('/track/:code', transactionController.trackTransaction);

// Resto de las rutas requieren sesión activa
router.use(authenticateToken);

// Rutas de transacciones
router.get('/', requirePermission('transactions.view'), transactionController.getTransactions);
router.post('/preview', transactionController.previewTransaction); // Usado por clientes y operadores para simular comisiones

// Rutas de solicitudes de cliente
router.get('/requests/all', transactionController.getClientRequests); // Filtrado interno maneja aislamiento de cliente/operador
router.post('/requests', transactionController.createClientRequest);
router.put('/requests/:id/cancel', transactionController.cancelClientRequest);
router.put('/requests/:id/status', requirePermission('transactions.status_change'), transactionController.updateClientRequestStatus);

router.get('/:id', requirePermission('transactions.view'), transactionController.getTransactionDetails);
router.post('/', requirePermission('transactions.create'), transactionController.createTransaction);
router.post('/:id/revert', requirePermission('transactions.revert'), transactionController.revertTransaction);

export default router;
