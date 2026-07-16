import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { ClipboardList, CheckCircle, XCircle, RefreshCw, Landmark, AlertCircle, ShieldAlert, Send, Layers } from 'lucide-react';

export default function PendingRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Process Modal State
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  const [originAccountId, setOriginAccountId] = useState<string>('');
  const [destAccountId, setDestAccountId] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [notes, setNotes] = useState<string>('');
  
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [submittingTx, setSubmittingTx] = useState<boolean>(false);

  const fetchRequests = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/transactions/requests/all?status=pending');
      setRequests(res.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener las solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openProcessModal = async (req: any) => {
    setSelectedRequest(req);
    setOriginAccountId(req.destination_account_info?.originAccountId || '');
    setDestAccountId('');
    setNotes('');
    setPreviewData(null);
    setErrorMsg(null);

    // Cargar cuentas del cliente de la solicitud
    try {
      const res = await apiRequest(`/accounts?clientId=${req.client_id}`);
      setClientAccounts(res.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('No se pudieron cargar las cuentas del cliente.');
    }
  };

  // Preview de comisión y límites en segundo plano para procesar la solicitud
  useEffect(() => {
    if (!selectedRequest || selectedRequest.amount <= 0) {
      setPreviewData(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const previewInput = {
          clientId: selectedRequest.client_id,
          type: selectedRequest.type,
          amount: parseFloat(selectedRequest.amount),
          currencyFrom: selectedRequest.currency,
          currencyTo: selectedRequest.beneficiary?.currency || selectedRequest.currency,
          additionalCharges: []
        };

        const res = await apiRequest('/transactions/preview', {
          method: 'POST',
          bodyData: previewInput
        });
        setPreviewData(res.data);
        setExchangeRate(res.data.exchangeRate || 1.0);
      } catch (err: any) {
        console.error('Preview error:', err);
      } finally {
        setLoadingPreview(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedRequest]);

  // Completar y crear transacción oficial
  const handleProcessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !previewData) return;

    setSubmittingTx(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest('/transactions', {
        method: 'POST',
        bodyData: {
          type: selectedRequest.type,
          accountOriginId: originAccountId || null,
          accountDestinationId: destAccountId || null,
          amount: parseFloat(selectedRequest.amount),
          currency: selectedRequest.currency,
          exchangeRate,
          beneficiaryId: selectedRequest.beneficiary?.id || null,
          beneficiarySnapshot: selectedRequest.beneficiary,
          reference: `Procesamiento de Solicitud #${selectedRequest.id.substring(0, 8)}`,
          notes: notes || `Solicitud aprobada y procesada por caja`,
          clientRequestId: selectedRequest.id,
          commissionSnapshot: {
            rateApplied: previewData.commissionRateApplied,
            commissionAmount: previewData.commissionAmount,
            totalCharged: previewData.totalCharged
          }
        }
      });

      setSuccessMsg('Solicitud aprobada y convertida en transacción de base de datos exitosamente.');
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la solicitud.');
    } finally {
      setSubmittingTx(false);
    }
  };

  // Rechazar solicitud
  const handleRejectRequest = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea rechazar esta solicitud de fondos?')) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/transactions/requests/${id}/status`, {
        method: 'PUT',
        bodyData: { status: 'rejected' }
      });
      setSuccessMsg('Solicitud rechazada con éxito.');
      fetchRequests();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al rechazar la solicitud.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ClipboardList className="text-[#2ABFA3]" size={20} />
          Solicitudes Pendientes de Clientes
        </h2>
        <p className="text-slate-300 text-sm mt-0.5">
          Lista de solicitudes de envío o retiro enviadas por clientes para su conciliación manual.
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center text-slate-300 bg-slate-900 border border-slate-800 rounded-3xl text-sm">
          No hay solicitudes pendientes en este momento.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.map((r) => (
            <div key={r.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#2ABFA3]/5 to-transparent rounded-full -z-10"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-extrabold text-white text-base leading-tight">Solicitud de {r.type === 'remesa' ? 'Remesa' : 'Retiro'}</h3>
                  <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 mt-1 uppercase">
                    Cliente: {r.client_name} (KYC: {r.kyc_level ?? 0})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-[#2ABFA3] block">{parseFloat(r.amount).toLocaleString()} {r.currency}</span>
                  <span className="text-[10px] text-slate-300 mt-1 block">Recibido {new Date(r.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                <div className="flex justify-between items-start">
                  <span className="text-slate-300">Cuenta origen:</span>
                  <span className="font-semibold text-slate-300 text-right">
                    {r.destination_account_info?.originAccountName || 'No especificada'}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-300">Destinatario:</span>
                  <span className="font-semibold text-slate-300 text-right">{r.beneficiary?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-300">Detalles Cuenta:</span>
                  <span className="font-mono text-slate-300 text-right">
                    {r.destination_account_info?.bankName} - {r.destination_account_info?.accountNumber} ({r.destination_account_info?.accountType})
                  </span>
                </div>
                {r.notes && (
                  <div className="p-2.5 bg-slate-950 rounded-xl text-slate-300 text-[11px] leading-relaxed">
                    <strong>Nota Cliente:</strong> {r.notes}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => openProcessModal(r)}
                  className="flex-1 h-9 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-bold rounded-xl text-xs cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  <Send size={12} />
                  Conciliar & Procesar
                </button>
                <button 
                  onClick={() => handleRejectRequest(r.id)}
                  className="h-9 px-4 bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 font-bold rounded-xl text-xs cursor-pointer transition-colors"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Process Client Request */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="text-[#2ABFA3]" size={18} />
                Conciliación y Aprobación
              </h3>
              <button 
                onClick={() => setSelectedRequest(null)}
                className="text-slate-300 hover:text-white cursor-pointer font-bold text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleProcessRequest} className="space-y-4 text-sm">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Cliente solicitante:</span>
                  <span className="font-bold text-white">{selectedRequest.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Monto solicitado:</span>
                  <span className="font-bold text-[#2ABFA3]">{parseFloat(selectedRequest.amount).toLocaleString()} {selectedRequest.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Beneficiario:</span>
                  <span className="font-bold text-slate-300">{selectedRequest.beneficiary?.name} ({selectedRequest.beneficiary?.currency})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Debitar Cuenta Origen</label>
                  <select 
                    value={originAccountId}
                    onChange={(e) => setOriginAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                  >
                    <option value="">-- Ninguna (Efectivo/Caja) --</option>
                    {clientAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({parseFloat(acc.available_balance ?? acc.balance).toLocaleString()} disp. / {parseFloat(acc.reserved_balance ?? 0).toLocaleString()} res. {acc.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Depositar Cuenta Destino</label>
                  <select 
                    value={destAccountId}
                    onChange={(e) => setDestAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                  >
                    <option value="">-- Ninguna (Efectivo/Caja) --</option>
                    {clientAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({parseFloat(acc.available_balance ?? acc.balance).toLocaleString()} disp. / {parseFloat(acc.reserved_balance ?? 0).toLocaleString()} res. {acc.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Tasa de cambio conciliada</label>
                <input 
                  type="number" 
                  step="0.000001"
                  required
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Math.max(0, parseFloat(e.target.value) || 1.0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] font-mono"
                />
              </div>

              {loadingPreview && (
                <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
                  <RefreshCw className="animate-spin" size={12} />
                  Calculando comisiones oficiales...
                </div>
              )}

              {previewData && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2">
                  <span className="font-bold text-slate-300 block pb-1 border-b border-slate-800">CÁLCULO DE COMISIÓN OFICIAL (REQUISITO BR-19)</span>
                  <div className="flex justify-between">
                    <span>Monto base:</span>
                    <span>{previewData.amount} {previewData.currencyFrom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comisión de par (Tasa {(previewData.commissionRateApplied * 100).toFixed(2)}%):</span>
                    <span>+{previewData.commissionAmount} {previewData.currencyFrom}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#2ABFA3]">
                    <span>Total cargado final:</span>
                    <span>{previewData.totalCharged} {previewData.currencyFrom}</span>
                  </div>
                  <div className="flex justify-between text-[#2ABFA3] font-bold">
                    <span>El beneficiario recibirá:</span>
                    <span>{previewData.convertedAmount} {previewData.currencyTo}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Comentario Aprobación (Notes) (BR-07)</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ingrese el comentario explicativo obligatorio..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#2ABFA3] h-16 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingTx || loadingPreview || !previewData}
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
              >
                {submittingTx ? 'Procesando en base de datos (ACID)...' : 'Aprobar y Registrar Operación'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
