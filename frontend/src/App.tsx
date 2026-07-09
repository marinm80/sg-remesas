import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore.js';

// Importar Vistas Públicas
import Landing from './pages/Landing.js';
import Login from './pages/Login.js';
import Register from './pages/Register.js';
import VerifyEmail from './pages/VerifyEmail.js';
import AccountSuspended from './pages/AccountSuspended.js';

// Importar Layouts & Vistas Dashboard
import DashboardLayout from './layouts/DashboardLayout.js';
import ClientDashboard from './pages/Dashboard/ClientDashboard.js';
import Beneficiaries from './pages/Dashboard/Beneficiaries.js';
import ClientTickets from './pages/Dashboard/ClientTickets.js';
import OperatorDashboard from './pages/Dashboard/OperatorDashboard.js';
import PendingRequests from './pages/Dashboard/PendingRequests.js';
import TicketsManagement from './pages/Dashboard/TicketsManagement.js';
import AdminDashboard from './pages/Dashboard/AdminDashboard.js';
import UsersManagement from './pages/Dashboard/Users.js';
import CommissionsConfig from './pages/Dashboard/CommissionsConfig.js';
import AuditLogs from './pages/Dashboard/AuditLogs.js';
import AuditorDashboard from './pages/Dashboard/AuditorDashboard.js';

// Componente para proteger rutas según autenticación y rol (RBAC) (RF-32)
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirección por defecto según el rol del usuario para prevenir 403 visuales
    const roleRoutes: Record<string, string> = {
      admin: '/dashboard/admin',
      operador: '/dashboard/operator',
      auditor: '/dashboard/auditor',
      cliente: '/dashboard/client',
    };
    return <Navigate to={roleRoutes[user.role] || '/'} replace />;
  }

  return <>{children}</>;
}

// Redirección inicial del dashboard según el rol del usuario
function DashboardIndexRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;

  const roleRoutes: Record<string, string> = {
    admin: '/dashboard/admin',
    operador: '/dashboard/operator',
    auditor: '/dashboard/auditor',
    cliente: '/dashboard/client',
  };

  return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/account-suspended" element={<AccountSuspended />} />

        {/* Rutas Dashboard Privadas Protegidas por Rol */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          {/* Index del Dashboard: Redirige según el rol */}
          <Route index element={<DashboardIndexRedirect />} />

          {/* Rutas de Cliente */}
          <Route 
            path="client" 
            element={
              <ProtectedRoute allowedRoles={['cliente']}>
                <ClientDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="beneficiaries" 
            element={
              <ProtectedRoute allowedRoles={['cliente']}>
                <Beneficiaries />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="tickets" 
            element={
              <ProtectedRoute allowedRoles={['cliente']}>
                <ClientTickets />
              </ProtectedRoute>
            } 
          />

          {/* Rutas de Operador */}
          <Route 
            path="operator" 
            element={
              <ProtectedRoute allowedRoles={['operador']}>
                <OperatorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="requests" 
            element={
              <ProtectedRoute allowedRoles={['operador']}>
                <PendingRequests />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="tickets-management" 
            element={
              <ProtectedRoute allowedRoles={['operador']}>
                <TicketsManagement />
              </ProtectedRoute>
            } 
          />

          {/* Rutas de Administrador */}
          <Route 
            path="admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="users" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'operador', 'auditor']}>
                <UsersManagement />
              </ProtectedRoute>
            } 
          />

          {/* Rutas Compartidas (Admin / Auditor) */}
          <Route 
            path="commissions" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'auditor']}>
                <CommissionsConfig />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="audit-logs" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'auditor']}>
                <AuditLogs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="auditor" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'auditor']}>
                <AuditorDashboard />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* Catch-all: Redirige a la landing page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
