import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DollarSign, CheckCircle, XCircle, Loader2, Search, Filter, ExternalLink, Eye } from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  commission: number;
  type: string;
  status: string;
  created_at: string;
  receipt_url?: string;
  users?: {
    name: string;
    email: string;
  };
}

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [targetTx, setTargetTx] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/transactions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Error fetching transactions');
      
      const data = await response.json();
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (tx: Transaction, status: 'completed' | 'rejected', reason?: string) => {
    if (status === 'rejected' && !reason && !showRejectionModal) {
      setTargetTx(tx);
      setShowRejectionModal(true);
      return;
    }

    const actionLabel = status === 'completed' ? 'APROBAR' : 'RECHAZAR';
    if (!window.confirm(`¿Estás seguro de ${actionLabel} esta transacción?`)) return;
    
    setProcessingId(tx.id);
    try {
      if (tx.type === 'plan_purchase' && status === 'completed') {
        // Use the API for plan purchase approval to handle commissions and plan updates
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session found");

        const response = await fetch('/api/admin/transactions/approve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ transactionId: tx.id })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al aprobar transacción");
        }
      } else {
        // Use the new update-status endpoint for other types or rejection
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No session found");

        const response = await fetch('/api/admin/transactions/update-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ 
            transactionId: tx.id, 
            status,
            rejectionReason: reason
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al actualizar transacción");
        }
      }
      
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status } : t));
      setShowRejectionModal(false);
      setRejectionReason('');
      setTargetTx(null);
      
      if (tx.type === 'plan_purchase' && status === 'completed') {
        // Refresh to see the new commission transaction if it was created
        fetchTransactions();
      }
    } catch (error: any) {
      console.error("Error processing transaction:", error);
      alert(error.message || "Error al procesar la transacción");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      t.users?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.users?.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesType && matchesStatus && matchesSearch;
  });

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'plan_purchase': return 'Compra de Plan';
      case 'referral_commission': return 'Comisión Referido';
      case 'withdrawal': return 'Retiro';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': return <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-xs font-bold">Completado</span>;
      case 'pending': return <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-xs font-bold">Pendiente</span>;
      case 'rejected': return <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold">Rechazado</span>;
      default: return <span className="px-2 py-1 bg-slate-500/10 text-slate-500 rounded text-xs font-bold">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rejection Reason Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] rounded-[30px] p-8 w-full max-w-md border border-slate-200 dark:border-white/10 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Rechazar Transacción</h3>
            <p className="text-sm text-slate-500 mb-6">Por favor, indica el motivo del rechazo para informar al usuario.</p>
            
            <textarea
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-red-500/50 outline-none min-h-[120px] text-slate-900 dark:text-white"
              placeholder="Ej: Comprobante ilegible, monto no coincide, cuenta no válida..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                  setTargetTx(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!rejectionReason.trim() || processingId === targetTx?.id}
                onClick={() => targetTx && handleAction(targetTx, 'rejected', rejectionReason)}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedReceipt(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
            >
              <XCircle className="w-8 h-8" />
            </button>
            <img 
              src={selectedReceipt} 
              alt="Comprobante" 
              className="w-full h-full object-contain rounded-xl shadow-2xl"
            />
            <a 
              href={selectedReceipt} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir en nueva pestaña</span>
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Transacciones</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Administra compras, comisiones y retiros.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50 text-slate-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent text-sm outline-none text-slate-700 dark:text-slate-300"
            >
              <option value="all">Todos los tipos</option>
              <option value="plan_purchase">Compras</option>
              <option value="referral_commission">Comisiones</option>
              <option value="withdrawal">Retiros</option>
            </select>
          </div>
          
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white dark:bg-[#111] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm outline-none text-slate-700 dark:text-slate-300"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completados</option>
            <option value="rejected">Rechazados</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-4 font-medium">Fecha</th>
                <th className="p-4 font-medium">Usuario</th>
                <th className="p-4 font-medium">Tipo</th>
                <th className="p-4 font-medium">Monto</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron transacciones.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-900 dark:text-white">{tx.users?.name || 'Usuario Desconocido'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500">{tx.users?.email}</p>
                    </td>
                    <td className="p-4">
                      <span className="text-slate-600 dark:text-slate-300">{getTypeLabel(tx.type)}</span>
                    </td>
                    <td className="p-4 font-bold text-emerald-500">
                      ${tx.amount.toLocaleString('es-CO')}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(tx.status)}
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      {tx.receipt_url && (
                        <button
                          onClick={() => setSelectedReceipt(tx.receipt_url!)}
                          className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                          title="Ver Comprobante"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {tx.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleAction(tx, 'completed')}
                            disabled={processingId === tx.id}
                            className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                            title="Aprobar"
                          >
                            {processingId === tx.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleAction(tx, 'rejected')}
                            disabled={processingId === tx.id}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                            title="Rechazar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
