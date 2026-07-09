import { Link } from 'react-router-dom';

export default function AccountSuspended() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 font-sans text-on-surface">
      <div className="max-w-md w-full space-y-6 bg-white border border-outline-variant/30 p-8 rounded-3xl card-elevation relative text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-error-container flex items-center justify-center shadow-lg">
          <span className="material-symbols-outlined text-error text-4xl">lock_person</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-headline-md font-bold text-primary tracking-tight">
            Cuenta Suspendida
          </h1>
          <p className="text-on-surface-variant text-body-sm mt-2 leading-relaxed">
            Tu cuenta ha sido desactivada por un administrador del sistema y actualmente no tienes acceso a la plataforma.
          </p>
        </div>

        {/* Info Card */}
        <div className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-low text-left space-y-3">
          <h2 className="text-label-md uppercase text-on-surface-variant tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-base">info</span>
            ¿Por qué fue suspendida?
          </h2>
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            Las cuentas pueden ser suspendidas por razones de seguridad, incumplimiento de políticas o por solicitud interna. Si crees que se trata de un error, contacta al equipo de soporte.
          </p>
        </div>

        {/* Contact Options */}
        <div className="space-y-3">
          <a
            href="mailto:soporte@sgremesas.com?subject=Solicitud%20de%20reactivación%20de%20cuenta"
            className="w-full h-12 bg-secondary hover:bg-secondary/90 text-on-secondary font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all text-body-sm"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            Contactar Soporte
          </a>

          <Link
            to="/login"
            className="w-full h-12 bg-white border border-outline-variant/50 text-primary font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-surface transition-all active:scale-95 text-body-sm"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Volver al Inicio de Sesión
          </Link>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-on-surface-variant/60 pt-2">
          Si ya fuiste reactivado, intenta iniciar sesión nuevamente.
        </p>
      </div>
    </div>
  );
}
