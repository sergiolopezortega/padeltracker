import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trophy, MapPin, Users, Calendar, X, Trash2, TrendingUp, Activity, Edit3, BarChart3, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Match } from './types';

export default function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Match>({
    date: new Date().toISOString().split('T')[0],
    time: '',
    club: '',
    team: '',
    result: '',
    status: 'Pendiente',
  });

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/matches');
      if (!response.ok) throw new Error('Error al cargar datos');
      const data = await response.json();
      
      // Sort by proximity to current time
      const now = new Date();
      const sortedData = data.sort((a: any, b: any) => {
        const dateA = new Date(`${a.date}${a.time ? `T${a.time}` : 'T00:00'}`).getTime();
        const dateB = new Date(`${b.date}${b.time ? `T${b.time}` : 'T00:00'}`).getTime();
        return Math.abs(dateA - now.getTime()) - Math.abs(dateB - now.getTime());
      });

      setMatches(sortedData);
      setError(null);
    } catch (err) {
      setError('No se pudieron cargar los partidos. Por favor, intenta de nuevo.');
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const stats = useMemo(() => {
    const total = matches.length;
    const thisMonth = matches.filter(m => {
      const matchDate = new Date(m.date);
      const now = new Date();
      return matchDate.getMonth() === now.getMonth() && matchDate.getFullYear() === now.getFullYear();
    }).length;
    return { total, thisMonth };
  }, [matches]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMatchId ? `/api/matches/${editingMatchId}` : '/api/matches';
      const method = editingMatchId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        handleCloseModal();
        fetchMatches();
      }
    } catch (error) {
      console.error('Error saving match:', error);
    }
  };

  const handleEdit = (match: Match) => {
    setEditingMatchId(match.id !== undefined ? match.id : null);
    setFormData({
      date: match.date,
      time: match.time || '',
      club: match.club,
      team: match.team,
      result: match.result || '',
      status: match.status || 'Pendiente',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMatchId(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: '',
      club: '',
      team: '',
      result: '',
      status: 'Pendiente',
    });
  };

  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Adjust firstDayOfMonth to start on Monday (0=Mon, 6=Sun)
    const startOffset = (firstDayOfMonth + 6) % 7;
    
    const days = [];
    // Previous month days
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, month: month - 1, year, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, month, year, isCurrentMonth: true });
    }
    
    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, month: month + 1, year, isCurrentMonth: false });
    }
    
    return days;
  }, [currentCalendarDate]);

  const matchesByDate = useMemo(() => {
    const map: Record<string, Match[]> = {};
    matches.forEach(m => {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    });
    return map;
  }, [matches]);

  const changeMonth = (offset: number) => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + offset, 1));
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este partido?')) return;
    try {
      const response = await fetch(`/api/matches/${id}`, { method: 'DELETE' });
      if (response.ok) {
        handleCloseModal();
        fetchMatches();
      }
    } catch (error) {
      console.error('Error deleting match:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="w-full px-4 py-5 space-y-5">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2.5 rounded-2xl shadow-lg shadow-emerald-200/50">
              <Trophy className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Liga Litoral - Mariza y Arancha</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setIsCalendarOpen(true)}
              className="bg-white text-slate-600 p-3 rounded-xl font-semibold text-sm flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-sm"
              title="Calendario"
              aria-label="Calendario"
            >
              <Calendar size={20} />
            </button>
            <button
              onClick={() => setIsStatsOpen(true)}
              className="bg-white text-slate-600 p-3 rounded-xl font-semibold text-sm flex items-center justify-center hover:bg-slate-50 border border-slate-200 transition-all active:scale-95 shadow-sm"
              title="Estadísticas"
              aria-label="Estadísticas"
            >
              <BarChart3 size={20} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-slate-900 text-white p-3 rounded-xl font-semibold text-sm flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 shadow-sm ml-auto"
              title="Nuevo Partido"
              aria-label="Nuevo Partido"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-100 border-t-emerald-500"></div>
            <p className="text-slate-400 text-sm font-medium">Cargando tus partidos...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-sm">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="text-slate-300 w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">¿Aún no has jugado?</h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">Registra tus partidos de competición para llevar un control detallado de tu temporada.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-8 bg-emerald-50 text-emerald-700 px-8 py-3 rounded-2xl font-bold hover:bg-emerald-100 transition-colors"
            >
              Añadir mi primer partido
            </button>
          </div>
        ) : (
          <div className="bg-white border-y border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-slate-300" />
                        Fecha / Hora
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-slate-300" />
                        Club
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                      <div className="flex items-center gap-2">
                        <Users size={12} className="text-slate-300" />
                        Contrincantes
                      </div>
                    </th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                      <div className="flex items-center gap-2">
                        <Trophy size={12} className="text-slate-300" />
                        Resultado / Estado
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {matches.map((match, idx) => (
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={match.id}
                      onClick={() => handleEdit(match)}
                      className={`group transition-colors cursor-pointer border-b border-slate-50 ${
                        match.status === 'Ganado' 
                          ? 'bg-emerald-50/60 hover:bg-emerald-100/60' 
                          : match.status === 'Perdido' 
                            ? 'bg-rose-50/60 hover:bg-rose-100/60' 
                            : 'bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">
                            {new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </span>
                          {match.time && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                <Clock size={10} /> {match.time}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-semibold text-slate-600">{match.club}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-semibold text-slate-600">{match.team}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          {match.result ? (
                            <span className="inline-flex items-center w-fit px-3 py-1.5 rounded-xl text-xs font-black bg-slate-900 text-white shadow-sm">
                              {match.result}
                            </span>
                          ) : null}
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            match.status === 'Ganado' ? 'text-emerald-600' : 
                            match.status === 'Perdido' ? 'text-rose-600' : 'text-slate-400'
                          }`}>
                            {match.status || 'Pendiente'}
                          </span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Calendar Modal */}
      <AnimatePresence>
        {isCalendarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
            >
              <div className="px-10 pt-10 pb-6 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Calendario</h2>
                  <p className="text-slate-500 text-xs font-medium">Días con partidos resaltados</p>
                </div>
                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="p-2.5 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-800 capitalize">
                    {currentCalendarDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                      <ChevronLeft size={20} className="text-slate-600" />
                    </button>
                    <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                      <ChevronRight size={20} className="text-slate-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">
                      {d}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((dateObj, i) => {
                    const dateStr = new Date(dateObj.year, dateObj.month, dateObj.day).toISOString().split('T')[0];
                    const hasMatches = matchesByDate[dateStr];
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <div
                        key={i}
                        className={`aspect-square flex flex-col items-center justify-center rounded-2xl relative transition-all ${
                          dateObj.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'
                        } ${isToday ? 'bg-slate-100' : ''}`}
                      >
                        <span className={`text-sm font-bold ${isToday ? 'text-indigo-600' : ''}`}>
                          {dateObj.day}
                        </span>
                        {hasMatches && (
                          <div className="absolute bottom-2 flex gap-0.5">
                            {hasMatches.map((_, idx) => (
                              <div key={idx} className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                            ))}
                          </div>
                        )}
                        {hasMatches && (
                          <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-2xl" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setIsCalendarOpen(false)}
                  className="w-full mt-8 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Statistics Modal */}
      <AnimatePresence>
        {isStatsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
            >
              <div className="px-10 pt-10 pb-6 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Estadísticas</h2>
                  <p className="text-slate-500 text-xs font-medium">Resumen de tu actividad</p>
                </div>
                <button
                  onClick={() => setIsStatsOpen(false)}
                  className="p-2.5 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="p-10 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-2xl">
                      <Activity className="text-indigo-600 w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Partidos</p>
                      <p className="text-3xl font-black text-slate-900">{stats.total}</p>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                    <div className="bg-emerald-100 p-3 rounded-2xl">
                      <TrendingUp className="text-emerald-600 w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Este Mes</p>
                      <p className="text-3xl font-black text-slate-900">{stats.thisMonth}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsStatsOpen(false)}
                  className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20"
            >
              <div className="px-10 pt-10 pb-6 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {editingMatchId ? 'Editar Partido' : 'Nuevo Partido'}
                  </h2>
                  <p className="text-slate-500 text-xs font-medium">
                    {editingMatchId ? 'Modifica los datos del encuentro' : 'Completa los detalles del encuentro'}
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2.5 hover:bg-white rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 pt-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Fecha</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all bg-slate-50/50 font-medium text-slate-700"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Hora</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                        <input
                          type="time"
                          lang="es-ES"
                          value={formData.time}
                          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                          className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all bg-slate-50/50 font-medium text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Estado del Partido</label>
                    <div className="relative">
                      <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all bg-slate-50/50 font-medium text-slate-700 appearance-none"
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="Ganado">Ganado</option>
                        <option value="Perdido">Perdido</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Club / Instalación</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Padel Indoor Center"
                        value={formData.club}
                        onChange={(e) => setFormData({ ...formData, club: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all bg-slate-50/50 font-medium text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Pareja Contrincante</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <input
                        type="text"
                        required
                        placeholder="Nombres de los oponentes"
                        value={formData.team}
                        onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all bg-slate-50/50 font-medium text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2.5 ml-1">Resultado (Opcional)</label>
                    <div className="relative">
                      <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Ej. 6-4 / 6-2"
                        value={formData.result}
                        onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-100 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all bg-slate-50/50 font-medium text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  {editingMatchId !== null && (
                    <button
                      type="button"
                      onClick={() => editingMatchId !== null && handleDelete(editingMatchId)}
                      className="flex-1 bg-red-50 text-red-600 py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest hover:bg-red-100 transition-all active:scale-[0.98]"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-[2] bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98]"
                  >
                    {editingMatchId ? 'Actualizar' : 'Guardar Partido'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
