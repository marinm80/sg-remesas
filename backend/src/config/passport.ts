import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findUserByEmail, createUser, createClientProfile } from '../repositories/user.repository.js';
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'google_client_id_placeholder';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'google_client_secret_placeholder';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No se pudo recuperar el correo desde la cuenta de Google'));
        }

        // Buscar el usuario en la base de datos
        let user = await findUserByEmail(email);

        if (user) {
          // El usuario existe. Retornar el usuario.
          // Las validaciones de colisión de proveedor (OAuth vs Local) se resuelven en el AuthController.
          return done(null, user);
        }

        // Si no existe, creamos un nuevo usuario con rol de Cliente (role_id = 4)
        user = await createUser({
          name: profile.displayName || 'Usuario de Google',
          email: email,
          password_hash: null, // Cuenta de inicio OAuth
          role_id: 4, // Rol 'cliente'
          auth_provider: 'google',
          provider_id: profile.id,
          email_verified: true, // Google OAuth no requiere verificación manual
        });

        // Crear el perfil del cliente asociado por defecto
        await createClientProfile({
          user_id: user.id,
          country: 'México', // País inicial sugerido (editable en el dashboard)
        });

        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;
