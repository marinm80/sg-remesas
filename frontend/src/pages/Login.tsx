import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';
import { apiRequest, apiUrl } from '../services/api.js';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginState = useAuthStore((state) => state.login);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Interceptar OAuth tokens o errores
  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (token && refreshToken) {
      // Login exitoso por Google OAuth. Recuperar info del usuario
      setLoading(true);
      fetch(apiUrl('/accounts'), {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(async () => {
          // El token es válido. Decodificar la info del token para armar el user
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(jsonPayload);
          
          loginState(token, refreshToken, {
            id: payload.id,
            name: payload.name || 'Usuario Google',
            email: payload.email || '',
            role: payload.role_name || 'cliente',
            mustChangePassword: false
          });
          navigate('/dashboard');
        })
        .catch((err) => {
          setErrorMsg('Error al verificar sesión de Google: ' + err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }

    if (error) {
      if (error === 'account_deactivated') {
        navigate('/account-suspended', { replace: true });
        return;
      }
      const errorMap: Record<string, string> = {
        oauth_failed: 'El inicio de sesión con Google falló.',
        provider_collision: 'Este correo está registrado localmente. Inicia sesión con contraseña (BR-13).',
        session_expired: 'Tu sesión ha expirado por inactividad o cambio de permisos.'
      };
      setErrorMsg(errorMap[error] || 'Ocurrió un error al autenticar.');
    }

    if (searchParams.get('verified') === 'true') {
      setInfoMsg('¡Correo electrónico verificado con éxito! Ya puedes iniciar sesión.');
    }
  }, [searchParams, loginState, navigate]);

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuthenticated && !searchParams.get('token')) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate, searchParams]);

  // Submit Login Local
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        bodyData: { email, password }
      });

      loginState(res.accessToken, res.refreshToken, res.user);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Credenciales inválidas.';
      if (msg.toLowerCase().includes('desactivada')) {
        navigate('/account-suspended', { replace: true });
        return;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = apiUrl('/auth/google');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans text-on-surface">
      <div className="max-w-md w-full space-y-8 bg-white border border-outline-variant/30 p-8 rounded-3xl card-elevation relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/10">
          <span className="material-symbols-outlined text-white text-3xl">account_balance</span>
        </div>

        <div className="text-center pt-6">
          <h2 className="text-headline-md font-bold text-primary tracking-tight">Iniciar Sesión</h2>
          <p className="text-on-surface-variant text-body-sm mt-1">Accede a tu panel de control operativo de SG Remesas</p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl border border-error/30 bg-error-container/20 text-error flex items-start gap-2.5 text-body-sm">
            <span className="material-symbols-outlined text-lg shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-4 rounded-xl border border-secondary-container bg-secondary-container/25 text-secondary flex items-start gap-2.5 text-body-sm font-medium">
            <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
            <span>{infoMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs text-on-surface-variant font-semibold block mb-1">Correo Electrónico</label>
            <div className="relative flex items-center bg-surface border border-outline-variant/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all duration-200">
              <span className="material-symbols-outlined text-on-surface-variant/50 ml-3.5 absolute">mail</span>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
                className="w-full bg-transparent pl-11 pr-4 py-3.5 text-primary placeholder-on-surface-variant/30 focus:outline-none text-body-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-on-surface-variant font-semibold block mb-1">Contraseña</label>
            <div className="relative flex items-center bg-surface border border-outline-variant/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all duration-200">
              <span className="material-symbols-outlined text-on-surface-variant/50 ml-3.5 absolute">lock</span>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent pl-11 pr-4 py-3.5 text-primary placeholder-on-surface-variant/30 focus:outline-none text-body-sm"
              />
            </div>
          </div>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-secondary hover:underline font-bold">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all text-body-sm"
          >
            {loading ? 'Cargando...' : (
              <>
                <span className="material-symbols-outlined text-lg">login</span>
                Ingresar
              </>
            )}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-outline-variant/30"></div>
          <span className="flex-shrink mx-4 text-on-surface-variant/60 text-xs font-semibold">O continuar con</span>
          <div className="flex-grow border-t border-outline-variant/30"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full h-12 bg-white border border-outline-variant/50 text-primary font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-surface transition-all active:scale-95 text-body-sm"
        >
          <span className="material-symbols-outlined text-lg text-secondary">language</span>
          Iniciar con Google
        </button>

        <div className="text-center text-xs text-on-surface-variant pt-2">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="text-secondary hover:underline font-bold">
            Regístrate aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
