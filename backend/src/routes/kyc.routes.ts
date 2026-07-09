import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as kycController from '../controllers/kyc.controller.js';
import { authenticateToken, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();

// Configuración de Multer para la subida de archivos KYC (Límite 5MB) (RF-28)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `kyc-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5 MB (BR-31)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de tipo imagen (JPEG, PNG) o PDF'));
  },
});

// Todas las rutas de KYC requieren sesión activa
router.use(authenticateToken);

// Rutas de cliente
router.post('/upload', upload.single('file'), kycController.uploadDocument);
router.get('/documents', kycController.getClientDocuments);
router.get('/history', kycController.getClientHistory);

// Servir de forma segura el archivo (servir archivos mediante endpoint autenticado)
router.get('/documents/view/:id', kycController.viewDocument);

// Rutas de administración / auditoría / operador
router.get('/pending', requirePermission('clients.kyc_review'), kycController.getPendingDocuments);
router.post('/documents/:id/review', requirePermission('clients.kyc_review'), kycController.reviewDocument);

export default router;
