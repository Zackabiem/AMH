import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  ArrowLeft, 
  Loader2, 
  Plus, 
  Minus, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

import { useAuth } from '../../App';
import { formatPrice, getCurrencySymbol } from '../../lib/currency';
import PriceDisplay from '../PriceDisplay';

interface CommissionLedger {
  id: string;
  target_id: string;
  target_type: 'store' | 'user';
  type: 'fee' | 'payment';
  amount: number;
  description: string;
  order_id?: string;
  created_at: string;
}

interface FinanceViewProps {
  targetId: string;
  targetType: 'store' | 'user';
  targetData: {
    totalDebt: number;
    lockThreshold: number;
    isLocked: boolean;
    name?: string;
  };
  onBack: () => void;
  sellerId: string;
}

const FinanceView: React.FC<FinanceViewProps> = ({ 
  targetId, 
  targetType, 
  targetData, 
  onBack,
  sellerId
}) => {
  const { profile } = useAuth() || {};
  const userCountry = profile?.country;

  const [ledger, setLedger] = useState<CommissionLedger[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchLedger = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('commission_ledger')
          .select('*')
          .eq('target_id', targetId)
          .eq('target_type', targetType)
          .order('created_at', { ascending: false });

        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchLedger(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }
        if (isMounted) setLedger(data || []);
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching ledger:', error);
        }
      } finally {
        if (isMounted) setLoadingLedger(false);
      }
    };

    fetchLedger();

    const subscription = supabase
      .channel('public:commission_ledger')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'commission_ledger', 
        filter: `target_id=eq.${targetId}` // Supabase realtime filters only support one column currently, so we filter by target_id
      }, payload => {
        // Double check target_type on client side if needed, though target_id is usually unique enough
        if (payload.new && (payload.new as any).target_type === targetType) {
            if (isMounted) fetchLedger();
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [targetId, targetType]);

  const handleProcessPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setProcessingPayment(true);
    try {
      const response = await fetch('/api/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetId,
          targetType,
          amount,
          sellerId,
          accountNumber
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setPaymentAmount('');
        alert('Payment processed successfully!');
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        alert('Failed to connect to the payment server. Please check your internet connection.');
      } else {
        console.error('Payment error:', error);
        alert(`Payment failed: ${error.message}`);
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 font-bold hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <TrendingUp className="text-emerald-600" />
          <h2 className="text-2xl font-black tracking-tight">Finance & Commission</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Debt Overview Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-white p-12 rounded-[40px] border border-black/5 shadow-sm space-y-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Current Commission Debt</p>
              <h3 className={`text-5xl font-black ${targetData.totalDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                <PriceDisplay 
                  amount={targetData.totalDebt || 0} 
                  sourceCountry={targetData.currency || 'Nigeria'} 
                  targetCountry={userCountry}
                  className=""
                  originalPriceClassName="text-sm font-bold text-gray-400 line-through ml-2 block mt-2"
                />
              </h3>
            </div>

            <div className="p-6 bg-gray-50 rounded-3xl space-y-4">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-400 uppercase tracking-widest">Lock Threshold</span>
                <PriceDisplay 
                  amount={targetData.lockThreshold || 50} 
                  sourceCountry={targetData.currency || 'Nigeria'} 
                  targetCountry={userCountry}
                  className="text-gray-900"
                  originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-1"
                />
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${targetData.totalDebt >= (targetData.lockThreshold || 50) ? 'bg-rose-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min((targetData.totalDebt / (targetData.lockThreshold || 50)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-2">
                {targetData.isLocked ? (
                  <>
                    <Lock size={14} className="text-rose-500" />
                    <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest">Account is Locked</p>
                  </>
                ) : (
                  <>
                    <Unlock size={14} className="text-emerald-500" />
                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Account is Active</p>
                  </>
                )}
              </div>
            </div>

              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Make a Manual Payment</label>
                
                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 space-y-3">
                  <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Platform Bank Details</p>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-emerald-900">African Market Hub Ltd</p>
                    <p className="text-lg font-black text-emerald-600 tracking-wider">0123456789</p>
                    <p className="text-xs font-bold text-emerald-700">Zenith Bank PLC</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Your Account Number (Reference)</label>
                  <input 
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Enter your account number"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Amount Paid</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-400">{getCurrencySymbol(userCountry)}</span>
                    <input 
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-12 pr-6 py-5 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-emerald-500 transition-all font-black text-xl"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleProcessPayment}
                  disabled={processingPayment || !paymentAmount || !accountNumber}
                  className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingPayment ? <Loader2 className="animate-spin" size={24} /> : 'Confirm Payment'}
                </button>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center leading-relaxed">
                  After making a bank transfer, enter your account number and the amount paid to notify our finance team.
                </p>
              </div>
          </div>

          <div className="bg-emerald-600 p-10 rounded-[40px] text-white space-y-6">
            <h4 className="text-lg font-black uppercase tracking-widest">How it works</h4>
            <ul className="space-y-4 text-sm font-medium opacity-90">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                <span>We charge a small commission (typically 1%) on each successful transaction.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                <span>Fees accumulate as debt. You can pay this debt at any time to keep your account active.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black shrink-0">3</span>
                <span>If debt exceeds your threshold, your listings/services are hidden until payment is made.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Ledger Card */}
        <div className="lg:col-span-2">
          <div className="bg-white p-12 rounded-[40px] border border-black/5 shadow-sm h-full flex flex-col min-h-[600px]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black tracking-tight">Transaction Ledger</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Fees</span>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg">Payments</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {loadingLedger ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                  <Loader2 className="animate-spin" size={48} />
                  <p className="font-black uppercase tracking-widest">Loading ledger...</p>
                </div>
              ) : ledger.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                  <TrendingUp size={48} className="opacity-20" />
                  <p className="font-black uppercase tracking-widest">No transactions yet</p>
                </div>
              ) : (
                ledger.map((entry) => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${entry.type === 'fee' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        {entry.type === 'fee' ? <Minus size={20} /> : <Plus size={20} />}
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{entry.description}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''} • {entry.created_at ? new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                    <div className={`text-xl font-black flex items-baseline gap-1 ${entry.type === 'fee' ? 'text-rose-600' : 'text-emerald-600'}`}>
                      <span>{entry.type === 'fee' ? '-' : '+'}</span>
                      <PriceDisplay 
                        amount={entry.amount} 
                        sourceCountry={targetData.currency || 'Nigeria'} 
                        targetCountry={userCountry}
                        className=""
                        originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-1"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FinanceView;
