import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../services/api.js';

export default function Register() {
  const navigate = useNavigate();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('México');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !country) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        bodyData: {
          name,
          email,
          password,
          country,
          phone: phone || null,
          address: address || null,
        },
      });

      setSuccessMsg('Registro exitoso. Hemos enviado un correo de verificación a tu casilla. Por favor verifícalo antes de iniciar sesión.');
      // Limpiar campos
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setAddress('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12 font-sans text-on-surface">
      <div className="max-w-md w-full space-y-8 bg-white border border-outline-variant/30 p-8 rounded-3xl card-elevation relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-xl shadow-primary/10">
          <span className="material-symbols-outlined text-white text-3xl">account_balance</span>
        </div>

        <div className="text-center pt-6">
          <h2 className="text-headline-md font-bold text-primary tracking-tight">Crear Cuenta</h2>
          <p className="text-on-surface-variant text-body-sm mt-1">Regístrate gratis y comienza a transferir hoy con SG Remesas</p>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-xl border border-error/30 bg-error-container/20 text-error flex items-start gap-2.5 text-body-sm">
            <span className="material-symbols-outlined text-lg shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl border border-sky-300/40 bg-sky-100 text-black flex items-start gap-2.5 text-body-sm font-medium">
            <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
            <span>{successMsg}</span>
          </div>
        )}

        {!successMsg && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-on-surface-variant font-semibold block mb-1">Nombre Completo</label>
              <div className="relative flex items-center bg-surface border border-outline-variant/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all duration-200">
                <span className="material-symbols-outlined text-on-surface-variant/50 ml-3.5 absolute">person</span>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Pérez"
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-primary placeholder-on-surface-variant/30 focus:outline-none text-body-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-on-surface-variant font-semibold block mb-1">Correo Electrónico</label>
              <div className="relative flex items-center bg-surface border border-outline-variant/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all duration-200">
                <span className="material-symbols-outlined text-on-surface-variant/50 ml-3.5 absolute">mail</span>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@ejemplo.com"
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
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-primary placeholder-on-surface-variant/30 focus:outline-none text-body-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-on-surface-variant font-semibold block mb-1">País</label>
                <div className="relative flex items-center bg-surface border border-outline-variant/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all duration-200">
                  <span className="material-symbols-outlined text-on-surface-variant/50 ml-3 absolute">public</span>
                  <select 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-transparent pl-10 pr-2 py-3.5 text-primary cursor-pointer focus:outline-none text-body-sm"
                  >
                    <option value="México">México</option>
                    <option value="Perú">Perú</option>
                    <option value="Colombia">Colombia</option>
                    <option value="España">España</option>
                    <option value="USA">USA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-on-surface-variant font-semibold block mb-1">Teléfono</label>
                <div className="relative flex items-center bg-surface border border-outline-variant/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all duration-200">
                  <span className="material-symbols-outlined text-on-surface-variant/50 ml-3 absolute">phone</span>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+52 55..."
                    className="w-full bg-transparent pl-10 pr-4 py-3.5 text-primary placeholder-on-surface-variant/30 focus:outline-none text-body-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-on-surface-variant font-semibold block mb-1">Dirección (Opcional)</label>
              <div className="relative flex items-center bg-surface border border-outline-variant/50 rounded-xl focus-within:border-primary focus-within:ring-1 focus-within:ring-primary overflow-hidden transition-all duration-200">
                <span className="material-symbols-outlined text-on-surface-variant/50 ml-3.5 absolute">location_on</span>
                <input 
                  type="text" 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle Falsa 123"
                  className="w-full bg-transparent pl-11 pr-4 py-3.5 text-primary placeholder-on-surface-variant/30 focus:outline-none text-body-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all text-body-sm mt-4"
            >
              {loading ? 'Procesando...' : (
                <>
                  <span className="material-symbols-outlined text-lg">person_add</span>
                  Crear Cuenta
                </>
              )}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-on-surface-variant pt-2">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-secondary hover:underline font-bold">
            Inicia sesión aquí
          </Link>
        </div>
      </div>
    </div>
  );
}
