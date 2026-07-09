import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/api.js';
import { HelpCircle, MessageSquare, Send, X, Landmark, Clipboard, Calendar, Clock, RefreshCw } from 'lucide-react';

export default function ClientTickets() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Active Ticket Detail State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyBody, setReplyBody] = useState<string>('');
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // New Ticket Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('consulta'); // consulta/reclamo/problema_tecnico/otro
  const [messageBody, setMessageBody] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiRequest('/tickets');
      setTickets(res.data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener los tickets de soporte.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

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
      // Recargar detalles por si cambió el estado (de closed/resolved a open)
      const details = await apiRequest(`/tickets/${selectedTicket.id}`);
      setSelectedTicket(details.data.ticket);
      fetchTickets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar respuesta.');
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !messageBody) return;

    setSubmittingTicket(true);
    setErrorMsg(null);

    try {
      await apiRequest('/tickets', {
        method: 'POST',
        bodyData: {
          subject,
          category,
          messageBody,
        }
      });
      setShowModal(false);
      setSubject('');
      setMessageBody('');
      fetchTickets();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al crear el ticket.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Validar si el ticket puede recibir respuestas
  const isTicketReplyable = () => {
    if (!selectedTicket) return false;
    if (selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved') return true;

    // BR-11: Menos de 30 días de cerrado para reabrir
    if (selectedTicket.closed_at) {
      const closedDate = new Date(selectedTicket.closed_at);
      const limitDate = new Date();
      limitDate.setDate(limitDate.getDate() - 30);
      return closedDate >= limitDate;
    }
    return true;
  };

  const getStatusLabel = (status: string) => {
    const maps: Record<string, { text: string, classes: string }> = {
      open: { text: 'Abierto', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' },
      in_review: { text: 'En Revisión', classes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25' },
      resolved: { text: 'Resuelto', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/25' },
      closed: { text: 'Cerrado', classes: 'bg-slate-800 text-slate-400 border-slate-700' }
    };
    const item = maps[status] || { text: status, classes: 'bg-slate-800 text-slate-400' };
    return (
      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${item.classes}`}>
        {item.text}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left List of Tickets */}
      <div className={`${selectedTicket ? 'hidden lg:block' : 'block'} lg:col-span-4 space-y-6`}>
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <HelpCircle size={16} className="text-[#2ABFA3]" />
            Mis Tickets
          </h2>
          <button 
            onClick={() => setShowModal(true)}
            className="px-3.5 py-1.5 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-bold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Abrir Ticket
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="animate-spin text-[#2ABFA3]" size={28} />
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-3xl text-xs leading-relaxed">
                No tienes ningún ticket de soporte abierto.
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
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-3 font-semibold">
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
      <div className={`${selectedTicket ? 'block' : 'hidden lg:block'} lg:col-span-8 space-y-6`}>
        {!selectedTicket ? (
          <div className="h-64 border border-slate-800 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-500 text-sm gap-2">
            <MessageSquare size={32} />
            Selecciona un ticket de soporte para ver la conversación.
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
                <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5 block">
                  Categoría: {selectedTicket.category} · Creado el {new Date(selectedTicket.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="text-right">
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
                  const isOwn = m.author_role === 'cliente';
                  return (
                    <div 
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${isOwn ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] font-bold text-slate-400">{m.author_name}</span>
                        {!isOwn && (
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
                      <span className="text-[9px] text-slate-500 mt-1 font-mono">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Thread Input Form */}
            {isTicketReplyable() ? (
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-800 bg-slate-900 flex gap-2">
                <input 
                  type="text" 
                  placeholder="Escribe tu mensaje..."
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
            ) : (
              <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-center text-xs text-slate-500 font-semibold leading-relaxed">
                Este ticket está cerrado y ha superado el límite de 30 días para su reapertura (BR-11). Por favor, abre otro si necesitas asistencia.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Open Ticket */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle className="text-[#2ABFA3]" size={18} />
                Abrir Nuevo Ticket
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Asunto</label>
                <input 
                  type="text" 
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ej: Retraso en mi transferencia de fondos"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#2ABFA3] text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Categoría</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white cursor-pointer focus:outline-none focus:border-[#2ABFA3] text-sm"
                >
                  <option value="consulta">Consulta general</option>
                  <option value="reclamo">Reclamo operacional</option>
                  <option value="problema_tecnico">Problema técnico de plataforma</option>
                  <option value="otro">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Mensaje Inicial</label>
                <textarea 
                  required
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Describe con detalle tu duda o problema..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#2ABFA3] text-sm h-32 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingTicket}
                className="w-full h-11 bg-[#2ABFA3] hover:bg-[#209d85] text-slate-900 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#2ABFA3]/15 transition-all text-sm mt-4"
              >
                {submittingTicket ? 'Creando...' : 'Enviar Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
