import pool from '../config/db.js';

export interface Ticket {
  id: string;
  client_id: string;
  created_by: string | null;
  subject: string;
  category: string; // consulta/reclamo/problema_tecnico/otro
  status: string; // open/in_review/resolved/closed
  opened_via: string; // web/phone/email/other
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  created_at: Date;
}

/**
 * Abre un nuevo ticket de soporte
 */
export async function createTicket(ticket: {
  client_id: string;
  created_by?: string | null;
  subject: string;
  category: string;
  opened_via?: string;
}): Promise<Ticket> {
  const { client_id, created_by = null, subject, category, opened_via = 'web' } = ticket;
  
  const query = `
    INSERT INTO tickets (client_id, created_by, subject, category, opened_via, status)
    VALUES ($1, $2, $3, $4, $5, 'open')
    RETURNING *;
  `;
  const result = await pool.query(query, [client_id, created_by, subject, category, opened_via]);
  return result.rows[0];
}

/**
 * Añade un mensaje al hilo de un ticket
 */
export async function createTicketMessage(msg: {
  ticket_id: string;
  author_id: string | null;
  body: string;
}): Promise<TicketMessage> {
  const { ticket_id, author_id, body } = msg;
  
  const query = `
    INSERT INTO ticket_messages (ticket_id, author_id, body)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const result = await pool.query(query, [ticket_id, author_id, body]);
  
  // Actualizar la fecha de última modificación del ticket
  await pool.query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [ticket_id]);
  
  return result.rows[0];
}

/**
 * Busca un ticket por ID resolviendo nombres de los involucrados
 */
export async function findTicketById(id: string): Promise<any | null> {
  const query = `
    SELECT t.*, 
           c.name as client_name, c.email as client_email,
           creator.name as creator_name
    FROM tickets t
    JOIN users c ON t.client_id = c.id
    LEFT JOIN users creator ON t.created_by = creator.id
    WHERE t.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length ? result.rows[0] : null;
}

/**
 * Obtiene los mensajes de un ticket ordenados cronológicamente
 */
export async function getTicketMessages(ticketId: string): Promise<any[]> {
  const query = `
    SELECT m.*, u.name as author_name, u.email as author_email, r.name as author_role
    FROM ticket_messages m
    LEFT JOIN users u ON m.author_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE m.ticket_id = $1
    ORDER BY m.created_at ASC;
  `;
  const result = await pool.query(query, [ticketId]);
  return result.rows;
}

/**
 * Obtiene los tickets de un cliente específico
 */
export async function findTicketsByClientId(clientId: string): Promise<any[]> {
  const query = `
    SELECT t.*, COUNT(m.id) as messages_count
    FROM tickets t
    LEFT JOIN ticket_messages m ON t.id = m.ticket_id
    WHERE t.client_id = $1
    GROUP BY t.id
    ORDER BY t.updated_at DESC;
  `;
  const result = await pool.query(query, [clientId]);
  return result.rows;
}

/**
 * Obtiene todos los tickets del sistema con filtros
 */
export async function listAllTickets(filters: {
  status?: string;
  category?: string;
  clientEmail?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { status, category, clientEmail, limit = 20, offset = 0 } = filters;
  
  let query = `
    SELECT t.*, u.name as client_name, u.email as client_email, COUNT(m.id) as messages_count
    FROM tickets t
    JOIN users u ON t.client_id = u.id
    LEFT JOIN ticket_messages m ON t.id = m.ticket_id
    WHERE 1=1
  `;
  
  const values: any[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND t.status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (category) {
    query += ` AND t.category = $${paramIndex}`;
    values.push(category);
    paramIndex++;
  }

  if (clientEmail) {
    query += ` AND u.email = $${paramIndex}`;
    values.push(clientEmail);
    paramIndex++;
  }

  query += ` GROUP BY t.id, u.name, u.email ORDER BY t.updated_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * Cambia el estado de un ticket y registra la fecha de cierre si aplica (BR-11)
 */
export async function updateTicketStatus(id: string, status: string): Promise<void> {
  const isClosed = status === 'closed' || status === 'resolved';
  const query = `
    UPDATE tickets 
    SET status = $1, 
        closed_at = $2, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3;
  `;
  const closedAt = isClosed ? new Date() : null;
  await pool.query(query, [status, closedAt, id]);
}
