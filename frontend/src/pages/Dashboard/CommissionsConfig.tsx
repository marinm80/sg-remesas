import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { 
  Percent, Plus, Trash2, Settings, RefreshCw, 
  CheckCircle, AlertCircle, HelpCircle, ToggleLeft, ToggleRight, DollarSign 
} from 'lucide-react';

export default function CommissionsConfig() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [rules, setRules] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [showTierModal, setShowTierModal] = useState<boolean>(false);

  // Form: Rule
  const [currencyFrom, setCurrencyFrom] = useState('USD');
  const [currencyTo, setCurrencyTo] = useState('MXN');
  const [ratePercent, setRatePercent] = useState<number>(2.5);
  const [minFixedAmount, setMinFixedAmount] = useState<number>(3);
  const [minFixedCurrency, setMinFixedCurrency] = useState('USD');

  // Form: Tier
  const [operatorId, setOperatorId] = useState<string>('');
  const [minAmountUsd, setMinAmountUsd] = useState<number>(100);
  const [maxAmountUsd, setMaxAmountUsd] = useState<string>('');
  const [tierRatePercent, setTierRatePercent] = useState<number>(0.5);

  // Form: Config
  const [configKey, setConfigKey] = useState('');
  const [configValue, setConfigValue] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [rulesRes, tiersRes, configsRes] = await Promise.all([
        apiRequest('/commissions/rules'),
        apiRequest('/commissions/tiers'),
        apiRequest('/commissions/config')
      ]);
      setRules(rulesRes.data || []);
      setTiers(tiersRes.data || []);
      setConfigs(configsRes.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener configuraciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest('/commissions/rules', {
        method: 'POST',
        bodyData: {
          currencyFrom,
          currencyTo,
          ratePercent,
          minFixedAmount,
          minFixedCurrency,
        }
      });
      setSuccessMsg('Regla de comisión de divisas creada con éxito.');
      setShowRuleModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear la regla.');
    }
  };

  const handleDeactivateRule = async (id: number) => {
    if (!window.confirm('¿Está seguro de desactivar esta regla de comisiones?')) return;
    setErrorMsg(null);
    try {
      await apiRequest(`/commissions/rules/${id}/deactivate`, { method: 'PUT' });
      setSuccessMsg('Regla de comisión desactivada.');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest('/commissions/tiers', {
        method: 'POST',
        bodyData: {
          operatorId: operatorId || null,
          minAmountUsd,
          maxAmountUsd: maxAmountUsd ? parseFloat(maxAmountUsd) : null,
          ratePercent: tierRatePercent,
        }
      });
      setSuccessMsg('Tramo de incentivo de operador registrado.');
      setShowTierModal(false);
      setOperatorId('');
      setMaxAmountUsd('');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeactivateTier = async (id: number) => {
    if (!window.confirm('¿Está seguro de desactivar este tramo de comisiones del operador?')) return;
    setErrorMsg(null);
    try {
      await apiRequest(`/commissions/tiers/${id}/deactivate`, { method: 'PUT' });
      setSuccessMsg('Tramo de comisión desactivado.');
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest('/commissions/config', {
        method: 'PUT',
        bodyData: {
          key: configKey,
          value: configValue
        }
      });
      setSuccessMsg(`Configuración ${configKey} actualizada con éxito.`);
      setShowConfigModal(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Percent className="text-[#2ABFA3]" size={20} />
            Configuración de Comisiones y Tramos
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Define comisiones por divisas, tramos de incentivo y variables de balance.</p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setShowRuleModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              + Regla Comisión
            </button>
            <button 
              onClick={() => setShowTierModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
            >
              + Tramo Incentivo
            </button>
          </div>
        )}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Currency Pairs Rules */}
          <div className="lg:col-span-8 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Reglas Activas por Monedas</h3>
            
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase bg-slate-900/50">
                    <th className="px-6 py-4">Par Divisas</th>
                    <th className="px-6 py-4 text-center">Tasa %</th>
                    <th className="px-6 py-4 text-right">Monto Mínimo</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    {isAdmin && <th className="px-6 py-4 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 text-xs">No hay reglas de par configuradas. Se usarán valores globales.</td>
                    </tr>
                  ) : (
                    rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-800/20">
                        <td className="px-6 py-4 font-bold text-white whitespace-nowrap">
                          {rule.currency_from} → {rule.currency_to}
                        </td>
                        <td className="px-6 py-4 text-center text-slate-300 font-mono">
                          {(parseFloat(rule.rate_percent)).toFixed(2)} %
                        </td>
                        <td className="px-6 py-4 text-right text-slate-300 font-mono">
                          {parseFloat(rule.min_fixed_amount).toLocaleString()} {rule.min_fixed_currency}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {rule.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#2ABFA3]/15 text-[#2ABFA3] border border-[#2ABFA3]/20">Activa</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-500 border border-slate-700">Inactiva</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            {rule.is_active && (
                              <button 
                                onClick={() => handleDeactivateRule(rule.id)}
                                className="text-xs text-red-400 hover:underline font-bold"
                              >
                                Desactivar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Operator Commission Tiers */}
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tramos de Incentivos de Operadores</h3>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase bg-slate-900/50">
                    <th className="px-6 py-4">Límite Mínimo (USD)</th>
                    <th className="px-6 py-4">Límite Máximo (USD)</th>
                    <th className="px-6 py-4 text-center">Incentivo %</th>
                    <th className="px-6 py-4">Operador</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    {isAdmin && <th className="px-6 py-4 text-right">Acción</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {tiers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">No hay tramos de incentivo configurados.</td>
                    </tr>
                  ) : (
                    tiers.map((tier) => (
                      <tr key={tier.id} className="hover:bg-slate-800/20">
                        <td className="px-6 py-4 font-mono text-slate-350">$ {parseFloat(tier.min_amount_usd).toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono text-slate-350">
                          {tier.max_amount_usd ? `$ ${parseFloat(tier.max_amount_usd).toLocaleString()}` : '∞'}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-[#2ABFA3] font-mono">
                          {(parseFloat(tier.rate_percent)).toFixed(2)} %
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {tier.operator_id ? 'Personalizado (ID)' : 'Global'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {tier.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#2ABFA3]/15 text-[#2ABFA3] border border-[#2ABFA3]/20">Activo</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-500 border border-slate-700">Inactivo</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right">
                            {tier.is_active && (
                              <button 
                                onClick={() => handleDeactivateTier(tier.id)}
                                className="text-xs text-red-400 hover:underline font-bold"
                              >
                                Desactivar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Global variables settings */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Parámetros Globales (Config)</h3>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
              {configs.map((c) => (
                <div key={c.id} className="flex justify-between items-start py-2.5 border-b border-slate-800/60 last:border-0 text-xs">
                  <div className="space-y-1 pr-4">
                    <span className="font-bold text-white font-mono">{c.key}</span>
                    <span className="text-[10px] text-slate-500 block">Actualizado por: {c.updater_name || 'Sistema'}</span>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="font-mono text-[#2ABFA3] font-bold text-sm block">{c.value}</span>
                    {isAdmin && (
                      <button 
                        onClick={() => {
                          setConfigKey(c.key);
                          setConfigValue(c.value);
                          setShowConfigModal(true);
                        }}
                        className="text-[10px] text-slate-400 hover:text-white font-bold"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Rule */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Percent className="text-[#2ABFA3]" size={18} />
                Nueva Regla de Comisión
              </h3>
              <button 
                onClick={() => setShowRuleModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Moneda Origen</label>
                  <select 
                    value={currencyFrom}
                    onChange={(e) => setCurrencyFrom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                    <option value="PEN">PEN</option>
                    <option value="COP">COP</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Moneda Destino</label>
                  <select 
                    value={currencyTo}
                    onChange={(e) => setCurrencyTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer"
                  >
                    <option value="MXN">MXN</option>
                    <option value="PEN">PEN</option>
                    <option value="COP">COP</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Tasa Porcentual (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={ratePercent}
                  onChange={(e) => setRatePercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Comisión Mínima Fija</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={minFixedAmount}
                    onChange={(e) => setMinFixedAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Divisa Mínima Fija</label>
                  <select 
                    value={minFixedCurrency}
                    onChange={(e) => setMinFixedCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer"
                  >
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                    <option value="PEN">PEN</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
              >
                Crear Regla de Divisas
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Tier */}
      {showTierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Percent className="text-[#2ABFA3]" size={18} />
                Nuevo Tramo de Incentivo
              </h3>
              <button 
                onClick={() => setShowTierModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                X
              </button>
            </div>

            <form onSubmit={handleCreateTier} className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">ID Operador (Vacío para Global)</label>
                <input 
                  type="text" 
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  placeholder="UUID del operador (opcional)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Monto Mínimo (USD)</label>
                  <input 
                    type="number" 
                    required
                    value={minAmountUsd}
                    onChange={(e) => setMinAmountUsd(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Monto Máximo (USD)</label>
                  <input 
                    type="number" 
                    value={maxAmountUsd}
                    onChange={(e) => setMaxAmountUsd(e.target.value)}
                    placeholder="Sin límite superior"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Incentivo del tramo (%)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={tierRatePercent}
                  onChange={(e) => setTierRatePercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
              >
                Crear Tramo de Incentivos
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Global Config */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="text-[#2ABFA3]" size={18} />
                Editar Parámetro Global
              </h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                X
              </button>
            </div>

            <form onSubmit={handleUpdateConfig} className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Clave de Configuración</label>
                <input 
                  type="text" 
                  disabled
                  value={configKey}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Valor de Configuración</label>
                <input 
                  type="text" 
                  required
                  value={configValue}
                  onChange={(e) => setConfigValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
              >
                Actualizar Configuración
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
