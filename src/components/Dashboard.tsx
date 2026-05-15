import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { 
  ShoppingBag, 
  Truck, 
  Home, 
  LayoutDashboard, 
  Store,
  ChevronRight,
  TrendingUp,
  Package,
  CheckCircle2,
  PlusCircle,
  Settings,
  User,
  Lock,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatPrice } from '../lib/currency';
import PriceDisplay from './PriceDisplay';

import BuyerDashboard from './dashboard/BuyerDashboard';
import SellerDashboard from './dashboard/SellerDashboard';
import TransporterDashboard from './dashboard/TransporterDashboard';
import PropertyDashboard from './dashboard/PropertyDashboard';
import AdminDashboard from './dashboard/AdminDashboard';
import UserProfile from './UserProfile';

import { SYSTEM_ROLES } from '../lib/roles';
import RoleSwitchList from './RoleSwitchList';

interface DashboardProps {
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  setChatTarget?: (target: { userId: string; userName: string; initialMessage?: string } | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ activeTab, setActiveTab, setChatTarget }) => {
  const { profile, switchRole, refreshProfile } = useAuth() || {};
  const [isSwitching, setIsSwitching] = useState(false);
  
  const isProfileComplete = profile && profile.phone && profile.country && profile.state && profile.address;
  const [showProfile, setShowProfile] = useState(!isProfileComplete);

  useEffect(() => {
    if (!isProfileComplete) {
      setShowProfile(true);
    }
  }, [isProfileComplete]);

  if (!profile) return null;

  const roles = SYSTEM_ROLES;

  const ModuleLoader = () => {
    switch (profile.active_role) {
      case 'admin': return <AdminDashboard />;
      case 'buyer': return <BuyerDashboard setActiveTab={setActiveTab} setShowProfile={setShowProfile} />;
      case 'seller': return <SellerDashboard initialView={activeTab === 'store_manager' ? 'store_manager' : 'overview'} setActiveTab={setActiveTab} setChatTarget={setChatTarget} setShowProfile={setShowProfile} />;
      case 'transporter': return <TransporterDashboard setActiveTab={setActiveTab} setShowProfile={setShowProfile} />;
      case 'property_owner': return <PropertyDashboard setActiveTab={setActiveTab} setShowProfile={setShowProfile} />;
      default: return <BuyerDashboard setActiveTab={setActiveTab} setShowProfile={setShowProfile} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <header className="mb-4 md:mb-8 flex justify-end gap-6">
        <div className="flex items-center gap-3">
          {!isProfileComplete && showProfile && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-sm font-bold">
              <AlertCircle size={16} />
              Please complete your profile to continue
            </div>
          )}
          <button
            onClick={() => {
              if (showProfile && !isProfileComplete) return;
              setShowProfile(!showProfile);
            }}
            disabled={showProfile && !isProfileComplete}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all font-bold text-sm ${
              showProfile 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' 
                : 'bg-white text-gray-600 border-black/5 shadow-sm hover:shadow-md'
            } ${showProfile && !isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <User size={18} />
            {showProfile ? 'Back to Dashboard' : 'My Profile'}
          </button>

          <div className="relative">
            <button
              onClick={() => {
                if (!isProfileComplete) return;
                setIsSwitching(!isSwitching);
              }}
              disabled={!isProfileComplete}
              className={`flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-black/5 shadow-sm transition-all font-bold text-sm ${
                !isProfileComplete ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'
              }`}
            >
              <LayoutDashboard size={18} className="text-emerald-600" />
              Switch Role
              <ChevronRight size={16} className={`text-gray-400 transition-transform ${isSwitching ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {isSwitching && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-black/5 p-3 z-50"
                >
                  <RoleSwitchList 
                    onSwitch={() => setIsSwitching(false)} 
                    containerClassName="space-y-1"
                    itemClassName="p-3"
                    iconClassName="w-5 h-5"
                    textClassName="text-sm font-bold"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {!showProfile && (
        <>
          {/* Verification Center */}
          {profile.pending_roles && profile.pending_roles.length > 0 && (
            <section className="mb-12">
              <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900">Verification Center</h2>
                    <p className="text-sm text-amber-700 font-medium">Your applications are currently being reviewed.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.pending_roles.map((role) => (
                    <div key={role} className="bg-white p-6 rounded-2xl border border-amber-100 shadow-sm flex flex-col justify-between">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
                            {role === 'transporter' ? <Truck size={20} /> : 
                             role === 'property_owner' ? <Home size={20} /> : 
                             role === 'seller' ? <Store size={20} /> : <User size={20} />}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 capitalize">{role.replace('_', ' ')}</p>
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Review</p>
                          </div>
                        </div>
                        <Clock size={18} className="text-amber-400 animate-pulse" />
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <AlertCircle size={14} className="text-amber-500" />
                          <span>Estimated time: 24-48 hours</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {!showProfile && (
            <section className="mb-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-emerald-600 p-8 rounded-[40px] text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest mb-2">
                  {profile.active_role === 'buyer' ? 'Total Spent' : 'Total Earnings'}
                </p>
                <h2 className="text-4xl font-black">
                  <PriceDisplay 
                    amount={profile.active_role === 'buyer' ? 1240 : 12450} 
                    sourceCountry="Nigeria" 
                    targetCountry={profile?.country}
                    className=""
                    originalPriceClassName="text-sm font-bold text-emerald-100/60 line-through ml-2"
                  />
                </h2>
                <div className="mt-4 flex items-center gap-2 text-emerald-100 text-xs font-bold">
                  <TrendingUp size={14} />
                  {profile.active_role === 'buyer' ? '15 orders this month' : '+12% from last month'}
                </div>
              </div>
              <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">
                  {profile.active_role === 'buyer' ? 'My Orders' : 'Active Orders'}
                </p>
                <h2 className="text-4xl font-black">{profile.active_role === 'buyer' ? '12' : '24'}</h2>
                <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                  <Package size={14} />
                  {profile.active_role === 'buyer' ? '2 in transit' : '4 pending shipment'}
                </div>
              </div>
              <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">
                  {profile.active_role === 'buyer' ? 'Buyer Rating' : 'Trust Score'}
                </p>
                <h2 className="text-4xl font-black">{profile.buyerTrustScore || 98}%</h2>
                <div className="mt-4 flex items-center gap-2 text-emerald-600 text-xs font-bold">
                  <CheckCircle2 size={14} />
                  Verified Account
                </div>
              </div>
            </div>
          </section>
          )}
        </>
      )}

    <section className="space-y-12">
        {showProfile ? (
          <UserProfile />
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black tracking-tight">Active Modules</h2>
              <button className="text-emerald-600 font-bold text-sm hover:underline">Customize Layout</button>
            </div>
            <ModuleLoader />
          </>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
