import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Target, 
  Calendar, 
  Users, 
  Info,
  ShieldCheck,
  Zap,
  BarChart3,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend
} from 'recharts';

export default function AppLogicProjection() {
  const [xpPerDailyTask, setXpPerDailyTask] = useState(100);
  const [dailyTasksCount, setDailyTasksCount] = useState(7);
  const [xpPerWeeklyTask, setXpPerWeeklyTask] = useState(1000);
  const [maxReferralCommission, setMaxReferralCommission] = useState(70); // 70%
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  const [referralCount, setReferralCount] = useState(10);
  const [selectedPlanValue, setSelectedPlanValue] = useState(15000);

  // Local states for inputs to allow smooth editing
  const [xpInput, setXpInput] = useState((100 * 7).toString());
  const [refInput, setRefInput] = useState("10");
  const [weeklyBonusInput, setWeeklyBonusInput] = useState("1000");

  const planValues = [15000, 30000, 60000, 120000];

  const getBasePercentage = (value: number) => {
    switch (value) {
      case 15000: return 5;
      case 30000: return 10;
      case 60000: return 15;
      case 120000: return 20;
      default: return 5;
    }
  };

  const projection = useMemo(() => {
    const levels = [];
    const dailyXp = xpPerDailyTask * dailyTasksCount;
    const weeklyXp = dailyXp * 7 + xpPerWeeklyTask;
    
    let totalXpAccumulated = 0;
    let weeksSpent = 0;

    const baseForPlan = getBasePercentage(selectedPlanValue);

    for (let i = 1; i <= 100; i++) {
      // Curva de dificultad
      const xpToNextLevel = Math.round(1000 * Math.pow(1.05, i - 1));
      totalXpAccumulated += xpToNextLevel;
      
      const weeksToCompleteLevel = xpToNextLevel / weeklyXp;
      weeksSpent += weeksToCompleteLevel;

      // Comisión escalada de base% a 70% linealmente (Nivel 1 al 100)
      // Usamos (i-1)/99 para que en nivel 1 sea exactamente la base
      let commission = baseForPlan + ((maxReferralCommission - baseForPlan) * ((i - 1) / 99));
      
      // Bonus de Líder: se lleva 5 puntos adicionales (le quita a la plataforma)
      if (isGroupLeader) {
        commission += 5;
      }

      const platformShare = Math.max(0, 100 - commission);
      const monthlyEarnings = referralCount * selectedPlanValue * (commission / 100);

      levels.push({
        level: i,
        xpRequired: xpToNextLevel,
        totalXp: totalXpAccumulated,
        weeksTotal: Math.round(weeksSpent * 10) / 10,
        monthsTotal: Math.round((weeksSpent / 4.33) * 10) / 10,
        commission: Math.round(commission * 10) / 10,
        platformShare: Math.round(platformShare * 10) / 10,
        monthlyEarnings: Math.round(monthlyEarnings)
      });
    }

    return {
      levels,
      weeklyXp,
      totalXpTo100: totalXpAccumulated,
      totalWeeks: Math.round(weeksSpent),
      totalMonths: Math.round(weeksSpent / 4.33),
      baseForPlan
    };
  }, [xpPerDailyTask, dailyTasksCount, xpPerWeeklyTask, maxReferralCommission, isGroupLeader, referralCount, selectedPlanValue]);

  const handleXpChange = (val: string) => {
    setXpInput(val);
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      setXpPerDailyTask(Math.round(num / dailyTasksCount));
    }
  };

  const handleRefChange = (val: string) => {
    setRefInput(val);
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0) {
      setReferralCount(num);
    }
  };

  const handleWeeklyBonusChange = (val: string) => {
    setWeeklyBonusInput(val);
    const num = parseInt(val);
    if (!isNaN(num) && num >= 0) {
      setXpPerWeeklyTask(num);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-emerald-500" />
            Simulador de Lógica App
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Proyección de niveles, comisiones y rentabilidad (Niveles 1-100).</p>
        </div>
      </div>

      {/* Controles del Simulador */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111] p-6 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Briefcase className="w-5 h-5 text-blue-500" />
            Plan y Referidos
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Referidos Activos</label>
                <input 
                  type="number"
                  value={refInput}
                  onChange={e => handleRefChange(e.target.value)}
                  onBlur={() => {
                    if (refInput === "" || parseInt(refInput) < 1) {
                      setRefInput("1");
                      setReferralCount(1);
                    }
                  }}
                  className="w-20 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-blue-500 outline-none focus:border-blue-500"
                />
              </div>
              <input 
                type="range" min="1" max="2000" step="5" 
                value={referralCount} 
                onChange={e => {
                  setReferralCount(parseInt(e.target.value));
                  setRefInput(e.target.value);
                }}
                className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Valor Suscripción (COP)</label>
              <div className="grid grid-cols-2 gap-2">
                {planValues.map(v => (
                  <button
                    key={v}
                    onClick={() => setSelectedPlanValue(v)}
                    className={`py-3 px-2 rounded-2xl text-xs font-bold transition-all border flex flex-col items-center gap-1 ${
                      selectedPlanValue === v 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                        : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-blue-500'
                    }`}
                  >
                    <span>${(v/1000).toFixed(0)}k</span>
                    <span className={`text-[10px] ${selectedPlanValue === v ? 'text-blue-100' : 'text-slate-400'}`}>
                      {getBasePercentage(v)}% Base
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] p-6 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Estatus de Liderazgo
          </h3>
          <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Líder de Grupo</p>
              <p className="text-[10px] text-emerald-500/70">+5% Bonus (del 30% Admin)</p>
            </div>
            <button
              onClick={() => setIsGroupLeader(!isGroupLeader)}
              className={`w-12 h-6 rounded-full transition-all relative ${isGroupLeader ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/10'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isGroupLeader ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <div className="space-y-3">
             <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                <span>Reparto Nivel 100</span>
             </div>
             <div className="h-4 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${isGroupLeader ? 75 : 70}%` }} />
                <div className="h-full bg-slate-300 dark:bg-white/20 transition-all duration-500" style={{ width: `${isGroupLeader ? 25 : 30}%` }} />
             </div>
             <div className="flex justify-between text-[10px] font-bold uppercase">
                <span className="text-blue-500">Usuario {isGroupLeader ? '75%' : '70%'}</span>
                <span className="text-slate-400">Plataforma {isGroupLeader ? '25%' : '30%'}</span>
             </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] p-6 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-sm space-y-6">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Zap className="w-5 h-5 text-amber-500" />
            Meta XP Semanal
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">XP Diaria (Tareas)</label>
                <input 
                  type="number"
                  value={xpInput}
                  onChange={e => handleXpChange(e.target.value)}
                  onBlur={() => {
                    const num = parseInt(xpInput);
                    if (xpInput === "" || isNaN(num) || num < 50) {
                      const fallback = 50;
                      setXpInput(fallback.toString());
                      setXpPerDailyTask(Math.round(fallback / dailyTasksCount));
                    } else if (num > 1000) {
                      const fallback = 1000;
                      setXpInput(fallback.toString());
                      setXpPerDailyTask(Math.round(fallback / dailyTasksCount));
                    }
                  }}
                  className="w-20 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-amber-500 outline-none focus:border-amber-500"
                />
              </div>
              <input 
                type="range" min="50" max="1000" step="10" 
                value={xpPerDailyTask * dailyTasksCount} 
                onChange={e => {
                  const totalDaily = parseInt(e.target.value);
                  setXpPerDailyTask(Math.round(totalDaily / dailyTasksCount));
                  setXpInput(totalDaily.toString());
                }}
                className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">XP Extra (Semanal)</label>
                <input 
                  type="number"
                  value={weeklyBonusInput}
                  onChange={e => handleWeeklyBonusChange(e.target.value)}
                  onBlur={() => {
                    if (weeklyBonusInput === "" || isNaN(parseInt(weeklyBonusInput))) {
                      setWeeklyBonusInput("0");
                      setXpPerWeeklyTask(0);
                    }
                  }}
                  className="w-20 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs font-bold text-amber-500 outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
               <div className="flex justify-between items-center mb-1">
                 <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase">Total Semanal (7 Días)</p>
                 <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full">Meta de XP</span>
               </div>
               <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-500">
                  {projection.weeklyXp.toLocaleString()} <span className="text-sm">XP</span>
               </p>
               <p className="text-[10px] text-amber-500/70 mt-1 italic">*Basado en ciclo de 7 días exactos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tiempo al Nv. 100', value: `${projection.totalMonths} meses`, icon: Calendar, color: 'text-purple-500' },
          { label: 'Máx % Comisión', value: `${isGroupLeader ? 75 : 70}%`, icon: ShieldCheck, color: 'text-blue-500' },
          { label: 'Ganancia Mes (Base)', value: `$${projection.levels[0].monthlyEarnings.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
          { label: 'Ganancia Mes (Nv 100)', value: `$${projection.levels[99].monthlyEarnings.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-500' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-[#111] p-6 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-sm transition-transform hover:scale-[1.02]">
            <div className={`p-2 rounded-xl bg-slate-50 dark:bg-white/5 w-fit mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
            <p className="text-xl font-extrabold dark:text-white leading-tight">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#111] p-8 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="font-extrabold mb-8 text-slate-800 dark:text-white flex items-center gap-2">
             <DollarSign className="w-5 h-5 text-blue-500" />
             Evolución de Ingresos Mensuales ($)
          </h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projection.levels.filter(l => l.level % 5 === 0)}>
                   <defs>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                         <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" strokeOpacity={0.05} />
                   <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                   <YAxis hide />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '16px' }}
                      itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                   />
                   <Area type="monotone" dataKey="monthlyEarnings" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorEarnings)" />
                </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111] p-8 rounded-[32px] border border-slate-200 dark:border-white/10 shadow-sm">
          <h3 className="font-extrabold mb-8 text-slate-800 dark:text-white flex items-center gap-2">
             <Info className="w-5 h-5 text-emerald-500" />
             Distribución de Ganancias (%)
          </h3>
          <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projection.levels.filter(l => l.level % 10 === 0)}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" strokeOpacity={0.05} />
                   <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                   <YAxis tick={{ fontSize: 10, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} />
                   <Legend verticalAlign="top" height={36}/>
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '16px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                   />
                   <Bar dataKey="commission" fill="#10b981" radius={[8, 8, 0, 0]} name="Usuario" />
                   <Bar dataKey="platformShare" fill="#475569" radius={[8, 8, 0, 0]} name="Plataforma" />
                </BarChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-[#111] rounded-[40px] border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-center sm:bg-slate-50/50">
           <h3 className="font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Hoja de Ruta: Niveles 1-100
           </h3>
           <div className="text-[10px] font-bold text-slate-400 flex items-center gap-4">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> XP Creciente</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Ganancia Creciente</span>
           </div>
        </div>
        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                 <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-white/5">
                    <th className="px-8 py-6">Fase Nivel</th>
                    <th className="px-8 py-6">Comisión</th>
                    <th className="px-8 py-6">Plataforma</th>
                    <th className="px-8 py-6">Semanas Tot.</th>
                    <th className="px-8 py-6">Meses Tot.</th>
                    <th className="px-8 py-6 text-right font-black">Ganancia Mensual</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                 {[1, 10, 25, 50, 75, 100].map(lv => {
                    const d = projection.levels[lv-1];
                    return (
                       <tr key={lv} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-8 py-6 font-extrabold text-slate-900 dark:text-white">Nivel {lv}</td>
                          <td className="px-8 py-6">
                             <div className="flex items-center gap-2">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">{d.commission}%</span>
                                <div className="hidden sm:block h-1.5 w-16 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                   <div className="h-full bg-blue-500" style={{ width: `${d.commission}%` }} />
                                </div>
                             </div>
                          </td>
                          <td className="px-8 py-6 text-slate-500 font-medium">{d.platformShare}%</td>
                          <td className="px-8 py-6 text-slate-500 font-medium">{d.weeksTotal}</td>
                          <td className="px-8 py-6 font-bold text-slate-900 dark:text-white">{Math.ceil(d.monthsTotal)} Meses</td>
                          <td className="px-8 py-6 text-right font-black text-emerald-600 dark:text-emerald-500 text-lg">
                             ${d.monthlyEarnings.toLocaleString()}
                          </td>
                       </tr>
                    )
                 })}
              </tbody>
           </table>
        </div>
      </div>

      <div className="p-8 bg-blue-600/5 border border-blue-600/10 rounded-[40px] flex gap-6 items-start">
         <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-600/20">
            <Info className="w-6 h-6" />
         </div>
         <div>
            <h4 className="text-lg font-bold text-blue-900 dark:text-blue-400 mb-2">Regla de Distribución (Nivel 100)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <p className="text-sm text-blue-800/70 dark:text-blue-300 leading-relaxed">
                  Al alcanzar el <strong>Nivel 100</strong>, el usuario recibe el <strong>70%</strong> del valor de la suscripción de sus referidos, mientras que la plataforma retiene el 30% para sostenibilidad.
               </p>
               <p className="text-sm text-blue-800/70 dark:text-blue-300 leading-relaxed">
                  Los <strong>Líderes de Grupo</strong> obtienen un beneficio preferencial del 5%, alcanzando un <strong>75% de comisión</strong> y dejando a la plataforma con un 25% final.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}
