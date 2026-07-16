import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  AlertCircle,
  Ban,
  CheckCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  RotateCcw,
  Send,
  XCircle,
} from 'lucide-react';

type GroupKey = 'pending' | 'approved' | 'declined' | 'reversed';

const groups: Array<{ key: GroupKey; label: string; icon: any }> = [
  { key: 'pending', label: 'Pendientes', icon: Clock },
  { key: 'approved', label: 'Aprobadas', icon: CheckCircle2 },
  { key: 'declined', label: 'Declinadas', icon: XCircle },
  { key: 'reversed', label: 'Revertidas', icon: RotateCcw },
];

function normalizeStatus(status: string): GroupKey {
  if (['completed'].includes(status)) return 'approved';
  if (['rejected', 'failed', 'cancelled'].includes(status)) return 'declined';
  if (['reversed'].includes(status)) return 'reversed';
  return 'pending';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    completed: 'Aprobada',
    pending: 'Pendiente',
    processing: 'Procesando',
    rejected: 'Declinada',
    cancelled: 'Cancelada',
    failed: 'Fallida',
    reversed: 'Revertida',
  };
  return labels[status] || status;
}

function statusClasses(status: string): string {
  if (status === 'completed') return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
  if (status === 'rejected' || status === 'failed' || status === 'cancelled') return 'bg-red-500/10 text-red-300 border-red-500/30';
  if (status === 'reversed') return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
  return 'bg-yellow-500/10 text-yellow-200 border-yellow-500/30';
}

