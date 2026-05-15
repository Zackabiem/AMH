import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  ChevronLeft
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StaffAuthProps {
  onBack: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 30 * 60 * 1000;

const StaffAuth: React.FC<StaffAuthProps> = ({ onBack }) => {
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setError('');
    setMessage('');
  }, [view]);

  const checkLockout = (emailToCheck: string) => {
    const data = localStorage.getItem(`staff_lock_${emailToCheck.toLowerCase()}`);
    if (data) {
      const { lockUntil } = JSON.parse(data);
      if (lockUntil && Date.now() < lockUntil) {
        return Math.ceil((lockUntil - Date.now()) / 60000);
      }
      if (lockUntil && Date.now() >= lockUntil) {
        localStorage.removeItem(`staff_lock_${emailToCheck.toLowerCase()}`);
      }
    }
    return 0;
  };

  const recordFailedAttempt = (emailToRecord: string) => {
    const key = `staff_lock_${emailToRecord.toLowerCase()}`;
    const data = localStorage.getItem(key);
    let attempts = 1;
    
    if (data) {
      const parsed = JSON.parse(data);
      if (!parsed.lockUntil || Date.now() >= parsed.lockUntil) {
        attempts = parsed.attempts + 1;
      }
    }
    
    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem(key, JSON.stringify({
        attempts,
        lockUntil: Date.now() + LOCKOUT_TIME
      }));
      return LOCKOUT_TIME / 60000;
    } else {
      localStorage.setItem(key, JSON.stringify({
        attempts,
        lockUntil: null
      }));
      return 0;
    }
  };

  const clearAttempts = (emailToClear: string) => {
    localStorage.removeItem(`staff_lock_${emailToClear.toLowerCase()}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const lockMins = checkLockout(email);
    if (lockMins > 0) {
      setError(`Account temporarily locked. Try again in ${lockMins} minutes.`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) throw authError;
      
      if (authData.user) {
        // Check if they are a staff member in business_members
        const { data: staffData, error: staffError } = await supabase
          .from('business_members')
          .select('*')
          .eq('user_id', authData.user.id)
          .eq('status', 'active');

        if (staffError) {
          console.error("Error checking staff status:", staffError);
        }

        if (!staffData || staffData.length === 0) {
          await supabase.auth.signOut();
          setError('Access denied. No active staff profile found for this account.');
          setLoading(false);
          return;
        }
      }
      
      clearAttempts(email);
    } catch (err: any) {
      const mins = recordFailedAttempt(email);
      if (mins > 0) {
        setError(`Too many failed attempts. Account locked for ${mins} minutes.`);
      } else {
        setError('Invalid email or password. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your work email address.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage('Reset link sent! Please check your work email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-[40px] shadow-2xl border border-black/5 relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-50 to-transparent opacity-50 pointer-events-none" />
        
        <div className="relative z-10">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors mb-8 group"
          >
            <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Personal
          </button>

          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="African Market Hub" className="h-20 object-contain" />
          </div>
          
          <h1 className="text-3xl font-black mb-2 tracking-tight text-gray-900">
            Staff Portal
          </h1>
          <p className="text-gray-500 mb-8 font-medium">
            {view === 'login' ? 'Sign in to access your company workspace.' : 'Enter your work email to receive a reset link.'}
          </p>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 text-rose-700"
              >
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-bold">{error}</p>
              </motion.div>
            )}
            
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl flex items-start gap-3"
              >
                <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                <p className="text-sm font-bold">{message}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={view === 'login' ? handleLogin : handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Work Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                  placeholder="you@company.com"
                />
              </div>
            </div>

            {view === 'login' && (
              <div>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <label className="block text-sm font-bold text-gray-700">Password</label>
                  <button 
                    type="button"
                    onClick={() => setView('forgot')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  {view === 'login' ? 'Sign In' : 'Send Reset Link'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {view === 'forgot' && (
            <div className="mt-8 text-center">
              <button onClick={() => setView('login')} className="text-sm font-bold text-indigo-600 hover:underline">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffAuth;
