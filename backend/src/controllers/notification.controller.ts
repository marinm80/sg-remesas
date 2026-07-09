import { Request, Response } from 'express';
import * as notificationRepository from '../repositories/notification.repository.js';

/**
 * Obtiene el listado de notificaciones para el usuario autenticado (RF-37)
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    const list = await notificationRepository.findNotificationsByUserId(user.id);
    res.status(200).json({ status: 'ok', data: list });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Marca una notificación como leída
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = req.params.id as string;

  try {
    await notificationRepository.markNotificationAsRead(id, user.id);
    res.status(200).json({ status: 'ok', message: 'Notificación marcada como leída.' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Marca todas las notificaciones como leídas
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  try {
    await notificationRepository.markAllNotificationsAsRead(user.id);
    res.status(200).json({ status: 'ok', message: 'Todas las notificaciones se marcaron como leídas.' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
