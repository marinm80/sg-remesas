import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { UserCheck, Plus, Edit2, Trash2, Globe, Landmark, DollarSign, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function Beneficiaries() {
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('checking'); // checking/savings/clabe/iban
  const [country, setCountry] = useState('MX');
  const [currency, setCurrency] = useState('MXN');

  const fetchBeneficiaries = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/beneficiaries');
      setBeneficiaries(res.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener los destinatarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setBankName('');
    setAccountNumber('');
    setAccountType('checking');
    setCountry('MX');
    setCurrency('MXN');
    setShowModal(true);
  };

  const openEditModal = (b: any) => {
    setEditingId(b.id);
    setName(b.name);
    setBankName(b.bank_name);
    setAccountNumber(b.account_number);
    setAccountType(b.account_type);
    setCountry(b.country);
    setCurrency(b.currency);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bankName || !accountNumber) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const bodyData = {
      name,
      bankName,
      accountNumber,
      accountType,
      country,
      currency,
    };

    try {
      if (editingId) {
        // Actualizar
        await apiRequest(`/beneficiaries/${editingId}`, {
          method: 'PUT',
          bodyData,
        });
        setSuccessMsg('Destinatario actualizado correctamente.');
      } else {
        // Crear
        await apiRequest('/beneficiaries', {
          method: 'POST',
          bodyData,
        });
        setSuccessMsg('Destinatario guardado con éxito en tu libreta.');
      }
      setShowModal(false);
      fetchBeneficiaries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar el destinatario.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este destinatario de tu libreta?')) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiRequest(`/beneficiaries/${id}`, { method: 'DELETE' });
      setSuccessMsg('Destinatario eliminado correctamente.');
      fetchBeneficiaries();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar el destinatario.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="text-[#2ABFA3]" size={20} />
            Libreta de Destinatarios
          </h2>
          <p className="text-slate-300 text-sm mt-0.5">
            Gestiona tus destinatarios frecuentes para agilizar tus envíos de remesas.
          </p>
        </div>

        <button 
          onClick={openAddModal}
          className="px-5 h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-2xl flex items-center gap-2 shadow-lg shadow-[#2ABFA3]/10 cursor-pointer transition-colors text-sm"
        >
          <Plus size={16} />
          Nuevo Destinatario
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {beneficiaries.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-300 bg-slate-900 border border-slate-800 rounded-3xl text-sm">
              No tienes ningún destinatario guardado en tu libreta. ¡Agrega uno nuevo!
            </div>
          ) : (
            beneficiaries.map((b) => (
              <div key={b.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#2ABFA3]/5 to-transparent rounded-full -z-10"></div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-extrabold text-white text-base leading-tight">{b.name}</h3>
                    <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1 mt-1 uppercase">
                      <Globe size={10} />
                      {b.country} · {b.currency}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(b)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white cursor-pointer transition-colors"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 bg-slate-800 hover:bg-red-950/40 rounded-lg text-slate-300 hover:text-red-400 cursor-pointer transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-[11px] text-slate-300">
                      <Landmark size={12} />
                      Banco:
                    </span>
                    <span className="font-semibold text-slate-300">{b.bank_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1 text-[11px] text-slate-300">
                      <DollarSign size={12} />
                      Nº Cuenta ({b.account_type}):
                    </span>
                    <span className="font-mono font-semibold text-slate-300">{b.account_number}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Add/Edit Beneficiary */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="text-[#2ABFA3]" size={18} />
                {editingId ? 'Editar Destinatario' : 'Nuevo Destinatario'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-300 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: María Rodríguez"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">País</label>
                  <select 
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer focus:outline-none focus:border-[#2ABFA3] text-sm"
                  >
                    <option value="MX">México (MX)</option>
                    <option value="PE">Perú (PE)</option>
                    <option value="CO">Colombia (CO)</option>
                    <option value="ES">España (ES)</option>
                    <option value="US">USA (US)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Moneda Cuenta</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer focus:outline-none focus:border-[#2ABFA3] text-sm"
                  >
                    <option value="MXN">MXN</option>
                    <option value="PEN">PEN</option>
                    <option value="COP">COP</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Banco Destino</label>
                  <input 
                    type="text" 
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ej: BBVA, BCP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">Tipo Cuenta</label>
                  <select 
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer focus:outline-none focus:border-[#2ABFA3] text-sm"
                  >
                    <option value="checking">Corriente (Checking)</option>
                    <option value="savings">Ahorros (Savings)</option>
                    <option value="clabe">CLABE (18 dígitos)</option>
                    <option value="iban">IBAN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-bold block mb-1">Nº Cuenta / CLABE / IBAN</label>
                <input 
                  type="text" 
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Número de cuenta bancaria"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] font-mono text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Destinatario'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
