import pool from '../config/db.js';

export interface Notification {
  id: string;
  user_id: string;
  type: string; // transaction_status/ticket_reply/kyc_update/compliance_alert
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
  is_read: boolean;
  created_at: Date;
}

/**
 * Busca si ya existe una notificación no leída idéntica (BR-36)
 */
export async function findDuplicateUnreadNotification(
  userId: string,
  type: string,
  entityType: string,
  entityId: string
): Promise<boolean> {
  const query = `
    SELECT id FROM notifications 
    WHERE user_id = $1 AND type = $2 AND entity_type = $3 AND entity_id = $4 AND is_read = false;
  `;
  const result = await pool.query(query, [userId, type, entityType, entityId]);
  return result.rows.length > 0;
}

/**
 * Inserta una nueva notificación interna en el sistema
 */
export async function insertNotification(notification: {
  user_id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
}): Promise<Notification> {
  const { user_id, type, title, body, entity_type, entity_id } = notification;

  const query = `
    INSERT INTO notifications (user_id, type, title, body, entity_type, entity_id, is_read)
    VALUES ($1, $2, $3, $4, $5, $6, false)
    RETURNING *;
  `;
  const result = await pool.query(query, [user_id, type, title, body, entity_type, entity_id]);
  return result.rows[0];
}

/**
 * Obtiene todas las notificaciones de un usuario
 */
export async function findNotificationsByUserId(userId: string): Promise<Notification[]> {
  const query = `
    SELECT * FROM notifications 
    WHERE user_id = $1 
    ORDER BY created_at DESC;
  `;
  const result = await pool.query(query, [userId]);
  return result.rows;
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsRead(id: string, userId: string): Promise<void> {
  const query = `
    UPDATE notifications 
    SET is_read = true 
    WHERE id = $1 AND user_id = $2;
  `;
  await pool.query(query, [id, userId]);
}

/**
 * Marca todas las notificaciones de un usuario como leídas
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const query = `
    UPDATE notifications 
    SET is_read = true 
    WHERE user_id = $1;
  `;
  await pool.query(query, [userId]);
}
