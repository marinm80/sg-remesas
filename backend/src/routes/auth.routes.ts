import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// Rutas locales
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rutas Google OAuth 2.0 (RF-04)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/api/auth/google', session: false }),
  authController.googleCallback
);

export default router;
