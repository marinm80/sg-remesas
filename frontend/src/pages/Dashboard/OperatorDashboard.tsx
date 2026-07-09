import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { 
  Inbox, Send, ArrowUpRight, ArrowDownLeft, Landmark, User, 
  DollarSign, CheckCircle2, Clock, AlertCircle, RefreshCw, X
} from 'lucide-react';

export default function OperatorDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Daily box stats
  const [dailyVolumeUsd, setDailyVolumeUsd] = useState<number>(0);
  const [dailyTxCount, setDailyTxCount] = useState<number>(0);

  // Create Transaction Modal State
  const [showTxModal, setShowTxModal] = useState<boolean>(false);
  
  // Form State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientAccounts, setClientAccounts] = useState<any[]>([]);
  const [clientBeneficiaries, setClientBeneficiaries] = useState<any[]>([]);
  
  const [type, setType] = useState<string>('remesa'); // remesa/retiro/cobro/transfer
  const [originAccountId, setOriginAccountId] = useState<string>('');
  const [destAccountId, setDestAccountId] = useState<string>('');
  const [amount, setAmount] = useState<number>(100);
  const [currency, setCurrency] = useState<string>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(1.0);
  const [beneficiaryId, setBeneficiaryId] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [submittingTx, setSubmittingTx] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [txsRes, clientsRes] = await Promise.all([
        apiRequest('/transactions'),
        apiRequest('/users/clients')
      ]);

      setTransactions(txsRes.data || []);
      setClients(clientsRes.data || []);

      // Calcular totales diarios en local (o del pool de hoy)
      const today = new Date().toDateString();
      const todayTxs = (txsRes.data || []).filter((tx: any) => new Date(tx.created_at).toDateString() === today && tx.status === 'completed');
      
      let volUsd = 0;
      for (const tx of todayTxs) {
        volUsd += parseFloat(tx.amount) / parseFloat(tx.exchange_rate);
      }

      setDailyVolumeUsd(Math.round(volUsd * 100) / 100);
      setDailyTxCount(todayTxs.length);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar bandeja operativa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Cargar cuentas y beneficiarios del cliente seleccionado
  useEffect(() => {
    if (!selectedClientId) {
      setClientAccounts([]);
      setClientBeneficiaries([]);
      return;
    }

    async function loadClientData() {
      try {
        const [accsRes, bensRes] = await Promise.all([
          apiRequest(`/accounts?clientId=${selectedClientId}`),
          apiRequest(`/beneficiaries?clientId=${selectedClientId}`)
        ]);
        setClientAccounts(accsRes.data || []);
        setClientBeneficiaries(bensRes.data || []);
      } catch (err) {
        console.error('Error al cargar datos del cliente:', err);
      }
    }
    loadClientData();
  }, [selectedClientId]);

  // Preview de comisión y límites en segundo plano
  useEffect(() => {
    if (!showTxModal || amount <= 0 || !selectedClientId || (type === 'remesa' && !beneficiaryId)) {
      setPreviewData(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const ben = clientBeneficiaries.find(b => b.id === beneficiaryId);
        
        const previewInput = {
          clientId: selectedClientId,
          type,
          amount,
          currencyFrom: currency,
          currencyTo: ben ? ben.currency : currency,
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
  }, [amount, currency, beneficiaryId, type, selectedClientId, showTxModal, clientBeneficiaries]);

  // Confirmar y registrar transacción
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || amount <= 0 || !previewData) return;

    setSubmittingTx(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const ben = clientBeneficiaries.find(b => b.id === beneficiaryId);

    try {
      await apiRequest('/transactions', {
        method: 'POST',
        bodyData: {
          type,
          accountOriginId: originAccountId || null,
          accountDestinationId: destAccountId || null,
          amount,
          currency,
          exchangeRate,
          beneficiaryId: beneficiaryId || null,
          beneficiarySnapshot: ben ? {
            name: ben.name,
            bankName: ben.bank_name,
            accountNumber: ben.account_number,
            accountType: ben.account_type,
            country: ben.country
          } : null,
          reference,
          notes: notes || 'Transacción registrada por caja',
          commissionSnapshot: {
            rateApplied: previewData.commissionRateApplied,
            commissionAmount: previewData.commissionAmount,
            totalCharged: previewData.totalCharged
          }
        }
      });

      setSuccessMsg('Transacción completada y saldos actualizados con éxito.');
      setShowTxModal(false);
      
      // Limpiar
      setSelectedClientId('');
      setOriginAccountId('');
      setDestAccountId('');
      setBeneficiaryId('');
      setReference('');
      setNotes('');
      setAmount(100);
      setPreviewData(null);

      fetchDashboardData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la transacción.');
    } finally {
      setSubmittingTx(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const maps: Record<string, { text: string, classes: string }> = {
      completed: { text: 'Completada', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
      pending: { text: 'Pendiente', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25' },
      processing: { text: 'Procesando', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
      rejected: { text: 'Rechazada', classes: 'bg-red-500/10 text-red-400 border-red-500/25' },
      reversed: { text: 'Revertida', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/25' },
    };
    const item = maps[status] || { text: status, classes: 'bg-slate-800 text-slate-400' };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${item.classes}`}>
        {item.text}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Box stats header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 p-6 rounded-3xl">
        <div className="space-y-1">
          <span className="text-xs text-slate-500 font-bold block">CAJA DIARIA (VOLUMEN)</span>
          <span className="text-2xl font-black text-white">$ {dailyVolumeUsd.toLocaleString()} USD</span>
        </div>

        <div className="space-y-1">
          <span className="text-xs text-slate-500 font-bold block">OPERACIONES HOY</span>
          <span className="text-2xl font-black text-white">{dailyTxCount} remesas</span>
        </div>

        <div className="flex items-center sm:justify-end">
          <button 
            onClick={() => setShowTxModal(true)}
            className="px-5 h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-2xl flex items-center gap-2 shadow-lg shadow-[#2ABFA3]/10 cursor-pointer transition-colors text-sm"
          >
            <Send size={14} />
            Nueva Operación
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl border border-sky-300/40 bg-sky-100 text-black flex items-start gap-2.5 text-sm">
          <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-300/40 bg-red-100 text-black flex items-start gap-2.5 text-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Operations List */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Últimos movimientos de caja</h3>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No hay transacciones registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase bg-slate-900/50">
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Código / Ref</th>
                    <th className="px-6 py-4">Usuario Cliente</th>
                    <th className="px-6 py-4">Destinatario</th>
                    <th className="px-6 py-4 text-right">Monto</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-white block">{tx.tracking_code}</span>
                        <span className="text-xs text-slate-500 block truncate max-w-xs">{tx.reference || 'Sin referencia'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-slate-300 block">{tx.client_name || 'Interno'}</span>
                        <span className="text-xs text-slate-500 block">{tx.client_email || 'empresa@remesas.com'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                        {tx.beneficiary_snapshot?.name || 'N/A'}
                      </td>
                      <td className={`px-6 py-4 text-right font-black whitespace-nowrap ${
                        tx.type === 'retiro' ? 'text-red-400' : 'text-[#2ABFA3]'
                      }`}>
                        {parseFloat(tx.amount).toLocaleString()} {tx.currency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(tx.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Transaction Form */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-xl space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="text-[#2ABFA3]" size={18} />
                Registrar Operación (Caja)
              </h3>
              <button 
                onClick={() => setShowTxModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4 text-sm">
              {/* Select Client */}
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Cliente Asociado</label>
                <select 
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                  required
                >
                  <option value="">-- Seleccionar Cliente --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {selectedClientId && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Tipo de Operación</label>
                      <select 
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                      >
                        <option value="remesa">Remesa (Envío internacional)</option>
                        <option value="retiro">Retiro de fondos (Caja)</option>
                        <option value="cobro">Cobro (Depósito)</option>
                        <option value="transfer">Transferencia interna</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Divisa Transacción</label>
                      <select 
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                      >
                        <option value="USD">USD</option>
                        <option value="MXN">MXN</option>
                        <option value="PEN">PEN</option>
                        <option value="COP">COP</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Cuenta de Origen</label>
                      <select 
                        value={originAccountId}
                        onChange={(e) => setOriginAccountId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                      >
                        <option value="">-- Ninguna (Caja/Efectivo) --</option>
                        {clientAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.balance} {acc.currency})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Cuenta de Destino</label>
                      <select 
                        value={destAccountId}
                        onChange={(e) => setDestAccountId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                      >
                        <option value="">-- Ninguna (Caja/Efectivo) --</option>
                        {clientAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.balance} {acc.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {type === 'remesa' && (
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Destinatario Final (Beneficiario)</label>
                      <select 
                        value={beneficiaryId}
                        onChange={(e) => setBeneficiaryId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] cursor-pointer"
                        required={type === 'remesa'}
                      >
                        <option value="">-- Seleccionar --</option>
                        {clientBeneficiaries.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.bank_name} - {b.account_number} | {b.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Monto de Operación</label>
                      <input 
                        type="number" 
                        required
                        min={1}
                        value={amount}
                        onChange={(e) => setAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-bold block mb-1">Tipo de Cambio Utilizado</label>
                      <input 
                        type="number" 
                        required
                        step="0.000001"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(Math.max(0, parseFloat(e.target.value) || 1.0))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] font-mono"
                      />
                    </div>
                  </div>

                  {/* Vista previa en tiempo real */}
                  {loadingPreview && (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                      <RefreshCw className="animate-spin" size={12} />
                      Evaluando límites KYC y comisiones...
                    </div>
                  )}

                  {previewData && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2">
                      <span className="font-bold text-slate-400 block pb-1 border-b border-slate-800">DESGLOSE FINANCIERO OFICIAL (REQUISITO BR-19)</span>
                      <div className="flex justify-between">
                        <span>Monto enviado:</span>
                        <span>{previewData.amount} {previewData.currencyFrom}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Comisión calculada (Tasa {(previewData.commissionRateApplied * 100).toFixed(2)}%):</span>
                        <span>+{previewData.commissionAmount} {previewData.currencyFrom}</span>
                      </div>
                      <div className="flex justify-between font-bold text-[#2ABFA3]">
                        <span>Total cargado final:</span>
                        <span>{previewData.totalCharged} {previewData.currencyFrom}</span>
                      </div>
                      <div className="flex justify-between text-[#2ABFA3] font-bold">
                        <span>Monto convertido para destinatario:</span>
                        <span>{previewData.convertedAmount} {previewData.currencyTo}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Referencia interna (Opcional)</label>
                    <input 
                      type="text" 
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ej: Depósito cheque #32991"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3]"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Comentarios / Notas (BR-07)</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ingrese un comentario sobre la operación de caja..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#2ABFA3] h-16 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingTx || loadingPreview || !previewData}
                    className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
                  >
                    {submittingTx ? 'Procesando en base de datos (ACID)...' : 'Registrar y Ejecutar Transferencia'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