export default function TransactionsHistory() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupKey>('pending');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  const [originAccountId, setOriginAccountId] = useState<string>('');
  const [destAccountId, setDestAccountId] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [notes, setNotes] = useState<string>('');
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const [revertTx, setRevertTx] = useState<any | null>(null);
  const [revertNotes, setRevertNotes] = useState<string>('');

  const canManage = user?.role === 'admin' || user?.role === 'operador';

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [txRes, reqRes] = await Promise.all([
        apiRequest('/transactions').catch(() => ({ data: [] })),
        apiRequest('/transactions/requests/all').catch(() => ({ data: [] })),
      ]);
      setTransactions(txRes.data || []);
      setRequests(reqRes.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar transacciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedRequest || parseFloat(selectedRequest.amount) <= 0) {
      setPreviewData(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const res = await apiRequest('/transactions/preview', {
          method: 'POST',
          bodyData: {
            clientId: selectedRequest.client_id,
            type: selectedRequest.type,
            amount: parseFloat(selectedRequest.amount),
            currencyFrom: selectedRequest.currency,
            currencyTo: selectedRequest.beneficiary?.currency || selectedRequest.currency,
            additionalCharges: [],
          },
        });
        setPreviewData(res.data);
        setExchangeRate(res.data.exchangeRate || 1.0);
      } catch (err: any) {
        setErrorMsg(err.message || 'No se pudo calcular la vista previa de comisiones.');
      } finally {
        setLoadingPreview(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedRequest]);

  const rows = useMemo(() => {
    const requestRows = requests.map((request) => ({
      id: request.id,
      source: 'request',
      status: request.status,
      type: request.type,
      amount: request.amount,
      currency: request.currency,
      created_at: request.created_at,
      reference: `Solicitud #${request.id.slice(0, 8)}`,
      tracking_code: null,
      client_name: request.client_name,
      client_email: request.client_email,
      beneficiary_name: request.beneficiary?.name || 'N/A',
      origin: request.destination_account_info?.originAccountName || 'Cuenta no indicada',
      raw: request,
    }));

    const transactionRows = transactions.map((transaction) => ({
      id: transaction.id,
      source: 'transaction',
      status: transaction.status,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency,
      created_at: transaction.created_at,
      reference: transaction.reference || 'Sin referencia',
      tracking_code: transaction.tracking_code,
      client_name: transaction.client_name,
      client_email: transaction.client_email,
      beneficiary_name: transaction.beneficiary_snapshot?.name || 'N/A',
      origin: transaction.account_origin_name || 'Cuenta no indicada',
      raw: transaction,
    }));

    return [...requestRows, ...transactionRows]
      .filter((row) => normalizeStatus(row.status) === activeGroup)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [activeGroup, requests, transactions]);

  const counts = useMemo(() => {
    const allRows = [
      ...requests.map((request) => request.status),
      ...transactions.map((transaction) => transaction.status),
    ];

    return allRows.reduce<Record<GroupKey, number>>(
      (acc, status) => {
        acc[normalizeStatus(status)] += 1;
        return acc;
      },
      { pending: 0, approved: 0, declined: 0, reversed: 0 }
    );
  }, [requests, transactions]);

  const openProcessModal = async (request: any) => {
    setSelectedRequest(request);
    setOriginAccountId(request.destination_account_info?.originAccountId || '');
    setDestAccountId('');
    setNotes('');
    setPreviewData(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiRequest(`/accounts?clientId=${request.client_id}`);
      setClientAccounts(res.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudieron cargar las cuentas del cliente.');
    }
  };

  const handleProcessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !previewData) return;

    setSubmittingAction(true);
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
          notes: notes || 'Solicitud aprobada y procesada por caja',
          clientRequestId: selectedRequest.id,
          commissionSnapshot: {
            rateApplied: previewData.commissionRateApplied,
            commissionAmount: previewData.commissionAmount,
            totalCharged: previewData.totalCharged,
          },
        },
      });

      setSuccessMsg('Solicitud aprobada y registrada como transaccion.');
      setSelectedRequest(null);
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la solicitud.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectRequest = async (request: any) => {
    if (!window.confirm('Deseas declinar esta solicitud?')) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/transactions/requests/${request.id}/status`, {
        method: 'PUT',
        bodyData: { status: 'rejected' },
      });
      setSuccessMsg('Solicitud declinada correctamente.');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al declinar la solicitud.');
    }
  };

  const handleCancelRequest = async (request: any) => {
    if (!window.confirm('Deseas cancelar esta solicitud y liberar el saldo reservado?')) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/transactions/requests/${request.id}/cancel`, {
        method: 'PUT',
      });
      setSuccessMsg('Solicitud cancelada y saldo liberado correctamente.');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cancelar la solicitud.');
    }
  };

  const handleRevertTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revertTx) return;

    setSubmittingAction(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest(`/transactions/${revertTx.id}/revert`, {
        method: 'POST',
        bodyData: { notes: revertNotes },
      });
      setSuccessMsg('Transaccion revertida correctamente.');
      setRevertTx(null);
      setRevertNotes('');
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al revertir la transaccion.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const renderActions = (row: any) => {
    if (!canManage) return null;

    if (row.source === 'request' && ['pending', 'processing'].includes(row.status)) {
      return (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openProcessModal(row.raw)}
            className="h-9 px-3 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
          >
            <CheckCircle size={14} />
            Aprobar
          </button>
          <button
            onClick={() => handleRejectRequest(row.raw)}
            className="h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-200 border border-red-500/30 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
          >
            <Ban size={14} />
            Declinar
          </button>
          <button
            onClick={() => handleCancelRequest(row.raw)}
            className="h-9 px-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
          >
            <XCircle size={14} />
            Cancelar
          </button>
        </div>
      );
    }

    if (row.source === 'transaction' && row.status === 'completed') {
      return (
        <div className="flex items-center justify-end">
          <button
            onClick={() => {
              setRevertTx(row.raw);
              setRevertNotes('');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="h-9 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 border border-orange-500/30 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw size={14} />
            Revertir
          </button>
        </div>
      );
    }

    return <span className="text-xs text-slate-500">Sin accion</span>;
  };

  const renderClientActions = (row: any) => {
    if (canManage || row.source !== 'request' || !['pending', 'processing'].includes(row.status)) return null;

    return (
      <button
        onClick={() => handleCancelRequest(row.raw)}
        className="h-9 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-200 border border-red-500/30 rounded-xl text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap"
      >
        <Ban size={14} />
        Cancelar
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Send className="text-[#2ABFA3]" size={20} />
            Transacciones
          </h2>
          <p className="text-slate-300 text-sm mt-0.5">
            {user?.role === 'cliente'
              ? 'Consulta tus solicitudes y operaciones procesadas.'
              : 'Control total de solicitudes, aprobaciones, declinaciones y reversos.'}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="h-10 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
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

      <div className="bg-slate-800/50 p-1 rounded-2xl inline-flex flex-wrap gap-1">
        {groups.map((group) => {
          const Icon = group.icon;
          const isActive = activeGroup === group.key;
          return (
            <button
              key={group.key}
              onClick={() => setActiveGroup(group.key)}
              className={`px-4 h-10 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-colors ${
                isActive ? 'bg-[#2ABFA3] text-slate-950' : 'text-white hover:bg-white/10'
              }`}
            >
              <Icon size={14} />
              {group.label}
              <span className={`px-1.5 py-0.5 rounded-md ${isActive ? 'bg-slate-950/10' : 'bg-white/10'}`}>
                {counts[group.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-300 text-sm">
            No hay transacciones en este grupo.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-300 text-xs font-bold uppercase bg-slate-900/50">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Referencia</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Origen</th>
                  <th className="px-6 py-4">Destinatario</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  {(canManage || user?.role === 'cliente') && <th className="px-6 py-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {rows.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-white block">{row.tracking_code || row.reference}</span>
                      <span className="text-xs text-slate-300 block capitalize">{row.source === 'request' ? 'Solicitud' : 'Transaccion'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-200 block">{row.client_name || (user?.role === 'cliente' ? user.name : 'Interno')}</span>
                      <span className="text-xs text-slate-300 block">{row.client_email || (user?.role === 'cliente' ? user.email : 'N/A')}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 capitalize whitespace-nowrap">{row.type}</td>
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap">{row.origin}</td>
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap">{row.beneficiary_name}</td>
                    <td className="px-6 py-4 text-right font-black text-[#2ABFA3] whitespace-nowrap">
                      {parseFloat(row.amount).toLocaleString()} {row.currency}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${statusClasses(row.status)}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    {(canManage || user?.role === 'cliente') && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {canManage ? renderActions(row) : renderClientActions(row)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="text-[#2ABFA3]" size={18} />
                Aprobar solicitud
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
                  <span className="text-slate-300">Cliente:</span>
                  <span className="font-bold text-white">{selectedRequest.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Monto:</span>
                  <span className="font-bold text-[#2ABFA3]">
                    {parseFloat(selectedRequest.amount).toLocaleString()} {selectedRequest.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Beneficiario:</span>
                  <span className="font-bold text-slate-300">
                    {selectedRequest.beneficiary?.name || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Debitar cuenta origen</label>
                  <select
                    value={originAccountId}
                    onChange={(e) => setOriginAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                  >
                    <option value="">-- Ninguna --</option>
                    {clientAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({parseFloat(acc.available_balance ?? acc.balance).toLocaleString()} disp. / {parseFloat(acc.reserved_balance ?? 0).toLocaleString()} res. {acc.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Depositar cuenta destino</label>
                  <select
                    value={destAccountId}
                    onChange={(e) => setDestAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                  >
                    <option value="">-- Ninguna --</option>
                    {clientAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({parseFloat(acc.available_balance ?? acc.balance).toLocaleString()} disp. / {parseFloat(acc.reserved_balance ?? 0).toLocaleString()} res. {acc.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Tasa de cambio</label>
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
                  Calculando comisiones...
                </div>
              )}

              {previewData && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2 text-slate-300">
                  <span className="font-bold text-white block pb-1 border-b border-slate-800">Resumen oficial</span>
                  <div className="flex justify-between">
                    <span>Monto base:</span>
                    <span>{previewData.amount} {previewData.currencyFrom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comision ({(previewData.commissionRateApplied * 100).toFixed(2)}%):</span>
                    <span>+{previewData.commissionAmount} {previewData.currencyFrom}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#2ABFA3]">
                    <span>Total cargado:</span>
                    <span>{previewData.totalCharged} {previewData.currencyFrom}</span>
                  </div>
                  <div className="flex justify-between text-[#2ABFA3] font-bold">
                    <span>Beneficiario recibe:</span>
                    <span>{previewData.convertedAmount} {previewData.currencyTo}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Comentario de aprobacion</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe la conciliacion realizada..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#2ABFA3] h-16 resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingAction || loadingPreview || !previewData}
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] disabled:opacity-60 text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
              >
                {submittingAction ? 'Procesando...' : 'Aprobar y registrar operacion'}
              </button>
            </form>
          </div>
        </div>
      )}

      {revertTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <RotateCcw className="text-orange-300" size={18} />
                Revertir transaccion
              </h3>
              <button
                onClick={() => setRevertTx(null)}
                className="text-slate-300 hover:text-white cursor-pointer font-bold text-sm"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleRevertTransaction} className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-sm text-slate-300 space-y-2">
                <div className="flex justify-between">
                  <span>Referencia:</span>
                  <span className="font-mono text-white">{revertTx.tracking_code || revertTx.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span>Monto:</span>
                  <span className="font-bold text-[#2ABFA3]">
                    {parseFloat(revertTx.amount).toLocaleString()} {revertTx.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Motivo del reverso</label>
                <textarea
                  value={revertNotes}
                  onChange={(e) => setRevertNotes(e.target.value)}
                  placeholder="Explica por que se revierte esta operacion..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-orange-300 h-20 resize-none"
                  required
                  minLength={5}
                />
              </div>

              <button
                type="submit"
                disabled={submittingAction || revertNotes.trim().length < 5}
                className="w-full h-11 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-slate-950 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all text-sm"
              >
                {submittingAction ? 'Revirtiendo...' : 'Confirmar reverso'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
