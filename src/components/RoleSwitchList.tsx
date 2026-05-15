import React from 'react';
import { Lock, Clock } from 'lucide-react';
import { useAuth } from '../App';
import { SYSTEM_ROLES } from '../lib/roles';

interface RoleSwitchListProps {
  onSwitch?: () => void;
  containerClassName?: string;
  itemClassName?: string;
  iconClassName?: string;
  textClassName?: string;
}

export default function RoleSwitchList({ 
  onSwitch, 
  containerClassName,
  itemClassName,
  iconClassName,
  textClassName
}: RoleSwitchListProps) {
  const { profile, switchRole } = useAuth() || {};
  const isProfileComplete = !profile || (profile.phone && profile.country && profile.state && profile.address);

  if (!profile) return null;

  return (
    <div className={containerClassName || "space-y-1"}>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 px-2">Switch Role</p>
      {SYSTEM_ROLES.map((role) => {
        const hasRole = profile.roles?.includes(role.id as any);
        const isPending = profile.pending_roles?.includes(role.id as any);
        
        return (
          <button
            key={role.id}
            onClick={() => {
              if (switchRole && hasRole) {
                switchRole(role.id as any);
              } else if (switchRole && !hasRole) {
                switchRole(role.id as any); // The App.tsx `switchRole` handles role requests internally
              }
              onSwitch?.();
            }}
            disabled={!isProfileComplete}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all text-left ${itemClassName || ''} ${
              !isProfileComplete ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              profile.active_role === role.id 
                ? 'bg-emerald-50 text-emerald-600' 
                : isPending
                  ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <role.icon className={iconClassName || "w-4 h-4"} />
              <span className={textClassName || "text-xs font-bold"}>{role.label}</span>
            </div>
            {!hasRole && !isPending && <Lock size={12} className="opacity-50" />}
            {isPending && <Clock size={12} className="animate-pulse text-amber-500" />}
          </button>
        );
      })}
    </div>
  );
}
