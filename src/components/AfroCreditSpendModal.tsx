import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, ShieldAlert, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { toast } from 'sonner';

export default function AfroCreditSpendModal() {
  const { user, profile } = useAuth() || {};
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [targetTask, setTargetTask] = useState<{
    title: string;
    description: string;
    cost: number;
    actionType: string;
    targetId?: string;
  } | null>(null);

  useEffect(() => {
    const handleOpen = (e: any) => {
      setTargetTask(e.detail);
      setIsOpen(true);
    };
    window.addEventListener('requestAfroCreditSpend', handleOpen);
    return () => window.removeEventListener('requestAfroCreditSpend', handleOpen);
  }, []);

  if (!isOpen || !targetTask) return null;

  const currentBalance = profile?.afro_credits || 0;
  const canAfford = currentBalance >= targetTask.cost;

  const handleConfirm = async () => {
    if (!user || !canAfford) return;
    setLoading(true);
    try {
      const newCredits = currentBalance - targetTask.cost;
      
      const { error } = await supabase.from('users').update({ afro_credits: newCredits }).eq('id', user.id);
      if (error) throw error;
      
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: -targetTask.cost,
        type: 'spend',
        description: targetTask.title,
        reference_id: targetTask.targetId
      });
      
      // Dispatch success event for the caller
      window.dispatchEvent(new CustomEvent(`afroCreditSpendSuccess_${targetTask.actionType}`, {
        detail: { targetId: targetTask.targetId }
      }));
      
      toast.success(`Successfully spent ${targetTask.cost} AC!`);
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl relative border border-black/5"
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 shadow-sm">
          <Sparkles size={32} />
        </div>

        <h2 className="text-xl font-black text-gray-900 mb-2">{targetTask.title}</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {targetTask.description}
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-gray-700">Cost:</span>
            <span className="text-lg font-black text-gray-900">{targetTask.cost} AC</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-500 font-medium">Your Balance:</span>
            <span className={`text-sm font-bold ${!canAfford ? 'text-red-500' : 'text-emerald-600'}`}>
              {currentBalance.toLocaleString()} AC
            </span>
          </div>
        </div>

        {!canAfford ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-xs font-bold">
              <ShieldAlert size={16} className="shrink-0 mt-0.5" />
              <p>You don't have enough Afro Credits. Please top up your wallet to continue.</p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                window.dispatchEvent(new CustomEvent('openAfroCreditWallet'));
              }}
              className="w-full py-4 px-6 bg-purple-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-purple-700 transition-colors"
            >
              Top Up Wallet
            </button>
          </div>
        ) : (
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-4 px-6 bg-gray-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
        )}
      </motion.div>
    </div>
  );
}
