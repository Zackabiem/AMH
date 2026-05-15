import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Building2, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Store, FileText, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';

interface BusinessOnboardingProps {
  onComplete: () => void;
  onCancel: () => void;
  role?: 'seller' | 'transporter' | 'property_owner';
}

const BusinessOnboarding: React.FC<BusinessOnboardingProps> = ({ onComplete, onCancel, role = 'seller' }) => {
  const { user, requestRole } = useAuth() || {};
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugStep, setDebugStep] = useState('');
  const [existingStore, setExistingStore] = useState<any>(null);
  const [convertStore, setConvertStore] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    businessType: 'limited',
    registrationNumber: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    let isMounted = true;
    if (user) {
      const checkExistingStore = async (retryCount = 0) => {
        try {
          const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', user.id)
            .eq('owner_type', 'user')
            .limit(1);
            
          if (error) {
            if (retryCount < 3 && (
              error.message?.includes('fetch') || 
              error.message?.includes('Lock') || 
              error.message?.includes('AbortError') ||
              error.message?.includes('steal') ||
              error.message?.includes('Failed to fetch')
            )) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              setTimeout(() => isMounted && checkExistingStore(retryCount + 1), delay);
              return;
            }
            throw error;
          }
          if (isMounted && data && data.length > 0) {
            setExistingStore(data[0]);
          }
        } catch (err) {
          console.error("Error checking existing store:", err);
        }
      };
      checkExistingStore();
    }
    return () => { isMounted = false; };
  }, [user?.id]);

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');

    const performSubmit = async (retryCount = 0) => {
      try {
        setDebugStep('0. Verifying User Profile...');
        // 0. Verify user exists in public.users
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (userError || !userProfile) {
          throw new Error(`User profile not found in database. Please refresh the page or contact support. Details: ${userError?.message || 'Not found'}`);
        }

        setDebugStep('1. Creating Business Document...');
        // 1. Create Business Document
        const { data: businessData, error: businessError } = await supabase.from('businesses').insert([{
          name: formData.name,
          business_type: formData.businessType,
          owner_user_id: user.id,
          registration_number: formData.registrationNumber,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]).select().single();

        if (businessError) {
          if (retryCount < 3 && (
            businessError.message?.includes('fetch') || 
            businessError.message?.includes('Lock') || 
            businessError.message?.includes('AbortError') ||
            businessError.message?.includes('steal') ||
            businessError.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => performSubmit(retryCount + 1), delay);
            return;
          }
          throw businessError;
        }
        
        if (!businessData) {
          throw new Error('No business data returned from insert');
        }
        
        const businessId = businessData.id;

        setDebugStep('2. Creating Business Member Document...');
        // 2. Create BusinessMember Document (Owner)
        const { error: memberError } = await supabase.from('business_members').insert([{
          business_id: businessId,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
        if (memberError) throw memberError;

        setDebugStep('3. Requesting Role...');
        // 3. Request Role if they don't have it
        if (requestRole) {
          await requestRole(role);
        }

        setDebugStep('4. Success!');
        setStep(4); // Success step
      } catch (err: any) {
        console.error('Error creating business:', err);
        const errorMessage = err?.message || err?.error_description || JSON.stringify(err);
        setError(`Error at step "${debugStep}": ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    performSubmit();
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-12">
      {[1, 2, 3].map((num) => (
        <React.Fragment key={num}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
            step === num ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' :
            step > num ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
          }`}>
            {step > num ? <CheckCircle2 size={20} /> : num}
          </div>
          {num < 3 && (
            <div className={`w-16 h-1 mx-2 rounded-full transition-colors ${
              step > num ? 'bg-blue-600' : 'bg-gray-100'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 py-6 px-4 sm:px-6 lg:px-8 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="font-black text-gray-900 leading-tight">Business Setup</h1>
              <p className="text-xs text-gray-500 font-medium">Enterprise Registration</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-900 transition-colors p-2"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 py-12">
        {step < 4 && renderStepIndicator()}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl sm:rounded-[32px] p-6 sm:p-8 md:p-12 shadow-sm border border-black/5"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Company Details</h2>
                <p className="text-gray-500">Let's start with your official business information.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Legal Business Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                      <Building2 size={20} />
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                      placeholder="e.g. Acme Corporation Ltd"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Business Type *</label>
                    <select
                      value={formData.businessType}
                      onChange={e => setFormData({...formData, businessType: e.target.value})}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white text-lg"
                    >
                      <option value="sole_proprietor">Sole Proprietor</option>
                      <option value="limited">Limited Company (LLC/Ltd)</option>
                      <option value="enterprise">Enterprise / Corp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Registration / CAC No. *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <FileText size={20} />
                      </div>
                      <input
                        type="text"
                        value={formData.registrationNumber}
                        onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                        className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                        placeholder="RC-123456"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    onClick={handleNext}
                    disabled={!formData.name || !formData.registrationNumber}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    Continue
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl sm:rounded-[32px] p-6 sm:p-8 md:p-12 shadow-sm border border-black/5"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Contact Information</h2>
                <p className="text-gray-500">How can customers and the platform reach your business?</p>
              </div>

              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Business Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                      placeholder="contact@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Business Phone *</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                      placeholder="+234..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Headquarters Address *</label>
                  <div className="relative">
                    <div className="absolute top-4 left-4 text-gray-400">
                      <MapPin size={20} />
                    </div>
                    <textarea
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg resize-none h-32"
                      placeholder="Full street address, City, State, Country"
                    />
                  </div>
                </div>

                <div className="pt-6 flex justify-between">
                  <button
                    onClick={handleBack}
                    className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <ArrowLeft size={20} />
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!formData.email || !formData.phone || !formData.address}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    Continue
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-2xl sm:rounded-[32px] p-6 sm:p-8 md:p-12 shadow-sm border border-black/5"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Review & Submit</h2>
                <p className="text-gray-500">Please review your information before final submission.</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium border border-rose-100">
                  {error}
                </div>
              )}

              <div className="bg-gray-50 rounded-2xl p-6 mb-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 border-b border-gray-200 pb-4">
                  <div className="sm:col-span-1 text-gray-500 font-medium">Business Name</div>
                  <div className="sm:col-span-2 font-bold text-gray-900">{formData.name}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 border-b border-gray-200 pb-4">
                  <div className="sm:col-span-1 text-gray-500 font-medium">Type</div>
                  <div className="sm:col-span-2 font-bold text-gray-900 capitalize">{formData.businessType.replace('_', ' ')}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 border-b border-gray-200 pb-4">
                  <div className="sm:col-span-1 text-gray-500 font-medium">Registration No.</div>
                  <div className="sm:col-span-2 font-bold text-gray-900">{formData.registrationNumber}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 border-b border-gray-200 pb-4">
                  <div className="sm:col-span-1 text-gray-500 font-medium">Contact</div>
                  <div className="sm:col-span-2 font-bold text-gray-900">
                    {formData.email}<br/>
                    {formData.phone}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="sm:col-span-1 text-gray-500 font-medium">Address</div>
                  <div className="sm:col-span-2 font-bold text-gray-900">{formData.address}</div>
                </div>
              </div>

              <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
                <div className="flex items-center h-6 mt-0.5">
                  <input
                    id="staffResponsibility"
                    type="checkbox"
                    required
                    className="w-5 h-5 text-amber-600 bg-white border-gray-300 rounded focus:ring-amber-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="staffResponsibility" className="text-lg font-bold text-gray-900 cursor-pointer">
                    Staff Responsibility Agreement
                  </label>
                  <p className="text-sm text-amber-800 mt-2 leading-relaxed">
                    By checking this box, I acknowledge that business owners are responsible for the actions of their staff accounts on Africa Market Hub.
                  </p>
                </div>
              </div>

              <div className="pt-6 flex justify-between">
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-lg hover:bg-gray-200 transition-all flex items-center gap-2"
                >
                  <ArrowLeft size={20} />
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={24} />
                      <span>Registering...</span>
                    </>
                  ) : 'Complete Registration'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] p-12 shadow-sm border border-black/5 text-center"
            >
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 mb-4">Registration Complete!</h2>
              <p className="text-xl text-gray-500 mb-10 max-w-lg mx-auto leading-relaxed">
                Your business profile has been successfully created. You can now access the enterprise dashboard to manage your branches and staff.
              </p>
              <button
                onClick={onComplete}
                className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200"
              >
                Go to Business Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BusinessOnboarding;
