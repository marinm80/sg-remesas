import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../services/api.js';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setErrorMsg('Token de verificación ausente en el enlace.');
      setLoading(false);
      return;
    }

    async function verify() {
      try {
        await apiRequest('/auth/verify-email', {
          method: 'POST',
          bodyData: { token }
        });
        // Redirigir a login indicando que fue verificado
        navigate('/login?verified=true');
      } catch (err: any) {
        setErrorMsg(err.message || 'El token de verificación es inválido o ha expirado.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans text-on-surface">
      <div className="max-w-md w-full bg-white border border-outline-variant/30 p-8 rounded-3xl card-elevation text-center space-y-6 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/10">
          <span className="material-symbols-outlined text-white text-3xl">account_balance</span>
        </div>

        <h2 className="text-xl font-bold text-primary pt-6">Verificación de Cuenta</h2>

        {loading && (
          <div className="space-y-4">
            <span className="material-symbols-outlined animate-spin text-secondary text-4xl">sync</span>
            <p className="text-on-surface-variant text-body-sm">Validando tu token de correo electrónico, por favor espera...</p>
          </div>
        )}

        {errorMsg && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-error/30 bg-error-container/20 text-error flex items-center justify-center gap-2.5 text-body-sm">
              <span className="material-symbols-outlined text-lg shrink-0">error</span>
              <span>{errorMsg}</span>
            </div>
            <p className="text-on-surface-variant text-body-sm">
              Si tu token expiró, puedes volver a solicitar un enlace de restablecimiento o registro.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/login" className="px-5 py-2.5 rounded-xl bg-white border border-outline-variant/50 hover:bg-surface text-primary font-bold text-body-sm transition-all active:scale-95">
                Iniciar Sesión
              </Link>
              <Link to="/" className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-body-sm transition-all active:scale-95">
                Ir a la Landing
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
