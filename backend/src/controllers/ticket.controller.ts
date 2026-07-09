import { Request, Response } from 'express';
import Joi from 'joi';
import * as ticketService from '../services/ticket.service.js';
import * as ticketRepository from '../repositories/ticket.repository.js';

/**
 * Abre un nuevo ticket de soporte (Cliente o de Operador a nombre de un Cliente) (RF-21)
 */
export async function createTicket(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    clientId: Joi.string().uuid().allow(null), // Si es cliente, se usará el suyo. Si es operador, se especifica.
    subject: Joi.string().max(150).required(),
    category: Joi.string().valid('consulta', 'reclamo', 'problema_tecnico', 'otro').required(),
    messageBody: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  // Si es un cliente, forzar su propio ID
  let targetClientId = value.clientId;
  if (user.role_name === 'cliente') {
    targetClientId = user.id;
  }

  if (!targetClientId) {
    res.status(400).json({ status: 'error', message: 'Se requiere especificar un clientId para la creación del ticket.' });
    return;
  }

  try {
    const ticket = await ticketService.openTicket({
      client_id: targetClientId,
      created_by: user.id,
      subject: value.subject,
      category: value.category,
      opened_via: user.role_name === 'cliente' ? 'web' : 'other',
      messageBody: value.messageBody,
    });

    res.status(201).json({
      status: 'ok',
      message: 'Ticket de soporte creado y registrado exitosamente.',
      data: ticket,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Añade una respuesta en el hilo del ticket (RF-25)
 */
export async function replyToTicket(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    body: Joi.string().required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;

  try {
    const existing = await ticketRepository.findTicketById(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Ticket no encontrado' });
      return;
    }

    // Aislamiento: Cliente sólo responde sus tickets
    if (user.role_name === 'cliente' && existing.client_id !== user.id) {
      res.status(403).json({ status: 'error', message: 'Acceso denegado' });
      return;
    }

    const message = await ticketService.replyToTicket({
      ticket_id: id,
      author_id: user.id,
      body: value.body,
    });

    res.status(201).json({
      status: 'ok',
      message: 'Respuesta registrada correctamente.',
      data: message,
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}

/**
 * Obtiene el listado de tickets con filtros (Aislamiento cliente)
 */
export async function getTickets(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  
  try {
    if (user.role_name === 'cliente') {
      const tickets = await ticketRepository.findTicketsByClientId(user.id);
      res.status(200).json({ status: 'ok', data: tickets });
    } else {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const status = req.query.status as string;
      const category = req.query.category as string;
      const clientEmail = req.query.clientEmail as string;

      const tickets = await ticketRepository.listAllTickets({
        status,
        category,
        clientEmail,
        limit,
        offset,
      });
      res.status(200).json({ status: 'ok', data: tickets });
    }
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Obtiene los detalles y el historial de mensajes de un ticket específico
 */
export async function getTicketDetails(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = req.params.id as string;

  try {
    const ticket = await ticketRepository.findTicketById(id);
    if (!ticket) {
      res.status(404).json({ status: 'error', message: 'Ticket no encontrado' });
      return;
    }

    // Aislamiento: Cliente sólo ve detalles de sus propios tickets
    if (user.role_name === 'cliente' && ticket.client_id !== user.id) {
      res.status(403).json({ status: 'error', message: 'Acceso denegado' });
      return;
    }

    const messages = await ticketRepository.getTicketMessages(id);

    res.status(200).json({
      status: 'ok',
      data: {
        ticket,
        messages,
      },
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Cambia el estado del ticket (Operador/Admin) (BR-11, RF-24)
 */
export async function updateTicketStatus(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const schema = Joi.object({
    status: Joi.string().valid('open', 'in_review', 'resolved', 'closed').required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;

  try {
    await ticketService.changeTicketStatus(id, value.status, user.id);
    res.status(200).json({
      status: 'ok',
      message: `El estado del ticket ha sido actualizado a ${value.status} con éxito.`,
    });
  } catch (err: any) {
    res.status(400).json({ status: 'error', message: err.message });
  }
}
