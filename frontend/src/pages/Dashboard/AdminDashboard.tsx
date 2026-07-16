import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { 
  TrendingUp, Users, Percent, ShieldAlert, BarChart3, 
  Download, Calendar, RefreshCw, AlertCircle, CheckCircle2 
} from 'lucide-react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Date filter for reports
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Stats / Reports State
  const [summaryStats, setSummaryStats] = useState<any[]>([]);
  const [operatorReport, setOperatorReport] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    totalVolumeUsd: 0,
    totalCommissionsUsd: 0,
    totalUsers: 0,
    activeAlertsCount: 0
  });

  const loadReports = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [sumRes, opRes, usersRes, alertsRes] = await Promise.all([
        apiRequest(`/reports/transactions-summary?startDate=${startDate}&endDate=${endDate}`),
        apiRequest(`/reports/operator-commissions?startDate=${startDate}&endDate=${endDate}`),
        apiRequest('/users'), // Conteo de usuarios
        apiRequest('/compliance/alerts/pending')
      ]);

      const sumData = sumRes.data || [];
      setSummaryStats(sumData);
      setOperatorReport(opRes.data || []);

      // Calcular KPI totales
      let vol = 0;
      let comm = 0;
      for (const row of sumData) {
        if (row.status === 'completed') {
          vol += parseFloat(row.total_volume_usd);
          comm += parseFloat(row.total_commission_usd);
        }
      }

      setKpis({
        totalVolumeUsd: vol,
        totalCommissionsUsd: comm,
        totalUsers: (usersRes.data || []).length,
        activeAlertsCount: (alertsRes.data || []).length
      });

    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener los reportes del sistema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [startDate, endDate]);

  // Exportar reporte de transacciones a CSV
  const handleExportTransactions = () => {
    if (summaryStats.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Estado,Transacciones Totales,Volumen Acumulado (USD),Comisiones Acumuladas (USD)\n";
    
    summaryStats.forEach(row => {
      csvContent += `${row.status},${row.total_count},${row.total_volume_usd},${row.total_commission_usd}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_transacciones_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Exportar reporte de operadores a CSV
  const handleExportOperators = () => {
    if (operatorReport.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Operador,Nombre,Email,Transacciones Procesadas,Volumen Procesado (USD),Comisiones por Pagar (USD)\n";
    
    operatorReport.forEach(row => {
      csvContent += `${row.operator_id},${row.operator_name},${row.operator_email},${row.transactions_count},${row.total_processed_usd},${row.total_commission_to_pay}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_comisiones_operadores_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Resumen Ejecutivo</h2>
          <p className="text-slate-300 text-sm mt-0.5">Métricas de rentabilidad y volumen general del negocio.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold text-xs uppercase">Desde:</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-bold text-xs uppercase">Hasta:</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-300/40 bg-red-100 text-black flex items-start gap-2.5 text-sm">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-300 font-bold uppercase">Volumen Procesado</span>
            <TrendingUp size={16} className="text-[#2ABFA3]" />
          </div>
          <p className="text-2xl font-black text-white">$ {kpis.totalVolumeUsd.toLocaleString()} USD</p>
          <span className="text-[10px] text-slate-300 font-bold block">Transacciones Completadas</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-300 font-bold uppercase">Ingresos Comisiones</span>
            <Percent size={16} className="text-[#2ABFA3]" />
          </div>
          <p className="text-2xl font-black text-[#2ABFA3]">$ {kpis.totalCommissionsUsd.toLocaleString()} USD</p>
          <span className="text-[10px] text-slate-300 font-bold block">Recaudación Neta del Periodo</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-300 font-bold uppercase">Usuarios Totales</span>
            <Users size={16} className="text-[#2ABFA3]" />
          </div>
          <p className="text-2xl font-black text-white">{kpis.totalUsers} cuentas</p>
          <span className="text-[10px] text-slate-300 font-bold block">Registros Locales y Google</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-300 font-bold uppercase">Alertas AML</span>
            <ShieldAlert size={16} className="text-orange-400" />
          </div>
          <p className="text-2xl font-black text-orange-400">{kpis.activeAlertsCount} pendientes</p>
          <span className="text-[10px] text-slate-300 font-bold block">Investigaciones de Auditoría</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Box 1: Transaction summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={16} className="text-[#2ABFA3]" />
                Volumen por Estado
              </h3>
              <button 
                onClick={handleExportTransactions}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download size={12} />
                Exportar CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-300 font-bold uppercase border-b border-slate-800">
                    <th className="py-2">Estado</th>
                    <th className="py-2 text-center">Transacciones</th>
                    <th className="py-2 text-right">Volumen total (USD)</th>
                    <th className="py-2 text-right">Comisión total (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {summaryStats.map((row) => (
                    <tr key={row.status} className="hover:bg-slate-850/40">
                      <td className="py-3 font-semibold capitalize text-slate-300">{row.status}</td>
                      <td className="py-3 text-center text-slate-300">{row.total_count}</td>
                      <td className="py-3 text-right font-mono text-slate-300">$ {parseFloat(row.total_volume_usd).toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-[#2ABFA3]">$ {parseFloat(row.total_commission_usd).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Box 2: Operator commission payouts */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-[#2ABFA3]" />
                Incentivos de Operadores
              </h3>
              <button 
                onClick={handleExportOperators}
                className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download size={12} />
                Exportar CSV
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-300 font-bold uppercase border-b border-slate-800">
                    <th className="py-2">Operador</th>
                    <th className="py-2 text-center">Transacciones</th>
                    <th className="py-2 text-right">Monto procesado (USD)</th>
                    <th className="py-2 text-right">Comisión a Liquidar (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {operatorReport.map((row) => (
                    <tr key={row.operator_id} className="hover:bg-slate-850/40">
                      <td className="py-3">
                        <span className="font-semibold text-slate-300 block">{row.operator_name}</span>
                        <span className="text-[10px] text-slate-300 block">{row.operator_email}</span>
                      </td>
                      <td className="py-3 text-center text-slate-300">{row.transactions_count}</td>
                      <td className="py-3 text-right font-mono text-slate-300">$ {parseFloat(row.total_processed_usd).toLocaleString()}</td>
                      <td className="py-3 text-right font-mono text-emerald-400 font-bold">$ {parseFloat(row.total_commission_to_pay).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
