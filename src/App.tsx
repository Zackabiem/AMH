/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, createContext, useContext, useRef, useMemo } from 'react';
import Navbar from './components/Navbar';
import PublicNavbar from './components/PublicNavbar';
import Dashboard from './components/Dashboard';
import MarketFeeds from './components/MarketFeeds';
import TransportFeeds from './components/TransportFeeds';
import PropertyFeeds from './components/PropertyFeeds';
import TransportBusinessProfile from './components/TransportBusinessProfile';
import PropertyAgencyProfile from './components/PropertyAgencyProfile';
import Map from './components/Map';
import Chat from './components/Chat';
import BusinessLanding from './components/BusinessLanding';
import BusinessOnboarding from './components/BusinessOnboarding';
import PropertyAgencyLanding from './components/PropertyAgencyLanding';
import TransportCompanyLanding from './components/TransportCompanyLanding';
import BecomeSellerModal from './components/BecomeSellerModal';
import BecomeTransporterModal from './components/BecomeTransporterModal';
import BecomePropertyOwnerModal from './components/BecomePropertyOwnerModal';
import AfroCreditWalletModal from './components/AfroCreditWalletModal';
import AfroCreditSpendModal from './components/AfroCreditSpendModal';
import { motion, AnimatePresence } from 'motion/react';
import Auth from './components/Auth';
import StaffAuth from './components/StaffAuth';
import ResetPassword from './components/ResetPassword';
import Legal from './components/Legal';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { LogIn, Loader2, ShieldAlert, Clock } from 'lucide-react';
import AdminApp from './AdminApp';
import { Toaster, toast } from 'sonner';
import { NotificationProvider } from './contexts/NotificationContext';
import { supabase } from './lib/supabase';
import { initializeExchangeRates } from './lib/currency';

