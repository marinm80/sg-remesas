import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';
import { apiRequest } from '../services/api.js';
import { 
  LogOut, Bell, User, LayoutDashboard, Users, Percent, ShieldAlert, 
  FileText, ClipboardList, HelpCircle, UserCheck, Inbox, AlertTriangle, Send
} from 'lucide-react';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Cargar notificaciones
  const fetchNotifications = async () => {
    try {
      const res = await apiRequest('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter((n: any) => !n.is_read).length);
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Polling ligero cada 15 segundos para notificaciones
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Clic fuera del dropdown de notificaciones para cerrar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PUT' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // Definir ítems del sidebar según el rol
  const getSidebarItems = () => {
    switch (user.role) {
      case 'admin':
        return [
          { name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard },
          { name: 'Transacciones', path: '/dashboard/transactions', icon: Send },
          { name: 'Usuarios', path: '/dashboard/users', icon: Users },
          { name: 'Comisiones y Tramos', path: '/dashboard/commissions', icon: Percent },
          { name: 'Log de Auditoría', path: '/dashboard/audit-logs', icon: FileText },
          { name: 'Alertas AML', path: '/dashboard/auditor', icon: ShieldAlert },
        ];
      case 'operador':
        return [
          { name: 'Bandeja de Operaciones', path: '/dashboard/operator', icon: Inbox },
          { name: 'Transacciones', path: '/dashboard/transactions', icon: Send },
          { name: 'Usuarios', path: '/dashboard/users', icon: Users },
          { name: 'Solicitudes Clientes', path: '/dashboard/requests', icon: ClipboardList },
          { name: 'Soporte y Tickets', path: '/dashboard/tickets-management', icon: HelpCircle },
        ];
      case 'auditor':
        return [
          { name: 'Alertas AML', path: '/dashboard/auditor', icon: ShieldAlert },
          { name: 'Usuarios', path: '/dashboard/users', icon: Users },
          { name: 'Log de Auditoría', path: '/dashboard/audit-logs', icon: FileText },
          { name: 'Comisiones y Tramos', path: '/dashboard/commissions', icon: Percent },
        ];
      case 'cliente':
      default:
        return [
          { name: 'Cuentas y Saldos', path: '/dashboard/client', icon: LayoutDashboard },
          { name: 'Transacciones', path: '/dashboard/transactions', icon: Send },
          { name: 'Destinatarios', path: '/dashboard/beneficiaries', icon: UserCheck },
          { name: 'Soporte Técnico', path: '/dashboard/tickets', icon: HelpCircle },
        ];
    }
  };

  const sidebarItems = getSidebarItems();

  return (
    <div className="min-h-screen bg-background text-on-surface flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-outline-variant/30 bg-white hidden md:flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-outline-variant/30 gap-2 shrink-0">
          <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
          <span className="font-bold text-md text-primary">
            SG Remesas
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`w-full h-10 px-4 flex items-center gap-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-secondary/10 border border-secondary/20 text-secondary shadow-sm' 
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container border border-transparent'
                }`}
              >
                <Icon size={16} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-outline-variant/50 shrink-0">
              <User size={18} className="text-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-primary truncate">{user.name}</p>
              <span className="text-[10px] font-extrabold tracking-wider text-on-surface-variant/70 uppercase bg-surface px-1.5 py-0.5 rounded border border-outline-variant/50 inline-block mt-0.5">
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full h-9 flex items-center justify-center gap-2 rounded-lg text-xs font-bold bg-white hover:bg-surface border border-outline-variant/50 cursor-pointer text-primary transition-colors active:scale-98"
          >
            <LogOut size={12} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Topbar */}
        <header className="h-16 border-b border-outline-variant/30 bg-white/80 flex items-center justify-between px-6 shrink-0 sticky top-0 backdrop-blur-md z-30">
          <div className="flex items-center md:hidden gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance</span>
            <span className="font-bold text-md text-primary">SG Remesas</span>
          </div>

          <div className="hidden md:block">
            <h1 className="text-sm font-bold text-primary">
              {sidebarItems.find((item) => item.path === location.pathname)?.name || 'Panel de Gestión'}
            </h1>
          </div>

          {/* User Controls */}
          <div className="flex items-center space-x-3">
            {/* Notification Dropdown Container */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 rounded-xl bg-white border border-outline-variant/50 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors relative cursor-pointer"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-white animate-pulse"></span>
                )}
              </button>

              {/* Dropdown Card */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-outline-variant/30 rounded-2xl shadow-2xl p-4 space-y-3 z-50 text-primary">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                    <span className="text-sm font-bold text-primary">Notificaciones</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-secondary hover:underline font-bold"
                      >
                        Marcar todas leídas
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-on-surface-variant text-center py-6">No tienes notificaciones</p>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-3 rounded-xl border text-xs space-y-1.5 transition-colors relative ${
                            n.is_read 
                              ? 'bg-surface-container-low border-outline-variant/20 text-on-surface-variant' 
                              : 'bg-surface border-outline-variant text-primary font-medium'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold pr-4">{n.title}</span>
                            {!n.is_read && (
                              <button 
                                onClick={() => handleMarkAsRead(n.id)}
                                className="w-4 h-4 rounded-full bg-secondary/10 hover:bg-secondary/20 flex items-center justify-center text-secondary shrink-0"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                          <p className="text-on-surface-variant text-[11px] leading-relaxed">{n.body}</p>
                          <span className="text-[10px] text-on-surface-variant/50 block text-right">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Logout Mobile */}
            <button 
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bg-white border border-outline-variant/50 flex md:hidden items-center justify-center text-on-surface-variant hover:text-primary cursor-pointer"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {user.mustChangePassword && (
            <div className="mb-6 p-4 rounded-xl border border-warning/30 bg-warning/10 text-warning flex items-start gap-3 text-sm">
              <span className="material-symbols-outlined text-lg shrink-0 mt-0.5">warning</span>
              <div>
                <h4 className="font-bold">Contraseña Temporal Detectada</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  El administrador ha configurado una contraseña temporal. Por seguridad, debes cambiarla lo antes posible.
                </p>
              </div>
            </div>
          )}

          <Outlet />
        </main>
      </div>
    </div>
  );
}
