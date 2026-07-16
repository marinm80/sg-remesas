import React, { useState, useEffect } from 'react';
import { apiRequest, apiUrl } from '../../services/api.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  Users, Plus, Shield, ShieldCheck, X,
  CheckCircle, AlertCircle, RefreshCw, Layers, FileText, Trash2, Archive, UserCog
} from 'lucide-react';

const SYSTEM_ADMIN_ID = 'a0000000-0000-0000-0000-000000000001';

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
  operador: 'bg-sky-500/15 text-sky-300 border-sky-500/25',
  auditor: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  cliente: 'bg-slate-500/15 text-slate-300 border-slate-500/25',
};

export default function UsersManagement() {
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'internal' | 'clients'>('internal');

  // Data
  const [internalUsers, setInternalUsers] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [kycPending, setKycPending] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showKycModal, setShowKycModal] = useState<boolean>(false);
  const [selectedKycDoc, setSelectedKycDoc] = useState<any | null>(null);

  // Form: Create Internal User
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number>(2);
  const [commissionEligible, setCommissionEligible] = useState<boolean>(false);
  const [submittingUser, setSubmittingUser] = useState<boolean>(false);

  // Form: Review KYC
  const [kycStatus, setKycStatus] = useState<string>('approved');
  const [kycComment, setKycComment] = useState<string>('');
  const [submittingKyc, setSubmittingKyc] = useState<boolean>(false);

  // Inline edit role
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRoleId, setNewRoleId] = useState<number>(2);

  // ── Fetchers ──────────────────────────────────────────────
  const fetchInternalUsers = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/users/internal');
      setInternalUsers(res.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener usuarios internos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [clientsRes, kycRes] = await Promise.all([
        apiRequest('/users/clients'),
        apiRequest('/kyc/pending'),
      ]);
      setClients(clientsRes.data || []);
      setKycPending(kycRes.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSuccessMsg(null);
    setErrorMsg(null);
    if (activeTab === 'internal') fetchInternalUsers();
    else fetchClients();
  }, [activeTab]);

  // ── Handlers: Internal Users ─────────────────────────────
  const handleCreateInternalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setSubmittingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest('/users/internal', {
        method: 'POST',
        bodyData: { name, email, password, role_id: roleId, commission_eligible: commissionEligible },
      });
      setSuccessMsg('Usuario interno creado con éxito. Se requerirá cambio de contraseña en su primer acceso.');
      setShowCreateModal(false);
      setName(''); setEmail(''); setPassword(''); setCommissionEligible(false);
      fetchInternalUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear usuario interno.');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/users/${userId}/role`, { method: 'PUT', bodyData: { role_id: newRoleId } });
      setSuccessMsg('Rol actualizado e invalidada la sesión activa con éxito.');
      setEditingUserId(null);
      fetchInternalUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar rol.');
    }
  };

  const handleArchiveUser = async (userId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? 'archivar' : 'desarchivar';
    if (!window.confirm(`¿Estás seguro de que deseas ${action} a este usuario?`)) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/users/${userId}/status`, { method: 'PUT', bodyData: { is_active: !currentlyActive } });
      setSuccessMsg(`Usuario ${currentlyActive ? 'archivado' : 'desarchivado'} correctamente.`);
      fetchInternalUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado.');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`¿Eliminar permanentemente a "${userName}"? Esta acción no se puede deshacer.`)) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/users/${userId}`, { method: 'DELETE' });
      setSuccessMsg('Usuario eliminado correctamente.');
      fetchInternalUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar usuario.');
    }
  };

  // ── Handler: KYC Review ──────────────────────────────────
  const handleReviewKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKycDoc || !kycComment) return;
    setSubmittingKyc(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/kyc/documents/${selectedKycDoc.id}/review`, {
        method: 'POST',
        bodyData: { status: kycStatus, comment: kycComment },
      });
      setSuccessMsg('Revisión de KYC registrada con éxito.');
      setShowKycModal(false);
      setSelectedKycDoc(null);
      setKycComment('');
      fetchClients();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la revisión KYC.');
    } finally {
      setSubmittingKyc(false);
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Tab Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="bg-slate-800/50 p-1 rounded-2xl inline-flex gap-1">
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'internal'
                ? 'bg-[#2ABFA3] text-slate-900 font-extrabold shadow-md'
                : 'bg-white/25 text-slate-950 hover:bg-white/40'
            }`}
          >
            <span className="flex items-center gap-2"><UserCog size={15} /> Equipo Interno</span>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
              activeTab === 'clients'
                ? 'bg-[#2ABFA3] text-slate-900 font-extrabold shadow-md'
                : 'bg-white/25 text-slate-950 hover:bg-white/40'
            }`}
          >
            <span className="flex items-center gap-2"><Users size={15} /> Clientes</span>
          </button>
        </div>

        {activeTab === 'internal' && isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-2xl flex items-center gap-2 shadow-lg shadow-[#2ABFA3]/10 cursor-pointer transition-colors text-sm"
          >
            <Plus size={16} />
            Nuevo Operador / Auditor
          </button>
        )}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-xl border border-sky-300/40 bg-sky-100 text-black flex items-start gap-2.5 text-sm">
          <CheckCircle className="shrink-0 mt-0.5" size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-300/40 bg-red-100 text-black flex items-start gap-2.5 text-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ═══════════ TAB: Equipo Interno ═══════════ */}
      {activeTab === 'internal' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
              </div>
            ) : internalUsers.length === 0 ? (
              <div className="p-12 text-center text-slate-300 text-sm">No hay usuarios internos registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-300 text-xs font-bold uppercase bg-slate-900/50">
                      <th className="px-6 py-4">Usuario</th>
                      <th className="px-6 py-4">Rol</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {internalUsers.map((u) => {
                      const isSystemAdmin = u.id === SYSTEM_ADMIN_ID;
                      const badgeClass = ROLE_BADGES[u.role_name] || ROLE_BADGES.cliente;
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-white block">{u.name}</span>
                            <span className="text-xs text-slate-300 block">{u.email}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editingUserId === u.id ? (
                              <div className="flex items-center gap-2">
                                <select
                                  value={newRoleId}
                                  onChange={(e) => setNewRoleId(parseInt(e.target.value))}
                                  className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 p-1.5"
                                >
                                  <option value={1}>Administrador</option>
                                  <option value={2}>Operador</option>
                                  <option value={3}>Auditor</option>
                                  <option value={4}>Cliente</option>
                                </select>
                                <button
                                  onClick={() => handleUpdateRole(u.id)}
                                  className="px-2.5 py-1 bg-[#2ABFA3] text-slate-900 rounded-lg font-bold text-xs cursor-pointer"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="text-xs text-slate-300 hover:text-white cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <span className={`inline-flex items-center text-[11px] font-bold uppercase px-2.5 py-1 rounded-full border ${badgeClass}`}>
                                {u.role_name}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {u.is_active ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-400 uppercase bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                Archivado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {isSystemAdmin ? (
                              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">Admin Principal</span>
                            ) : isAdmin ? (
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={() => { setEditingUserId(u.id); setNewRoleId(u.role_id); }}
                                  className="text-xs text-[#2ABFA3] hover:underline font-bold cursor-pointer flex items-center gap-1"
                                >
                                  <Shield size={12} /> Cambiar Rol
                                </button>
                                <button
                                  onClick={() => handleArchiveUser(u.id, u.is_active)}
                                  className="text-xs text-amber-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                                >
                                  <Archive size={12} /> {u.is_active ? 'Archivar' : 'Desarchivar'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="text-xs text-red-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 size={12} /> Eliminar
                                </button>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ TAB: Clientes ═══════════ */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Pending KYC reviews */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="text-[#2ABFA3]" size={16} />
              Revisiones KYC Pendientes ({kycPending.length})
            </h3>
            <div className="space-y-4">
              {kycPending.length === 0 ? (
                <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-300 text-xs">
                  No hay solicitudes de verificación KYC pendientes.
                </div>
              ) : (
                kycPending.map((doc) => (
                  <div key={doc.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-white text-sm">{doc.client_name}</h4>
                        <span className="text-[10px] text-slate-300 block">{doc.client_email}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#2ABFA3]/15 text-[#2ABFA3] text-[9px] font-extrabold uppercase">
                        Nivel solicitado: {doc.level_requested}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 space-y-1">
                      <p>Documento: <strong className="text-slate-300 capitalize">{doc.document_type}</strong></p>
                      <p>Fecha: <strong className="text-slate-300">{new Date(doc.submitted_at).toLocaleDateString()}</strong></p>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={apiUrl(`/kyc/documents/view/${doc.id}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-8 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center justify-center gap-1"
                      >
                        <FileText size={12} /> Ver Archivo
                      </a>
                      <button
                        onClick={() => { setSelectedKycDoc(doc); setShowKycModal(true); }}
                        className="flex-1 h-8 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-bold rounded-lg text-xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <ShieldCheck size={12} /> Calificar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Clients list */}
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Clientes Registrados</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
                </div>
              ) : clients.length === 0 ? (
                <div className="p-12 text-center text-slate-300 text-sm">No hay clientes registrados aún.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-300 text-xs font-bold uppercase bg-slate-900/50">
                        <th className="px-6 py-4">Cliente</th>
                        <th className="px-6 py-4">País</th>
                        <th className="px-6 py-4">Teléfono</th>
                        <th className="px-6 py-4 text-center">KYC Nivel</th>
                        <th className="px-6 py-4 text-right">Registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {clients.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="font-bold text-white block">{c.name}</span>
                            <span className="text-xs text-slate-300 block">{c.email}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-xs">{c.country || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-300 text-xs font-mono">{c.phone || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center text-[11px] font-bold text-[#2ABFA3] uppercase bg-[#2ABFA3]/10 border border-[#2ABFA3]/20 px-2.5 py-0.5 rounded-full">
                              KYC-{c.kyc_level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-slate-300 text-xs">
                            {new Date(c.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Modal: Create Internal User ═══════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="text-[#2ABFA3]" size={18} />
                Nuevo Miembro del Equipo
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-300 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateInternalUser} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Nombre Completo</label>
                <input
                  type="text" required value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Sofía López"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Correo electrónico corporativo</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="sofia@sgremesas.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Contraseña temporal</label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Rol Operativo</label>
                  <select
                    value={roleId} onChange={(e) => setRoleId(parseInt(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer focus:outline-none focus:border-[#2ABFA3] text-sm"
                  >
                    <option value={2}>Operador de Caja</option>
                    <option value={3}>Auditor Compliance</option>
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-semibold select-none">
                    <input
                      type="checkbox" checked={commissionEligible}
                      onChange={(e) => setCommissionEligible(e.target.checked)}
                      className="accent-[#2ABFA3]"
                    />
                    Apto para comisiones
                  </label>
                </div>
              </div>
              <button
                type="submit" disabled={submittingUser}
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
              >
                {submittingUser ? 'Creando en DB...' : 'Crear Cuenta y Requerir Cambio'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ Modal: Review KYC ═══════════ */}
      {showKycModal && selectedKycDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="text-[#2ABFA3]" size={18} />
                Revisión de Documento KYC
              </h3>
              <button onClick={() => setShowKycModal(false)} className="text-slate-300 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleReviewKyc} className="space-y-4 text-sm">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <p className="text-slate-300 text-xs">Cliente: <strong className="text-white">{selectedKycDoc.client_name}</strong></p>
                <p className="text-slate-300 text-xs">Email: <strong className="text-white">{selectedKycDoc.client_email}</strong></p>
                <p className="text-slate-300 text-xs">Nivel Solicitado: <strong className="text-[#2ABFA3] font-bold">KYC-{selectedKycDoc.level_requested}</strong></p>
              </div>
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Calificación de Solicitud</label>
                <select
                  value={kycStatus} onChange={(e) => setKycStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer focus:outline-none focus:border-[#2ABFA3]"
                >
                  <option value="approved">Aprobar y Promover KYC Nivel</option>
                  <option value="rejected">Rechazar (Documento Inválido)</option>
                  <option value="correction_needed">Requerir Corrección / Subir de nuevo</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Comentario para el cliente (obligatorio)</label>
                <textarea
                  required value={kycComment} onChange={(e) => setKycComment(e.target.value)}
                  placeholder="Ej: Cédula de identidad legible. Aprobada."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#2ABFA3] h-24 resize-none"
                />
              </div>
              <button
                type="submit" disabled={submittingKyc || !kycComment}
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm"
              >
                {submittingKyc ? 'Procesando nivel...' : 'Registrar Calificación de KYC'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
