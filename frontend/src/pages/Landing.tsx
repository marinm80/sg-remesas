import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiUrl } from '../services/api.js';

export default function Landing() {
  // Simulador State
  const [amount, setAmount] = useState<number>(1000);
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('MXN');
  const [rate, setRate] = useState<number>(17.5);
  const [loadingRate, setLoadingRate] = useState<boolean>(false);
  const [convertedAmount, setConvertedAmount] = useState<number>(0);
  const [fee, setFee] = useState<number>(28); // Comisión aproximada
  const [totalCharged, setTotalCharged] = useState<number>(1028);

  // Rastrear State
  const [trackCode, setTrackCode] = useState<string>('');
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [loadingTrack, setLoadingTrack] = useState<boolean>(false);

  // Currencies soportadas
  const currencies = ['USD', 'MXN', 'PEN', 'COP', 'EUR'];

  // Obtener tasas de cambio
  useEffect(() => {
    async function fetchRate() {
      if (fromCurrency === toCurrency) {
        setRate(1);
        return;
      }
      setLoadingRate(true);
      try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`);
        if (res.ok) {
          const data = await res.json();
          const fetchedRate = data.rates[toCurrency] || 1;
          setRate(fetchedRate);
        } else {
          // Fallback rates
          const fallbacks: Record<string, Record<string, number>> = {
            USD: { MXN: 17.5, PEN: 3.7, COP: 4000, EUR: 0.92 },
            MXN: { USD: 0.057, PEN: 0.21, COP: 228, EUR: 0.052 },
            EUR: { USD: 1.08, MXN: 19.0, PEN: 4.0, COP: 4340 }
          };
          setRate(fallbacks[fromCurrency]?.[toCurrency] || 1.0);
        }
      } catch {
        // Fallback en caso de error
        const fallbacks: Record<string, Record<string, number>> = {
          USD: { MXN: 17.5, PEN: 3.7, COP: 4000, EUR: 0.92 },
          MXN: { USD: 0.057, PEN: 0.21, COP: 228, EUR: 0.052 }
        };
        setRate(fallbacks[fromCurrency]?.[toCurrency] || 1.0);
      } finally {
        setLoadingRate(false);
      }
    }
    fetchRate();
  }, [fromCurrency, toCurrency]);

  // Recalcular simulador
  useEffect(() => {
    // Regla de comisión estimada: 2.5% + $3 USD mínimo fijo (convertido a divisa origen)
    const baseFeePercent = 0.025;
    let minFixed = 3.0;

    if (fromCurrency !== 'USD') {
      // Ajuste aproximado para el mínimo fijo
      minFixed = fromCurrency === 'MXN' ? 50 : (fromCurrency === 'PEN' ? 11 : (fromCurrency === 'COP' ? 12000 : 3.0));
    }

    const calculatedFee = Math.max(amount * baseFeePercent, minFixed);
    const total = amount + calculatedFee;
    const converted = amount * rate;

    setFee(Math.round(calculatedFee * 100) / 100);
    setTotalCharged(Math.round(total * 100) / 100);
    setConvertedAmount(Math.round(converted * 100) / 100);
  }, [amount, rate, fromCurrency]);

  // Rastrear Remesa
  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim()) return;

    setLoadingTrack(true);
    setTrackingError(null);
    setTrackingResult(null);

    try {
      const res = await fetch(apiUrl(`/transactions/track/${trackCode.trim().toUpperCase()}`));
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Código de seguimiento no válido.');
      }
      setTrackingResult(data.data);
    } catch (err: any) {
      setTrackingError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoadingTrack(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased font-sans">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-md fixed top-0 w-full z-50 border-b border-outline-variant/30">
        <nav className="flex justify-between items-center px-container-margin-mobile md:px-container-margin-desktop h-20 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-3xl" data-icon="account_balance">account_balance</span>
              <span className="text-headline-md font-bold text-primary tracking-tight">SG Remesas</span>
            </div>
            {/* Expanded Desktop Menu */}
            <div className="hidden lg:flex items-center gap-8 ml-4">
              <a className="text-primary font-semibold text-body-md hover:text-secondary transition-colors" href="#services">Remesas</a>
              <a className="text-on-surface-variant hover:text-primary text-body-md transition-colors" href="#services">Retiros</a>
              <a className="text-on-surface-variant hover:text-primary text-body-md transition-colors" href="#tracker">Seguimiento</a>
              <a className="text-on-surface-variant hover:text-primary text-body-md transition-colors" href="#services">Seguridad</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block text-primary font-semibold px-4 py-2 hover:bg-surface-container-low rounded-lg transition-colors">Iniciar Sesión</Link>
            <Link to="/register" className="px-6 py-3 bg-primary text-on-primary rounded-full font-label-md text-label-md hover:opacity-90 active:scale-95 transition-all duration-200">
              Registrarse
            </Link>
          </div>
        </nav>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="hero-gradient relative overflow-hidden py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-container-margin-mobile md:px-container-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="z-10 text-center lg:text-left">
              <h1 className="font-display-lg text-4xl md:text-5xl lg:text-display-lg text-primary leading-tight mb-8">
                Envía dinero al mundo de forma <span className="text-secondary font-bold">inteligente</span>.
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-12 max-w-2xl lg:max-w-lg mx-auto lg:mx-0">
                Mueve tus fondos con seguridad institucional, comisiones mínimas y la velocidad que tu familia y negocios merecen.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/register" className="h-14 px-10 bg-primary text-on-primary rounded-xl font-headline-md text-headline-md flex items-center justify-center hover:bg-primary/90 transition-all shadow-lg shadow-primary/10">
                  Crear Cuenta Gratis
                </Link>
                <a href="#services" className="h-14 px-10 bg-surface-container-low text-primary border border-outline-variant/50 rounded-xl font-headline-md text-headline-md flex items-center justify-center hover:bg-surface-container transition-all">
                  Ver Servicios
                </a>
              </div>
              <div className="mt-12 flex items-center justify-center lg:justify-start gap-4">
                <div className="flex -space-x-3">
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-surface-container-highest flex items-center justify-center text-xs text-on-surface-variant font-bold">JS</div>
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-secondary-container flex items-center justify-center text-xs text-on-secondary-container font-bold">MA</div>
                  <div className="w-12 h-12 rounded-full border-2 border-white bg-primary-fixed flex items-center justify-center text-xs text-on-primary-fixed font-bold">+2k</div>
                </div>
                <p className="text-body-sm text-on-surface-variant">Únete a más de <span className="font-bold text-primary">2,000+</span> usuarios satisfechos.</p>
              </div>
            </div>

            {/* Visual Element / Interactive Simulator Card */}
            <div className="relative">
              <div className="absolute -top-20 -right-20 w-96 h-96 bg-secondary-container/20 blur-3xl rounded-full"></div>
              
              <div className="relative bg-white p-8 rounded-3xl card-elevation max-w-md mx-auto transform lg:rotate-2 hover:rotate-0 transition-all duration-300">
                <div className="flex justify-between items-center mb-8">
                  <span className="font-bold text-headline-md text-primary">Transferencia</span>
                  <span className="material-symbols-outlined text-on-surface-variant cursor-pointer">more_horiz</span>
                </div>
                
                <div className="space-y-6">
                  {/* From Currency Block */}
                  <div className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-outline-variant/30">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-on-primary shrink-0">
                      <span className="material-symbols-outlined">send</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-body-sm text-on-surface-variant">Enviando desde</p>
                        <select 
                          value={fromCurrency}
                          onChange={(e) => setFromCurrency(e.target.value)}
                          className="text-body-sm font-bold text-primary bg-transparent border-none p-0 cursor-pointer focus:outline-none focus:ring-0"
                        >
                          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex items-baseline mt-1">
                        <span className="font-bold text-headline-md text-primary mr-1">$</span>
                        <input 
                          type="number" 
                          value={amount || ''}
                          onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full font-bold text-headline-md text-primary bg-transparent border-none p-0 focus:outline-none focus:ring-0 focus:border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Swap Row */}
                  <div className="flex justify-center -my-2 relative z-10">
                    <button 
                      type="button"
                      onClick={() => {
                        const temp = fromCurrency;
                        setFromCurrency(toCurrency);
                        setToCurrency(temp);
                      }}
                      className="bg-white p-2 rounded-full border border-outline-variant/60 shadow-sm hover:bg-surface transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-primary">swap_vert</span>
                    </button>
                  </div>

                  {/* To Currency Block */}
                  <div className="flex items-center gap-4 p-4 bg-surface rounded-xl border border-outline-variant/30">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-on-secondary shrink-0">
                      <span className="material-symbols-outlined">account_balance_wallet</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-body-sm text-on-surface-variant">Recibiendo en</p>
                        <select 
                          value={toCurrency}
                          onChange={(e) => setToCurrency(e.target.value)}
                          className="text-body-sm font-bold text-secondary bg-transparent border-none p-0 cursor-pointer focus:outline-none focus:ring-0"
                        >
                          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="font-bold text-headline-md text-primary truncate mt-1">
                        ${convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Breakdown Info */}
                  <div className="pt-4 space-y-1.5 text-xs text-on-surface-variant border-t border-outline-variant/30">
                    <div className="flex justify-between items-center">
                      <span>Tasa de cambio:</span>
                      <span className="font-mono flex items-center gap-1">
                        {loadingRate ? (
                          <span className="animate-pulse">Cargando...</span>
                        ) : (
                          `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comisión estimada (2.5% + Fijo):</span>
                      <span className="font-semibold text-primary">+{fee} {fromCurrency}</span>
                    </div>
                    <div className="flex justify-between text-body-sm font-bold border-t border-dashed border-outline-variant/20 pt-1.5 mt-1.5">
                      <span>Total a debitar:</span>
                      <span className="text-secondary">{totalCharged} {fromCurrency}</span>
                    </div>
                  </div>
                </div>

                <Link 
                  to="/register" 
                  className="w-full block text-center mt-6 py-4 bg-primary text-on-primary rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all duration-200 shadow-md"
                >
                  Confirmar Envío
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section Preview */}
        <section id="services" className="py-24 bg-white border-t border-outline-variant/20">
          <div className="max-w-7xl mx-auto px-container-margin-mobile md:px-container-margin-desktop">
            <div className="text-center mb-16">
              <h2 className="text-headline-lg font-bold mb-4 text-primary">Servicios diseñados para ti</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">Nuestra plataforma ofrece soluciones financieras completas para usuarios individuales y empresas internacionales.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-8 rounded-2xl bg-surface hover:shadow-xl transition-all border border-outline-variant/30 hover:-translate-y-1">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mb-6 text-on-primary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <h3 className="text-headline-md font-bold mb-3 text-primary">Remesas Rápidas</h3>
                <p className="text-on-surface-variant mb-6 text-body-sm">Envía dinero a más de 50 países con las tasas de cambio más competitivas del mercado.</p>
                <Link className="text-primary font-bold inline-flex items-center gap-2 hover:gap-3 transition-all text-body-sm" to="/register">
                  Saber más <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
              <div className="p-8 rounded-2xl bg-surface hover:shadow-xl transition-all border border-outline-variant/30 hover:-translate-y-1">
                <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-6 text-on-secondary">
                  <span className="material-symbols-outlined">atm</span>
                </div>
                <h3 className="text-headline-md font-bold mb-3 text-primary">Retiros Locales</h3>
                <p className="text-on-surface-variant mb-6 text-body-sm">Accede a tus fondos en moneda local a través de nuestra red de cajeros y socios autorizados.</p>
                <Link className="text-primary font-bold inline-flex items-center gap-2 hover:gap-3 transition-all text-body-sm" to="/register">
                  Saber más <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
              <div className="p-8 rounded-2xl bg-surface hover:shadow-xl transition-all border border-outline-variant/30 hover:-translate-y-1">
                <div className="w-12 h-12 bg-primary-container rounded-xl flex items-center justify-center mb-6 text-on-primary">
                  <span className="material-symbols-outlined text-secondary">shield</span>
                </div>
                <h3 className="text-headline-md font-bold mb-3 text-primary">Seguridad Total</h3>
                <p className="text-on-surface-variant mb-6 text-body-sm">Tus datos y dinero están protegidos por encriptación de grado bancario y monitoreo de cumplimiento AML 24/7.</p>
                <Link className="text-primary font-bold inline-flex items-center gap-2 hover:gap-3 transition-all text-body-sm" to="/register">
                  Saber más <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Public Tracker Section */}
        <section id="tracker" className="py-24 bg-surface-container-low border-t border-outline-variant/20">
          <div className="max-w-3xl mx-auto px-4">
            <div className="text-center space-y-3 mb-10">
              <h2 className="text-headline-lg font-bold text-primary">Rastreo Público de Remesas</h2>
              <p className="text-on-surface-variant text-body-sm">
                Ingresa el código único de tu remesa para verificar el estado en tiempo real. No requiere inicio de sesión.
              </p>
            </div>

            <form onSubmit={handleTrack} className="flex gap-2 p-1.5 bg-white rounded-xl border border-outline-variant/50 max-w-lg mx-auto shadow-sm">
              <input 
                type="text" 
                placeholder="Ej: REM-2026-XF83A"
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                className="flex-1 bg-transparent px-4 py-2 text-primary font-mono placeholder-on-surface-variant/40 focus:outline-none uppercase"
              />
              <button 
                type="submit" 
                disabled={loadingTrack}
                className="px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-bold flex items-center gap-2 cursor-pointer transition-all duration-200"
              >
                {loadingTrack ? (
                  <span className="material-symbols-outlined animate-spin text-lg">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-lg">search</span>
                )}
                Buscar
              </button>
            </form>

            {/* Tracking error */}
            {trackingError && (
              <div className="mt-6 p-4 rounded-xl border border-error/30 bg-error-container/20 text-error flex items-center gap-2 max-w-lg mx-auto">
                <span className="material-symbols-outlined text-lg">error</span>
                <span className="text-body-sm font-medium">{trackingError}</span>
              </div>
            )}

            {/* Tracking result */}
            {trackingResult && (
              <div className="mt-8 bg-white border border-outline-variant/30 p-6 rounded-2xl max-w-lg mx-auto space-y-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-on-surface-variant/70 font-bold block">CÓDIGO DE SEGUIMIENTO</span>
                    <span className="text-body-md font-mono font-bold text-primary">{trackingResult.tracking_code}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-on-surface-variant/70 font-bold block">MONTO ENVIADO</span>
                    <span className="text-body-md font-extrabold text-secondary">{trackingResult.amount} {trackingResult.currency}</span>
                  </div>
                </div>

                {/* Status Visual Timeline */}
                <div className="space-y-4 pt-2">
                  <span className="text-xs text-on-surface-variant/70 font-bold block">ESTADO DE OPERACIÓN</span>
                  
                  <div className="grid grid-cols-3 gap-2 relative">
                    {/* Progress Line background */}
                    <div className="absolute top-4 left-[16.6%] right-[16.6%] h-1 bg-surface-container-high -z-10"></div>
                    
                    {/* Progress Line active */}
                    <div className={`absolute top-4 left-[16.6%] h-1 bg-secondary -z-10 transition-all duration-500`}
                      style={{ 
                        width: trackingResult.status === 'completed' ? '66.6%' : 
                               trackingResult.status === 'processing' ? '33.3%' : '0%' 
                      }}
                    ></div>

                    {/* Step 1: Pending */}
                    <div className="flex flex-col items-center text-center">
                      <div className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold text-xs">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                      </div>
                      <span className="text-[11px] font-bold text-primary mt-1.5">Pendiente</span>
                    </div>

                    {/* Step 2: Processing */}
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        trackingResult.status === 'processing' || trackingResult.status === 'completed'
                          ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface-variant/40'
                      }`}>
                        <span className={`material-symbols-outlined text-sm ${trackingResult.status === 'processing' ? 'animate-spin' : ''}`}>sync</span>
                      </div>
                      <span className={`text-[11px] font-bold mt-1.5 ${
                        trackingResult.status === 'processing' || trackingResult.status === 'completed'
                          ? 'text-primary' : 'text-on-surface-variant/40'
                      }`}>Procesando</span>
                    </div>

                    {/* Step 3: Completed */}
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                        trackingResult.status === 'completed'
                          ? 'bg-secondary text-on-secondary' 
                          : trackingResult.status === 'reversed' ? 'bg-orange-500 text-white'
                          : trackingResult.status === 'failed' ? 'bg-error text-on-error'
                          : 'bg-surface-container-high text-on-surface-variant/40'
                      }`}>
                        <span className="material-symbols-outlined text-sm">
                          {trackingResult.status === 'reversed' ? 'undo' : 
                           trackingResult.status === 'failed' ? 'cancel' : 'check_circle'}
                        </span>
                      </div>
                      <span className={`text-[11px] font-bold mt-1.5 ${
                        trackingResult.status === 'completed' ? 'text-secondary font-bold' 
                        : trackingResult.status === 'reversed' ? 'text-orange-600'
                        : trackingResult.status === 'failed' ? 'text-error'
                        : 'text-on-surface-variant/40'
                      }`}>
                        {trackingResult.status === 'reversed' ? 'Revertida' : 
                         trackingResult.status === 'failed' ? 'Fallida' : 'Completada'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-xs text-on-surface-variant/60 flex justify-between border-t border-outline-variant/30">
                  <span>Registrado el: {new Date(trackingResult.created_at).toLocaleString()}</span>
                  <span>Tipo: Remesa Internacional</span>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-highest py-16 border-t border-outline-variant/20 text-on-surface">
        <div className="max-w-7xl mx-auto px-container-margin-mobile md:px-container-margin-desktop">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary text-2xl" data-icon="account_balance">account_balance</span>
                <span className="font-bold text-lg text-primary">SG Remesas</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">Haciendo que las finanzas globales sean accesibles para todos, en cualquier lugar.</p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-primary">Empresa</h4>
              <ul className="space-y-4 text-body-sm text-on-surface-variant">
                <li><a className="hover:text-primary transition-colors" href="#">Sobre nosotros</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Carreras</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Prensa</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-primary">Soporte</h4>
              <ul className="space-y-4 text-body-sm text-on-surface-variant">
                <li><a className="hover:text-primary transition-colors" href="#">Centro de ayuda</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Contacto</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Estado del sistema</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-primary">Legal</h4>
              <ul className="space-y-4 text-body-sm text-on-surface-variant">
                <li><a className="hover:text-primary transition-colors" href="#">Privacidad</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Términos</a></li>
                <li><a className="hover:text-primary transition-colors" href="#">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4 text-body-sm text-on-surface-variant">
            <p>© 2026 SG Remesas. Todos los derechos reservados.</p>
            <div className="flex gap-6">
              <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">language</span>
              <span className="material-symbols-outlined cursor-pointer hover:text-primary transition-colors">share</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
