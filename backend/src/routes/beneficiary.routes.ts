import { Router } from 'express';
import * as beneficiaryController from '../controllers/beneficiary.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Todas las rutas de beneficiarios requieren sesión activa
router.use(authenticateToken);

router.get('/', beneficiaryController.getBeneficiaries);
router.post('/', beneficiaryController.createBeneficiary);
router.put('/:id', beneficiaryController.updateBeneficiary);
router.delete('/:id', beneficiaryController.deleteBeneficiary);

export default router;
