import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Users, Target, Trophy, Sparkles, Zap, Gift, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

interface SquadQuestsWidgetProps {
  userId?: string;
  className?: string;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  currentXP: number;
  targetXP: number;
  rewardXP: number;
  icon: any;
  color: string;
}

export function SquadQuestsWidget({ userId, className }: SquadQuestsWidgetProps) {
  const [claimedQuests, setClaimedQuests] = useState<Record<string, boolean>>({});
  const [teamMemberCount, setTeamMemberCount] = useState<number>(0);
  const [weeklyTeamXP, setWeeklyTeamXP] = useState<number>(3450); // Live fallback simulation

  useEffect(() => {
    if (!userId) return;

    const fetchTeamStats = async () => {
      try {
        // Fetch count of referrals
        const { count } = await supabase
          .from("referrals")
          .select("id", { count: "exact" })
          .eq("referrer_id", userId);

        if (count !== null) {
          setTeamMemberCount(count);
          // Calculate simulated weekly XP based on active team count
          setWeeklyTeamXP(Math.max(1200, count * 1450));
        }
      } catch (e) {
        console.error("Error fetching squad quest stats:", e);
      }
    };

    fetchTeamStats();
  }, [userId]);

  const quests: Quest[] = [
    {
      id: "quest_team_10k",
      title: "Desafío Semanal de Red",
      description: "Acumular 10,000 XP en equipo durante la semana actual.",
      currentXP: weeklyTeamXP,
      targetXP: 10000,
      rewardXP: 500,
      icon: Zap,
      color: "from-blue-500 to-indigo-600",
    },
    {
      id: "quest_expand_squad",
      title: "Expansión de Escuadra",
      description: "Reclutar a 3 nuevos emprendedores directos activos.",
      currentXP: teamMemberCount,
      targetXP: 3,
      rewardXP: 750,
      icon: Users,
      color: "from-amber-500 to-orange-600",
    },
  ];

  const handleClaim = (questId: string, rewardXP: number) => {
    setClaimedQuests((prev) => ({ ...prev, [questId]: true }));
    toast.success(`¡Recompensa de Escuadra Reclamada! +${rewardXP} XP sumados a tu perfil.`);
  };

  return (
    <div className={cn("bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-100 dark:border-white/5", className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                Misiones Colaborativas de Equipo
              </h3>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Squad Quests
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unete con tus referidos para cumplir metas semanales y ganar XP extra.
            </p>
          </div>
        </div>
      </div>

      {/* Quest Cards */}
      <div className="space-y-4">
        {quests.map((quest) => {
          const progressPercent = Math.min(100, Math.round((quest.currentXP / quest.targetXP) * 100));
          const isCompleted = quest.currentXP >= quest.targetXP;
          const isClaimed = claimedQuests[quest.id];
          const QuestIcon = quest.icon;

          return (
            <div
              key={quest.id}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className={cn("p-2.5 rounded-xl bg-gradient-to-br text-white shadow-md shrink-0 mt-0.5", quest.color)}>
                    <QuestIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{quest.title}</span>
                      <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                        +{quest.rewardXP} XP
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {quest.description}
                    </p>
                  </div>
                </div>

                {isCompleted ? (
                  <button
                    type="button"
                    disabled={isClaimed}
                    onClick={() => handleClaim(quest.id, quest.rewardXP)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5",
                      isClaimed
                        ? "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20 cursor-pointer"
                    )}
                  >
                    {isClaimed ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reclamado</span>
                      </>
                    ) : (
                      <>
                        <Gift className="w-3.5 h-3.5" />
                        <span>Reclamar +{quest.rewardXP} XP</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-white/10 px-2.5 py-1 rounded-lg shrink-0">
                    {quest.currentXP.toLocaleString()} / {quest.targetXP.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
