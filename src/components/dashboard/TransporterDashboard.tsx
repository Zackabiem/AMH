import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Truck, 
  MapPin, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  Power,
  Navigation,
  Check,
  User,
  PlusCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../App';
import { formatPrice } from '../../lib/currency';
import PriceDisplay from '../PriceDisplay';
import { toast } from 'sonner';
import BusinessOnboarding from '../BusinessOnboarding';
import { DriverPortal } from '../logistics/DriverPortal';

interface TransporterDashboardProps {
  setActiveTab?: (tab: string) => void;
  setShowProfile?: (show: boolean) => void;
}

const TransporterDashboard: React.FC<TransporterDashboardProps> = ({ setActiveTab, setShowProfile }) => {
  const { profile } = useAuth() || {};
  const [transporterProfile, setTransporterProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showBusinessOnboarding, setShowBusinessOnboarding] = useState(false);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  
  // Setup form state
  const [setupName, setSetupName] = useState(profile?.username || '');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupVehicle, setSetupVehicle] = useState('Motorcycle');

  // Jobs state
  const [incomingJobs, setIncomingJobs] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<any[]>([]);
  const [poolJobs, setPoolJobs] = useState<any[]>([]);

  // Enterprise state
  const isEnterprise = !!profile?.business_name;
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'branches' | 'team'>('overview');
  const [branches, setBranches] = useState<any[]>([]);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({ name: '', location: '', manager: '', phone: '' });

  // Team state
  const [team, setTeam] = useState<any[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'driver', branchId: '' });

  // If they are an individual dispatcher, route them immediately to the new Driver Portal
  if (!isEnterprise && !loading && transporterProfile) {
    return <DriverPortal />;
  }

  useEffect(() => {
    if (!profile?.id) return;

    let isMounted = true;

    // 1. Fetch Transporter Profile
    const fetchProfile = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('transporters')
          .select('*')
          .eq('user_id', profile.id)
          .limit(1);
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchProfile(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        if (data && data.length > 0) {
          const t = data[0];
          if (isMounted) {
            setTransporterProfile({
              ...t,
              userId: t.user_id,
              vehicleType: t.vehicle_type,
              isOnline: t.is_online,
              createdAt: t.created_at,
              updatedAt: t.updated_at
            });
          }
        } else {
          if (isMounted) setTransporterProfile(null);
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching transporter profile:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchBusinessMember = async () => {
      if (!profile?.id) return;
      try {
        const { data, error } = await supabase
          .from('business_members')
          .select('*')
          .eq('user_id', profile.id)
          .limit(1);
        if (!error && data && data.length > 0) {
          setIsBusinessOwner(true);
        }
      } catch (err) {
        console.error("Error checking business membership:", err);
      }
    };

    fetchProfile();
    fetchBusinessMember();
    
    if (profile?.transporter_kyc_type === 'business_transporter' && !isBusinessOwner) {
      setShowBusinessOnboarding(true);
    }

    const profileSubscription = supabase.channel('transporter_profile_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transporters', filter: `user_id=eq.${profile.id}` }, () => {
        if (isMounted) fetchProfile();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(profileSubscription);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (!transporterProfile?.id) return;

    let isMounted = true;

    // 2. Fetch Incoming & Active Jobs for this transporter
    const fetchMyJobs = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('transport_jobs')
          .select('*')
          .eq('transporter_id', transporterProfile.id);
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchMyJobs(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        const jobs = (data || []).map(j => ({
          ...j,
          orderId: j.order_id,
          storeId: j.store_id,
          buyerId: j.buyer_id,
          transporterId: j.transporter_id,
          transporterName: j.transporter_name,
          deliveryAddress: j.delivery_address,
          deliveryFee: j.delivery_fee,
          pickupAddress: j.pickup_address,
          acceptedAt: j.accepted_at,
          createdAt: j.created_at,
          updatedAt: j.updated_at
        }));

        if (isMounted) {
          setIncomingJobs(jobs.filter(j => j.status === 'pending_acceptance'));
          setActiveJobs(jobs.filter(j => ['accepted', 'picked_up', 'in_transit'].includes(j.status)));
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching my jobs:', error);
        }
      }
    };

    // 3. Fetch Pool Jobs (Store Dispatcher requests waiting for anyone)
    const fetchPoolJobs = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 600));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('transport_jobs')
          .select('*')
          .eq('method', 'store_dispatcher')
          .eq('status', 'awaiting_transporter');
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchPoolJobs(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        const jobs = (data || []).map(j => ({
          ...j,
          orderId: j.order_id,
          storeId: j.store_id,
          buyerId: j.buyer_id,
          transporterId: j.transporter_id,
          transporterName: j.transporter_name,
          deliveryAddress: j.delivery_address,
          deliveryFee: j.delivery_fee,
          pickupAddress: j.pickup_address,
          acceptedAt: j.accepted_at,
          createdAt: j.created_at,
          updatedAt: j.updated_at
        }));

        if (isMounted) {
          setPoolJobs(jobs);
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching pool jobs:', error);
        }
      }
    };

    fetchMyJobs();
    fetchPoolJobs();

    const myJobsSubscription = supabase.channel('transporter_my_jobs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_jobs', filter: `transporter_id=eq.${transporterProfile.id}` }, () => {
        if (isMounted) fetchMyJobs();
      })
      .subscribe();

    const poolJobsSubscription = supabase.channel('transporter_pool_jobs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_jobs', filter: `method=eq.store_dispatcher` }, () => {
        if (isMounted) fetchPoolJobs();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(myJobsSubscription);
      supabase.removeChannel(poolJobsSubscription);
    };
  }, [transporterProfile?.id]);


  const handleSetupProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('transporters')
        .insert({
          user_id: profile.id,
          name: setupName,
          phone: setupPhone,
          vehicle_type: setupVehicle,
          is_online: false
        });
      if (error) throw error;
    } catch (error) {
      console.error('Error creating transporter profile:', error);
    }
  };

  const toggleOnlineStatus = async () => {
    if (!transporterProfile?.id) return;
    
    // If going online
    if (!transporterProfile.isOnline) {
      try {
        const { error } = await supabase
          .from('transporters')
          .update({ is_online: true })
          .eq('id', transporterProfile.id);
        if (error) throw error;
        toast.success('You are now online!');
      } catch (error) {
        console.error('Error updating online status:', error);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from('transporters')
        .update({ is_online: false })
        .eq('id', transporterProfile.id);
      if (error) throw error;
      toast.success('You are now offline.');
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const handleAcceptJob = async (jobId: string, orderId: string) => {
    try {
      const { error: jobError } = await supabase
        .from('transport_jobs')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', jobId);
      if (jobError) throw jobError;

      // Update order status to indicate transporter is assigned
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          transporter_status: 'accepted'
        })
        .eq('id', orderId);
      if (orderError) throw orderError;
    } catch (error) {
      console.error('Error accepting job:', error);
    }
  };

  const handleRejectJob = async (jobId: string, orderId: string) => {
    try {
      const { error: jobError } = await supabase
        .from('transport_jobs')
        .update({
          status: 'rejected',
          transporter_id: null // Remove assignment so buyer can pick someone else
        })
        .eq('id', jobId);
      if (jobError) throw jobError;
      
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          transport_requested: false,
          transporter_id: null,
          transport_method: null
        })
        .eq('id', orderId);
      if (orderError) throw orderError;
    } catch (error) {
      console.error('Error rejecting job:', error);
    }
  };

  const handleClaimPoolJob = async (jobId: string, orderId: string) => {
    if (!transporterProfile?.id) return;
    try {
      const { error: jobError } = await supabase
        .from('transport_jobs')
        .update({
          status: 'accepted',
          transporter_id: transporterProfile.id,
          transporter_name: transporterProfile.name,
          accepted_at: new Date().toISOString()
        })
        .eq('id', jobId);
      if (jobError) throw jobError;
      
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          transporter_id: transporterProfile.id,
          transporter_status: 'accepted'
        })
        .eq('id', orderId);
      if (orderError) throw orderError;
    } catch (error) {
      console.error('Error claiming job:', error);
    }
  };

  const handleUpdateJobStatus = async (jobId: string, orderId: string, newStatus: string, orderStatus: string) => {
    try {
      const { error: jobError } = await supabase
        .from('transport_jobs')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      if (jobError) throw jobError;
      
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          transporter_status: newStatus
        })
        .eq('id', orderId);
      if (orderError) throw orderError;
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  if (showBusinessOnboarding) {
    return (
      <div className="max-w-4xl mx-auto">
        <BusinessOnboarding 
          role="transporter"
          onComplete={() => {
            setIsBusinessOwner(true);
            setShowBusinessOnboarding(false);
          }}
          onCancel={() => setShowBusinessOnboarding(false)}
        />
      </div>
    );
  }

  if (!transporterProfile) {
    return (
      <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
          <Truck size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          {isEnterprise ? 'Setup Transport Company' : 'Setup Transporter Profile'}
        </h2>
        <p className="text-gray-500 mb-8">
          {isEnterprise ? 'Complete your company profile to start managing branches and fleets.' : 'Complete your profile to start receiving delivery requests.'}
        </p>
        
        <form onSubmit={handleSetupProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {isEnterprise ? 'Company Representative Name' : 'Full Name'}
            </label>
            <input 
              type="text" 
              required
              value={setupName}
              onChange={(e) => setSetupName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
            <input 
              type="tel" 
              required
              value={setupPhone}
              onChange={(e) => setSetupPhone(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Vehicle Type</label>
            <select 
              value={setupVehicle}
              onChange={(e) => setSetupVehicle(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Motorcycle">Motorcycle</option>
              <option value="Car">Car</option>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
            </select>
          </div>
          <button 
            type="submit"
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black hover:bg-indigo-700 transition-colors mt-4"
          >
            Complete Setup
          </button>
        </form>
      </div>
    );
  }

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    
    try {
      const { data, error } = await supabase.from('stores').insert({
        owner_type: 'business',
        owner_id: profile.id,
        business_id: profile.business_id || profile.id,
        name: profile.business_name || 'Transport Company',
        branch_name: newBranch.name,
        location: newBranch.location,
        phone: newBranch.phone,
        category: 'Transport',
        business_type: 'Transport Branch'
      }).select().single();

      if (error) throw error;
      
      setBranches([...branches, {
        id: data.id,
        name: data.branch_name || data.name,
        location: data.location,
        phone: data.phone,
        manager: 'Assigned Manager',
        status: 'active'
      }]);
      setNewBranch({ name: '', location: '', manager: '', phone: '' });
      setShowAddBranch(false);
      toast.success('Branch added successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add branch');
    }
  };

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
      setNewStaff({ name: '', email: '', role: 'driver', branchId: '' });
      setShowAddStaff(false);
      toast.success('Staff member added successfully.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add staff');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header & Online Toggle */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Truck size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">
              {isEnterprise ? profile?.business_name : transporterProfile.name}
            </h1>
            <p className="text-gray-500 font-medium">
              {isEnterprise ? 'Transport Company' : `${transporterProfile.vehicleType} • ${transporterProfile.phone}`}
            </p>
          </div>
        </div>

        <button
          onClick={toggleOnlineStatus}
          className={`px-8 py-4 rounded-2xl font-black flex items-center gap-3 transition-all ${
            transporterProfile.isOnline 
              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Power size={20} />
          {transporterProfile.isOnline ? 'You are ONLINE' : 'You are OFFLINE'}
        </button>
      </div>

      {isEnterprise && (
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors ${
              activeSubTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview & Jobs
          </button>
          <button
            onClick={() => setActiveSubTab('branches')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors ${
              activeSubTab === 'branches'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Branches
          </button>
          <button
            onClick={() => setActiveSubTab('team')}
            className={`py-4 px-6 font-bold text-sm border-b-2 transition-colors ${
              activeSubTab === 'team'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Team
          </button>
        </div>
      )}

      {activeSubTab === 'branches' && isEnterprise ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Company Branches</h2>
              <p className="text-gray-500">Manage your transport parks and terminals.</p>
            </div>
            <button 
              onClick={() => setShowAddBranch(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <PlusCircle size={20} />
              Add Branch
            </button>
          </div>

          {showAddBranch && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Branch</h3>
              <form onSubmit={handleAddBranch} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Branch Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Lagos Mainland Terminal"
                    value={newBranch.name}
                    onChange={(e) => setNewBranch({...newBranch, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Location / Address</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Jibowu, Yaba"
                    value={newBranch.location}
                    onChange={(e) => setNewBranch({...newBranch, location: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Branch Manager Name</label>
                  <input 
                    type="text" 
                    required
                    value={newBranch.manager}
                    onChange={(e) => setNewBranch({...newBranch, manager: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Contact Phone</label>
                  <input 
                    type="tel" 
                    required
                    value={newBranch.phone}
                    onChange={(e) => setNewBranch({...newBranch, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddBranch(false)}
                    className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Save Branch
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Main Park (from profile) */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-indigo-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-black text-lg text-gray-900">Main Headquarters</h3>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">Primary</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</p>
                    <p className="font-medium text-gray-900">{profile?.main_park_location || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Added Branches */}
            {branches.map(branch => (
              <div key={branch.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-lg text-gray-900">{branch.name}</h3>
                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">Active</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Location</p>
                      <p className="font-medium text-gray-900">{branch.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <User size={18} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Manager</p>
                      <p className="font-medium text-gray-900">{branch.manager}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone size={18} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact</p>
                      <p className="font-medium text-gray-900">{branch.phone}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeSubTab === 'team' && isEnterprise ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Team Management</h2>
              <p className="text-gray-500">Add staff, assign roles, and manage access.</p>
            </div>
            <button 
              onClick={() => setShowAddStaff(true)}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
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
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Staff Member</h3>
              <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., John Doe"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    placeholder="john@company.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Role</label>
                  <select 
                    required
                    value={newStaff.role}
                    onChange={(e) => setNewStaff({...newStaff, role: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="driver">Driver</option>
                    <option value="dispatcher">Dispatcher</option>
                    <option value="branch_manager">Branch Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assign to Branch</label>
                  <select 
                    required
                    value={newStaff.branchId}
                    onChange={(e) => setNewStaff({...newStaff, branchId: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="main">Main Headquarters</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
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
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
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
                <h3 className="text-lg font-bold text-gray-900 mb-1">No staff members yet</h3>
                <p className="text-gray-500">Add your first staff member to start delegating tasks.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 font-bold text-gray-600 text-sm">Name</th>
                      <th className="p-4 font-bold text-gray-600 text-sm">Role</th>
                      <th className="p-4 font-bold text-gray-600 text-sm">Branch</th>
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
                          <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold capitalize">
                            {staff.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-medium text-gray-700">
                          {staff.branchId === 'main' ? 'Main HQ' : branches.find(b => b.id === staff.branchId)?.name || 'Unknown'}
                        </td>
                        <td className="p-4">
                          <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                            <CheckCircle size={14} /> Active
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button className="text-indigo-600 hover:text-indigo-800 font-bold text-sm">Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {!transporterProfile.isOnline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl flex items-start gap-4">
          <Clock className="shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-lg">You are currently offline</h3>
            <p className="text-amber-700">Go online to receive direct delivery requests from buyers and see available pool jobs.</p>
          </div>
        </div>
      )}

      {/* Incoming Direct Requests */}
      {incomingJobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
            </span>
            Incoming Requests ({incomingJobs.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incomingJobs.map(job => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={job.id} 
                className="bg-white p-6 rounded-3xl shadow-lg border-2 border-indigo-100 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-black text-lg text-gray-900">Delivery Request</h3>
                  <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <PriceDisplay 
                      amount={job.totalAmount || 0} 
                      sourceCountry={job.store_currency || 'Nigeria'} 
                      targetCountry={profile?.country}
                      className=""
                      originalPriceClassName="text-[10px] font-bold text-indigo-400 line-through ml-1"
                    />
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pickup</p>
                      <p className="font-medium text-gray-900">{job.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Navigation size={18} className="text-indigo-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dropoff</p>
                      <p className="font-medium text-gray-900">{job.deliveryLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => handleAcceptJob(job.id, job.orderId)}
                    className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} /> Accept
                  </button>
                  <button 
                    onClick={() => handleRejectJob(job.id, job.orderId)}
                    className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <XCircle size={18} /> Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Jobs */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-900">Active Jobs</h2>
          {activeJobs.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center">
              <Package className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-gray-500 font-medium">No active deliveries.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeJobs.map(job => (
                <div key={job.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        job.status === 'accepted' ? 'bg-blue-50 text-blue-600' :
                        job.status === 'picked_up' ? 'bg-amber-50 text-amber-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {job.status.replace('_', ' ')}
                      </span>
                    </div>
                    <PriceDisplay 
                      amount={job.totalAmount || 0} 
                      sourceCountry={job.store_currency || 'Nigeria'} 
                      targetCountry={profile?.country}
                      className="font-black text-gray-900"
                      originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-2"
                    />
                  </div>

                  <div className="space-y-2 mb-6">
                    <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <MapPin size={14} /> From: {job.pickupLocation}
                    </p>
                    <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Navigation size={14} /> To: {job.deliveryLocation}
                    </p>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="pt-4 border-t border-gray-100">
                    {job.status === 'accepted' && (
                      <button 
                        onClick={() => handleUpdateJobStatus(job.id, job.orderId, 'picked_up', 'shipped')}
                        className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors"
                      >
                        Mark as Picked Up
                      </button>
                    )}
                    {job.status === 'picked_up' && (
                      <button 
                        onClick={() => handleUpdateJobStatus(job.id, job.orderId, 'in_transit', 'shipped')}
                        className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-colors"
                      >
                        Mark In Transit
                      </button>
                    )}
                    {job.status === 'in_transit' && (
                      <button 
                        onClick={() => handleUpdateJobStatus(job.id, job.orderId, 'delivered', 'delivered')}
                        className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Pool Jobs */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-900">Available Pool Jobs</h2>
          {!transporterProfile.isOnline ? (
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center">
              <Power className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-gray-500 font-medium">Go online to view available jobs.</p>
            </div>
          ) : poolJobs.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8 text-center">
              <Package className="mx-auto text-gray-300 mb-3" size={32} />
              <p className="text-gray-500 font-medium">No pool jobs available right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {poolJobs.map(job => (
                <div key={job.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                      Open Request
                    </span>
                    <PriceDisplay 
                      amount={job.totalAmount || 0} 
                      sourceCountry={job.store_currency || 'Nigeria'} 
                      targetCountry={profile?.country}
                      className="font-black text-gray-900"
                      originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-2"
                    />
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <MapPin size={14} /> {job.pickupLocation}
                    </p>
                    <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Navigation size={14} /> {job.deliveryLocation}
                    </p>
                  </div>

                  <button 
                    onClick={() => handleClaimPoolJob(job.id, job.orderId)}
                    className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Claim Job
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default TransporterDashboard;
