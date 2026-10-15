import { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { Loader2, TrendingUp, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface ChartData {
  date: string;
  amount: number;
}

export default function AdvancedStats() {
  const { user } = useUser();
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPeriod, setTotalPeriod] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        const { data: transactions, error } = await supabase
          .from('transactions')
          .select('amount, created_at')
          .eq('user_id', user.id)
          .eq('type', 'referral_commission')
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Process data for the chart (group by day)
        const groupedData: { [key: string]: number } = {};
        let total = 0;

        transactions?.forEach(t => {
          const date = new Date(t.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
          groupedData[date] = (groupedData[date] || 0) + t.amount;
          total += t.amount;
        });

        const chartData = Object.entries(groupedData).map(([date, amount]) => ({
          date,
          amount
        }));

        setData(chartData);
        setTotalPeriod(total);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center bg-white dark:bg-[#111] rounded-3xl border border-slate-100 dark:border-white/5">
        <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Estadísticas Avanzadas</h3>
        <p className="text-slate-500 dark:text-slate-400">Aún no tienes suficientes datos para generar gráficos.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-white/5"
    >
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Rendimiento de Ganancias
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tus comisiones en los últimos días</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Periodo</p>
          <p className="text-xl font-black text-emerald-600">${totalPeriod.toLocaleString('es-CO')}</p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e293b', 
                border: 'none', 
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`$${value.toLocaleString('es-CO')}`, 'Ganancia']}
            />
            <Area 
              type="monotone" 
              dataKey="amount" 
              stroke="#2563eb" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorAmount)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
