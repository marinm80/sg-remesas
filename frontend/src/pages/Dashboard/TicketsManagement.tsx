import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { HelpCircle, MessageSquare, Send, X, Landmark, Clipboard, Calendar, Clock, RefreshCw, CheckSquare, AlertCircle } from 'lucide-react';

export default function TicketsManagement() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters State
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');

  // Active Ticket Detail State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyBody, setReplyBody] = useState<string>('');
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  const fetchTickets = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams();
      if (status) queryParams.set('status', status);
      if (category) queryParams.set('category', category);
      if (clientEmail) queryParams.set('clientEmail', clientEmail);

      const res = await apiRequest(`/tickets?${queryParams.toString()}`);
      setTickets(res.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener los tickets de soporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [status, category, clientEmail]);

  const handleSelectTicket = async (ticket: any) => {
    setLoadingDetails(true);
    setSelectedTicket(ticket);
    setErrorMsg(null);
    try {
      const res = await apiRequest(`/tickets/${ticket.id}`);
      setSelectedTicket(res.data.ticket);
      setMessages(res.data.messages);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar el hilo de discusión.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || !selectedTicket) return;

    setErrorMsg(null);
    try {
      const res = await apiRequest(`/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        bodyData: { body: replyBody }
      });
      setMessages([...messages, res.data]);
      setReplyBody('');
      // Recargar detalles por si cambió el estado
      const details = await apiRequest(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(details.data.ticket);
      fetchTickets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar respuesta.');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;

    setErrorMsg(null);
    try {
      await apiRequest(`/tickets/${selectedTicket.id}/status`, {
        method: 'PUT',
        bodyData: { status: newStatus }
      });
      
      const details = await apiRequest(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(details.data.ticket);
      fetchTickets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado.');
    }
  };

  const getStatusLabel = (status: string) => {
    const maps: Record<string, { text: string, classes: string }> = {
      open: { text: 'Abierto', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
      in_review: { text: 'En Revisión', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25' },
      resolved: { text: 'Resuelto', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
      closed: { text: 'Cerrado', classes: 'bg-slate-800 text-slate-300 border-slate-700' }
    };
    const item = maps[status] || { text: status, classes: 'bg-slate-800 text-slate-300' };
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${item.classes}`}>
        {item.text}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left List of Tickets */}
      <div className={`${selectedTicket ? 'hidden lg:block' : 'block'} lg:col-span-5 space-y-6`}>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle size={16} className="text-[#2ABFA3]" />
            Bandeja Soporte Global
          </h2>

          {/* Filters Form */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] text-slate-300 font-bold block mb-1">Estado</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white cursor-pointer"
              >
                <option value="">Todos</option>
                <option value="open">Abierto</option>
                <option value="in_review">En revisión</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-300 font-bold block mb-1">Categoría</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white cursor-pointer"
              >
                <option value="">Todas</option>
                <option value="consulta">Consulta</option>
                <option value="reclamo">Reclamo</option>
                <option value="problema_tecnico">Problema técnico</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="text-[10px] text-slate-300 font-bold block mb-1">Email Cliente</label>
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

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="animate-spin text-[#2ABFA3]" size={28} />
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-300 bg-slate-900 border border-slate-800 rounded-3xl text-xs">
                No hay tickets que coincidan con los filtros.
              </div>
            ) : (
              tickets.map((t) => (
                <div 
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`p-4 border rounded-3xl cursor-pointer transition-all hover:border-[#2ABFA3]/40 ${
                    selectedTicket?.id === t.id 
                      ? 'bg-slate-900 border-[#2ABFA3]/40 shadow-md shadow-[#2ABFA3]/5' 
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-extrabold text-white text-sm line-clamp-1">{t.subject}</h4>
                    {getStatusLabel(t.status)}
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">De: {t.client_name} ({t.client_email})</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-300 mt-3 font-semibold">
                    <span>Categoría: {t.category}</span>
                    <span>Modificado: {new Date(t.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right Ticket Thread View */}
      <div className={`${selectedTicket ? 'block' : 'hidden lg:block'} lg:col-span-7 space-y-6`}>
        {!selectedTicket ? (
          <div className="h-64 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-300 text-sm gap-2">
            <MessageSquare size={32} />
            Selecciona un ticket para responder.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col h-[70vh] shadow-sm">
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
              <div>
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="lg:hidden text-xs text-[#2ABFA3] hover:underline font-bold block mb-1"
                >
                  ← Volver a la lista
                </button>
                <h3 className="font-extrabold text-white text-base leading-tight">{selectedTicket.subject}</h3>
                <span className="text-[10px] font-bold text-slate-300 uppercase mt-0.5 block">
                  Cliente: {selectedTicket.client_name} ({selectedTicket.client_email})
                </span>
              </div>
              
              {/* Quick Actions Status */}
              <div className="flex items-center gap-2">
                <select 
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-300 px-2 py-1.5 cursor-pointer"
                >
                  <option value="open">Abierto</option>
                  <option value="in_review">En revisión</option>
                  <option value="resolved">Resuelto</option>
                  <option value="closed">Cerrado</option>
                </select>
                {getStatusLabel(selectedTicket.status)}
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-900/40">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="animate-spin text-[#2ABFA3]" size={28} />
                </div>
              ) : (
                messages.map((m) => {
                  const isOwn = m.author_role !== 'cliente';
                  return (
                    <div 
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${isOwn ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-300">{m.author_name}</span>
                        {isOwn && (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[#2ABFA3]/15 text-[#2ABFA3] uppercase">
                            Soporte
                          </span>
                        )}
                      </div>
                      <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isOwn 
                          ? 'bg-gradient-to-tr from-[#1B3F72] to-[#2ABFA3]/20 border border-[#2ABFA3]/20 text-white rounded-tr-none' 
                          : 'bg-slate-800 border border-slate-700/60 text-slate-200 rounded-tl-none'
                      }`}>
                        {m.body}
                      </div>
                      <span className="text-[9px] text-slate-300 mt-1 font-mono">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Thread Input Form */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2">
              <input 
                type="text" 
                placeholder="Escribe tu mensaje como soporte..."
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-[#2ABFA3] text-sm"
              />
              <button 
                type="submit"
                className="w-10 h-10 rounded-xl bg-[#2ABFA3] text-slate-900 flex items-center justify-center shrink-0 cursor-pointer hover:bg-[#209d85] transition-colors"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
