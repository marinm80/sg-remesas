import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/api.js';
import { 
  CreditCard, ArrowUpRight, ArrowDownLeft, Send, CheckCircle2, 
  Clock, XCircle, AlertCircle, RefreshCw, Layers, Plus, X
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
  const [loadingBeneficiariesForRequest, setLoadingBeneficiariesForRequest] = useState<boolean>(false);
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [selectedOriginAccountId, setSelectedOriginAccountId] = useState<string>('');
  const [requestStep, setRequestStep] = useState<'select-beneficiary' | 'details'>('select-beneficiary');
  const [showAccountModal, setShowAccountModal] = useState<boolean>(false);
  const [accountName, setAccountName] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('bank');
  const [accountCurrency, setAccountCurrency] = useState<string>('USD');
  const [accountBalance, setAccountBalance] = useState<number>(1000);
  const [savingAccount, setSavingAccount] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [accsRes, txsRes, bensRes, reqsRes, kycHistory] = await Promise.all([
        apiRequest('/accounts').catch(() => ({ data: [] })),
        apiRequest('/transactions').catch(() => ({ data: [] })),
        apiRequest('/beneficiaries').catch(() => ({ data: [] })),
        apiRequest('/transactions/requests/all').catch(() => ({ data: [] })),
        apiRequest('/kyc/history').catch(() => ({ data: [] })),
      ]);
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

  useEffect(() => {
    if (!selectedOriginAccountId && accounts.length > 0) {
      const firstActiveAccount = accounts.find((account) => account.is_active) || accounts[0];
      setSelectedOriginAccountId(firstActiveAccount.id);
      setCurrency(firstActiveAccount.currency);
    }
  }, [accounts, selectedOriginAccountId]);

  // Calcular vista previa de la remesa
  useEffect(() => {
    if (!showRequestModal || amount <= 0 || !selectedBeneficiaryId || !selectedOriginAccountId) {
      setPreviewData(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingPreview(true);
      try {
        const ben = beneficiaries.find(b => b.id === selectedBeneficiaryId);
        const originAccount = accounts.find(a => a.id === selectedOriginAccountId);
        if (!ben || !originAccount) return;

        // Llamar endpoint de preview
        const res = await apiRequest('/transactions/preview', {
          method: 'POST',
          bodyData: {
            clientId: ben.client_id,
            type,
            amount,
            currencyFrom: originAccount.currency,
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
  }, [accounts, amount, selectedOriginAccountId, selectedBeneficiaryId, type, showRequestModal, beneficiaries]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeneficiaryId || !selectedOriginAccountId || amount <= 0) return;

    setSubmittingRequest(true);
    setRequestSuccess(null);
    setErrorMsg(null);

    try {
      const ben = beneficiaries.find(b => b.id === selectedBeneficiaryId);
      const originAccount = accounts.find(a => a.id === selectedOriginAccountId);
      if (!ben) throw new Error('Beneficiario inválido');

      if (!originAccount) throw new Error('Selecciona una cuenta origen para enviar fondos.');
      const availableBalance = parseFloat((originAccount.available_balance ?? originAccount.balance).toString());
      const totalToReserve = previewData?.totalCharged ? parseFloat(previewData.totalCharged) : amount;
      if (availableBalance < totalToReserve) {
        throw new Error('La cuenta origen no tiene saldo disponible suficiente para cubrir monto y comision. Revisa el saldo reservado por solicitudes pendientes.');
      }

      await apiRequest('/transactions/requests', {
        method: 'POST',
        bodyData: {
          type,
          accountOriginId: originAccount.id,
          amount,
          currency: originAccount.currency,
          destinationAccountInfo: {
            originAccountId: originAccount.id,
            originAccountName: originAccount.name,
            originAccountCurrency: originAccount.currency,
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

  const openRequestModal = async () => {
    setRequestStep('select-beneficiary');
    setSelectedBeneficiaryId('');
    setPreviewData(null);
    setShowRequestModal(true);
    setLoadingBeneficiariesForRequest(true);
    setErrorMsg(null);

    try {
      const res = await apiRequest('/beneficiaries');
      setBeneficiaries(res.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar los destinatarios.');
    } finally {
      setLoadingBeneficiariesForRequest(false);
    }
  };

  const closeRequestModal = () => {
    setShowRequestModal(false);
    setRequestStep('select-beneficiary');
    setPreviewData(null);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || accountBalance < 0) return;

    setSavingAccount(true);
    setErrorMsg(null);
    setRequestSuccess(null);

    try {
      const res = await apiRequest('/accounts', {
        method: 'POST',
        bodyData: {
          name: accountName,
          type: accountType,
          currency: accountCurrency,
          balance: accountBalance,
        },
      });

      setRequestSuccess('Cuenta creada correctamente. Ya puedes usarla como origen de fondos.');
      setSelectedOriginAccountId(res.data.id);
      setCurrency(res.data.currency);
      setShowAccountModal(false);
      setAccountName('');
      setAccountType('bank');
      setAccountCurrency('USD');
      setAccountBalance(1000);
      fetchDashboardData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la cuenta.');
    } finally {
      setSavingAccount(false);
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
      cancelled: { text: 'Cancelada', classes: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
      reversed: { text: 'Revertida', classes: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: AlertCircle },
    };
    const item = maps[status] || { text: status, classes: 'bg-slate-800 text-slate-300 border-slate-700', icon: Clock };
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
          <p className="text-slate-300 text-sm mt-0.5">Controla tus envíos de remesas y saldos.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-2xl bg-white border border-white text-xs font-extrabold text-slate-950 flex items-center gap-2 shadow-sm">
            <Layers className="text-slate-950" size={14} />
            <span className="text-slate-950">KYC: Nivel {kycProfile?.kyc_level ?? 0}</span>
          </div>
          
          <button 
            onClick={openRequestModal}
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
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Mis Cuentas</h3>
            <button
              onClick={() => setShowAccountModal(true)}
              className="h-8 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus size={12} />
              Agregar
            </button>
          </div>

          <div className="space-y-4">
            {accounts.length === 0 ? (
              <div className="p-6 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-300 text-sm space-y-4">
                <p>No tienes cuentas de fondos registradas.</p>
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="mx-auto h-9 px-4 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  <Plus size={14} />
                  Crear cuenta
                </button>
              </div>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#2ABFA3]/5 to-transparent rounded-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-slate-300 font-bold">{acc.name}</span>
                      <span className="text-[10px] text-slate-300 block uppercase font-mono mt-0.5">{acc.type}</span>
                    </div>
                    <div className="p-2 bg-slate-800 rounded-xl">
                      <CreditCard size={16} className="text-[#2ABFA3]" />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs text-slate-300 font-bold block">SALDO DISPONIBLE</span>
                    <span className="text-2xl font-black text-white">
                      {parseFloat(acc.available_balance ?? acc.balance).toLocaleString()} {acc.currency}
                    </span>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2">
                        <span className="block text-slate-300 font-bold">Total</span>
                        <span className="text-slate-100 font-mono">{parseFloat(acc.balance).toLocaleString()}</span>
                      </div>
                      <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 px-3 py-2">
                        <span className="block text-yellow-200 font-bold">Reservado</span>
                        <span className="text-yellow-100 font-mono">{parseFloat(acc.reserved_balance ?? 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Transactions History */}
        <div className="lg:col-span-8 space-y-6">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Últimas Transacciones</h3>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-300 text-sm">
                No hay transacciones registradas todavía.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-300 text-xs font-bold uppercase bg-slate-900/50">
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
                        <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-white block">{tx.tracking_code}</span>
                          <span className="text-xs text-slate-300 block truncate max-w-xs">{tx.reference || 'Sin referencia'}</span>
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

      {/* Modal: Crear Cuenta */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="text-[#2ABFA3]" size={18} />
                Crear Cuenta de Fondos
              </h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Nombre de la cuenta</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Ej: Cuenta personal USD"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Tipo</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                  >
                    <option value="bank">Banco</option>
                    <option value="digital">Digital</option>
                    <option value="cash">Efectivo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Moneda</label>
                  <select
                    value={accountCurrency}
                    onChange={(e) => setAccountCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                    <option value="PEN">PEN</option>
                    <option value="COP">COP</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Saldo inicial demo</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] font-bold text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={savingAccount}
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm"
              >
                {savingAccount ? 'Creando...' : 'Crear Cuenta'}
              </button>
            </form>
          </div>
        </div>
      )}

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
                onClick={closeRequestModal}
                className="text-slate-300 hover:text-white font-bold text-sm cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            {loadingBeneficiariesForRequest ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-300">
                <RefreshCw className="animate-spin text-[#2ABFA3]" size={16} />
                Cargando destinatarios...
              </div>
            ) : beneficiaries.length === 0 ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-slate-300">Primero debes agregar destinatarios a tu libreta.</p>
                <button
                  onClick={() => {
                    closeRequestModal();
                    navigate('/dashboard/beneficiaries');
                  }}
                  className="px-4 py-2 bg-[#2ABFA3] text-slate-900 font-bold rounded-xl text-xs"
                >
                  Agregar Destinatario
                </button>
              </div>
            ) : requestStep === 'select-beneficiary' ? (
              <div className="space-y-5">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Destinatario disponible</label>
                  <select
                    value={selectedBeneficiaryId}
                    onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Seleccionar destinatario --</option>
                    {beneficiaries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.bank_name} - {b.account_number} | {b.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeRequestModal}
                    className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!selectedBeneficiaryId}
                    onClick={() => setRequestStep('details')}
                    className="h-10 px-5 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Aceptar
                  </button>
                </div>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-6 space-y-4">
                <p className="text-sm text-slate-300">Primero debes crear una cuenta propia para enviar fondos.</p>
                <button
                  onClick={() => setShowAccountModal(true)}
                  className="px-4 py-2 bg-[#2ABFA3] text-slate-900 font-bold rounded-xl text-xs"
                >
                  Crear Cuenta
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-300 font-bold uppercase block">Destinatario seleccionado</span>
                    <span className="text-sm text-white font-bold">
                      {beneficiaries.find((b) => b.id === selectedBeneficiaryId)?.name || 'Sin seleccionar'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestStep('select-beneficiary');
                      setPreviewData(null);
                    }}
                    className="h-8 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold"
                  >
                    Cambiar
                  </button>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Cuenta origen</label>
                  <select
                    value={selectedOriginAccountId}
                    onChange={(e) => {
                      const account = accounts.find((item) => item.id === e.target.value);
                      setSelectedOriginAccountId(e.target.value);
                      if (account) setCurrency(account.currency);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm cursor-pointer"
                    required
                  >
                    <option value="">-- Seleccionar cuenta --</option>
                    {accounts.filter((account) => account.is_active).map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({parseFloat(account.available_balance ?? account.balance).toLocaleString()} disp. / {parseFloat(account.reserved_balance ?? 0).toLocaleString()} res. {account.currency})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-300 font-bold block mb-1">Tipo de Operación</label>
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
                    <label className="text-xs text-slate-300 font-bold block mb-1">Divisa Origen</label>
                    <select 
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={Boolean(selectedOriginAccountId)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-80"
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
                  <label className="text-xs text-slate-300 font-bold block mb-1">Seleccionar Destinatario Frecuente</label>
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
                  <label className="text-xs text-slate-300 font-bold block mb-1">Monto a Enviar / Retirar</label>
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
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-300">
                    <RefreshCw className="animate-spin" size={12} />
                    Calculando comisiones estimadas...
                  </div>
                )}

                {previewData && (
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs space-y-2">
                    <span className="font-bold text-slate-300 block pb-1 border-b border-slate-800">CÁLCULO DE COMISIÓN DE RESPALDO (VISTA PREVIA)</span>
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
                    <div className="flex justify-between text-slate-300">
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
                  <label className="text-xs text-slate-300 font-bold block mb-1">Notas / Instrucciones adicionales</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Pago de renta, depósito urgente..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#2ABFA3] text-sm h-20 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingRequest || loadingPreview || !selectedOriginAccountId}
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
