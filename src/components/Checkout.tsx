import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  CreditCard, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck,
  AlertCircle,
  Building2,
  Copy,
  Check,
  Upload
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createNotification } from '../lib/notifications';
import { useAuth } from '../App';
import { formatPrice } from '../lib/currency';
import PriceDisplay from './PriceDisplay';

interface CheckoutProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ order, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [storeDetails, setStoreDetails] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const { profile } = useAuth() || {};

  useEffect(() => {
    let isMounted = true;
    const fetchStoreDetails = async (retryCount = 0) => {
      try {
        const { data: storeData, error } = await supabase
          .from('stores')
          .select('*')
          .eq('id', order.store_id)
          .single();
          
        if (error) {
          if (retryCount < 3 && (
            error.message?.includes('fetch') || 
            error.message?.includes('Lock') || 
            error.message?.includes('AbortError') ||
            error.message?.includes('steal') ||
            error.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => isMounted && fetchStoreDetails(retryCount + 1), delay);
            return;
          }
          throw error;
        }
        
        if (storeData) {
          // Check if store has its own bank details
          if (storeData.account_number && storeData.bank_name) {
            storeData.bank_details = {
              bankName: storeData.bank_name,
              accountNumber: storeData.account_number,
              accountName: storeData.name // Account names are inferred from the store or business name
            };
          }
        }

        if (isMounted && storeData) {
          setStoreDetails(storeData);
        }
      } catch (error) {
        console.error('Error fetching store details:', error);
      }
    };
    if (order?.store_id) {
      fetchStoreDetails();
    }
    return () => { isMounted = false; };
  }, [order?.store_id]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmPayment = async () => {
    if (!receiptFile) {
      alert("Please upload your payment receipt.");
      return;
    }
    if (!consentChecked) {
      alert("Please confirm that you have made the transfer.");
      return;
    }

    setLoading(true);
    
    try {
      // 1. Get secure upload signature from our Vercel API
      const signResponse = await fetch('/api/cloudinary/sign', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'receipts' })
      });
      if (!signResponse.ok) {
        throw new Error('Failed to get upload signature. Make sure Cloudinary credentials are set.');
      }
      const signData = await signResponse.json();

      // 2. Upload directly from browser to Cloudinary
      const formData = new FormData();
      formData.append('file', receiptFile);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', signData.timestamp);
      formData.append('signature', signData.signature);
      formData.append('folder', signData.folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      const uploadData = await uploadResponse.json();
      const publicUrl = uploadData.secure_url;

      // 3. Update Order
      const performConfirm = async (retryCount = 0) => {
        try {
          const { error } = await supabase
            .from('orders')
            .update({ 
              status: 'awaiting_seller_confirmation',
              receipt_url: publicUrl 
            })
            .eq('id', order.id);
            
          if (error) {
            if (retryCount < 3 && (
              error.message?.includes('fetch') || 
              error.message?.includes('Lock') || 
              error.message?.includes('AbortError') ||
              error.message?.includes('steal') ||
              error.message?.includes('Failed to fetch')
            )) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              setTimeout(() => performConfirm(retryCount + 1), delay);
              return;
            }
            throw error;
          }
          
          if (order.seller_ids && order.seller_ids.length > 0) {
            order.seller_ids.forEach((sellerId: string) => {
              createNotification(
                sellerId,
                'New Order Received',
                `A new order (#${order.id.slice(0, 8)}) is awaiting your confirmation.`,
                'order_created',
                '/dashboard?tab=orders'
              );
            });
          }

          setStep(2);
        } catch (error) {
          console.error('Error confirming payment:', error);
          alert('Failed to confirm payment. Please try again.');
        } finally {
          setLoading(false);
        }
      };
      performConfirm();
    } catch (err) {
      console.error('Error in payment confirmation:', err);
      alert('An unexpected error occurred.');
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-black/5 px-4 md:px-8 py-4 md:py-6 flex items-center justify-between sticky top-0 z-10">
        <button 
          onClick={onClose}
          className="p-2 md:p-3 hover:bg-gray-100 rounded-2xl transition-all flex items-center gap-2 text-gray-600 font-bold text-sm md:text-base"
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Back to Market</span>
        </button>
        <div className="flex items-center gap-2 md:gap-4">
          {[1, 2].map((s) => (
            <div 
              key={s}
              className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-500 ${
                step >= s ? 'bg-emerald-600 scale-125' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <div className="w-10 md:w-24" /> {/* Spacer */}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-8"
                >
                  <section>
                    <h3 className="text-2xl font-black tracking-tight mb-6 flex items-center gap-3">
                      <CreditCard className="text-emerald-600" />
                      Payment Details
                    </h3>
                    
                    <div className="bg-white p-8 rounded-[32px] border-2 border-black/5 space-y-6">
                      <div className="text-center mb-8">
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-sm mb-2">Amount to Pay</p>
                        <PriceDisplay 
                          amount={order.total} 
                          sourceCountry={storeDetails?.currency || 'Nigeria'} 
                          targetCountry={profile?.country}
                          className="text-5xl font-black text-emerald-600"
                          originalPriceClassName="text-sm font-bold text-gray-400 line-through ml-2 block mt-2"
                        />
                      </div>

                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-black/5 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Store Name</p>
                            <p className="font-black text-lg text-gray-900">{order.storeName || order.store_name}</p>
                          </div>
                          <Building2 className="text-gray-400" size={24} />
                        </div>

                        {storeDetails?.bankDetails || storeDetails?.bank_details ? (
                          <div className="p-4 bg-gray-50 rounded-2xl border border-black/5 space-y-4">
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Bank Name</p>
                              <p className="font-black text-lg text-gray-900">{storeDetails.bankDetails?.bankName || storeDetails.bank_details?.bankName}</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Account Number</p>
                                <p className="font-black text-xl text-gray-900 tracking-wider">{storeDetails.bankDetails?.accountNumber || storeDetails.bank_details?.accountNumber}</p>
                              </div>
                              <button 
                                onClick={() => handleCopy(storeDetails.bankDetails?.accountNumber || storeDetails.bank_details?.accountNumber)}
                                className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-600"
                              >
                                {copied ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} />}
                              </button>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Account Name</p>
                              <p className="font-bold text-gray-900">{storeDetails.bankDetails?.accountName || storeDetails.bank_details?.accountName}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                            <div>
                              <p className="font-bold text-amber-900">Bank details not available</p>
                              <p className="text-sm text-amber-700 mt-1">Please contact the seller directly to arrange payment.</p>
                            </div>
                          </div>
                        )}

                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                          <div>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Payment Reference</p>
                            <p className="font-black text-xl text-emerald-900 tracking-wider">{order.paymentReference || order.payment_reference}</p>
                          </div>
                          <button 
                            onClick={() => handleCopy(order.paymentReference || order.payment_reference)}
                            className="p-2 hover:bg-emerald-200 rounded-xl transition-colors text-emerald-700"
                          >
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                          </button>
                        </div>
                        <p className="text-xs font-bold text-gray-500 text-center">
                          * Please include this reference when making your transfer
                        </p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-xl font-black tracking-tight mb-4 flex items-center gap-3">
                      <Upload className="text-emerald-600" />
                      Upload Receipt
                    </h3>
                    <div className="bg-white p-6 rounded-[32px] border-2 border-black/5 space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Payment Receipt (Image/PDF)</label>
                        <input 
                          type="file" 
                          accept="image/*,.pdf"
                          onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                        />
                      </div>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                          className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          I confirm that I have transferred the exact amount to the seller's account using the correct Payment Reference.
                        </span>
                      </label>
                    </div>
                  </section>

                  <div className="bg-amber-50 p-8 rounded-[32px] border border-amber-100 flex gap-4">
                    <AlertCircle className="text-amber-600 shrink-0" size={24} />
                    <div>
                      <h4 className="font-black text-amber-900 mb-1">Important</h4>
                      <p className="text-sm text-amber-700 font-medium leading-relaxed">
                        After making the transfer to the store's account, click the button below. The seller will review and confirm your payment.
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className="w-full py-6 bg-emerald-600 text-white rounded-[32px] font-black text-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                  >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : 'I Have Paid'}
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 space-y-8"
                >
                  <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle2 size={64} />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tight mb-4">Payment Submitted!</h2>
                    <p className="text-gray-500 text-lg max-w-md mx-auto">
                      The seller will review your payment shortly. Once confirmed, you can request transport for your order.
                    </p>
                  </div>
                  <div className="flex flex-col gap-4 max-w-xs mx-auto">
                    <button 
                      onClick={onSuccess}
                      className="w-full py-5 bg-black text-white rounded-2xl font-bold text-lg hover:bg-gray-900 transition-all"
                    >
                      Go to Dashboard
                    </button>
                    <button 
                      onClick={onClose}
                      className="w-full py-5 bg-white border border-black/5 text-gray-600 rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-black/5 sticky top-32">
              <h4 className="text-xl font-black tracking-tight mb-8">Order Summary</h4>
              <div className="space-y-6 mb-8">
                {order.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 line-clamp-1">{item.title}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{order.storeName || order.store_name}</p>
                    </div>
                    <PriceDisplay 
                      amount={item.price} 
                      sourceCountry={storeDetails?.currency || 'Nigeria'} 
                      targetCountry={profile?.country}
                      className="font-black text-gray-900"
                      originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-2"
                    />
                  </div>
                ))}
              </div>
              
              <div className="space-y-4 pt-8 border-t border-gray-100">
                <div className="flex justify-between items-center pt-4">
                  <span className="text-gray-900 font-black text-lg">Total</span>
                  <PriceDisplay 
                    amount={order.total} 
                    sourceCountry={storeDetails?.currency || 'Nigeria'} 
                    targetCountry={profile?.country}
                    className="text-3xl font-black text-emerald-600"
                    originalPriceClassName="text-sm font-bold text-gray-400 line-through ml-2"
                  />
                </div>
              </div>
            </div>

            <div className="bg-emerald-600 p-8 rounded-[40px] text-white space-y-4">
              <ShieldCheck size={32} />
              <h4 className="text-xl font-black tracking-tight">AMH Protection</h4>
              <p className="text-emerald-100 text-sm leading-relaxed font-medium">
                Every purchase on African Market Hub is protected. We ensure your money is safe until you get exactly what you ordered.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Checkout;
