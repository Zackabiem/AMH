import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './App';
import { Loader2, ShieldAlert, LogIn, LayoutDashboard, Users, Settings, LogOut, CheckCircle2, XCircle, Clock, Menu, X, FileText, MapPin, CreditCard, UserCircle, ArrowRight, Truck, ShieldCheck, Building2, Briefcase, Upload, Trash2 } from 'lucide-react';
import { supabase } from './lib/supabase';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
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
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/admin'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Admin login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-zinc-100" id="admin-login-page">
      <div className="max-w-md w-full bg-zinc-900 p-10 md:p-12 rounded-[40px] shadow-2xl border border-zinc-800 relative overflow-hidden" id="admin-login-card">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-zinc-800/50 to-transparent opacity-50 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-20 h-20 bg-zinc-800 text-zinc-300 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-xl border border-zinc-700" id="admin-login-icon">
            <ShieldAlert size={40} />
          </div>
          
          <h1 className="text-3xl font-black mb-2 tracking-tight text-white text-center">HQ Control</h1>
          <p className="text-zinc-500 mb-10 leading-relaxed text-center font-medium">
            Restricted access. Authorized personnel only.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-3 text-rose-400" id="admin-login-error">
              <ShieldAlert size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-5" id="admin-login-form">
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Admin Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <UserCircle size={20} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-zinc-100 focus:border-zinc-100 outline-none transition-all font-bold text-white"
                  placeholder="admin@hq.com"
                  id="admin-login-email"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Security Key</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500">
                  <LogIn size={20} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 bg-zinc-950 border border-zinc-800 rounded-2xl focus:ring-2 focus:ring-zinc-100 focus:border-zinc-100 outline-none transition-all font-bold text-white"
                  placeholder="••••••••"
                  id="admin-login-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-zinc-100 text-zinc-900 rounded-2xl font-black text-xl hover:bg-white transition-all active:scale-95 shadow-xl shadow-zinc-950 flex items-center justify-center gap-3 mt-8 disabled:opacity-50"
              id="admin-login-submit"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  Authenticate
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-zinc-800"></div>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Secondary Auth</span>
            <div className="flex-1 h-px bg-zinc-800"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full py-4 bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-2xl font-bold text-base hover:bg-zinc-800 transition-all active:scale-95 flex items-center justify-center gap-3"
            id="admin-login-google"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff" opacity="0.8"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#ffffff" opacity="0.6"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#ffffff" opacity="0.4"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, listings: 0 });

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async (retryCount = 0) => {
      try {
        const { count: userCount, error: userError } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: listingCount, error: listingError } = await supabase.from('products').select('*', { count: 'exact', head: true });
        
        if (userError || listingError) {
          const error = userError || listingError;
          if (retryCount < 3 && (
            error?.message?.includes('fetch') || 
            error?.message?.includes('Lock') || 
            error?.message?.includes('AbortError') ||
            error?.message?.includes('steal') ||
            error?.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => isMounted && fetchStats(retryCount + 1), delay);
            return;
          }
          throw error;
        }

        if (isMounted) {
          setStats({ users: userCount || 0, listings: listingCount || 0 });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white mb-8">System Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-zinc-400 font-medium mb-2">Total Users</h3>
          <p className="text-4xl font-bold text-white">{stats.users}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-zinc-400 font-medium mb-2">Active Listings</h3>
          <p className="text-4xl font-bold text-white">{stats.listings}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <h3 className="text-zinc-400 font-medium mb-2">System Status</h3>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-lg font-bold text-emerald-500">Operational</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoleRequests = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKyc, setSelectedKyc] = useState<any | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);
  const [viewingDoc, setViewingDoc] = useState(false);
  const [docToView, setDocToView] = useState<{ url: string; name: string } | null>(null);

  const handleViewDocument = async (path: string, name: string = 'Document') => {
    if (!path) return;
    try {
      setViewingDoc(true);
      // If it's a Cloudinary URL or regular HTTP URL, use it directly
      if (path.startsWith('http://') || path.startsWith('https://')) {
        setDocToView({ url: path, name });
        return;
      }
      
      // Legacy Supabase storage fallback
      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(path, 300);

      if (error) throw error;
      if (data?.signedUrl) {
        setDocToView({ url: data.signedUrl, name });
      }
    } catch (error) {
      console.error('Error opening document:', error);
      alert('Failed to open document. It might have been moved or deleted.');
    } finally {
      setViewingDoc(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async (retryCount = 0) => {
    try {
      setLoading(true);
      const pendingUsers: any[] = [];

      // 1. Fetch KYC Applications
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_applications')
        .select('*')
        .eq('status', 'pending');

      if (kycError) {
        if (retryCount < 3 && (
          kycError.message?.includes('fetch') || 
          kycError.message?.includes('Lock') || 
          kycError.message?.includes('AbortError') ||
          kycError.message?.includes('steal') ||
          kycError.message?.includes('Failed to fetch')
        )) {
          const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
          setTimeout(() => fetchRequests(retryCount + 1), delay);
          return;
        }
        throw kycError;
      }

      // 2. Fetch basic role requests
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .not('pending_roles', 'is', null);

      if (usersError) throw usersError;

      // 3. Fetch Businesses
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('*');

      if (businessError) throw businessError;

      // Track processed user-role pairs to avoid duplicates
      const processedPairs = new Set<string>();

      // Process KYC Applications first
      kycData?.forEach(data => {
        const kycType = data.data?.type || 'individual_seller';
        let role = 'seller';
        if (kycType === 'transporter') role = 'transporter';
        if (kycType.startsWith('property_owner')) role = 'property_owner';

        processedPairs.add(`${data.user_id}-${role}`);

        pendingUsers.push({
          id: data.id,
          userId: data.user_id,
          name: data.data?.legal_name || data.data?.identity?.legalName || 'Unknown',
          email: 'KYC Application',
          role: `${role} (KYC)`,
          targetRole: role,
          type: 'kyc',
          kycData: data,
          date: data.created_at ? new Date(data.created_at) : new Date()
        });
      });

      // Process Users with pending roles
      usersData?.forEach(data => {
        if (data.pending_roles && data.pending_roles.length > 0) {
          data.pending_roles.forEach((role: string) => {
            if (processedPairs.has(`${data.id}-${role}`)) return;

            // Check if this is a business request
            const userBusiness = businessData?.find(b => b.owner_user_id === data.id);
            
            if (role === 'seller' && userBusiness) {
              pendingUsers.push({
                id: `${data.id}-business`,
                userId: data.id,
                name: userBusiness.name,
                email: data.email,
                role: 'seller (Business)',
                targetRole: 'seller',
                type: 'business',
                businessData: userBusiness,
                date: userBusiness.created_at ? new Date(userBusiness.created_at) : new Date()
              });
            } else {
              pendingUsers.push({
                id: `${data.id}-${role}`,
                userId: data.id,
                name: data.username || 'Unknown',
                email: data.email,
                role: role,
                targetRole: role,
                type: 'basic',
                date: data.updated_at ? new Date(data.updated_at) : new Date()
              });
            }
          });
        }
      });
      
      setRequests(pendingUsers.sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, role: string, requestId: string) => {
    try {
      const { data: user } = await supabase.from('users').select('roles, pending_roles').eq('id', userId).single();
      if (!user) return;

      const updatedRoles = [...new Set([...(user.roles || []), role])];
      const updatedPending = (user.pending_roles || []).filter((r: string) => r !== role);

      await supabase
        .from('users')
        .update({
          roles: updatedRoles,
          pending_roles: updatedPending,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error approving role:', error);
    }
  };

  const handleReject = async (userId: string, role: string, requestId: string) => {
    try {
      const { data: user } = await supabase.from('users').select('pending_roles').eq('id', userId).single();
      if (!user) return;

      const updatedPending = (user.pending_roles || []).filter((r: string) => r !== role);

      await supabase
        .from('users')
        .update({
          pending_roles: updatedPending,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting role:', error);
    }
  };

  const handleApproveKyc = async (requestId: string, userId: string, kycData: any) => {
    try {
      const kycType = kycData.data?.type || 'individual_seller';
      let role = 'seller';
      if (kycType.includes('transporter')) role = 'transporter';
      else if (kycType.includes('property_owner')) role = 'property_owner';
      else role = 'seller';

      // 1. Update KYC status
      await supabase
        .from('kyc_applications')
        .update({ 
          status: 'approved', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', requestId);
      
      // 2. Update User roles and KYC type
      const { data: user } = await supabase.from('users').select('roles, pending_roles').eq('id', userId).single();
      if (user) {
        const updatedRoles = [...new Set([...(user.roles || []), role])];
        const updatedPending = (user.pending_roles || []).filter((r: string) => r !== role);
        
        const updateData: any = {
          roles: updatedRoles,
          pending_roles: updatedPending,
          updated_at: new Date().toISOString()
        };

        if (role === 'seller') updateData.seller_kyc_type = kycType;
        if (role === 'transporter') updateData.transporter_kyc_type = kycType;
        if (role === 'property_owner') updateData.property_owner_kyc_type = kycType;

        await supabase
          .from('users')
          .update(updateData)
          .eq('id', userId);
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      setSelectedKyc(null);
    } catch (error) {
      console.error('Error approving KYC:', error);
    }
  };

  const handleRejectKyc = async (requestId: string, userId: string, kycData: any) => {
    try {
      const kycType = kycData.data?.type || 'individual_seller';
      let role = 'seller';
      if (kycType === 'transporter') role = 'transporter';
      if (kycType.startsWith('property_owner')) role = 'property_owner';

      await supabase
        .from('kyc_applications')
        .update({ 
          status: 'rejected', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', requestId);
      
      const { data: user } = await supabase.from('users').select('pending_roles').eq('id', userId).single();
      if (user) {
        const updatedPending = (user.pending_roles || []).filter((r: string) => r !== role);
        await supabase
          .from('users')
          .update({
            pending_roles: updatedPending,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }

      setRequests(prev => prev.filter(r => r.id !== requestId));
      setSelectedKyc(null);
    } catch (error) {
      console.error('Error rejecting KYC:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Role Requests</h1>
        <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800">
          <Clock size={16} className="text-amber-500" />
          <span className="text-sm font-medium text-zinc-300">{requests.length} Pending</span>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
          <p className="text-zinc-500">There are no pending role requests to review.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50">
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">User / Store</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Requested Role</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                <th className="p-4 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-white font-bold">
                        {request.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{request.name}</p>
                        <p className="text-xs text-zinc-500">{request.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${
                      request.type === 'kyc' 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {request.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-400">
                    {request.date.toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      {request.type === 'kyc' ? (
                        <button
                          onClick={() => setSelectedKyc(request)}
                          className="px-3 py-1.5 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          Review KYC
                        </button>
                      ) : request.type === 'business' ? (
                        <button
                          onClick={() => setSelectedBusiness(request)}
                          className="px-3 py-1.5 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors"
                        >
                          Review Business
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleReject(request.userId, request.role, request.id)}
                            className="p-2 text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle size={20} />
                          </button>
                          <button
                            onClick={() => handleApprove(request.userId, request.role, request.id)}
                            className="p-2 text-zinc-500 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* KYC Review Modal */}
      {selectedKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-zinc-800 overflow-hidden my-8">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  {selectedKyc.targetRole === 'transporter' ? <Truck className="text-emerald-500" /> : 
                   selectedKyc.targetRole === 'property_owner' ? <Building2 className="text-emerald-500" /> :
                   <UserCircle className="text-emerald-500" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review {selectedKyc.targetRole.replace('_', ' ')} KYC</h2>
                  <p className="text-zinc-500 text-sm">Application ID: {selectedKyc.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedKyc(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Identity Section */}
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <UserCircle className="text-emerald-500" size={20} /> Identity Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Legal Name</p>
                    <p className="text-white font-medium">{selectedKyc.kycData.data?.legal_name || selectedKyc.kycData.data?.identity?.legalName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">ID Type</p>
                    <p className="text-white font-medium capitalize">{(selectedKyc.kycData.data?.id_type || selectedKyc.kycData.data?.identity?.idType)?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">ID Number</p>
                    <p className="text-white font-medium">{selectedKyc.kycData.data?.id_number || selectedKyc.kycData.data?.identity?.idNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">ID Document</p>
                    {selectedKyc.kycData.data?.id_document_url || selectedKyc.kycData.data?.identity?.id_document_url ? (
                      <button 
                        onClick={() => handleViewDocument(selectedKyc.kycData.data?.id_document_url || selectedKyc.kycData.data?.identity?.id_document_url, 'ID Document')}
                        disabled={viewingDoc}
                        className="text-emerald-500 hover:underline flex items-center gap-1 text-sm disabled:opacity-50"
                      >
                        <FileText size={16} /> {viewingDoc ? 'Generating Link...' : 'View Document'}
                      </button>
                    ) : (
                      <p className="text-zinc-400 text-sm italic">No document uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Transporter Specific: Credentials & Vehicle */}
              {selectedKyc.targetRole === 'transporter' && (
                <>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                      <ShieldCheck className="text-amber-500" size={20} /> Credentials
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Driver's License</p>
                        <button 
                          onClick={() => handleViewDocument(selectedKyc.kycData.data?.credentials?.driversLicenseUrl, "Driver's License")}
                          disabled={viewingDoc}
                          className="text-emerald-500 hover:underline flex items-center gap-1 text-sm disabled:opacity-50"
                        >
                          <FileText size={16} /> {viewingDoc ? 'Generating...' : 'View License'}
                        </button>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Expiry Date</p>
                        <p className="text-white font-medium">{selectedKyc.kycData.data?.credentials?.driversLicenseExpiry}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                      <Truck className="text-blue-500" size={20} /> Vehicle Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Vehicle Type</p>
                        <p className="text-white font-medium capitalize">{selectedKyc.kycData.data?.vehicle?.vehicleType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Make & Model</p>
                        <p className="text-white font-medium">{selectedKyc.kycData.data?.vehicle?.vehicleMakeModel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">License Plate</p>
                        <p className="text-white font-medium">{selectedKyc.kycData.data?.vehicle?.licensePlate}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Vehicle Photo</p>
                        <button 
                          onClick={() => handleViewDocument(selectedKyc.kycData.data?.vehicle?.vehiclePhotoUrl, 'Vehicle Photo')}
                          disabled={viewingDoc}
                          className="text-emerald-500 hover:underline flex items-center gap-1 text-sm disabled:opacity-50"
                        >
                          <FileText size={16} /> {viewingDoc ? 'Generating...' : 'View Photo'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Property Owner Specific */}
              {selectedKyc.targetRole === 'property_owner' && (
                <>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                      <ShieldCheck className="text-amber-500" size={20} /> Professional Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Association Name</p>
                        <p className="text-white font-medium">{selectedKyc.kycData.data?.professional?.associationName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Association ID</p>
                        <button 
                          onClick={() => handleViewDocument(selectedKyc.kycData.data?.professional?.associationIdUrl, 'Association ID')}
                          disabled={viewingDoc}
                          className="text-emerald-500 hover:underline flex items-center gap-1 text-sm disabled:opacity-50"
                        >
                          <FileText size={16} /> {viewingDoc ? 'Generating...' : 'View Association ID'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                      <Users className="text-blue-500" size={20} /> Guarantors
                    </h3>
                    <div className="space-y-4">
                      {selectedKyc.kycData.data?.guarantors?.map((guarantor: any, index: number) => (
                        <div key={index} className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                          <p className="text-sm font-bold text-white mb-2">Guarantor {index + 1}</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Name</p>
                              <p className="text-white text-sm">{guarantor.name || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Consent Form</p>
                              <button 
                                onClick={() => handleViewDocument(guarantor.consentUrl, `Guarantor ${index + 1} Consent`)}
                                disabled={viewingDoc}
                                className="text-emerald-500 hover:underline flex items-center gap-1 text-sm disabled:opacity-50"
                              >
                                <FileText size={16} /> View Form
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex items-center justify-end gap-4">
              <button
                onClick={() => handleRejectKyc(selectedKyc.id, selectedKyc.userId, selectedKyc.kycData)}
                className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 font-bold transition-all"
              >
                Reject Application
              </button>
              <button
                onClick={() => handleApproveKyc(selectedKyc.id, selectedKyc.userId, selectedKyc.kycData)}
                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                Approve & Grant Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Review Modal */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-3xl shadow-2xl border border-zinc-800 overflow-hidden my-8">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Building2 className="text-blue-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Review Business Registration</h2>
                  <p className="text-zinc-500 text-sm">Business ID: {selectedBusiness.businessData.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBusiness(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                  <Briefcase className="text-blue-500" size={20} /> Business Details
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800">
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Business Name</p>
                    <p className="text-white font-bold text-lg">{selectedBusiness.businessData.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Type</p>
                    <p className="text-white font-medium capitalize">{selectedBusiness.businessData.business_type?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Registration Number</p>
                    <p className="text-white font-medium">{selectedBusiness.businessData.registration_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Email</p>
                    <p className="text-white font-medium">{selectedBusiness.businessData.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Phone</p>
                    <p className="text-white font-medium">{selectedBusiness.businessData.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Address</p>
                    <p className="text-white font-medium">{selectedBusiness.businessData.address}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 flex items-center justify-end gap-4">
              <button
                onClick={() => handleReject(selectedBusiness.userId, selectedBusiness.targetRole, selectedBusiness.id)}
                className="px-6 py-2.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 font-bold transition-all"
              >
                Reject Registration
              </button>
              <button
                onClick={() => handleApprove(selectedBusiness.userId, selectedBusiness.targetRole, selectedBusiness.id)}
                className="px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                Approve Business
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {docToView && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-5xl h-[90vh] shadow-2xl border border-zinc-800 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <FileText className="text-emerald-500" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white">{docToView.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href={docToView.url} 
                  download 
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                  title="Download Document"
                >
                  <Upload size={24} className="rotate-180" />
                </a>
                <button 
                  onClick={() => setDocToView(null)} 
                  className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-zinc-950 p-4 overflow-hidden flex items-center justify-center">
              {docToView.url.toLowerCase().includes('.pdf') || docToView.url.toLowerCase().includes('signed_url') ? (
                <iframe 
                  src={docToView.url} 
                  className="w-full h-full rounded-xl border-0"
                  title={docToView.name}
                />
              ) : (
                <img 
                  src={docToView.url} 
                  alt={docToView.name}
                  className="max-w-full max-h-full object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, logout } = useAuth() || {};
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    if (logout) {
      await logout();
      navigate('/admin');
    }
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/requests', label: 'Role Requests', icon: ShieldAlert },
    { path: '/admin/global-status', label: 'Global Status', icon: Upload },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Admin Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-white">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="font-bold text-white tracking-tight">HQ Control</h2>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Admin Portal</p>
            </div>
          </div>
          <button className="md:hidden text-zinc-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive 
                    ? 'bg-zinc-800 text-white' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold">{profile?.username?.charAt(0) || 'A'}</span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile?.username || 'Administrator'}</p>
              <p className="text-xs text-zinc-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-rose-400 hover:bg-rose-400/10 rounded-lg font-medium transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-900 sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="text-zinc-400 hover:text-white">
            <Menu size={24} />
          </button>
          <h1 className="font-bold text-white">HQ Control</h1>
        </div>
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

const GlobalStatus = () => {
  const { user } = useAuth() || {};
  const [text, setText] = useState('');
  const [media, setMedia] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('store_updates')
        .select('*')
        .eq('is_global', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching global updates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if ((!text.trim() && !media) || !user) return;

    setPosting(true);
    try {
      let mediaUrl = null;
      let mediaType = 'none';
      let mediaPublicId = null;

      if (media) {
        const signResponse = await fetch('/api/cloudinary/sign', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'global_updates' })
        });
        
        if (!signResponse.ok) throw new Error('Failed to get signature');
        const signData = await signResponse.json();

        const formData = new FormData();
        formData.append('file', media);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', signData.timestamp);
        formData.append('signature', signData.signature);
        formData.append('folder', 'global_updates');

        const isVideo = media.type.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';
        mediaType = isVideo ? 'video' : 'image';

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`,
          { method: 'POST', body: formData }
        );

        if (!uploadResponse.ok) throw new Error('Failed to upload media');
        const uploadData = await uploadResponse.json();
        mediaUrl = uploadData.secure_url;
        mediaPublicId = uploadData.public_id;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { error } = await supabase
        .from('store_updates')
        .insert({
          seller_id: user.id,
          text,
          likes: [],
          media_url: mediaUrl,
          media_type: mediaType,
          media_public_id: mediaPublicId,
          expires_at: expiresAt.toISOString(),
          is_global: true
        });
        
      if (error) throw error;
      
      setText('');
      setMedia(null);
      fetchUpdates();
    } catch (error) {
      console.error('Error posting global update:', error);
      alert('Failed to post update');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this global update?')) return;
    try {
      const { error } = await supabase.from('store_updates').delete().eq('id', id);
      if (error) throw error;
      setUpdates(prev => prev.filter(u => u.id !== id));
    } catch (error) {
      console.error('Error deleting update:', error);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-white mb-2">Global Status Updates</h1>
        <p className="text-zinc-400">Post announcements visible to all users on the marketplace.</p>
      </div>

      <div className="bg-zinc-900 p-6 md:p-8 rounded-[32px] border border-zinc-800 mb-10">
        <h2 className="text-xl font-bold text-white mb-6">New Announcement</h2>
        <div className="space-y-4">
          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's the latest news for the platform?"
            className="w-full p-6 bg-zinc-950 border border-zinc-800 rounded-[24px] focus:ring-2 focus:ring-zinc-100 text-white transition-all h-32 resize-none"
          />
          
          {media && (
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
              {media.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(media)} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <video src={URL.createObjectURL(media)} className="w-full h-full object-cover" />
              )}
              <button
                onClick={() => setMedia(null)}
                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-rose-500 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors font-bold text-sm">
              <Upload size={18} />
              <span>Add Media</span>
              <input 
                type="file" 
                accept="image/*,video/*" 
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setMedia(e.target.files[0]);
                  }
                }}
              />
            </label>
            <button 
              onClick={handlePost}
              disabled={posting || (!text.trim() && !media)}
              className="px-8 py-3 bg-white text-zinc-900 rounded-xl font-black hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {posting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
              Post Global Status
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Active Announcements</h2>
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-zinc-500" size={32} />
          </div>
        ) : updates.length === 0 ? (
          <div className="bg-zinc-900 p-12 rounded-[32px] border border-zinc-800 text-center">
            <p className="text-zinc-500 font-medium">No active global announcements.</p>
          </div>
        ) : (
          updates.map(update => (
            <div key={update.id} className="bg-zinc-900 p-6 rounded-[24px] border border-zinc-800 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300">
                    <ShieldAlert size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white">African Market Hub</p>
                    <p className="text-xs text-zinc-500">
                      Expires: {new Date(update.expires_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(update.id)}
                  className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <p className="text-zinc-300 whitespace-pre-wrap">{update.text}</p>
              {update.media_url && (
                <div className="rounded-xl overflow-hidden bg-zinc-950 max-h-64 flex items-center justify-start">
                  {update.media_type === 'video' ? (
                    <video src={update.media_url} controls className="max-h-64 object-contain" />
                  ) : (
                    <img src={update.media_url} alt="Media" className="max-h-64 object-contain" />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default function AdminApp() {
  const authContext = useAuth();
  
  if (!authContext) return null;
  const { user, profile, loading } = authContext;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-500" size={48} />
      </div>
    );
  }

  if (!user) {
    return <AdminLogin />;
  }

  // Check if user has admin role
  if (!profile?.roles?.includes('admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <div className="max-w-md w-full bg-zinc-900 p-8 rounded-3xl shadow-2xl text-center border border-rose-900/30">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Access Denied</h2>
          <p className="text-zinc-400 mb-8">
            Your account does not have administrator privileges.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors"
          >
            Return to Public App
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<AdminDashboard />} />
        <Route path="/requests" element={<RoleRequests />} />
        <Route path="/global-status" element={<GlobalStatus />} />
        {/* Add more admin routes here later */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminLayout>
  );
}
