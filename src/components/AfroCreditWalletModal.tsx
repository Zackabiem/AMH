import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { toast } from 'sonner';

export default function AfroCreditWalletModal() {
  const { user, profile } = useAuth() || {};
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(500);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openAfroCreditWallet', handleOpen);
    return () => window.removeEventListener('openAfroCreditWallet', handleOpen);
  }, []);

  if (!isOpen) return null;

  const costPerCredit = 100; // e.g. 100 Naira per AC

  const handleTopUp = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Simulate payment gateway
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newCredits = (profile?.afro_credits || 0) + amount;
      
      const { error } = await supabase.from('users').update({ afro_credits: newCredits }).eq('id', user.id);
      if (error) throw error;
      
      await supabase.from('credit_transactions').insert({
        user_id: user.id,
        amount: amount,
        type: 'top_up',
        description: `Purchased ${amount} Afro Credits`,
      });
      
      toast.success(`Successfully topped up ${amount} Afro Credits!`);
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to top up credits');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative border border-black/5"
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 shadow-sm">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-xl font-bold">&cent;</div>
        </div>

        <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Afro Credits Wallet</h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Current Balance: <strong className="text-gray-900 text-xl ml-2">{profile?.afro_credits?.toLocaleString() || '0'} AC</strong>
        </p>
        
        <div className="space-y-4 mb-8">
           <label className="block text-sm font-bold text-gray-700">Top up amount</label>
           <div className="grid grid-cols-3 gap-3">
             {[100, 500, 1000, 5000].map(val => (
               <button
                 key={val}
                 onClick={() => setAmount(val)}
                 className={`py-3 rounded-xl font-bold transition-all ${amount === val ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
               >
                 +{val}
               </button>
             ))}
           </div>
           
           <div className="bg-gray-50 p-4 rounded-xl mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Total Cost:</span>
              <span className="text-xl font-black text-gray-900">₦{(amount * costPerCredit).toLocaleString()}</span>
           </div>
        </div>

        <button
          onClick={handleTopUp}
          disabled={loading || amount <= 0}
          className="w-full py-4 px-6 bg-gray-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <><ShieldCheck size={18} /> Confirm Payment</>
          )}
        </button>
      </motion.div>
    </div>
  );
}
