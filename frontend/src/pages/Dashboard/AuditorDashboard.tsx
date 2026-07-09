import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { 
  ShieldAlert, RefreshCw, CheckCircle, AlertCircle, X, Search, FileText, Settings
} from 'lucide-react';

export default function AuditorDashboard() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [alerts, setAlerts] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters State
  const [status, setStatus] = useState<string>('pending');
  const [ruleCode, setRuleCode] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');

  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string>('reviewed');
  const [reviewerComment, setReviewerComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const fetchAlertsAndRules = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams();
      if (status) queryParams.set('status', status);
      if (ruleCode) queryParams.set('ruleCode', ruleCode);
      if (clientEmail) queryParams.set('clientEmail', clientEmail);

      const [alertsRes, rulesRes] = await Promise.all([
        apiRequest(`/compliance/alerts?${queryParams.toString()}`),
        apiRequest('/compliance/rules')
      ]);

      setAlerts(alertsRes.data || []);
      setRules(rulesRes.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener alertas AML.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertsAndRules();
  }, [status, ruleCode, clientEmail]);

  const handleReviewAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert || !reviewerComment) return;

    setSubmittingReview(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest(`/compliance/alerts/${selectedAlert.id}/review`, {
        method: 'POST',
        bodyData: {
          status: reviewStatus,
          comment: reviewerComment
        }
      });

      setSuccessMsg('Alerta de cumplimiento AML resuelta con éxito.');
      setShowReviewModal(false);
      setSelectedAlert(null);
      setReviewerComment('');
      fetchAlertsAndRules();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la revisión de la alerta.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const getAlertLabel = (code: string) => {
    const labels: Record<string, string> = {
      threshold_amount: 'Envío de alto valor unitario',
      structuring: 'Fraccionamiento / Estructuración',
      new_client_high_value: 'Primer envío de alto monto (Cliente Nuevo)'
    };
    return labels[code] || code;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="text-[#2ABFA3]" size={20} />
          Bandeja de Cumplimiento Normativo (AML / PLD)
        </h2>
        <p className="text-slate-400 text-sm mt-0.5">
          Audita alertas de lavado de dinero gatilladas en base a las transacciones registradas del sistema.
        </p>
      </div>

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

      {/* Grid Rules & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Compliance Rules overview */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Settings size={16} className="text-[#2ABFA3]" />
            Reglas de Alerta AML
          </h3>

          <div className="space-y-4">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <h4 className="font-extrabold text-white text-xs font-mono">{rule.code}</h4>
                  {rule.is_active ? (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-extrabold border border-emerald-500/20">ACTIVA</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 text-[8px] font-extrabold border border-slate-700">INACTIVA</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{rule.description}</p>
                <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-1 font-mono">
                  <p>Umbral: $ {parseFloat(rule.threshold_amount_usd).toLocaleString()} USD</p>
                  {rule.window_hours && <p>Ventana: {rule.window_hours} horas</p>}
                  {rule.transaction_count && <p>Frecuencia: {rule.transaction_count}+ txs</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Alerts Tray */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Alertas Investigadas</h3>
            
            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Estado de Alerta</label>
                <select 
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white cursor-pointer"
                >
                  <option value="pending">Pendientes de auditoría</option>
                  <option value="reviewed">Revisadas</option>
                  <option value="dismissed">Descartadas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Tipo de Regla</label>
                <select 
                  value={ruleCode}
                  onChange={(e) => setRuleCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white cursor-pointer"
                >
                  <option value="">Todas</option>
                  <option value="threshold_amount">Monto Unitario</option>
                  <option value="structuring">Fraccionamiento</option>
                  <option value="new_client_high_value">Cliente Nuevo</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-bold block mb-1">Email Cliente</label>
                <input 
                  type="text"
                  placeholder="juan@ejemplo.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>

          {/* Table display */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No hay alertas de cumplimiento AML en esta bandeja.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase bg-slate-900/50">
                      <th className="px-6 py-4">Alerta / Regla</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4 text-right">Monto Gatillado</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {alerts.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-800/20 text-xs">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-extrabold text-white block">{getAlertLabel(a.rule_code)}</span>
                          <span className="text-[10px] text-slate-500 block font-mono">Remesa: {a.tracking_code}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-slate-300 block">{a.client_name}</span>
                          <span className="text-[10px] text-slate-500 block">{a.client_email}</span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap font-mono font-bold text-orange-400">
                          $ {parseFloat(a.triggered_amount_usd).toLocaleString()} USD
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                            a.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse' :
                            a.status === 'reviewed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            'bg-slate-850 text-slate-400 border-slate-700'
                          }`}>
                            {a.status === 'pending' ? 'pendiente' : a.status === 'reviewed' ? 'revisada' : 'descartada'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {a.status === 'pending' ? (
                            <button 
                              onClick={() => {
                                setSelectedAlert(a);
                                setShowReviewModal(true);
                              }}
                              className="px-3 h-8 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-bold rounded-lg text-xs cursor-pointer flex items-center justify-center"
                            >
                              Investigar
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic block max-w-xs truncate" title={a.reviewer_comment}>
                              Nota: {a.reviewer_comment}
                            </span>
                          )}
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

      {/* Modal: Review Alert */}
      {showReviewModal && selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldAlert className="text-[#2ABFA3]" size={18} />
                Resolución de Alerta AML
              </h3>
              <button 
                onClick={() => setShowReviewModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleReviewAlertSubmit} className="space-y-4 text-sm">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-1">
                <p className="text-slate-400 text-xs">Regla: <strong className="text-white">{getAlertLabel(selectedAlert.rule_code)}</strong></p>
                <p className="text-slate-400 text-xs">Monto gatillado: <strong className="text-orange-400">$ {parseFloat(selectedAlert.triggered_amount_usd).toLocaleString()} USD</strong></p>
                <p className="text-slate-400 text-xs">Cliente: <strong className="text-white">{selectedAlert.client_name}</strong></p>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Resultado de Auditoría</label>
                <select 
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer focus:outline-none focus:border-[#2ABFA3]"
                >
                  <option value="reviewed">Revisada (Operación Legítima Confirmada)</option>
                  <option value="dismissed">Descartada (Falso Positivo / Error)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Comentarios de Investigación (Comentario obligatorio)</label>
                <textarea 
                  required
                  value={reviewerComment}
                  onChange={(e) => setReviewerComment(e.target.value)}
                  placeholder="Ej: Se comprobó declaración jurada de origen de fondos. Operación legítima."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#2ABFA3] h-24 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingReview || !reviewerComment}
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm"
              >
                {submittingReview ? 'Procesando auditoría...' : 'Archivar Resolución AML'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
