import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { FileText, Calendar, RefreshCw, AlertCircle, Eye } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchLogs = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest(`/reports/audit-logs?startDate=${startDate}&endDate=${endDate}`);
      setLogs(res.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener los logs de auditoría.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 border border-slate-800 p-6 rounded-3xl gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="text-[#2ABFA3]" size={20} />
            Historial de Auditoría
          </h2>
          <p className="text-slate-400 text-sm mt-0.5">Logs inmutables de cambios de estado y operaciones registradas (RF-42).</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold text-xs uppercase">Desde:</span>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-bold text-xs uppercase">Hasta:</span>
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

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="animate-spin text-[#2ABFA3]" size={36} />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No se encontraron logs de auditoría en el rango de fechas seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs font-bold uppercase bg-slate-900/50">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Código Remesa</th>
                  <th className="px-6 py-4">Acción / Estado</th>
                  <th className="px-6 py-4">Operador Responsable</th>
                  <th className="px-6 py-4">Comentarios de Auditoría</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20 transition-colors text-xs">
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-white">
                      {log.tracking_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {log.previous_status ? (
                          <>
                            <span className="text-slate-500 font-semibold">{log.previous_status}</span>
                            <span className="text-slate-600">→</span>
                            <span className="text-[#2ABFA3] font-bold">{log.new_status}</span>
                          </>
                        ) : (
                          <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-[9px]">Creada (completed)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-slate-350 block font-semibold">{log.performed_by_name || 'Automático'}</span>
                      <span className="text-[10px] text-slate-500 block">{log.performed_by_email || 'system'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 leading-relaxed font-sans max-w-sm">
                      {log.action_description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
