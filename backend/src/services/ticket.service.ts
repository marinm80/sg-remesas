import pool from '../config/db.js';
import * as ticketRepository from '../repositories/ticket.repository.js';
import { createNotification } from './notification.service.js';
import * as userRepository from '../repositories/user.repository.js';

/**
 * Abre un ticket de soporte e inserta el primer mensaje dentro de una transacción
 */
export async function openTicket(data: {
  client_id: string;
  created_by: string; // Puede ser el mismo cliente o un operador (RF-21)
  subject: string;
  category: string;
  opened_via?: string;
  messageBody: string;
}): Promise<ticketRepository.Ticket> {
  const { client_id, created_by, subject, category, opened_via = 'web', messageBody } = data;

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // 1. Crear el ticket
    const queryTicket = `
      INSERT INTO tickets (client_id, created_by, subject, category, opened_via, status)
      VALUES ($1, $2, $3, $4, $5, 'open')
      RETURNING *;
    `;
    const resTicket = await dbClient.query(queryTicket, [client_id, created_by, subject, category, opened_via]);
    const ticket = resTicket.rows[0];

    // 2. Crear el primer mensaje en el hilo
    const queryMessage = `
      INSERT INTO ticket_messages (ticket_id, author_id, body)
      VALUES ($1, $2, $3);
    `;
    await dbClient.query(queryMessage, [ticket.id, created_by, messageBody]);

    await dbClient.query('COMMIT');

    // 3. Notificar internamente
    // Si fue abierto por un operador a nombre del cliente (RF-21), notificar al cliente.
    if (client_id !== created_by) {
      await createNotification({
        user_id: client_id,
        type: 'ticket_reply',
        title: 'Nuevo ticket de soporte abierto',
        body: `Se ha abierto el ticket '${subject}' a tu nombre por nuestro equipo.`,
        entity_type: 'ticket',
        entity_id: ticket.id,
      });
    } else {
      // Si fue abierto por el cliente, notificar a los administradores del sistema
      const admins = await dbClient.query("SELECT id FROM users WHERE role_id = 1 AND deleted_at IS NULL");
      for (const admin of admins.rows) {
        await createNotification({
          user_id: admin.id,
          type: 'ticket_reply',
          title: 'Nuevo ticket de soporte recibido',
          body: `El cliente ha abierto el ticket '${subject}' (Categoría: ${category}).`,
          entity_type: 'ticket',
          entity_id: ticket.id,
        });
      }
    }

    return ticket;
  } catch (error) {
    await dbClient.query('ROLLBACK');
    throw error;
  } finally {
    dbClient.release();
  }
}

/**
 * Responde a un ticket de soporte y genera notificaciones internas según el emisor
 */
export async function replyToTicket(data: {
  ticket_id: string;
  author_id: string;
  body: string;
}): Promise<ticketRepository.TicketMessage> {
  const { ticket_id, author_id, body } = data;

  const ticket = await ticketRepository.findTicketById(ticket_id);
  if (!ticket) {
    throw new Error('El ticket especificado no existe');
  }

  const author = await userRepository.findUserById(author_id);
  if (!author) {
    throw new Error('El autor del mensaje no existe');
  }

  // 1. Guardar mensaje
  const message = await ticketRepository.createTicketMessage({
    ticket_id,
    author_id,
    body,
  });

  // Si el ticket estaba resuelto o cerrado, lo reabrimos ante una nueva respuesta
  if (ticket.status === 'closed' || ticket.status === 'resolved') {
    // Validar si el cliente puede reabrirlo (BR-11: menos de 30 días desde el cierre)
    if (author.role_name === 'cliente' && ticket.closed_at) {
      const closedDate = new Date(ticket.closed_at);
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 30);
      
      if (closedDate < limitDate) {
        throw new Error('No es posible reabrir este ticket. Ha superado el límite de 30 días desde el cierre (BR-11). Por favor abra uno nuevo.');
      }
    }
    
    await ticketRepository.updateTicketStatus(ticket_id, 'open');
  }

  // 2. Notificaciones (RF-25)
  if (author.role_name === 'cliente') {
    // Si responde el cliente, notificar a los admins y operadores asociados
    const adminsAndOps = await pool.query("SELECT id FROM users WHERE role_id IN (1, 2) AND deleted_at IS NULL");
    for (const user of adminsAndOps.rows) {
      await createNotification({
        user_id: user.id,
        type: 'ticket_reply',
        title: 'Nueva respuesta en ticket de soporte',
        body: `El cliente respondió en el ticket '${ticket.subject}': "${body.substring(0, 40)}..."`,
        entity_type: 'ticket',
        entity_id: ticket_id,
      });
    }
  } else {
    // Si responde un operador o administrador, notificar al cliente asignado al ticket
    await createNotification({
      user_id: ticket.client_id,
      type: 'ticket_reply',
      title: 'Nueva respuesta del equipo de soporte',
      body: `El equipo respondió en tu ticket '${ticket.subject}': "${body.substring(0, 40)}..."`,
      entity_type: 'ticket',
      entity_id: ticket_id,
    });
  }

  return message;
}

/**
 * Cambia el estado del ticket y notifica al cliente si se resolvió/cerró
 */
export async function changeTicketStatus(ticketId: string, status: string, changedBy: string): Promise<void> {
  const ticket = await ticketRepository.findTicketById(ticketId);
  if (!ticket) {
    throw new Error('El ticket especificado no existe');
  }

  await ticketRepository.updateTicketStatus(ticketId, status);

  // Si se cierra o resuelve, notificar al cliente final
  if (status === 'closed' || status === 'resolved') {
    const statusText = status === 'closed' ? 'Cerrado' : 'Resuelto';
    await createNotification({
      user_id: ticket.client_id,
      type: 'ticket_reply',
      title: `Ticket de soporte ${statusText}`,
      body: `Tu ticket '${ticket.subject}' ha sido marcado como ${statusText.toLowerCase()}.`,
      entity_type: 'ticket',
      entity_id: ticketId,
    });
  }
}
