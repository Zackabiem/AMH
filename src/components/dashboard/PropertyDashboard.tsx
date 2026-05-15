import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  CheckCircle, 
  PlusCircle, 
  User, 
  Home, 
  MessageSquare, 
  TrendingUp,
  BarChart3,
  ArrowRight,
  Info
} from 'lucide-react';
import { useAuth } from '../../App';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import FinanceView from './FinanceView';
import BusinessOnboarding from '../BusinessOnboarding';
import PropertyForm from '../PropertyForm';
import PriceDisplay from '../PriceDisplay';
import { Edit3, Trash2 } from 'lucide-react';


interface PropertyDashboardProps {
  setActiveTab?: (tab: string) => void;
  setShowProfile?: (show: boolean) => void;
}

const PropertyDashboard: React.FC<PropertyDashboardProps> = ({ setActiveTab, setShowProfile }) => {
  const { user, profile } = useAuth() || {};
  const [activeView, setActiveView] = useState<'overview' | 'finance'>('overview');
  const [showBusinessOnboarding, setShowBusinessOnboarding] = useState(false);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Enterprise state
  const isEnterprise = !!profile?.business_name;
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'portfolio' | 'team'>('overview');
  
  // Team state
  const [team, setTeam] = useState<any[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'agent', branchId: 'main' });
  
  // Properties state
  const [properties, setProperties] = useState<any[]>([]);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);
  
  // Property counts
  const [propertyCount, setPropertyCount] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;

    let isMounted = true;

    const checkBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from('business_members')
          .select('*')
          .eq('user_id', profile.id)
          .limit(1);
        if (!error && data && data.length > 0 && isMounted) {
          setIsBusinessOwner(true);
        }
        if (isMounted) setLoading(false);
      } catch (err) {
        console.error("Error checking business membership:", err);
        if (isMounted) setLoading(false);
      }
    };

    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('owner_id', profile.id)
          .order('created_at', { ascending: false });
        if (!error && data && isMounted) {
          setProperties(data);
          setPropertyCount(data.length);
        }
      } catch (err) {
        console.error("Error fetching properties:", err);
      }
    };

    const handleAddPropertySuccess = () => {
      toast.success('Credits used! You can now add a new property.');
      setShowPropertyForm(true);
    };

    window.addEventListener('afroCreditSpendSuccess_addProperty', handleAddPropertySuccess);

    checkBusiness();
    fetchProperties();
    
    if (profile?.property_owner_kyc_type === 'business_property_owner' && !isBusinessOwner) {
      setShowBusinessOnboarding(true);
    }

    const fetchTeam = async () => {
      try {
        const { data: teamData, error: teamError } = await supabase
          .from('business_members')
          .select(`
            id,
            role,
            store_id,
            status,
            users (
              name,
              email
            )
          `)
          .eq('business_id', profile.business_id || profile.id);

        if (!teamError && teamData && isMounted) {
          setTeam(teamData.map(member => ({
            id: member.id,
            name: (member.users as any)?.name || 'Unknown',
            email: (member.users as any)?.email || 'Unknown',
            role: member.role,
            branchId: member.store_id || 'main',
            status: member.status
          })));
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
      }
    };

    fetchTeam();

    return () => {
      isMounted = false;
      window.removeEventListener('afroCreditSpendSuccess_addProperty', handleAddPropertySuccess);
    };
  }, [profile?.id, isEnterprise]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    try {
      // 1. Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, username, email')
        .eq('email', newStaff.email)
        .single();
        
      if (userError || !userData) {
        toast.error('User not found. They must create an account first.');
        return;
      }

      // 2. Insert into business_members
      const { data, error } = await supabase.from('business_members').insert({
        business_id: profile.business_id || profile.id,
        user_id: userData.id,
        role: newStaff.role,
        store_id: newStaff.branchId === 'main' ? null : newStaff.branchId,
        status: 'active'
      }).select().single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This user is already a staff member.');
          return;
        }
        throw error;
      }

      setTeam([...team, { 
        id: data.id,
        name: userData.username || 'Unknown',
        email: userData.email,
        role: newStaff.role,
        branchId: newStaff.branchId,
        status: 'active'
      }]);
      setNewStaff({ name: '', email: '', role: 'agent', branchId: 'main' });
      setShowAddStaff(false);
      toast.success('Staff member added successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add staff');
    }
  };

  if (activeView === 'finance' && profile) {
    return (
      <FinanceView 
        targetId={user?.uid || ''}
        targetType="user"
        targetData={{
          totalDebt: profile.totalDebt || 0,
          lockThreshold: profile.lockThreshold || 50,
          isLocked: profile.isLocked || false,
          name: profile.username || profile.displayName || 'Property Owner'
        }}
        sellerId={user?.uid || ''}
        onBack={() => setActiveView('overview')}
      />
    );
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
  }

  if (showBusinessOnboarding) {
    return (
      <div className="max-w-4xl mx-auto">
        <BusinessOnboarding 
          role="property_owner"
          onComplete={() => {
            setIsBusinessOwner(true);
            setShowBusinessOnboarding(false);
          }}
          onCancel={() => setShowBusinessOnboarding(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {isEnterprise ? profile?.business_name : (profile?.username || 'Property Owner')}
            </h1>
            <p className="text-gray-500 font-medium">
              {isEnterprise ? 'Real Estate Agency' : 'Independent Property Owner'}
            </p>
          </div>
        </div>
      </div>

      {isEnterprise && (
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeSubTab === 'overview'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveSubTab('portfolio')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeSubTab === 'portfolio'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Portfolio
          </button>
          <button
            onClick={() => setActiveSubTab('team')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeSubTab === 'team'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Team
          </button>
        </div>
      )}

      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => {
              if (propertyCount >= 2) {
                // Must pay credits
                if ((profile?.afro_credits || 0) < 50) {
                  toast.error('Insufficient Afro Credits. You need 50 AC to list an additional property.');
                  window.dispatchEvent(new CustomEvent('openAfroCreditWallet'));
                  return;
                }
                window.dispatchEvent(new CustomEvent('requestAfroCreditSpend', {
                  detail: {
                    title: 'Unlock Additional Property Listing',
                    description: 'You have reached your 2 free listings limit. Spend 50 AC to add this property.',
                    cost: 50,
                    actionType: 'addProperty',
                    targetId: user?.uid || ''
                  }
                }));
              } else {
                setShowPropertyForm(true);
              }
            }}
            className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group relative"
          >
            {propertyCount >= 2 && (
              <div className="absolute top-4 right-4 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-[10px] font-black tracking-widest shadow-sm">
                50 AC REQUIRED
              </div>
            )}
            <div className="w-12 h-12 bg-purple-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-100">
              <PlusCircle size={24} />
            </div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-purple-600 transition-colors">Add Property Listing</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Post a new property for sale or rent. ({propertyCount}/2 Free)</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => setActiveTab?.('properties')}
            className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-blue-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-100">
              <Home size={24} />
            </div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">Property Listings</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Manage your existing real estate.</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => setActiveTab?.('chat')}
            className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-100">
              <MessageSquare size={24} />
            </div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-orange-600 transition-colors">Property Enquiries</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Respond to potential buyers/tenants.</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            onClick={() => setActiveView('finance')}
            className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-100">
              <TrendingUp size={24} />
            </div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-emerald-600 transition-colors">Finance & Commission</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Manage your debt and view transaction history.</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -5 }}
            className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-100">
              <BarChart3 size={24} />
            </div>
            <h3 className="font-bold text-lg mb-1 group-hover:text-indigo-600 transition-colors">Property Analytics</h3>
            <p className="text-gray-400 text-sm leading-relaxed">See how your listings are performing.</p>
          </motion.div>
        </div>
      )}

      {activeSubTab === 'portfolio' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Your Properties</h2>
              <p className="text-gray-500">Manage your real estate listings and portfolio.</p>
            </div>
            <button 
              onClick={() => {
                if (propertyCount >= 2) {
                  if ((profile?.afro_credits || 0) < 50) {
                    toast.error('Insufficient Afro Credits.');
                    window.dispatchEvent(new CustomEvent('openAfroCreditWallet'));
                    return;
                  }
                  window.dispatchEvent(new CustomEvent('requestAfroCreditSpend', {
                    detail: {
                      title: 'Unlock Additional Property Listing',
                      description: 'Spend 50 AC to add this property.',
                      cost: 50,
                      actionType: 'addProperty',
                      targetId: user?.uid || ''
                    }
                  }));
                } else {
                  setShowPropertyForm(true);
                }
              }}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <PlusCircle size={20} />
              Add Property
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => (
              <div key={property.id} className="bg-white rounded-[32px] border border-black/5 overflow-hidden group hover:shadow-xl transition-all">
                <div className="h-48 bg-gray-100 relative">
                  {property.image_url ? (
                    <img src={property.image_url} alt={property.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <Home size={40} />
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-black shadow-sm text-gray-700">
                    {property.type}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-black text-lg mb-1">{property.title}</h3>
                  <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                    <MapPin size={14} /> {property.location}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl font-black">
                      <PriceDisplay amount={property.price} />
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingProperty(property);
                          setShowPropertyForm(true);
                        }}
                        className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this property?')) {
                            const { error } = await supabase.from('properties').delete().eq('id', property.id);
                            if (error) toast.error('Error deleting property');
                            else {
                               toast.success('Property deleted');
                               setProperties(properties.filter(p => p.id !== property.id));
                               try { await fetch('/api/estate-clear', { method: 'POST' }); } catch(e){}
                            }
                          }
                        }}
                        className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {properties.length === 0 && (
              <div className="col-span-full py-12 text-center bg-white rounded-[32px] border border-black/5">
                <Home className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-xl font-black text-gray-900 mb-2">No Properties Yet</h3>
                <p className="text-gray-500">Add your first property to start receiving enquiries.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'team' && isEnterprise && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Agency Team</h2>
              <p className="text-gray-500">Add real estate agents, managers, and assign them to properties.</p>
            </div>
            <button 
              onClick={() => setShowAddStaff(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <PlusCircle size={20} />
              Add Staff
            </button>
          </div>

          {showAddStaff && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Team Member</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 mb-6">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Notice:</span> Business owners are responsible for actions of their staff accounts. Ensure you only add trusted individuals.
                </p>
              </div>

              <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Jane Smith"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="jane@agency.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                  <select 
                    required
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="agent">Real Estate Agent</option>
                    <option value="manager">Property Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Branch / Office</label>
                  <select 
                    required
                    value={newStaff.branchId}
                    onChange={(e) => setNewStaff({...newStaff, branchId: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="main">Main Office</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddStaff(false)}
                    className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    Send Invite
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {team.length === 0 ? (
              <div className="p-12 text-center">
                <User className="mx-auto text-gray-300 mb-3" size={48} />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No team members yet</h3>
                <p className="text-gray-500">Add your first agent to start delegating properties.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 font-bold text-gray-600 text-sm">Name</th>
                      <th className="p-4 font-bold text-gray-600 text-sm">Role</th>
                      <th className="p-4 font-bold text-gray-600 text-sm">Office</th>
                      <th className="p-4 font-bold text-gray-600 text-sm">Status</th>
                      <th className="p-4 font-bold text-gray-600 text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.map(staff => (
                      <tr key={staff.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{staff.name}</div>
                          <div className="text-xs text-gray-500">{staff.email}</div>
                        </td>
                        <td className="p-4">
                          <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-bold capitalize">
                            {staff.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-700">
                          {staff.branchId === 'main' ? 'Main Office' : 'Unknown'}
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                            <CheckCircle size={14} /> Active
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="text-purple-600 hover:text-purple-800 font-bold text-sm">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {showPropertyForm && (
        <PropertyForm 
          propertyToEdit={editingProperty}
          onClose={() => {
            setShowPropertyForm(false);
            setEditingProperty(null);
          }}
          onSuccess={() => {
            setShowPropertyForm(false);
            setEditingProperty(null);
            // We could just refresh properties here but they'll reflect on reload for now
          }}
        />
      )}
    </div>
  );
};

export default PropertyDashboard;
