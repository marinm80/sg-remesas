import { Router } from 'express';
import * as ticketController from '../controllers/ticket.controller.js';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas de tickets requieren sesión activa
router.use(authenticateToken);

// Rutas accesibles por clientes u operadores (según aislamiento interno)
router.get('/', requirePermission('tickets.view'), ticketController.getTickets);
router.get('/:id', requirePermission('tickets.view'), ticketController.getTicketDetails);
router.post('/', requirePermission('tickets.create'), ticketController.createTicket);
router.post('/:id/messages', requirePermission('tickets.reply'), ticketController.replyToTicket);

// Cambio de estado de tickets (solo operadores/admins)
router.put('/:id/status', requirePermission('tickets.close'), ticketController.updateTicketStatus);

export default router;
