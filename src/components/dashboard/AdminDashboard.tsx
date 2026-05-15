import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, ShieldCheck, Users, Store, XCircle, Loader2, Search, FileText, Ban, Coins } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../App';
import { createNotification } from '../../lib/notifications';

export default function AdminDashboard() {
  const { user } = useAuth() || {};
  const [activeTab, setActiveTab] = useState<'overview' | 'kyc' | 'users' | 'disputes'>('overview');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingKyc: 0,
    totalStores: 0,
    activeDisputes: 0
  });
  
  const [kycApplications, setKycApplications] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [disputesList, setDisputesList] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        // Fetch stats
        const [usersRes, kycRes, storesRes, disputesRes] = await Promise.all([
          supabase.from('users').select('id', { count: 'exact', head: true }),
          supabase.from('kyc_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('stores').select('id', { count: 'exact', head: true }),
          supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open')
        ]);
        
        setStats({
          totalUsers: usersRes.count || 0,
          pendingKyc: kycRes.count || 0,
          totalStores: storesRes.count || 0,
          activeDisputes: disputesRes.count || 0
        });
      } else if (activeTab === 'kyc') {
        const { data, error } = await supabase
          .from('kyc_applications')
          .select(`
            *,
            users ( name, email, phone )
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setKycApplications(data || []);
      } else if (activeTab === 'users') {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        setUsersList(data || []);
      } else if (activeTab === 'disputes') {
        const { data, error } = await supabase
          .from('disputes')
          .select(`
            *,
            buyer:buyer_id ( name, email ),
            seller:seller_id ( name, email ),
            store:store_id ( name )
          `)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setDisputesList(data || []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKycAction = async (id: string, userId: string, action: 'approved' | 'rejected') => {
    if (!confirm(`Are you sure you want to mark this KYC as ${action}?`)) return;
    
    setProcessingId(id);
    try {
      // 1. Update KYC status
      const { error: kycError } = await supabase
        .from('kyc_applications')
        .update({ status: action, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (kycError) throw kycError;

      // 2. If approved, grant the requested role to the user
      if (action === 'approved') {
        // Get current user roles and pending roles
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('roles, pending_roles')
          .eq('id', userId)
          .single();
          
        if (userError) throw userError;
        
        // Get the KYC application to know which role they requested
        const app = kycApplications.find(a => a.id === id);
        const requestedRole = app?.data?.type || 'seller'; // Default to seller if not specified
        
        const currentRoles = userData.roles || ['buyer'];
        const currentPending = userData.pending_roles || [];
        
        if (!currentRoles.includes(requestedRole)) {
          const newRoles = [...currentRoles, requestedRole];
          const newPending = currentPending.filter((r: string) => r !== requestedRole);
          
          await supabase
            .from('users')
            .update({ 
              roles: newRoles,
              pending_roles: newPending
            })
            .eq('id', userId);
        }
      } else if (action === 'rejected') {
        // If rejected, remove from pending roles
        const { data: userData } = await supabase
          .from('users')
          .select('pending_roles')
          .eq('id', userId)
          .single();
          
        if (userData) {
          const app = kycApplications.find(a => a.id === id);
          const requestedRole = app?.data?.type || 'seller';
          const newPending = (userData.pending_roles || []).filter((r: string) => r !== requestedRole);
          
          await supabase
            .from('users')
            .update({ pending_roles: newPending })
            .eq('id', userId);
        }
      }

      // Find the application details
      const appData = kycApplications.find(app => app.id === id);

      // Refresh list
      setKycApplications(prev => prev.filter(app => app.id !== id));
      
      // Notify the user
      createNotification(
        userId,
        `KYC Application ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        `Your KYC application to become a ${appData?.data?.type || 'seller'} has been ${action}.`,
        'system',
        '/'
      );

      alert(`KYC application ${action} successfully.`);
    } catch (error) {
      console.error(`Error processing KYC ${action}:`, error);
      alert('Failed to process KYC application.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleUserLock = async (userId: string, currentLockStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentLockStatus ? 'unlock' : 'lock'} this user?`)) return;
    
    setProcessingId(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_locked: !currentLockStatus })
        .eq('id', userId);
        
      if (error) throw error;
      
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_locked: !currentLockStatus } : u));
      
      createNotification(
        userId,
        `Account ${!currentLockStatus ? 'Locked' : 'Unlocked'}`,
        `Your account has been ${!currentLockStatus ? 'locked due to administrator action' : 'unlocked'}.`,
        'system',
        '/'
      );
    } catch (error) {
      console.error('Error toggling user lock:', error);
      alert('Failed to update user status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCreditUser = async (userId: string, userName: string, currentCredits: number) => {
    const amountStr = prompt(`Enter Afro Credits amount to add for ${userName}:`);
    if (!amountStr) return;
    const amount = parseInt(amountStr);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid positive number');
      return;
    }

    setProcessingId(`credit_${userId}`);
    try {
      const newTotal = (currentCredits || 0) + amount;
      
      const { error } = await supabase
        .from('users')
        .update({ afro_credits: newTotal })
        .eq('id', userId);
        
      if (error) throw error;
      
      await supabase.from('credit_transactions').insert({
        user_id: userId,
        amount: amount,
        transaction_type: 'deposit',
        description: 'Credited by Administrator',
        reference_id: `admin_credit_${Date.now()}`,
        status: 'completed'
      });

      createNotification(
        userId,
        'Afro Credits Received',
        `An administrator has credited your account with ${amount} AC.`,
        'system',
        '/'
      );
      
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, afro_credits: newTotal } : u));
      alert(`Successfully credited ${amount} AC to ${userName}.`);
    } catch (error) {
      console.error('Error crediting user:', error);
      alert('Failed to credit user.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateDisputeStatus = async (disputeId: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this dispute as ${newStatus.replace('_', ' ')}?`)) return;
    
    setProcessingId(disputeId);
    try {
      const { error } = await supabase
        .from('disputes')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', disputeId);
        
      if (error) throw error;
      
      const dispute = disputesList.find(d => d.id === disputeId);
      if (dispute) {
        const msg = `Your dispute regarding order #${dispute.order_id.slice(-6).toUpperCase()} has been updated to: ${newStatus.replace('_', ' ')}`;
        if (dispute.buyer_id) createNotification(dispute.buyer_id, 'Dispute Status Updated', msg, 'system');
        if (dispute.seller_id) createNotification(dispute.seller_id, 'Dispute Status Updated', msg, 'system');
      }

      setDisputesList(prev => prev.map(d => d.id === disputeId ? { ...d, status: newStatus } : d));
    } catch (error) {
      console.error('Error updating dispute:', error);
      alert('Failed to update dispute status.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            <ShieldCheck className="text-emerald-600" size={40} />
            Admin Control Panel
          </h1>
          <p className="text-gray-500 font-bold mt-2">Manage users, approve KYC, and monitor platform health.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-8 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: ShieldCheck },
          { id: 'kyc', label: 'KYC Approvals', icon: FileText },
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'disputes', label: 'Disputes', icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black whitespace-nowrap transition-all ${
              activeTab === tab.id 
                ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' 
                : 'bg-white text-gray-500 hover:bg-gray-50 border border-black/5'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            {tab.id === 'kyc' && stats.pendingKyc > 0 && (
              <span className="ml-2 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {stats.pendingKyc}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
        </div>
      ) : (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Users size={24} />
                </div>
                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-1">Total Users</p>
                <h3 className="text-4xl font-black text-gray-900">{stats.totalUsers}</h3>
              </div>
              
              <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                  <FileText size={24} />
                </div>
                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-1">Pending KYC</p>
                <h3 className="text-4xl font-black text-gray-900">{stats.pendingKyc}</h3>
              </div>
              
              <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <Store size={24} />
                </div>
                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-1">Active Stores</p>
                <h3 className="text-4xl font-black text-gray-900">{stats.totalStores}</h3>
              </div>
              
              <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
                  <AlertTriangle size={24} />
                </div>
                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest mb-1">Active Disputes</p>
                <h3 className="text-4xl font-black text-gray-900">{stats.activeDisputes}</h3>
              </div>
            </div>
          )}

          {/* KYC Approvals Tab */}
          {activeTab === 'kyc' && (
            <div className="space-y-6">
              {kycApplications.length === 0 ? (
                <div className="bg-white p-12 rounded-[40px] border border-black/5 text-center">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">All Caught Up!</h3>
                  <p className="text-gray-500 font-bold">There are no pending KYC applications to review.</p>
                </div>
              ) : (
                kycApplications.map(app => (
                  <div key={app.id} className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm flex flex-col lg:flex-row gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-4">
                        <span className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-black uppercase tracking-widest">
                          {app.data?.type || 'Seller'} Application
                        </span>
                        <span className="text-gray-400 font-bold text-sm">
                          Submitted: {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">User Details</p>
                          <p className="font-black text-lg text-gray-900">{app.users?.name || 'Unknown'}</p>
                          <p className="text-gray-500 font-medium">{app.users?.email}</p>
                          <p className="text-gray-500 font-medium">{app.users?.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Legal Information</p>
                          <p className="font-black text-lg text-gray-900">{app.data?.legal_name}</p>
                          <p className="text-gray-500 font-medium">{app.data?.id_type}: {app.data?.id_number}</p>
                        </div>
                      </div>
                      
                      <div className="p-4 bg-gray-50 rounded-2xl border border-black/5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bank Details</p>
                        <p className="font-bold text-gray-900">{app.data?.bank_name}</p>
                        <p className="font-mono text-gray-600">{app.data?.account_number}</p>
                        <p className="text-gray-500 text-sm">{app.data?.account_name}</p>
                      </div>
                    </div>
                    
                    <div className="w-full lg:w-72 flex flex-col gap-4">
                      {app.data?.id_document_url && (
                        <a 
                          href={app.data.id_document_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-4 bg-blue-50 text-blue-600 rounded-2xl font-black hover:bg-blue-100 transition-all text-center flex items-center justify-center gap-2"
                        >
                          <FileText size={20} />
                          View ID Document
                        </a>
                      )}
                      <button 
                        onClick={() => handleKycAction(app.id, app.user_id, 'approved')}
                        disabled={processingId === app.id}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingId === app.id ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                        Approve KYC
                      </button>
                      <button 
                        onClick={() => handleKycAction(app.id, app.user_id, 'rejected')}
                        disabled={processingId === app.id}
                        className="w-full py-4 bg-rose-50 text-rose-600 rounded-2xl font-black hover:bg-rose-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingId === app.id ? <Loader2 className="animate-spin" size={20} /> : <XCircle size={20} />}
                        Reject Application
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <div className="bg-white rounded-[40px] border border-black/5 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-black/5 flex justify-between items-center bg-gray-50/50">
                <h3 className="text-xl font-black text-gray-900">Recent Users</h3>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-64"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-black/5">
                      <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">User</th>
                      <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Roles</th>
                      <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Joined</th>
                      <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {usersList.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-6">
                          <p className="font-black text-gray-900">{u.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500 font-medium">{u.email}</p>
                        </td>
                        <td className="p-6">
                          <div className="flex flex-wrap gap-2">
                            {(u.roles || ['buyer']).map((role: string) => (
                              <span key={role} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                {role}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-6 text-sm font-bold text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-6">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                            u.is_locked ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {u.is_locked ? 'Locked' : 'Active'}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleCreditUser(u.id, u.name || u.email, u.afro_credits)}
                              disabled={processingId === `credit_${u.id}`}
                              className="p-2 rounded-xl transition-colors disabled:opacity-50 bg-purple-50 text-purple-600 hover:bg-purple-100"
                              title="Credit Wallet"
                            >
                              {processingId === `credit_${u.id}` ? <Loader2 className="animate-spin" size={20} /> : <Coins size={20} />}
                            </button>
                            <button 
                              onClick={() => handleToggleUserLock(u.id, u.is_locked)}
                              disabled={processingId === u.id || u.roles?.includes('admin')}
                              className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${
                                u.is_locked 
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              }`}
                              title={u.is_locked ? "Unlock User" : "Lock User"}
                            >
                              {processingId === u.id ? <Loader2 className="animate-spin" size={20} /> : <Ban size={20} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Disputes Tab */}
          {activeTab === 'disputes' && (
            <div className="space-y-6">
              {disputesList.length === 0 ? (
                <div className="bg-white p-12 rounded-[40px] border border-black/5 text-center">
                  <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">No Active Disputes</h3>
                  <p className="text-gray-500 font-bold">There are currently no disputes requiring attention.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {disputesList.map(dispute => (
                    <div key={dispute.id} className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              dispute.status === 'open' ? 'bg-rose-50 text-rose-600' :
                              dispute.status === 'investigating' ? 'bg-amber-50 text-amber-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {dispute.status.replace('_', ' ')}
                            </span>
                            <span className="text-sm font-bold text-gray-400">
                              Order #{dispute.order_id.slice(-6).toUpperCase()}
                            </span>
                          </div>
                          <h4 className="text-xl font-black text-gray-900">{dispute.reason}</h4>
                          <p className="text-sm text-gray-500 font-bold mt-1">Opened on {new Date(dispute.created_at).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {dispute.status !== 'resolved_buyer' && dispute.status !== 'resolved_seller' && dispute.status !== 'closed' && (
                            <>
                              <button 
                                onClick={() => handleUpdateDisputeStatus(dispute.id, 'investigating')}
                                disabled={processingId === dispute.id || dispute.status === 'investigating'}
                                className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl font-bold text-sm hover:bg-amber-100 transition-colors disabled:opacity-50"
                              >
                                Investigate
                              </button>
                              <button 
                                onClick={() => handleUpdateDisputeStatus(dispute.id, 'resolved_buyer')}
                                disabled={processingId === dispute.id}
                                className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
                              >
                                Resolve (Favor Buyer)
                              </button>
                              <button 
                                onClick={() => handleUpdateDisputeStatus(dispute.id, 'resolved_seller')}
                                disabled={processingId === dispute.id}
                                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
                              >
                                Resolve (Favor Seller)
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h5 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Description</h5>
                          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <p className="text-gray-600 font-medium whitespace-pre-wrap">{dispute.description}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <h5 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Parties Involved</h5>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Buyer</p>
                                <p className="font-bold text-gray-900">{dispute.buyer?.name || 'Unknown'}</p>
                                <p className="text-sm text-gray-500">{dispute.buyer?.email}</p>
                              </div>
                              <div className="h-px bg-gray-200"></div>
                              <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Seller / Store</p>
                                <p className="font-bold text-gray-900">{dispute.store?.name || dispute.seller?.name || 'Unknown'}</p>
                                <p className="text-sm text-gray-500">{dispute.seller?.email}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