function Footer({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  return (
    <footer className="bg-white border-t border-gray-100 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-500 font-medium">
          &copy; {new Date().getFullYear()} African Market Hub. All rights reserved.
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm font-bold text-gray-600">
          <button onClick={() => setActiveTab('legal_terms')} className="hover:text-emerald-600 transition-colors">Terms</button>
          <button onClick={() => setActiveTab('legal_privacy')} className="hover:text-emerald-600 transition-colors">Privacy</button>
          <button onClick={() => setActiveTab('legal_payment')} className="hover:text-emerald-600 transition-colors">Payment Policy</button>
          <button onClick={() => setActiveTab('legal_dispatch')} className="hover:text-emerald-600 transition-colors">Transport Policy</button>
          <button onClick={() => setActiveTab('legal_kyc')} className="hover:text-emerald-600 transition-colors">KYC Policy</button>
        </div>
      </div>
    </footer>
  );
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  roles: ('buyer' | 'seller' | 'transporter' | 'property_owner' | 'admin')[];
  pending_roles?: ('seller' | 'transporter' | 'property_owner')[];
  active_role: 'buyer' | 'seller' | 'transporter' | 'property_owner' | 'admin';
  first_name?: string;
  last_name?: string;
  other_names?: string;
  address?: string;
  phone?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  state?: string;
  lga?: string;
  bio?: string;
  photo_url?: string;
  bank_name?: string;
  account_number?: string;
  addresses?: {
    id: string;
    label: string;
    address: string;
    isDefault: boolean;
  }[];
  notification_preferences?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  buyer_trust_score?: number;
  vehicle_type?: string;
  availability_status?: string;
  total_debt?: number;
  is_locked?: boolean;
  lock_threshold?: number;
  commission_rate?: number;
  max_commission?: number;
  min_commission?: number;
  seller_kyc_type?: 'individual_seller' | 'business_seller';
  transporter_kyc_type?: 'individual_transporter' | 'business_transporter';
  property_owner_kyc_type?: 'individual_property_owner' | 'business_property_owner';
  afro_credits?: number;
}

const AuthContext = createContext<{
  user: any | null; // Supabase User
  profile: UserProfile | null;
  loading: boolean;
  switchRole: (role: UserProfile['active_role']) => Promise<void>;
  requestRole: (role: 'seller' | 'transporter' | 'property_owner') => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  login: () => Promise<void>;
} | null>(null);

export const useAuth = () => useContext(AuthContext);

const PublicApp = ({ loading, user, handleLogin, activeTab, setActiveTab, renderContent }: any) => {
  const [authView, setAuthView] = useState<'personal' | 'staff'>('personal');

  useEffect(() => {
    const handleSwitch = () => setAuthView('staff');
    window.addEventListener('switchToStaffLogin', handleSwitch);
    return () => window.removeEventListener('switchToStaffLogin', handleSwitch);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  if (!user) {
    if (activeTab === 'business_landing' || activeTab === 'property_agency_landing' || activeTab === 'transport_company_landing' || activeTab?.startsWith('legal_')) {
      return (
        <div className="flex flex-col min-h-screen bg-gray-50">
          <PublicNavbar setActiveTab={setActiveTab} />
          <main className="flex-1">
            {renderContent()}
          </main>
          <Footer setActiveTab={setActiveTab} />
        </div>
      );
    }

    if (authView === 'staff') {
      return (
        <div className="flex flex-col min-h-screen bg-gray-50">
          <PublicNavbar setActiveTab={setActiveTab} />
          <main className="flex-1 flex flex-col">
            <StaffAuth onBack={() => setAuthView('personal')} />
          </main>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <PublicNavbar setActiveTab={setActiveTab} />
        <main className="flex-1 flex flex-col">
          <Auth 
            onBusinessClick={() => setActiveTab('business_landing')} 
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 text-gray-900 font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-hidden">
      {activeTab !== 'business_landing' && activeTab !== 'property_agency_landing' && !activeTab?.startsWith('legal_') && (
        <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
      
      <main className="flex-1 overflow-y-auto h-full pt-14 pb-20 md:pt-0 md:pb-0 flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
        <Footer setActiveTab={setActiveTab} />
      </main>
    </div>
  );
};

function App() {
  const [activeTab, setActiveTab] = useState('market_feeds');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null);
  const [chatTarget, setChatTarget] = useState<{ userId: string; userName: string; initialMessage?: string } | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showBusinessWizard, setShowBusinessWizard] = useState(false);
  const [businessWizardRole, setBusinessWizardRole] = useState<'seller' | 'property_owner'>('seller');
  const [requestingRole, setRequestingRole] = useState<{ id: string; label: string } | null>(null);
  const [viewingPendingRole, setViewingPendingRole] = useState<{ id: string; label: string } | null>(null);

  const cancelRoleRequest = async (roleId: string) => {
    if (!user || !profile) return;
    try {
      const updatedPending = (profile.pending_roles || []).filter(r => r !== roleId);
      const { error } = await supabase.from('users').update({ 
        pending_roles: updatedPending,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);

      if (error) throw error;

      // Update local profile state
      setProfile(prev => prev ? { ...prev, pending_roles: updatedPending } : null);

      // Delete any pending KYC applications for this role
      await supabase.from('kyc_applications')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'pending');

      setViewingPendingRole(null);
      toast.success('Request cancelled successfully');
    } catch (error) {
      console.error("Error cancelling role request:", error);
      toast.error('Failed to cancel request');
    }
  };

  useEffect(() => {
    const handleOpenWizard = (e: any) => {
      if (e.detail?.role) {
        setBusinessWizardRole(e.detail.role);
      } else {
        setBusinessWizardRole('seller');
      }
      setShowBusinessWizard(true);
    };
    window.addEventListener('openBusinessWizard', handleOpenWizard);
    
    const handleNavigateToPropertyAgencyLanding = () => {
      setActiveTab('property_agency_landing');
    };
    window.addEventListener('navigateToPropertyAgencyLanding', handleNavigateToPropertyAgencyLanding);

    const handleNavigateToBusinessLanding = () => {
      setActiveTab('business_landing');
    };
    window.addEventListener('navigateToBusinessLanding', handleNavigateToBusinessLanding);

    const handleNavigateToTransportCompanyLanding = () => {
      setActiveTab('transport_company_landing');
    };
    window.addEventListener('navigateToTransportCompanyLanding', handleNavigateToTransportCompanyLanding);

    const handleNavigateToTransportBusiness = (e: any) => {
      if (e.detail?.businessId) {
        setSelectedBusinessId(e.detail.businessId);
        setActiveTab('transport_business_profile');
      }
    };
    window.addEventListener('navigateToTransportBusiness', handleNavigateToTransportBusiness);

    const handleNavigateToPropertyAgency = (e: any) => {
      if (e.detail?.agencyId) {
        setSelectedAgencyId(e.detail.agencyId);
        setActiveTab('property_agency_profile');
      }
    };
    window.addEventListener('navigateToPropertyAgency', handleNavigateToPropertyAgency);

    // Initialize exchange rates
    initializeExchangeRates();

    return () => {
      window.removeEventListener('openBusinessWizard', handleOpenWizard);
      window.removeEventListener('navigateToPropertyAgencyLanding', handleNavigateToPropertyAgencyLanding);
      window.removeEventListener('navigateToBusinessLanding', handleNavigateToBusinessLanding);
      window.removeEventListener('navigateToTransportCompanyLanding', handleNavigateToTransportCompanyLanding);
      window.removeEventListener('navigateToTransportBusiness', handleNavigateToTransportBusiness);
      window.removeEventListener('navigateToPropertyAgency', handleNavigateToPropertyAgency);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user?.id) {
          localStorage.setItem('amh_last_user_id', session.user.id);

          fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: session.user.id
            })
          }).catch(() => {});
        }
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Separate effect for profile and realtime subscription
  useEffect(() => {
    if (!user?.id || loading) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let isMounted = true;
    setProfileLoading(true);
    const channelId = `profile:${user.id}`;
    const channel = supabase.channel(channelId);

    const fetchProfile = async (retryCount = 0) => {
      try {
        // Stagger profile fetch slightly after session fetch
        if (retryCount === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!isMounted) return;

        const { data: userDoc, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (error) {
          const errMsg = error.message || String(error);
          // Handle lock or network errors by retrying
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch')) && retryCount < 2) {
            setTimeout(() => fetchProfile(retryCount + 1), 500);
            return;
          }
          // If profile not found, we create it (handled below)
          if (error.code !== 'PGRST116') throw error;
        }

        if (!isMounted) return;

        if (!userDoc && (!error || error.code === 'PGRST116')) {
          const isDefaultAdmin = user.email === 'eneerzack@gmail.com';
          const initialRoles = isDefaultAdmin ? ['buyer', 'admin'] : ['buyer'];
          const defaultName = user.email?.split('@')[0] || 'Anonymous';
          const newProfile: UserProfile = {
            id: user.id,
            username: user.user_metadata?.username || defaultName,
            email: user.email || '',
            roles: initialRoles as any,
            active_role: 'buyer'
          };
          await supabase.from('users').insert([newProfile]);
          if (isMounted) {
            setProfile(newProfile);
            setProfileLoading(false);
          }
        } else if (userDoc) {
          if (user.email === 'eneerzack@gmail.com' && (!userDoc.roles || !userDoc.roles.includes('admin'))) {
            const updatedRoles = [...(userDoc.roles || []), 'admin'];
            await supabase.from('users').update({ roles: updatedRoles }).eq('id', user.id);
            userDoc.roles = updatedRoles;
          }
          if (isMounted) {
            setProfile(userDoc as UserProfile);
            setProfileLoading(false);
          }
        }

        // Subscribe to changes
        channel
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'users', 
            filter: `id=eq.${user.id}` 
          }, payload => {
            if (isMounted) setProfile(payload.new as UserProfile);
          })
          .subscribe();

      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch')) {
          console.error("Error fetching profile:", error);
        }
        if (isMounted) setProfileLoading(false);
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('users').update({ ...data, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      
      // Update local state immediately so UI reflects changes without waiting for realtime subscription
      setProfile(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const switchRole = async (role: UserProfile['active_role']) => {
    if (!user || !profile) return;
    
    const currentRoles = profile.roles || ['buyer'];
    if (!currentRoles.includes(role)) {
      const isPending = profile.pending_roles?.includes(role as any);
      const roleLabels: Record<string, string> = {
        seller: 'Seller',
        transporter: 'Transporter',
        property_owner: 'Property Owner'
      };
      if (!isPending) {
        setRequestingRole({ id: role, label: roleLabels[role] || role });
      } else {
        setViewingPendingRole({ id: role, label: roleLabels[role] || role });
      }
      return;
    }

    const buyerOnlyTabs = ['transport_feeds', 'property_feeds'];
    const sellerOnlyTabs = ['store_manager'];
    const transporterOnlyTabs = ['delivery_jobs'];
    const propertyOwnerOnlyTabs = ['my_listings'];

    if (role !== 'buyer' && buyerOnlyTabs.includes(activeTab)) setActiveTab('dashboard');
    if (role !== 'seller' && sellerOnlyTabs.includes(activeTab)) setActiveTab('dashboard');
    if (role !== 'transporter' && transporterOnlyTabs.includes(activeTab)) setActiveTab('dashboard');
    if (role !== 'property_owner' && propertyOwnerOnlyTabs.includes(activeTab)) setActiveTab('dashboard');
    
    if (role === 'transporter' || role === 'property_owner') {
      if (activeTab === 'market_feeds') setActiveTab('dashboard');
    }

    try {
      await supabase.from('users').update({ active_role: role }).eq('id', user.id);
      setProfile({ ...profile, active_role: role });
    } catch (error) {
      console.error("Error switching role:", error);
    }
  };

  const requestRole = async (role: 'seller' | 'transporter' | 'property_owner') => {
    if (!user || !profile) return;
    
    const currentPending = profile.pending_roles || [];
    if (currentPending.includes(role) || profile.roles.includes(role)) return;

    const updatedPending = [...currentPending, role];
    try {
      await supabase.from('users').update({ pending_roles: updatedPending, updated_at: new Date().toISOString() }).eq('id', user.id);
      setProfile({ ...profile, pending_roles: updatedPending });
    } catch (error) {
      console.error("Error requesting role:", error);
    }
  };

  const handleLogin = async () => {
    // This is now handled by Auth/StaffAuth components via email/password
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setActiveTab('marketplace');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const confirmRoleRequest = async () => {
    if (requestingRole) {
      await requestRole(requestingRole.id as any);
      setRequestingRole(null);
    }
  };

  const isProfileComplete = profile && profile.phone && profile.country && profile.state && profile.address;

  const renderContent = () => {
    if (user && profile && !isProfileComplete) {
      return <Dashboard activeTab="dashboard" setActiveTab={setActiveTab} setChatTarget={setChatTarget} />;
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} setChatTarget={setChatTarget} />;
      case 'market_feeds':
        return <MarketFeeds setActiveTab={setActiveTab} setChatTarget={setChatTarget} />;
      case 'transport_feeds':
        return <TransportFeeds />;
      case 'property_feeds':
        return <PropertyFeeds />;
      case 'transport_business_profile':
        return selectedBusinessId ? (
          <TransportBusinessProfile 
            businessId={selectedBusinessId} 
            onBack={() => setActiveTab('transport_feeds')}
            onContact={(userId, userName) => {
              setChatTarget({ userId, userName });
              setActiveTab('chat');
            }}
          />
        ) : <TransportFeeds />;
      case 'property_agency_profile':
        return selectedAgencyId ? (
          <PropertyAgencyProfile 
            agencyId={selectedAgencyId} 
            onBack={() => setActiveTab('property_feeds')}
            onContact={(userId, userName) => {
              setChatTarget({ userId, userName });
              setActiveTab('chat');
            }}
          />
        ) : <PropertyFeeds />;
      case 'business_landing':
        return <BusinessLanding 
          onRegisterClick={() => {
            setBusinessWizardRole('seller');
            setShowBusinessWizard(true);
          }} 
          onBack={() => setActiveTab('market_feeds')} 
        />;
      case 'property_agency_landing':
        return <PropertyAgencyLanding
          onRegisterClick={() => {
            setBusinessWizardRole('property_owner');
            setShowBusinessWizard(true);
          }}
          onBack={() => setActiveTab('market_feeds')}
        />;
      case 'transport_company_landing':
        return <TransportCompanyLanding
          onRegisterClick={() => {
            setBusinessWizardRole('transporter');
            setShowBusinessWizard(true);
          }}
          onBack={() => setActiveTab('market_feeds')}
        />;
      case 'store_manager':
      case 'delivery_jobs':
      case 'my_listings':
        return <Dashboard activeTab={activeTab} setActiveTab={setActiveTab} setChatTarget={setChatTarget} />;
      case 'chat':
        return <Chat target={chatTarget} setTarget={setChatTarget} />;
      case 'legal_terms':
        return <Legal initialSection="terms" onBack={() => setActiveTab('dashboard')} />;
      case 'legal_privacy':
        return <Legal initialSection="privacy" onBack={() => setActiveTab('dashboard')} />;
      case 'legal_payment':
        return <Legal initialSection="payment" onBack={() => setActiveTab('dashboard')} />;
      case 'legal_dispatch':
        return <Legal initialSection="dispatch" onBack={() => setActiveTab('dashboard')} />;
      case 'legal_kyc':
        return <Legal initialSection="kyc" onBack={() => setActiveTab('dashboard')} />;
      default:
        return <MarketFeeds setActiveTab={setActiveTab} setChatTarget={setChatTarget} />;
    }
  };

  const authContextValue = useMemo(() => ({ 
    user, 
    profile, 
    loading: loading || profileLoading,
    switchRole,
    requestRole,
    updateProfile,
    logout,
    login: handleLogin 
  }), [user, profile, loading, profileLoading, switchRole, requestRole, updateProfile, logout, handleLogin]);

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={authContextValue}>
        <NotificationProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/admin/*" element={<AdminApp />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/*" element={
                <PublicApp 
                  loading={loading || (user && profileLoading)}
                  user={user}
                  handleLogin={handleLogin}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  renderContent={renderContent}
                />
              } />
            </Routes>
            <AnimatePresence>
              {showBusinessWizard && (
                <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
                  <BusinessOnboarding
                    onComplete={() => {
                      setShowBusinessWizard(false);
                      requestRole(businessWizardRole);
                      setActiveTab('dashboard');
                    }}
                    onCancel={() => setShowBusinessWizard(false)}
                  />
                </div>
              )}
              
              {requestingRole && requestingRole.id === 'seller' ? (
                <BecomeSellerModal
                  key="seller-modal"
                  isOpen={true}
                  onClose={() => setRequestingRole(null)}
                  onComplete={() => setRequestingRole(null)}
                />
              ) : requestingRole && requestingRole.id === 'transporter' ? (
                <BecomeTransporterModal
                  key="transporter-modal"
                  isOpen={true}
                  onClose={() => setRequestingRole(null)}
                  onComplete={() => setRequestingRole(null)}
                />
              ) : requestingRole && requestingRole.id === 'property_owner' ? (
                <BecomePropertyOwnerModal
                  key="property-modal"
                  isOpen={true}
                  onClose={() => setRequestingRole(null)}
                  onComplete={() => setRequestingRole(null)}
                />
              ) : requestingRole ? (
                <div key="standard-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-black/5"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                      <ShieldAlert size={32} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Request Access</h3>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                      You are requesting access to the <strong className="text-gray-900">{requestingRole.label}</strong> role. 
                      {requestingRole.id === 'property_owner' 
                        ? " Property owners must undergo strict verification to ensure the safety and legality of real estate transactions." 
                        : " This role requires verification by an administrator before you can access its features."}
                    </p>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setRequestingRole(null)}
                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmRoleRequest}
                        className="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                      >
                        Submit Request
                      </button>
                    </div>
                  </motion.div>
                </div>
              ) : viewingPendingRole ? (
                <div key="pending-modal" className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl border border-black/5"
                  >
                    <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                      <Clock size={32} className="animate-pulse" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-2">Request Pending</h3>
                    <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                      Your request for the <strong className="text-gray-900">{viewingPendingRole.label}</strong> role is currently under review by an administrator.
                    </p>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setViewingPendingRole(null)}
                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          cancelRoleRequest(viewingPendingRole.id);
                        }}
                        className="flex-1 py-3 px-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
                      >
                        Cancel Request
                      </button>
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>
            <AfroCreditWalletModal />
            <AfroCreditSpendModal />
          </BrowserRouter>
          <Toaster position="top-right" />
        </NotificationProvider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default App;

