import * as notificationRepository from '../repositories/notification.repository.js';

/**
 * Crea una notificación interna validando duplicados no leídos (BR-36)
 */
export async function createNotification(data: {
  user_id: string;
  type: string; // transaction_status / ticket_reply / kyc_update / compliance_alert
  title: string;
  body: string;
  entity_type: string; // transaction / ticket / kyc_document / compliance_alert
  entity_id: string;
}): Promise<void> {
  try {
    // BR-36: Verificar que no exista ya una notificación no leída del mismo tipo + entidad
    const isDuplicate = await notificationRepository.findDuplicateUnreadNotification(
      data.user_id,
      data.type,
      data.entity_type,
      data.entity_id
    );

    if (isDuplicate) {
      return; // Ignorar inserción para evitar saturación de notificaciones idénticas
    }

    await notificationRepository.insertNotification(data);
  } catch (error: any) {
    console.error('[Notifications] Error al registrar notificación interna:', error.message);
  }
}
