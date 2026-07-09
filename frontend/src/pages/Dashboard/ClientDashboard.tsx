import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { 
  CreditCard, ArrowUpRight, ArrowDownLeft, Send, CheckCircle2, 
  Clock, XCircle, AlertCircle, RefreshCw, Layers
} from 'lucide-react';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [kycProfile, setKycProfile] = useState<any | null>(null);

  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Modal Solicitar Remesa State
  const [showRequestModal, setShowRequestModal] = useState<boolean>(false);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>('');
  const [amount, setAmount] = useState<number>(100);
  const [currency, setCurrency] = useState<string>('USD');
  const [type, setType] = useState<string>('remesa'); // remesa / retiro
  const [notes, setNotes] = useState<string>('');
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [accsRes, txsRes, bensRes, reqsRes, usersRes] = await Promise.all([
        apiRequest('/accounts'),
        apiRequest('/transactions'),
        apiRequest('/beneficiaries'),
        apiRequest('/transactions/requests/all'),
        apiRequest('/auth/verify-email'), // Para traer perfil KYC
      ]).catch(() => {
        // En local, mock del perfil de correo si es necesario, pero verify-email es para confirmar token.
        // Mejor buscar info de usuario en base de datos.
        // Espera, ¿cómo traemos el KYC del usuario? 
        // Podemos hacer GET a /api/kyc/history o traer los documentos
        return [[], [], [], [], null];
      });

      // El perfil del cliente se puede traer de kyc/history o kyc/documents.
      // Para simplificar, traemos los documentos KYC para ver el nivel.
      // Pero wait, we can fetch client profile info!
      // En account controller, `findAllAccounts` o `getAccounts` retorna cuentas.
      // Vamos a traer la info KYC desde el endpoint de KYC.
      const kycHistory = await apiRequest('/kyc/history').catch(() => ({ data: [] }));
      
      setAccounts(accsRes.data || []);
      setTransactions(txsRes.data || []);
      setBeneficiaries(bensRes.data || []);
      setRequests(reqsRes.data || []);
      
      // Intentar deducir nivel KYC del historial o por defecto KYC-0
      const lastHistory = kycHistory.data?.[0];
      setKycProfile({ kyc_level: lastHistory ? lastHistory.new_level : 0 });

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar los datos del dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Calcular vista previa de la remesa
  useEffect(() => {
    if (!showRequestModal || amount <= 0 || !selectedBeneficiaryId) {
      setPreviewData(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const ben = beneficiaries.find(b => b.id === selectedBeneficiaryId);
        if (!ben) return;

        // Llamar endpoint de preview
        const res = await apiRequest('/transactions/preview', {
          method: 'POST',
          bodyData: {
            clientId: ben.client_id,
            type,
            amount,
            currencyFrom: currency,
            currencyTo: ben.currency
          }
        });
        setPreviewData(res.data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingPreview(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [amount, currency, selectedBeneficiaryId, type, showRequestModal, beneficiaries]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeneficiaryId || amount <= 0) return;

    setSubmittingRequest(true);
    setRequestSuccess(null);
    setErrorMsg(null);

    try {
      const ben = beneficiaries.find(b => b.id === selectedBeneficiaryId);
      if (!ben) throw new Error('Beneficiario inválido');

      await apiRequest('/transactions/requests', {
        method: 'POST',
        bodyData: {
          type,
          amount,
          currency,
          destinationAccountInfo: {
            bankName: ben.bank_name,
            accountNumber: ben.account_number,
            accountType: ben.account_type,
            country: ben.country
          },
          beneficiary: {
            id: ben.id,
            name: ben.name,
            currency: ben.currency
          },
          notes
        }
      });

      setRequestSuccess('Tu solicitud de remesa ha sido creada con éxito y está pendiente de procesamiento.');
      setSelectedBeneficiaryId('');
      setAmount(100);
      setNotes('');
      setShowRequestModal(false);
      fetchDashboardData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar la solicitud.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
      </div>
    );
  }

  // Resolver estados con tags visuales
  const getStatusBadge = (status: string) => {
    const maps: Record<string, { text: string, classes: string, icon: any }> = {
      completed: { text: 'Completada', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
      pending: { text: 'Pendiente', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
      processing: { text: 'Procesando', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: RefreshCw },
      rejected: { text: 'Rechazada', classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
      reversed: { text: 'Revertida', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertCircle },
    };
    const item = maps[status] || { text: status, classes: 'bg-slate-800 text-slate-400 border-slate-700', icon: Clock };
    const Icon = item.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${item.classes}`}>
        <Icon size={12} className={status === 'processing' ? 'animate-spin' : ''} />
        {item.text}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Hola, Bienvenido de vuelta</h2>
          <p className="text-slate-400 text-sm mt-0.5">Controla tus envíos de remesas y saldos.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-800 border border-slate-700 text-xs font-bold flex items-center gap-2">
            <Layers className="text-[#2ABFA3]" size={14} />
            KYC: Nivel {kycProfile?.kyc_level ?? 0}
          </div>
          
          <button 
            onClick={() => setShowRequestModal(true)}
            className="px-5 h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-2xl flex items-center gap-2 shadow-lg shadow-[#2ABFA3]/10 cursor-pointer transition-colors text-sm"
          >
            <Send size={14} />
            Solicitar Envío
          </button>
        </div>
      </div>

      {requestSuccess && (
        <div className="p-4 rounded-xl border border-sky-300/40 bg-sky-100 text-black flex items-start gap-2.5 text-sm">
          <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
          <span>{requestSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-300/40 bg-red-100 text-black flex items-start gap-2.5 text-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid: Accounts & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Accounts */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Mis Cuentas</h3>

          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="p-6 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-500 text-sm">
                No tienes cuentas de fondos registradas.
              </div>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#2ABFA3]/5 to-transparent rounded-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-400 font-bold">{acc.name}</span>
                      <span className="text-[10px] text-slate-500 block uppercase font-mono mt-0.5">{acc.type}</span>
                    </div>
                    <div className="p-2 bg-slate-800 rounded-xl">
                      <CreditCard size={16} className="text-[#2ABFA3]" />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 font-bold block">SALDO DISPONIBLE</span>
                    <span className="text-2xl font-black text-white">{parseFloat(acc.balance).toLocaleString()} {acc.currency}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Transactions History */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Últimas Transacciones</h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                No hay transacciones registradas todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase bg-slate-900/50">
                      <th className="px-6 py-4">Fecha</th>
                      <th className="px-6 py-4">Código / Ref</th>
                      <th className="px-6 py-4">Destinatario</th>
                      <th className="px-6 py-4 text-right">Monto</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-white block">{tx.tracking_code}</span>
                          <span className="text-xs text-slate-500 block truncate max-w-xs">{tx.reference || 'Sin referencia'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                          {tx.beneficiary_snapshot?.name || 'N/A'}
                        </td>
                        <td className={`px-6 py-4 text-right font-black whitespace-nowrap ${
                          tx.type === 'retiro' ? 'text-red-400' : 'text-[#2ABFA3]'
                        }`}>
                          {tx.type === 'retiro' ? '-' : '+'}{parseFloat(tx.amount).toLocaleString()} {tx.currency}
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
      </div>

      {/* Modal: Solicitar Remesa */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Send className="text-[#2ABFA3]" size={18} />
                Solicitar Nueva Operación
              </h3>
              <button 
                onClick={() => setShowRequestModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {beneficiaries.length === 0 ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-slate-500">Primero debes agregar destinatarios a tu libreta.</p>
                <button 
                  onClick={() => navigate('/dashboard/beneficiaries')}
                  className="px-4 py-2 bg-[#2ABFA3] text-slate-900 font-bold rounded-xl text-xs"
                >
                  Agregar Destinatario
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Tipo de Operación</label>
                    <select 
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm cursor-pointer"
                    >
                      <option value="remesa">Remesa (Envío)</option>
                      <option value="retiro">Retiro (Fondos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Divisa Origen</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm cursor-pointer"
                    >
                      <option value="USD">USD</option>
                      <option value="MXN">MXN</option>
                      <option value="PEN">PEN</option>
                      <option value="COP">COP</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Seleccionar Destinatario Frecuente</label>
                  <select 
                    value={selectedBeneficiaryId}
                    onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.bank_name} - {b.account_number} | {b.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Monto a Enviar / Retirar</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] font-bold text-sm"
                  />
                </div>

                {/* Vista previa en tiempo real */}
                {loadingPreview && (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <RefreshCw className="animate-spin" size={12} />
                    Calculando comisiones estimadas...
                  </div>
                )}

                {previewData && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2">
                    <span className="font-bold text-slate-400 block pb-1 border-b border-slate-800">CÁLCULO DE COMISIÓN DE RESPALDO (VISTA PREVIA)</span>
                    <div className="flex justify-between">
                      <span>Monto base:</span>
                      <span>{previewData.amount} {previewData.currencyFrom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Comisión de par (Tasa {(previewData.commissionRateApplied * 100).toFixed(2)}%):</span>
                      <span>+{previewData.commissionAmount} {previewData.currencyFrom}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[#2ABFA3]">
                      <span>Total cargado estimado:</span>
                      <span>{previewData.totalCharged} {previewData.currencyFrom}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Tasa de cambio Frankfurter:</span>
                      <span>1 {previewData.currencyFrom} = {previewData.exchangeRate} {previewData.currencyTo}</span>
                    </div>
                    <div className="flex justify-between text-[#2ABFA3] font-bold">
                      <span>El destinatario recibirá aprox:</span>
                      <span>{previewData.convertedAmount} {previewData.currencyTo}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Notas / Instrucciones adicionales</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Pago de renta, depósito urgente..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#2ABFA3] text-sm h-20 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingRequest || loadingPreview}
                  className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm"
                >
                  {submittingRequest ? 'Procesando...' : 'Confirmar Solicitud'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
