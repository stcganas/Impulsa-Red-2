import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  TrendingUp, 
  Award, 
  UserPlus, 
  Shield, 
  MessageSquare, 
  Target, 
  Lock, 
  Share2, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  Zap, 
  ArrowUpRight,
  Sparkles,
  Phone,
  Send,
  X
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useFeatures } from '../contexts/FeatureContext';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { AchievementShareCardModal } from '../components/viral/AchievementShareCardModal';
import { SquadQuestsWidget } from '../components/viral/SquadQuestsWidget';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  level: number;
  plan: string;
  status: string;
  created_at: string;
  xp?: number;
  is_tasks_active?: boolean;
  networkLevel?: number;
}

interface TeamStats {
  leaderLevel: string;
  activeDirects: number;
  totalDirects: number;
  totalEarnings: number;
  teamMembers: TeamMember[];
}

export default function TeamPanel() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getUserFeature } = useFeatures();
  const [stats, setStats] = useState<TeamStats>({
    leaderLevel: user?.leader_level || 'Promotor',
    activeDirects: 0,
    totalDirects: 0,
    totalEarnings: user?.totalEarned || 0,
    teamMembers: []
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<'all' | 1 | 2 | 3>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modals
  const [showShareCardModal, setShowShareCardModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeReward, setChallengeReward] = useState('500');

  const canCreateTeam = getUserFeature('can_create_team');
  const commissionLevel2 = getUserFeature('commission_level_2');
  const commissionLevel3 = getUserFeature('commission_level_3');

  const isProOrElite = 
    user?.plan?.toLowerCase().includes('pro') || 
    user?.plan?.toLowerCase().includes('élite') || 
    user?.plan?.toLowerCase().includes('elite') || 
    user?.plan?.toLowerCase().includes('avanzado') ||
    user?.role === 'admin' ||
    (user?.level && user.level >= 10);

  const hasAccess = canCreateTeam === true || isProOrElite;

  const inviteUrl = `${window.location.origin}/invite/${user?.referral_code || ''}`;

  useEffect(() => {
    const fetchTeamStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/team/summary', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStats({
            leaderLevel: data.leaderLevel || user?.leader_level || 'Promotor',
            activeDirects: data.activeDirects || 0,
            totalDirects: data.totalDirects || 0,
            totalEarnings: data.totalEarnings || user?.totalEarned || 0,
            teamMembers: Array.isArray(data.teamMembers) ? data.teamMembers : []
          });
        }
      } catch (error) {
        console.error("Error fetching team stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, [user]);

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('¡Enlace de líder copiado al portapapeles!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendBroadcast = () => {
    if (!broadcastMessage.trim()) {
      toast.error('Por favor escribe un mensaje para tu equipo');
      return;
    }
    
    // Open WhatsApp Web with broadcast template
    const text = encodeURIComponent(`📢 *COMUNICADO DE TU LÍDER (${user?.name})*:\n\n${broadcastMessage}\n\n👉 Accede a la plataforma aquí: ${inviteUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setShowMessageModal(false);
    setBroadcastMessage('');
    toast.success('Mensaje preparado en WhatsApp para compartir con tu equipo');
  };

  const handleAssignChallenge = () => {
    if (!challengeTitle.trim()) {
      toast.error('Por favor escribe el nombre del reto');
      return;
    }

    const text = encodeURIComponent(`🎯 *NUEVO RETO DE EQUIPO*: "${challengeTitle}"\n\n🏆 Recompensa: +${challengeReward} XP\n👤 Asignado por tu líder: ${user?.name}\n\n¡Ingresa a completar tus tareas diarias y subir en el ranking!\n👉 ${inviteUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    setShowChallengeModal(false);
    setChallengeTitle('');
    toast.success('¡Reto creado y listo para compartir!');
  };

  const filteredMembers = stats.teamMembers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = filterLevel === 'all' || (m.networkLevel || 1) === filterLevel;
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && m.is_tasks_active) || 
                          (filterStatus === 'inactive' && !m.is_tasks_active);
    return matchesSearch && matchesLevel && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-6 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">
          Cargando Panel de Liderazgo...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24">
      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-emerald-600/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Nivel {stats.leaderLevel}
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              Panel de Líder
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestiona tu red, motiva a tus referidos y multiplica tus ingresos.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 -mt-16 relative z-20 mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#111] p-5 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-2 text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">
              Equipo Total
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {stats.teamMembers.length}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ({stats.activeDirects} VIP)
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#111] p-5 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-white/5"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-0.5">
              Ganancias Red
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">
              ${stats.totalEarnings.toLocaleString('es-CO')}
            </p>
          </motion.div>
        </div>

        {/* Quick Link Card */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg shadow-emerald-600/20 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-200" />
              <span className="font-bold text-sm">Tu Enlace de Afiliación de Líder</span>
            </div>
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-mono">
              {user?.referral_code || 'IMPULSA'}
            </span>
          </div>
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md rounded-2xl p-2 pl-3">
            <p className="text-xs text-emerald-100 truncate flex-1 font-mono">
              {inviteUrl}
            </p>
            <button
              onClick={copyInviteLink}
              className="px-4 py-2 bg-white text-emerald-800 rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-50 active:scale-95 transition-all shadow-md shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowShareCardModal(true)}
            className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-2 transition-all cursor-pointer mt-1"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generar y Compartir Tarjeta de Logro en Redes</span>
          </button>
        </div>

        {/* Squad Quests Widget */}
        <SquadQuestsWidget userId={user?.id} />
      </div>

      {!hasAccess ? (
        <div className="px-6">
          <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 bg-slate-200 dark:bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Herramientas de Líder</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              Desbloquea la gestión multicanal de equipo, retos personalizados y comisiones de hasta 3 niveles de profundidad con los planes Pro o Élite.
            </p>
            <button 
              onClick={() => navigate("/plan-selection")}
              className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
            >
              Activar Plan de Líder
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 space-y-6">
          {/* Multi-level Info */}
          {(commissionLevel2 || commissionLevel3 || isProOrElite) && (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-lg shadow-blue-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Red Multinivel Activa</p>
                  <p className="font-bold text-sm">
                    Recibes comisiones hasta Línea {commissionLevel3 || user?.plan?.toLowerCase().includes('élite') ? '3 (25%)' : '2 (50%)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Leader Action Tools */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" /> Herramientas de Activación
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setShowMessageModal(true)}
                className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-emerald-500/50 active:scale-[0.98] transition-all text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-white">Mensaje al Equipo</span>
                <span className="text-[10px] text-slate-400">Difusión WhatsApp</span>
              </button>

              <button 
                onClick={() => setShowChallengeModal(true)}
                className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex flex-col items-center justify-center gap-2 hover:border-blue-500/50 active:scale-[0.98] transition-all text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Target className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-white">Lanzar Reto</span>
                <span className="text-[10px] text-slate-400">Premia con XP extra</span>
              </button>
            </div>
          </div>

          {/* Team List & Filters */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Miembros de tu Red ({filteredMembers.length})
              </h2>
            </div>

            {/* Filters Bar */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar miembro por nombre o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setFilterLevel('all')}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    filterLevel === 'all' 
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' 
                      : 'bg-white dark:bg-[#111] text-slate-500 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  Todas las Líneas
                </button>
                <button
                  onClick={() => setFilterLevel(1)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    filterLevel === 1 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white dark:bg-[#111] text-slate-500 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  Línea 1 (Directos)
                </button>
                <button
                  onClick={() => setFilterLevel(2)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    filterLevel === 2 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white dark:bg-[#111] text-slate-500 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  Línea 2
                </button>
                <button
                  onClick={() => setFilterLevel(3)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    filterLevel === 3 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white dark:bg-[#111] text-slate-500 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  Línea 3
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3">
              {filteredMembers.map((member) => {
                const isPlanActive = member.plan && member.plan.toLowerCase() !== 'básico' && member.plan.toLowerCase() !== 'gratis' && member.plan.toLowerCase() !== 'free';
                const isDoingTasks = member.is_tasks_active;

                return (
                  <div 
                    key={member.id} 
                    className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex flex-col gap-3 transition-all hover:border-slate-300 dark:hover:border-white/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-sm shadow-inner">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                            {member.name}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                              (member.networkLevel || 1) === 1 
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' 
                                : (member.networkLevel || 1) === 2 
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
                            }`}>
                              Línea {member.networkLevel || 1}
                            </span>
                          </p>
                          <p className="text-xs text-slate-400">
                            Nivel {member.level || 1} • Plan {member.plan || 'Básico'}
                          </p>
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                        isPlanActive 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {isPlanActive ? `Plan ${member.plan}` : 'Básico'}
                      </div>
                    </div>
                    
                    {/* Activity Row */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isDoingTasks ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-amber-400'}`} />
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {isDoingTasks ? 'Tareas Activas hoy' : 'Sin tareas hoy'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> {member.xp || 0} XP
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredMembers.length === 0 && (
                <div className="text-center py-10 bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5 p-6">
                  <UserPlus className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-900 dark:text-white font-bold mb-1">
                    {searchTerm ? 'No se encontraron miembros' : 'Aún no tienes referidos en tu red'}
                  </p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                    Comparte tu enlace de líder en tus redes sociales y WhatsApp para empezar a formar tu equipo.
                  </p>
                  <button
                    onClick={copyInviteLink}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all inline-flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Enlace
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Message Modal */}
      <AnimatePresence>
        {showMessageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#111] rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowMessageModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Mensaje de Líder</h3>
                  <p className="text-xs text-slate-500">Envía un comunicado directo a tu equipo</p>
                </div>
              </div>

              <textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Ejemplo: ¡Equipo! Recuerden completar las tareas de hoy para asegurar su bono de temporada..."
                className="w-full p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4 resize-none"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendBroadcast}
                  className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl text-sm hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-4 h-4" /> Compartir en WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Launch Challenge Modal */}
      <AnimatePresence>
        {showChallengeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#111] rounded-3xl p-6 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowChallengeModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lanzar Reto de Red</h3>
                  <p className="text-xs text-slate-500">Incentiva a tu red con metas claras</p>
                </div>
              </div>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Título del Reto
                  </label>
                  <input
                    type="text"
                    value={challengeTitle}
                    onChange={(e) => setChallengeTitle(e.target.value)}
                    placeholder="Ej: Completar 5 días seguidos de tareas"
                    className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Recompensa en XP
                  </label>
                  <select
                    value={challengeReward}
                    onChange={(e) => setChallengeReward(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="250">+250 XP (Bono Rápido)</option>
                    <option value="500">+500 XP (Reto Estándar)</option>
                    <option value="1000">+1.000 XP (Reto Titán)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowChallengeModal(false)}
                  className="flex-1 py-3 text-slate-600 dark:text-slate-400 font-bold rounded-xl text-sm hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignChallenge}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Send className="w-4 h-4" /> Publicar Reto
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Achievement Share Card Modal */}
      {user && (
        <AchievementShareCardModal
          isOpen={showShareCardModal}
          onClose={() => setShowShareCardModal(false)}
          user={user}
        />
      )}
    </div>
  );
}
