import { Request, Response } from 'express';
import Joi from 'joi';
import path from 'path';
import fs from 'fs';
import pool from '../config/db.js';
import * as kycRepository from '../repositories/kyc.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import { createNotification } from '../services/notification.service.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Asegurar que la carpeta uploads exista
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Registra un documento subido (Cliente) (RF-28)
 */
export async function uploadDocument(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  if (!req.file) {
    res.status(400).json({ status: 'error', message: 'No se subió ningún archivo' });
    return;
  }

  const schema = Joi.object({
    levelRequested: Joi.number().integer().valid(1, 2).required(),
    documentType: Joi.string().valid('id_card', 'passport', 'proof_of_address').required(),
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    // Si falla la validación, eliminar el archivo subido
    fs.unlinkSync(req.file.path);
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  try {
    const doc = await kycRepository.uploadKycDocument({
      client_id: user.id,
      level_requested: value.levelRequested,
      document_type: value.documentType,
      file_url: req.file.filename, // Guardar solo el nombre del archivo
    });

    res.status(201).json({
      status: 'ok',
      message: 'Documento subido y registrado para verificación',
      data: doc,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Revisa (aprueba/rechaza) una solicitud KYC (Admin/Auditor/Operador con permiso)
 */
export async function reviewDocument(req: Request, res: Response): Promise<void> {
  const reviewer = (req as any).user;
  const schema = Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'correction_needed').required(),
    comment: Joi.string().max(500).required(), // Comentario obligatorio
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ status: 'error', message: error.details[0].message });
    return;
  }

  const id = req.params.id as string;

  const dbClient = await pool.connect();
  try {
    await dbClient.query('BEGIN');

    // 1. Obtener documento
    const doc = await kycRepository.findKycDocumentById(id);
    if (!doc) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      dbClient.release();
      return;
    }

    if (doc.status !== 'pending') {
      res.status(400).json({ status: 'error', message: 'El documento ya ha sido revisado previamente' });
      dbClient.release();
      return;
    }

    // 2. Obtener perfil de cliente actual
    const profile = await userRepository.findClientProfileByUserId(doc.client_id);
    if (!profile) {
      res.status(404).json({ status: 'error', message: 'Perfil del cliente no encontrado' });
      dbClient.release();
      return;
    }

    const previousLevel = profile.kyc_level;
    let newLevel = previousLevel;

    // 3. Actualizar documento en base de datos
    const updateDocQuery = `
      UPDATE kyc_documents 
      SET status = $1, reviewed_by = $2, reviewer_comment = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4;
    `;
    await dbClient.query(updateDocQuery, [value.status, reviewer.id, value.comment, id]);

    // 4. Si se aprueba, evaluar si sube de nivel KYC
    if (value.status === 'approved') {
      if (doc.level_requested > previousLevel) {
        newLevel = doc.level_requested;
        // Actualizar el perfil del cliente
        await dbClient.query(
          "UPDATE client_profiles SET kyc_level = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2",
          [newLevel, doc.client_id]
        );
      }
    }

    // 5. Registrar en el historial KYC
    const historyQuery = `
      INSERT INTO kyc_history (client_id, previous_level, new_level, action, performed_by, comment)
      VALUES ($1, $2, $3, $4, $5, $6);
    `;
    await dbClient.query(historyQuery, [doc.client_id, previousLevel, newLevel, value.status, reviewer.id, value.comment]);

    await dbClient.query('COMMIT');

    // 6. Notificar al cliente
    const statusText = value.status === 'approved' ? 'Aprobado' : (value.status === 'rejected' ? 'Rechazado' : 'Requiere Corrección');
    await createNotification({
      user_id: doc.client_id,
      type: 'kyc_update',
      title: `Documento KYC ${statusText}`,
      body: `Tu documento de tipo ${doc.document_type} ha sido ${statusText.toLowerCase()}. Comentario: ${value.comment}`,
      entity_type: 'kyc_document',
      entity_id: doc.id,
    }).catch(err => console.error('[Notification Async Error]', err.message));

    res.status(200).json({
      status: 'ok',
      message: `Documento revisado correctamente. Nivel KYC del cliente: KYC-${newLevel}.`,
    });
  } catch (err: any) {
    await dbClient.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    dbClient.release();
  }
}

/**
 * Lista las solicitudes KYC pendientes (para Administrador/Operador/Auditor) (RF-30)
 */
export async function getPendingDocuments(req: Request, res: Response): Promise<void> {
  try {
    const docs = await kycRepository.findPendingKycDocuments();
    res.status(200).json({ status: 'ok', data: docs });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Obtiene los documentos del cliente
 */
export async function getClientDocuments(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  let clientId = req.query.clientId as string;

  if (user.role_name === 'cliente') {
    clientId = user.id;
  }

  if (!clientId) {
    res.status(400).json({ status: 'error', message: 'Se requiere el parámetro clientId' });
    return;
  }

  try {
    const docs = await kycRepository.findKycDocumentsByClientId(clientId);
    res.status(200).json({ status: 'ok', data: docs });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Obtiene el historial KYC del cliente
 */
export async function getClientHistory(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  let clientId = req.query.clientId as string;

  if (user.role_name === 'cliente') {
    clientId = user.id;
  }

  if (!clientId) {
    res.status(400).json({ status: 'error', message: 'Se requiere el parámetro clientId' });
    return;
  }

  try {
    const history = await kycRepository.findKycHistoryByClientId(clientId);
    res.status(200).json({ status: 'ok', data: history });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * Sirve de forma segura el documento subido (servir archivos mediante endpoint autenticado)
 */
export async function viewDocument(req: Request, res: Response): Promise<void> {
  const user = (req as any).user;
  const id = req.params.id as string;

  try {
    const doc = await kycRepository.findKycDocumentById(id);
    if (!doc) {
      res.status(404).json({ status: 'error', message: 'Documento no encontrado' });
      return;
    }

    // Aislamiento: Un cliente sólo puede ver sus propios archivos KYC
    if (user.role_name === 'cliente' && doc.client_id !== user.id) {
      res.status(403).json({ status: 'error', message: 'Acceso denegado a este documento' });
      return;
    }

    const filePath = path.join(UPLOADS_DIR, doc.file_url);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ status: 'error', message: 'El archivo físico no existe en el servidor' });
      return;
    }

    res.sendFile(filePath);
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
}
