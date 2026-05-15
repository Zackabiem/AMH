import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ShoppingBag, 
  Bell, 
  Package, 
  MessageSquare, 
  User,
  Heart,
  ChevronRight,
  Clock,
  Star,
  ExternalLink,
  Truck,
  X,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../App';
import { AnimatePresence } from 'motion/react';

interface ModuleProps {
  title: string;
  icon: any;
  color: string;
  description: string;
  onClick?: () => void;
}

const Module: React.FC<ModuleProps> = ({ title, icon, color, description, onClick }) => (
  <motion.div
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="bg-white p-6 rounded-[32px] border border-black/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
  >
    <div className={`w-12 h-12 ${color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-${color.split('-')[1]}-100`}>
      {React.createElement(icon, { size: 24 })}
    </div>
    <h3 className="font-bold text-lg mb-1 group-hover:text-blue-600 transition-colors">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

import { formatPrice } from '../../lib/currency';
import PriceDisplay from '../PriceDisplay';
import { toast } from 'sonner';

interface BuyerDashboardProps {
  setActiveTab?: (tab: string) => void;
  setShowProfile?: (show: boolean) => void;
}

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ setActiveTab, setShowProfile }) => {
  const { profile } = useAuth() || {};
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'orders'>('overview');
  
  const [transportModalOrder, setTransportModalOrder] = useState<string | null>(null);
  const [transportMethod, setTransportMethod] = useState<'self' | 'buyer_dispatcher' | 'store_dispatcher'>('store_dispatcher');
  const [dispatcherName, setDispatcherName] = useState('');
  const [dispatcherPhone, setDispatcherPhone] = useState('');
  const [availableTransporters, setAvailableTransporters] = useState<any[]>([]);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  
  // Dispute state
  const [disputeModalOrder, setDisputeModalOrder] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState('Item not received');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;

    let isMounted = true;

    // Fetch All Orders
    const fetchOrders = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('buyer_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchOrders(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        if (isMounted) {
          setAllOrders(data || []);
          setRecentOrders((data || []).slice(0, 3));
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching orders:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // Fetch Wishlist
    const fetchWishlist = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 600));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('saved_items')
          .select('*')
          .eq('user_id', profile.id)
          .limit(4);

        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchWishlist(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        if (isMounted) {
          setWishlist(data || []);
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching wishlist:', error);
        }
      }
    };

    fetchOrders();
    fetchWishlist();

    // Set up real-time subscription for orders
    const ordersSubscription = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `buyer_id=eq.${profile.id}` }, payload => {
        if (isMounted) fetchOrders();
      })
      .subscribe();

    // Set up real-time subscription for transport jobs to notify buyer
    const transportJobsSubscription = supabase
      .channel(`buyer_transport_${profile.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'transport_jobs',
        filter: `buyer_id=eq.${profile.id}`
      }, payload => {
        if (payload.new && payload.new.status === 'accepted' && payload.old.status !== 'accepted') {
          toast.success(`A transporter (${payload.new.transporter_name || 'Driver'}) has accepted your delivery job!`, {
            duration: 8000,
            icon: '🚚'
          });
        }
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(ordersSubscription);
      supabase.removeChannel(transportJobsSubscription);
    };
  }, [profile?.id]);

  useEffect(() => {
    if (transportMethod === 'buyer_dispatcher') {
      const fetchTransporters = async () => {
        try {
          const { data, error } = await supabase
            .from('transporters')
            .select('*')
            .limit(10);
            
          if (error) throw error;
          setAvailableTransporters(data || []);
        } catch (error) {
          console.error("Error fetching transporters:", error);
        }
      };
      fetchTransporters();
    }
  }, [transportMethod]);

  const handleRequestTransport = (orderId: string) => {
    setTransportModalOrder(orderId);
    setTransportMethod('store_dispatcher');
    setDispatcherName('');
    setDispatcherPhone('');
    setSelectedTransporterId(null);
  };

  const submitTransportRequest = async () => {
    if (!transportModalOrder) return;
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', transportModalOrder)
        .single();
        
      if (orderError || !orderData) return;

      const storeId = orderData.seller_ids?.[0] || 'unknown_store';
      const storeName = orderData.items?.[0]?.storeName || orderData.items?.[0]?.store_name || 'Store';

      if (transportMethod === 'store_dispatcher') {
        await supabase.from('transport_jobs').insert([{
          order_id: transportModalOrder,
          buyer_id: profile?.id,
          store_id: storeId,
          pickup_location: storeName, // In a real app, use actual store address
          delivery_location: 'Buyer Address', // In a real app, use actual buyer address
          status: 'awaiting_transporter',
          created_at: new Date().toISOString(),
          total_amount: orderData.total,
          items: orderData.items,
          method: 'store_dispatcher'
        }]);
      } else if (transportMethod === 'buyer_dispatcher' && selectedTransporterId) {
        const selectedTransporter = availableTransporters.find(t => t.id === selectedTransporterId);
        await supabase.from('transport_jobs').insert([{
          order_id: transportModalOrder,
          buyer_id: profile?.id,
          store_id: storeId,
          transporter_id: selectedTransporterId,
          transporter_name: selectedTransporter?.name || 'Platform Transporter',
          pickup_location: storeName,
          delivery_location: 'Buyer Address',
          status: 'pending_acceptance',
          created_at: new Date().toISOString(),
          total_amount: orderData.total,
          items: orderData.items,
          method: 'buyer_dispatcher'
        }]);
      }

      await supabase.from('orders').update({
        status: transportMethod === 'self' ? 'ready_for_pickup' : 'processing',
        transport_requested: true,
        transport_method: transportMethod,
        ...(transportMethod === 'buyer_dispatcher' && selectedTransporterId ? {
          transporter_id: selectedTransporterId
        } : {})
      }).eq('id', transportModalOrder);

      setTransportModalOrder(null);
    } catch (error) {
      console.error('Error requesting transport:', error);
    }
  };

  const submitDispute = async () => {
    if (!disputeModalOrder || !disputeDescription.trim()) {
      alert("Please provide a description of the issue.");
      return;
    }
    setSubmittingDispute(true);
    try {
      const { error } = await supabase
        .from('disputes')
        .insert({
          order_id: disputeModalOrder.id,
          buyer_id: profile.id,
          seller_id: disputeModalOrder.seller_ids?.[0] || disputeModalOrder.store_id, // Fallback
          store_id: disputeModalOrder.store_id,
          reason: disputeReason,
          description: disputeDescription,
          status: 'open'
        });
        
      if (error) throw error;
      
      setDisputeModalOrder(null);
      setDisputeDescription('');
      alert('Dispute opened successfully. Our team will review it shortly.');
    } catch (error) {
      console.error('Error opening dispute:', error);
      alert('Failed to open dispute.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  return (
    <div className="space-y-12">
      {activeView === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Module 
              title="Browse Products" 
              icon={ShoppingBag} 
              color="bg-blue-500" 
              description="Find the best deals across the continent." 
              onClick={() => setActiveTab?.('marketplace')}
            />
            <Module 
              title="Saved Items" 
              icon={Heart} 
              color="bg-pink-500" 
              description="Items you've bookmarked for later." 
              onClick={() => {/* Handle wishlist view if needed */}}
            />
            <Module 
              title="Orders" 
              icon={Package} 
              color="bg-indigo-500" 
              description="Track your active and past purchases." 
              onClick={() => setActiveView('orders')}
            />
            <Module 
              title="Messages" 
              icon={MessageSquare} 
              color="bg-emerald-500" 
              description="Chat with sellers and transporters." 
              onClick={() => setActiveTab?.('chat')}
            />
            <Module 
              title="Notifications" 
              icon={Bell} 
              color="bg-orange-500" 
              description="Stay updated on your order status." 
              onClick={() => {/* Handle notifications view if needed */}}
            />
            <Module 
              title="Profile" 
              icon={User} 
              color="bg-gray-500" 
              description="Manage your personal information." 
              onClick={() => setShowProfile?.(true)}
            />
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Recent Orders Section */}
            <section className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                  <Package className="text-indigo-500" size={20} />
                  Recent Orders
                </h3>
                <button 
                  onClick={() => setActiveView('orders')}
                  className="text-indigo-600 font-bold text-xs uppercase tracking-widest flex items-center gap-1 hover:underline"
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                    <Package className="mx-auto text-gray-300 mb-3" size={32} />
                    <p className="text-gray-400 font-bold text-sm">No orders yet. Start shopping!</p>
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-black/5 hover:border-indigo-200 transition-colors group cursor-pointer">
                      <div className="flex items-center gap-4">
                        {order.items?.[0]?.images?.[0] ? (
                          <img src={order.items[0].images[0]} alt="Order thumbnail" className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white" />
                        ) : (
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm">
                            <ShoppingBag size={20} />
                          </div>
                        )}
                        <div>
                          <p className="font-black text-sm text-gray-900">Order #{order.id.slice(-6).toUpperCase()}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 
                              order.status === 'shipped' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                              {order.status ? order.status.replace('_', ' ') : 'Processing'}
                            </span>
                            {order.status === 'paid' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestTransport(order.id);
                                }}
                                className="px-3 py-1 bg-indigo-600 text-white rounded-md font-bold text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-colors flex items-center gap-1"
                              >
                                <Truck size={10} />
                                Request Transport
                              </button>
                            )}
                            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                              <Clock size={10} />
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recently'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <PriceDisplay 
                          amount={order.total || 0} 
                          sourceCountry={order.store_currency || 'Nigeria'} 
                          targetCountry={profile?.country}
                          className="font-black text-gray-900"
                          originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-2 block mt-1"
                        />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.items?.length || 1} items</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </>
      )}

      {activeView === 'orders' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setActiveView('overview')}
              className="flex items-center gap-2 text-gray-400 font-bold hover:text-indigo-600 transition-colors"
            >
              <ChevronRight className="rotate-180" size={20} />
              Back to Overview
            </button>
            <h2 className="text-3xl font-black tracking-tight">My Orders</h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center p-12">
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            ) : allOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] border border-black/5 text-center">
                <Package className="mx-auto text-gray-300 mb-4" size={48} />
                <p className="text-gray-400 font-bold text-lg">No orders found.</p>
                <button 
                  onClick={() => setActiveTab?.('marketplace')}
                  className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              allOrders.map(order => (
                <div 
                  key={order.id} 
                  className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 hover:border-indigo-200 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    {order.items?.[0]?.images?.[0] ? (
                      <img src={order.items[0].images[0]} alt="Order thumbnail" className="w-16 h-16 rounded-2xl object-cover shrink-0 group-hover:scale-110 transition-transform shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <ShoppingBag size={32} />
                      </div>
                    )}
                    <div>
                      <h4 className="text-lg font-black">Order #{order.id.slice(-6).toUpperCase()}</h4>
                      <div className="text-gray-400 font-bold text-sm flex items-center gap-1 flex-wrap">
                        {order.items?.length || 1} items • Total: 
                        <PriceDisplay 
                          amount={order.total || 0} 
                          sourceCountry={order.store_currency || 'Nigeria'} 
                          targetCountry={profile?.country}
                          className=""
                          originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-1"
                        />
                      </div>
                      <p className="text-xs font-bold text-gray-400 mt-1">
                        Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Recently'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                      ['pending_payment', 'awaiting_seller_confirmation'].includes(order.status) ? 'bg-amber-50 text-amber-600' :
                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {order.status ? order.status.replace(/_/g, ' ') : 'Processing'}
                    </span>
                    {order.status === 'paid' && (
                      <button 
                        onClick={() => handleRequestTransport(order.id)}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2"
                      >
                        <Truck size={16} />
                        Request Transport
                      </button>
                    )}
                    {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'pending_payment' && (
                      <button 
                        onClick={() => setDisputeModalOrder(order)}
                        className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors flex items-center gap-2"
                      >
                        <AlertTriangle size={16} />
                        Report Issue
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Transport Modal */}
      {transportModalOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-gray-900">Delivery Method</h3>
              <button 
                onClick={() => setTransportModalOrder(null)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-8">
              <label className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${transportMethod === 'store_dispatcher' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input 
                  type="radio" 
                  name="transportMethod" 
                  value="store_dispatcher"
                  checked={transportMethod === 'store_dispatcher'}
                  onChange={(e) => setTransportMethod(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-black text-gray-900">Store Dispatcher</p>
                  <p className="text-sm text-gray-500 font-medium">Let the platform or store arrange delivery for you.</p>
                </div>
              </label>

              <label className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${transportMethod === 'buyer_dispatcher' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input 
                  type="radio" 
                  name="transportMethod" 
                  value="buyer_dispatcher"
                  checked={transportMethod === 'buyer_dispatcher'}
                  onChange={(e) => setTransportMethod(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-black text-gray-900">Hire Platform Transporter</p>
                  <p className="text-sm text-gray-500 font-medium">Find and hire an independent transporter nearby.</p>
                </div>
              </label>

              <label className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${transportMethod === 'self' ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <input 
                  type="radio" 
                  name="transportMethod" 
                  value="self"
                  checked={transportMethod === 'self'}
                  onChange={(e) => setTransportMethod(e.target.value as any)}
                  className="mt-1"
                />
                <div>
                  <p className="font-black text-gray-900">Self Pickup</p>
                  <p className="text-sm text-gray-500 font-medium">Pick up the items yourself in person.</p>
                </div>
              </label>
            </div>

            {transportMethod === 'buyer_dispatcher' && (
              <div className="space-y-4 mb-8 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                <h4 className="font-black text-gray-900 mb-2">Available Transporters</h4>
                {availableTransporters.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <Truck className="mx-auto text-gray-300 mb-2" size={24} />
                    <p className="text-sm text-gray-500 font-medium">No transporters available right now.</p>
                  </div>
                ) : (
                  availableTransporters.map(transporter => (
                    <div 
                      key={transporter.id}
                      onClick={() => setSelectedTransporterId(transporter.id)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        selectedTransporterId === transporter.id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{transporter.name}</p>
                          <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                            <Truck size={12} /> {transporter.vehicleType || 'Vehicle'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-amber-500 text-xs font-black">
                          <Star size={12} className="fill-current" /> 4.8
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">~2.5 km away</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <button 
              onClick={submitTransportRequest}
              disabled={transportMethod === 'buyer_dispatcher' && !selectedTransporterId}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transportMethod === 'buyer_dispatcher' ? 'Send Job Request' : 'Confirm Delivery Method'}
            </button>
          </motion.div>
        </div>
      )}

      {/* Dispute Modal */}
      <AnimatePresence>
        {disputeModalOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" />
                  Report an Issue
                </h3>
                <button 
                  onClick={() => setDisputeModalOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Dispute</label>
                  <select 
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                  >
                    <option value="Item not received">Item not received</option>
                    <option value="Item significantly not as described">Item significantly not as described</option>
                    <option value="Seller unresponsive">Seller unresponsive</option>
                    <option value="Fake or counterfeit item">Fake or counterfeit item</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                  <textarea 
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    placeholder="Please provide details about the issue..."
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 h-32 resize-none"
                  />
                </div>

                <button 
                  onClick={submitDispute}
                  disabled={submittingDispute}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BuyerDashboard;
