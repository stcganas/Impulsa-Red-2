import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Loader2, Trash2, Edit2, Play, Pause, ChevronDown, ChevronUp, Mail, Phone, MapPin, Calendar, Award, CheckSquare, Wallet, Users, Hash, Shield, X, AlertTriangle, Plus, RotateCcw } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  level?: number;
  plan?: string;
  referral_code?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  document_url?: string;
  document_back_url?: string;
  completedTasks?: number;
  walletBalance?: number;
  referralCount?: number;
  compliance_score?: number;
}

interface TaskData {
  id: string;
  name: string;
  day: string;
  xp: number;
  completed: boolean;
  isPenalty?: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // User Tasks State
  const [userTasks, setUserTasks] = useState<TaskData[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Edit Modal State
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editFormData, setEditFormData] = useState({ 
    name: '', 
    email: '', 
    role: '', 
    phone: '', 
    address: '',
    wallet_balance: 0,
    xp: 0
  });

  // Penalty Modal State
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [penaltyFormData, setPenaltyFormData] = useState({ name: '', xp: 50 });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Error fetching users');

      const usersData = await response.json();
      setUsers(usersData || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTasks = async (userId: string) => {
    setLoadingTasks(true);
    try {
      // Fetch all tasks
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('id');
      
      if (tasksError) throw tasksError;

      // Fetch user's completed tasks
      const { data: completedTasks, error: completedError } = await supabase
        .from('user_tasks')
        .select('task_id')
        .eq('user_id', userId);

      if (completedError) throw completedError;

      // Fetch user's penalty tasks
      const { data: penaltyTasks, error: penaltyError } = await supabase
        .from('penalty_tasks')
        .select('*')
        .eq('user_id', userId);

      if (penaltyError) throw penaltyError;

      const completedTaskIds = new Set(completedTasks?.map(ut => ut.task_id));

      const formattedTasks = (allTasks || []).map(t => ({
        id: t.id,
        name: t.name,
        day: t.day,
        xp: t.xp,
        completed: completedTaskIds.has(t.id),
        isPenalty: false
      }));

      const formattedPenaltyTasks = (penaltyTasks || []).map(pt => ({
        id: pt.id,
        name: pt.name,
        day: 'Castigo',
        xp: pt.xp,
        completed: pt.is_completed,
        isPenalty: true
      }));

      setUserTasks([...formattedTasks, ...formattedPenaltyTasks]);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleUserAction = async (id: string, action: string, data?: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      let url = `/api/admin/users/${id}`;
      let method = 'PATCH';
      let body = data;

      if (action === 'delete') {
        method = 'DELETE';
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error performing ${action}`);
      }
      
      fetchUsers();
      setIsEditMode(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error(`Error performing ${action}:`, error);
      alert(error.message || 'Error al realizar la acción');
    }
  };

  const handleResetProgress = async (userId: string) => {
    if (!confirm('¿Estás SEGURO de que deseas REINICIAR el progreso de este usuario? Esto eliminará todas sus tareas completadas, transacciones, notificaciones y pondrá su balance y XP en cero.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      console.log(`[DEBUG] Attempting POST reset-progress for user: ${userId}`);
      const response = await fetch(`/api/admin/users/${userId}/reset-progress`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`[DEBUG] Reset-progress status: ${response.status}`);
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        let errorMessage = `Error ${response.status}`;
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.details || errorMessage;
          } else {
            const textError = await response.text();
            console.error('[DEBUG] Non-JSON error:', textError);
            errorMessage = `Ruta de API no encontrada o error de servidor: ${response.status}`;
          }
        } catch (e) {
          errorMessage = `Error al procesar respuesta del servidor (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[DEBUG] Reset-progress success:', result);
      alert('El progreso del usuario ha sido reiniciado correctamente.');
      fetchUsers();
    } catch (error: any) {
      console.error('Error resetting progress:', error);
      alert(error.message || 'Error al reiniciar el progreso');
    }
  };

  const handleAddPenalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch(`/api/admin/users/${selectedUser.id}/penalty-tasks`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: penaltyFormData.name,
          xp: penaltyFormData.xp
        })
      });

      if (!response.ok) throw new Error('Error adding penalty task');
      
      alert('Tarea de castigo agregada exitosamente.');
      setIsPenaltyModalOpen(false);
      setPenaltyFormData({ name: '', xp: 50 });
    } catch (error) {
      console.error('Error adding penalty task:', error);
      alert('Error al agregar la tarea de castigo.');
    }
  };

  const filteredUsers = users.filter(u => 
    (roleFilter === 'todos' || u.role === roleFilter) &&
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleExpand = (id: string) => {
    if (expandedUserId === id) {
      setExpandedUserId(null);
      setUserTasks([]);
    } else {
      setExpandedUserId(id);
      fetchUserTasks(id);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Usuarios</h2>
          <div className="bg-white dark:bg-white/5 px-4 py-2 rounded-full border border-slate-200 dark:border-white/5 flex items-center gap-2 w-64 focus-within:border-emerald-500/50 transition-colors">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none text-slate-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['todos', 'admin', 'user', 'leader', 'referral'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-all ${
                roleFilter === role 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className={`bg-white dark:bg-[#111] border transition-all duration-300 overflow-hidden ${
                expandedUserId === user.id 
                  ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5 rounded-2xl' 
                  : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-xl'
              }`}
            >
              {/* Collapsed Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleExpand(user.id)}
              >
                <div className="flex items-center gap-4">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-slate-200 dark:border-white/5 flex items-center justify-center text-emerald-500 font-bold text-lg">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                      {user.name || 'Usuario Sin Nombre'}
                      {user.role === 'admin' && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {user.id.substring(0, 8)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {user.status || 'active'}
                  </div>
                  <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5">
                    {expandedUserId === user.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedUserId === user.id && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-black/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                    
                    {/* Personal Info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Información Personal</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Email</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Teléfono</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.phone || 'No especificado'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Dirección</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.address || 'No especificada'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Platform Stats */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estadísticas</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Award className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Nivel</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">Nivel {user.level || 1} ({user.plan || 'Free'})</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckSquare className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Tareas Completadas</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.completedTasks || 0} tareas</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Wallet className="w-4 h-4 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Saldo de Billetera</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{formatCurrency(user.walletBalance || 0)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Award className="w-4 h-4 text-indigo-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Puntaje de Cumplimiento</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.compliance_score || 100}%</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles de Cuenta</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Fecha de Registro</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{formatDate(user.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Users className="w-4 h-4 text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Referidos</p>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.referralCount || 0} usuarios</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Hash className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Código de Referencia</p>
                            <p className="text-sm font-mono bg-slate-200 dark:bg-white/5 px-2 py-0.5 rounded mt-0.5 text-slate-900 dark:text-white">{user.referral_code || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Document Verification */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Documentos de Identidad</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Frente</p>
                          {user.document_url ? (
                            <a href={user.document_url} target="_blank" rel="noreferrer" className="block aspect-[3/2] rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group">
                              <img src={user.document_url} alt="Frente Documento" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </a>
                          ) : (
                            <div className="aspect-[3/2] rounded-lg bg-slate-100 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center">
                              <span className="text-[9px] text-slate-400 font-bold">No cargado</span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Reverso</p>
                          {user.document_back_url ? (
                            <a href={user.document_back_url} target="_blank" rel="noreferrer" className="block aspect-[3/2] rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group">
                              <img src={user.document_back_url} alt="Reverso Documento" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </a>
                          ) : (
                            <div className="aspect-[3/2] rounded-lg bg-slate-100 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center">
                              <span className="text-[9px] text-slate-400 font-bold">No cargado</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* User Tasks */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/5">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-emerald-500" />
                      Estado de Tareas Semanales
                    </h4>
                    
                    {loadingTasks ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      </div>
                    ) : userTasks.length === 0 ? (
                      <p className="text-sm text-slate-500">No hay tareas configuradas.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userTasks.map(task => (
                          <div key={task.id} className={`flex items-center justify-between p-3 rounded-xl border ${task.completed ? 'bg-emerald-500/10 border-emerald-500/20' : task.isPenalty ? 'bg-red-500/10 border-red-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${task.completed ? 'bg-emerald-500 text-white' : task.isPenalty ? 'bg-red-100 dark:bg-red-900/30 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                                {task.isPenalty ? <AlertTriangle className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className={`text-sm font-medium ${task.completed ? 'text-emerald-600 dark:text-emerald-400' : task.isPenalty ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>{task.name}</p>
                                <p className="text-[10px] text-slate-500">{task.isPenalty ? 'Tarea de Castigo' : `Día ${task.day}`} • {task.xp} XP</p>
                              </div>
                            </div>
                            {!task.completed && !task.isPenalty && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setPenaltyFormData({ name: `Castigo por: ${task.name}`, xp: 50 });
                                  setIsPenaltyModalOpen(true);
                                }}
                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Castigo
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 flex flex-wrap gap-3 justify-end">
                    <button 
                      onClick={() => {
                        setSelectedUser(user);
                        setIsPenaltyModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors"
                    >
                      <AlertTriangle className="w-4 h-4" /> Agregar Castigo
                    </button>

                    <button 
                      onClick={() => { 
                        setSelectedUser(user); 
                        setIsEditMode(true); 
                        setEditFormData({ 
                          name: user.name || '', 
                          email: user.email || '', 
                          role: user.role || 'user',
                          phone: user.phone || '',
                          address: user.address || '',
                          wallet_balance: user.walletBalance || 0,
                          xp: (user as any).xp || 0
                        }); 
                      }} 
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors text-slate-700 dark:text-slate-300"
                    >
                      <Edit2 className="w-4 h-4 text-blue-500 dark:text-blue-400" /> Editar
                    </button>
                    
                    <button 
                      onClick={() => handleUserAction(user.id, 'update', { status: user.status === 'active' ? 'paused' : 'active' })} 
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors text-slate-700 dark:text-slate-300"
                    >
                      {user.status === 'active' ? (
                        <><Pause className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Pausar</>
                      ) : (
                        <><Play className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Activar</>
                      )}
                    </button>

                    <button 
                      onClick={() => handleResetProgress(user.id)} 
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 rounded-lg text-sm font-medium transition-colors"
                      title="Reiniciar Progreso (Cero Actividades)"
                    >
                      <RotateCcw className="w-4 h-4" /> Reiniciar Progreso
                    </button>
                    
                    <button 
                      onClick={() => { if(confirm('¿Estás seguro de que deseas eliminar este usuario permanentemente?')) handleUserAction(user.id, 'delete') }} 
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/5">
              <p className="text-slate-500">No se encontraron usuarios que coincidan con la búsqueda.</p>
            </div>
          )}
        </div>
      )}

      {/* Penalty Modal */}
      {isPenaltyModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/10 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6" />
                Agregar Tarea de Castigo
              </h3>
              <button onClick={() => setIsPenaltyModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Asignar una tarea de castigo a <strong className="text-slate-900 dark:text-white">{selectedUser.name}</strong> por incumplimiento.
            </p>

            <form onSubmit={handleAddPenalty} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Nombre de la Tarea de Castigo</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-red-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={penaltyFormData.name} 
                  onChange={e => setPenaltyFormData({...penaltyFormData, name: e.target.value})} 
                  placeholder="Ej: Ver 3 videos educativos extra" 
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Experiencia (XP) a recuperar</label>
                <input 
                  type="number"
                  min="0"
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-red-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={penaltyFormData.xp} 
                  onChange={e => setPenaltyFormData({...penaltyFormData, xp: parseInt(e.target.value)})} 
                  placeholder="Ej: 50" 
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsPenaltyModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white transition-colors"
                >
                  Asignar Castigo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditMode && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/10 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">Editar Usuario</h3>
              <button onClick={() => setIsEditMode(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Nombre Completo</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                  placeholder="Nombre" 
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Correo Electrónico</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white opacity-50" 
                  value={editFormData.email} 
                  onChange={e => setEditFormData({...editFormData, email: e.target.value})} 
                  placeholder="Email" 
                  disabled
                />
                <p className="text-[10px] text-slate-500 mt-1 ml-1">El correo no se puede modificar por seguridad.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 ml-1 mb-1 block">Teléfono</label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                    value={editFormData.phone} 
                    onChange={e => setEditFormData({...editFormData, phone: e.target.value})} 
                    placeholder="Teléfono" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 ml-1 mb-1 block">Rol</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors appearance-none text-slate-900 dark:text-white" 
                    value={editFormData.role} 
                    onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                  >
                    <option value="user" className="bg-white dark:bg-[#111]">User</option>
                    <option value="admin" className="bg-white dark:bg-[#111]">Admin</option>
                    <option value="leader" className="bg-white dark:bg-[#111]">Leader</option>
                    <option value="referral" className="bg-white dark:bg-[#111]">Referral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 ml-1 mb-1 block">Saldo Billetera ($)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                    value={editFormData.wallet_balance} 
                    onChange={e => setEditFormData({...editFormData, wallet_balance: parseFloat(e.target.value) || 0})} 
                    placeholder="0" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 ml-1 mb-1 block">Experiencia (XP)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                    value={editFormData.xp} 
                    onChange={e => setEditFormData({...editFormData, xp: parseInt(e.target.value) || 0})} 
                    placeholder="0" 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Dirección</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={editFormData.address} 
                  onChange={e => setEditFormData({...editFormData, address: e.target.value})} 
                  placeholder="Dirección completa" 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsEditMode(false)} 
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl font-bold transition-colors text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleUserAction(selectedUser.id, 'update', editFormData)} 
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
