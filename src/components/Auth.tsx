import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  Building2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthProps {
  onBusinessClick: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds

const Auth: React.FC<AuthProps> = ({ onBusinessClick }) => {
  const [view, setView] = useState<'login' | 'signup' | 'forgot' | 'success'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Clear errors when switching views
  useEffect(() => {
    setError('');
    // Only clear message if we are not in success view
    if (view !== 'success') {
      setMessage('');
    }
  }, [view]);

  const checkLockout = (emailToCheck: string) => {
    const data = localStorage.getItem(`auth_lock_${emailToCheck.toLowerCase()}`);
    if (data) {
      const { lockUntil } = JSON.parse(data);
      if (lockUntil && Date.now() < lockUntil) {
        return Math.ceil((lockUntil - Date.now()) / 60000); // minutes left
      }
      if (lockUntil && Date.now() >= lockUntil) {
        localStorage.removeItem(`auth_lock_${emailToCheck.toLowerCase()}`);
      }
    }
    return 0;
  };

  const recordFailedAttempt = (emailToRecord: string) => {
    const key = `auth_lock_${emailToRecord.toLowerCase()}`;
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
    localStorage.removeItem(`auth_lock_${emailToClear.toLowerCase()}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    const lockMins = checkLockout(email);
    if (lockMins > 0) {
      setError(`Account temporarily locked due to too many failed attempts. Try again in ${lockMins} minutes.`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (authError) throw authError;
      clearAttempts(email);
    } catch (err: any) {
      const mins = recordFailedAttempt(email);
      if (mins > 0) {
        setError(`Too many failed attempts. Account locked for ${mins} minutes.`);
      } else {
        setError('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setError('An account with this email already exists.');
        return;
      }
      
      // Pre-emptively create/update the user document so App.tsx has the correct name
      if (data.user) {
        const defaultName = email.split('@')[0];
        const { error: dbError } = await supabase.from('users').upsert({
          id: data.user.id,
          username: defaultName,
          email: email,
          roles: ['buyer'],
          active_role: 'buyer',
          updated_at: new Date().toISOString()
        });
        if (dbError) console.error("Error creating user profile:", dbError);
      }

      if (data.session) {
        setMessage('Account created successfully! Logging you in...');
      } else {
        setMessage('Registration successful! Please check your email to confirm your account before logging in.');
        setView('success');
      }

    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
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
      setMessage('Password reset link sent! Please check your email inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const themeColor = 'emerald';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-md w-full bg-white p-8 md:p-12 rounded-[40px] shadow-2xl border border-black/5 relative overflow-hidden">
        
        {/* Decorative background elements */}
        <div className={`absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-emerald-50 to-transparent opacity-50 pointer-events-none`} />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="African Market Hub" className="h-20 object-contain" />
          </div>
          
          <h1 className="text-3xl font-black mb-2 tracking-tight text-gray-900">
            {view === 'login' ? 'Welcome Back' : view === 'signup' ? 'Create Account' : view === 'success' ? 'Check Your Email' : 'Reset Password'}
          </h1>
          <p className="text-gray-500 mb-8 font-medium">
            {view === 'login' ? `Sign in to access your African Market Hub dashboard.` : 
             view === 'signup' ? 'Join thousands of buyers and sellers across the continent.' : 
             view === 'success' ? 'We\'ve sent a confirmation link to your email address.' :
             'Enter your email to receive a secure password reset link.'}
          </p>

          <AnimatePresence mode="wait">
            {view === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className={`w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-6`}>
                  <Mail size={40} />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-4">Verify your email</h2>
                <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                  We've sent a verification link to <strong className="text-gray-900">{email}</strong>. 
                  Please click the link in the email to confirm your account and start using African Market Hub.
                </p>
                <button
                  onClick={() => setView('login')}
                  className={`w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg`}
                >
                  Back to Login
                </button>
              </motion.div>
            ) : (
              <>
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
                    className={`mb-6 p-4 bg-emerald-50 border-emerald-100 text-emerald-700 rounded-2xl flex items-start gap-3`}
                  >
                    <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm font-bold">{message}</p>
                  </motion.div>
                )}

                <form onSubmit={view === 'login' ? handleLogin : view === 'signup' ? handleSignUp : handleForgotPassword} className="space-y-4">
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                        <Mail size={20} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-${themeColor}-500 outline-none transition-all font-medium`}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  {view !== 'forgot' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <label className="block text-sm font-bold text-gray-700">Password</label>
                        {view === 'login' && (
                          <button 
                            type="button"
                            onClick={() => setView('forgot')}
                            className={`text-xs font-bold text-${themeColor}-600 hover:text-${themeColor}-700`}
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                          <Lock size={20} />
                        </div>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={`w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-${themeColor}-500 outline-none transition-all font-medium`}
                          placeholder="••••••••"
                        />
                      </div>
                      {view === 'signup' && (
                        <p className={`text-xs mt-2 ml-1 font-medium ${password.length > 0 && password.length < 8 ? 'text-rose-500' : 'text-gray-400'}`}>
                          Must be at least 8 characters long.
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 text-white rounded-2xl font-black text-lg transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed`}
                  >
                    {loading ? <Loader2 className="animate-spin" size={24} /> : (
                      <>
                        {view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Send Reset Link'}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-8 text-center space-y-4">
                  {view === 'login' ? (
                    <p className="text-sm font-medium text-gray-600">
                      Don't have an account?{' '}
                      <button onClick={() => setView('signup')} className={`text-${themeColor}-600 font-bold hover:underline`}>
                        Sign up
                      </button>
                    </p>
                  ) : view === 'signup' ? (
                    <p className="text-sm font-medium text-gray-600">
                      Already have an account?{' '}
                      <button onClick={() => setView('login')} className={`text-${themeColor}-600 font-bold hover:underline`}>
                        Log in
                      </button>
                    </p>
                  ) : (
                    <button onClick={() => setView('login')} className={`text-sm font-bold text-${themeColor}-600 hover:underline`}>
                      Back to Login
                    </button>
                  )}
                  
                  <button
                    onClick={onBusinessClick}
                    className="block w-full text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Register as a Business
                  </button>

                  <div className="pt-4 border-t border-gray-100">
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('switchToStaffLogin'))}
                      className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-emerald-600 transition-colors"
                    >
                      Staff Login
                    </button>
                  </div>
                </div>
              </>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
};

export default Auth;
