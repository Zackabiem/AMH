import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Truck, 
  Home, 
  MessageSquare, 
  User, 
  LayoutDashboard, 
  Store, 
  ClipboardList, 
  Building2,
  LogOut,
  ChevronDown,
  RefreshCcw,
  Lock,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../App';
import BecomeSellerModal from './BecomeSellerModal';

import NotificationBell from './NotificationBell';
import { SYSTEM_ROLES } from '../lib/roles';
import RoleSwitchList from './RoleSwitchList';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { profile, logout, switchRole, requestRole } = useAuth() || {};
  const [showRoleSwitcher, setShowRoleSwitcher] = React.useState(false);
  const navRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setShowRoleSwitcher(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const active_role = profile?.active_role || 'buyer';
  const isProfileComplete = !profile || (profile.phone && profile.country && profile.state && profile.address);

  const roles = SYSTEM_ROLES;

  const handleRoleClick = async (role: any) => {
    if (switchRole) {
      await switchRole(role.id);
      setShowRoleSwitcher(false);
    }
  };

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['all'] },
    { id: 'market_feeds', label: 'Marketplace', icon: ShoppingBag, roles: ['buyer', 'seller'] },
    { id: 'store_manager', label: 'My Store', icon: Store, roles: ['seller'] },
    { id: 'transport_feeds', label: 'Transport', icon: Truck, roles: ['buyer'] },
    { id: 'delivery_jobs', label: 'Delivery Jobs', icon: ClipboardList, roles: ['transporter'] },
    { id: 'property_feeds', label: 'Properties', icon: Home, roles: ['buyer'] },
    { id: 'my_listings', label: 'My Listings', icon: Building2, roles: ['property_owner'] },
    { id: 'chat', label: 'Messages', icon: MessageSquare, roles: ['all'] },
  ];

  const tabs = allTabs.filter(tab => tab.roles.includes('all') || tab.roles.includes(active_role));

  const AfroCreditBadge = () => (
    <div 
      onClick={() => window.dispatchEvent(new CustomEvent('openAfroCreditWallet'))}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl font-black text-xs shadow-sm cursor-pointer hover:bg-purple-100 transition-colors shrink-0" title="Afro Credits"
    >
      {/* Fake coin icon */}
      <div className="w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center text-[10px]">&cent;</div>
      <span>{profile?.afro_credits?.toLocaleString() || '0'} AC</span>
    </div>
  );

  return (
    <>
    <nav ref={navRef} className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-black/5 px-2 py-2 flex justify-around items-center md:sticky md:top-0 md:flex-col md:h-screen md:w-64 md:border-r md:border-t-0 md:justify-start md:pt-6 md:gap-2 z-50">
      <div className="hidden md:flex mb-8 px-4 items-center justify-between w-full">
        <img src="/logo.png" alt="African Market Hub" className="w-40 h-auto object-contain shrink-0" />
        <div className="flex items-center gap-2">
          {active_role !== 'buyer' && <AfroCreditBadge />}
          <NotificationBell />
        </div>
      </div>
      
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (!isProfileComplete && tab.id !== 'dashboard') return;
              setActiveTab(tab.id);
              setShowRoleSwitcher(false);
            }}
            disabled={!isProfileComplete && tab.id !== 'dashboard'}
            className={cn(
              "flex flex-col items-center gap-0.5 p-1.5 rounded-2xl transition-all md:flex-row md:w-full md:px-4 md:py-2.5 md:gap-3",
              activeTab === tab.id 
                ? "text-emerald-600 bg-emerald-50 shadow-sm shadow-emerald-100" 
                : "text-gray-400 hover:bg-gray-50 hover:text-gray-600",
              !isProfileComplete && tab.id !== 'dashboard' ? "opacity-50 cursor-not-allowed" : ""
            )}
          >
            <Icon className="w-5 h-5 md:w-[18px] md:h-[18px]" strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className="text-[9px] md:text-xs font-bold">{tab.label}</span>
          </button>
        );
      })}

      {/* Mobile Profile Button */}
      <div className="md:hidden relative">
        <button
          onClick={() => {
            if (!isProfileComplete) return;
            setShowRoleSwitcher(!showRoleSwitcher);
          }}
          disabled={!isProfileComplete}
          className={cn(
            "flex flex-col items-center gap-0.5 p-1.5 rounded-2xl transition-all",
            showRoleSwitcher ? "text-emerald-600 bg-emerald-50" : "text-gray-400",
            !isProfileComplete ? "opacity-50 cursor-not-allowed" : ""
          )}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-bold">Profile</span>
        </button>
        
        <AnimatePresence>
          {showRoleSwitcher && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full right-0 w-64 mb-4 bg-white border border-black/5 rounded-[32px] shadow-2xl p-6 z-[60]"
            >
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                  <User size={24} />
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-black truncate text-gray-900">{profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : profile?.username || 'User'}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{profile?.active_role}</p>
                </div>
              </div>

              <RoleSwitchList 
                onSwitch={() => setShowRoleSwitcher(false)} 
                containerClassName="space-y-1 mb-6"
                itemClassName="px-4 py-3"
                iconClassName="w-4 h-4"
                textClassName="text-xs font-bold"
              />

              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-4 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all"
              >
                <LogOut size={18} />
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden md:mt-auto md:block w-full px-4 pb-6">
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">System Status</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ? "bg-emerald-500" : "bg-amber-500")} />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Map Engine</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-xl">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Firestore DB</span>
          </div>
        </div>
        
        <div className="relative role-switcher-container">
          {showRoleSwitcher && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-black/5 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
              <RoleSwitchList 
                onSwitch={() => setShowRoleSwitcher(false)} 
                containerClassName="space-y-0.5"
                itemClassName="px-3 py-1.5"
                iconClassName="w-3.5 h-3.5"
                textClassName="text-[10px] font-bold"
              />
              <div className="mt-2 pt-2 border-t border-black/10">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-all text-left group/logout"
                >
                  <LogOut className="w-3.5 h-3.5 group-hover/logout:-translate-x-0.5 transition-transform" />
                  <span className="text-[10px] font-bold">Logout</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-2 bg-white border border-black/5 rounded-2xl shadow-sm group relative">
            <button 
              onClick={() => {
                setShowRoleSwitcher(!showRoleSwitcher);
              }}
              className={cn(
                "w-8 h-8 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100 transition-transform shrink-0 hover:scale-105"
              )}
            >
              <User className="w-4 h-4" />
            </button>
            <div 
              className="overflow-hidden flex-1 cursor-pointer"
              onClick={() => {
                setShowRoleSwitcher(!showRoleSwitcher);
              }}
            >
              <p className="text-xs font-black truncate text-gray-900">{profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : profile?.username || 'User'}</p>
              <div className="flex items-center gap-1">
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{profile?.active_role || 'Buyer'}</p>
                <ChevronDown className={cn("w-3 h-3 text-emerald-600 transition-transform", showRoleSwitcher && "rotate-180")} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-black/5 px-4 flex items-center justify-between z-40">
      <div className="flex items-center gap-3 min-w-0">
        <img src="/logo.png" alt="AMH" className="w-[120px] h-10 object-contain shrink-0" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {active_role !== 'buyer' && <AfroCreditBadge />}
        <NotificationBell />
      </div>
    </div>
    </>
  );
};

export default Navbar;
