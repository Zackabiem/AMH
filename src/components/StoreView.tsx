import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  ShieldCheck, 
  Users, 
  ShoppingBag,
  ShoppingCart,
  Check,
  Info,
  ChevronRight,
  Store,
  Image as ImageIcon,
  Play,
  X as XIcon,
  Loader2,
  Calendar,
  Briefcase,
  Clock,
  Award,
  Plus,
  Edit3,
  Trash2,
  MessageSquare,
  Share2,
  Heart,
  Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { formatPrice } from '../lib/currency';
import PriceDisplay from './PriceDisplay';
import ProductCard from './ProductCard';

interface StoreViewProps {
  storeId: string;
  onClose: () => void;
  onAddToCart: (product: any) => void;
  onEditProduct?: (product: any) => void;
  onDeleteProduct?: (product: any) => void;
  cart: any[];
  setActiveTab: (tab: string) => void;
  setChatTarget: (target: { userId: string; userName: string; initialMessage?: string } | null) => void;
}

const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url.split('?')[0]);

const StoreView: React.FC<StoreViewProps> = ({ 
  storeId, 
  onClose, 
  onAddToCart, 
  onEditProduct, 
  onDeleteProduct, 
  cart,
  setActiveTab,
  setChatTarget
}) => {
  const { user, profile } = useAuth() || {};
  const [store, setStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [reviews, setReviews] = useState<any[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [postingUpdate, setPostingUpdate] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let isMounted = true;

    const fetchUpdates = async (retryCount = 0) => {
      try {
        const { data, error } = await supabase
          .from('store_updates')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

        if (error) {
          if (retryCount < 3 && (
            error.message?.includes('fetch') || 
            error.message?.includes('Lock') || 
            error.message?.includes('AbortError') ||
            error.message?.includes('steal') ||
            error.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => isMounted && fetchUpdates(retryCount + 1), delay);
            return;
          }
          throw error;
        }
        if (isMounted) setUpdates(data || []);
      } catch (err) {
        console.error('Error fetching updates:', err);
      }
    };

    fetchUpdates();

    const subscription = supabase.channel('store_updates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_updates', filter: `store_id=eq.${storeId}` }, payload => {
        fetchUpdates();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [storeId]);

  const filteredUpdates = updates.filter(update => {
    if (!update.created_at) return true;
    const updateDate = new Date(update.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return updateDate > sevenDaysAgo;
  });

  const isFollowerOrOwner = user?.id === store?.owner_id || following;

  const handlePostUpdate = async () => {
    if (!newUpdateText.trim() || !user || !storeId) return;

    setPostingUpdate(true);
    try {
      const { error } = await supabase
        .from('store_updates')
        .insert({
          store_id: storeId,
          seller_id: user.id,
          text: newUpdateText,
          likes: []
        });
      
      if (error) throw error;
      setNewUpdateText('');
    } catch (error) {
      console.error('Error posting update:', error);
    } finally {
      setPostingUpdate(false);
    }
  };

  const handleLikeUpdate = async (updateId: string, currentLikes: string[]) => {
    if (!user) return;

    const isLiked = currentLikes.includes(user.id);
    const newLikes = isLiked 
      ? currentLikes.filter(id => id !== user.id)
      : [...currentLikes, user.id];

    try {
      const { error } = await supabase
        .from('store_updates')
        .update({ likes: newLikes })
        .eq('id', updateId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [storeReviews, setStoreReviews] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async (retryCount = 0) => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

        if (error) {
          if (retryCount < 3 && (
            error.message?.includes('fetch') || 
            error.message?.includes('Lock') || 
            error.message?.includes('AbortError') ||
            error.message?.includes('steal') ||
            error.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => isMounted && fetchReviews(retryCount + 1), delay);
            return;
          }
          throw error;
        }
        if (isMounted) setStoreReviews(data || []);
      } catch (err) {
        console.error('Error fetching store reviews:', err);
      }
    };

    fetchReviews();

    const subscription = supabase.channel('store_reviews_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `store_id=eq.${storeId}` }, payload => {
        fetchReviews();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [storeId]);

  const storeRating = storeReviews.length > 0 
    ? storeReviews.reduce((acc, curr) => acc + curr.rating, 0) / storeReviews.length 
    : 0;

  useEffect(() => {
    let isMounted = true;
    if (!selectedProduct) {
      setReviews([]);
      setHasPurchased(false);
      return;
    }

    const fetchProductReviews = async (retryCount = 0) => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('product_id', selectedProduct.id)
          .order('created_at', { ascending: false });

        if (error) {
          if (retryCount < 3 && (
            error.message?.includes('fetch') || 
            error.message?.includes('Lock') || 
            error.message?.includes('AbortError') ||
            error.message?.includes('steal') ||
            error.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => isMounted && fetchProductReviews(retryCount + 1), delay);
            return;
          }
          throw error;
        }
        if (isMounted) setReviews(data || []);
      } catch (err) {
        console.error('Error fetching product reviews:', err);
      }
    };

    fetchProductReviews();

    const subscription = supabase.channel('product_reviews_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `product_id=eq.${selectedProduct.id}` }, payload => {
        fetchProductReviews();
      })
      .subscribe();

    // Check if purchased
    const checkPurchase = async (retryCount = 0) => {
      if (!user) return;
      try {
        const { data: orders, error } = await supabase
          .from('orders')
          .select('items')
          .eq('buyer_id', user.id)
          .eq('status', 'delivered');

        if (error) {
          if (retryCount < 3 && (
            error.message?.includes('fetch') || 
            error.message?.includes('Lock') || 
            error.message?.includes('AbortError') ||
            error.message?.includes('steal') ||
            error.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => isMounted && checkPurchase(retryCount + 1), delay);
            return;
          }
          throw error;
        }
        
        if (isMounted && orders) {
          const purchased = orders.some(order => {
            const items = order.items || [];
            return items.some((item: any) => item.id === selectedProduct.id);
          });
          setHasPurchased(purchased);
        }
      } catch (err) {
        console.error('Error checking purchase:', err);
      }
    };
    
    if (user) {
      checkPurchase();
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [selectedProduct, user]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;

    setIsReviewing(true);
    try {
      const reviewData = {
        user_id: user.id,
        user_name: profile?.username || 'Anonymous Buyer',
        product_id: selectedProduct.id,
        store_id: storeId,
        rating: reviewRating,
        comment: reviewComment
      };

      const { error: reviewError } = await supabase
        .from('reviews')
        .insert(reviewData);

      if (reviewError) throw reviewError;

      // Update product average rating
      const newReviewCount = (selectedProduct.reviewCount || 0) + 1;
      const newRating = ((selectedProduct.rating || 0) * (selectedProduct.reviewCount || 0) + reviewRating) / newReviewCount;

      const { error: updateError } = await supabase
        .from('products')
        .update({
          rating: Number((newRating || 0).toFixed(1)),
          review_count: newReviewCount
        })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      setReviewComment('');
      setReviewRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsReviewing(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchStoreData = async (retryCount = 0) => {
      try {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError) {
          if (retryCount < 3 && (
            storeError.message?.includes('fetch') || 
            storeError.message?.includes('Lock') || 
            storeError.message?.includes('AbortError') ||
            storeError.message?.includes('steal') ||
            storeError.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => isMounted && fetchStoreData(retryCount + 1), delay);
            return;
          }
          throw storeError;
        }
        
        if (isMounted && storeData) {
          setStore(storeData);
          if (user) {
            setFollowing(storeData.followers?.includes(user.id) || false);
          }
        }

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId);

        if (productsError) throw productsError;
        if (isMounted) {
          setProducts(productsData || []);
          setLoading(false);
        }

      } catch (error) {
        console.error('Error fetching store data:', error);
        if (isMounted) setLoading(false);
      }
    };

    fetchStoreData();

    if (user) {
      const fetchSavedItems = async () => {
        const { data } = await supabase
          .from('saved_items')
          .select('product_id')
          .eq('user_id', user.id);
        if (data) setSavedItemIds(data.map(item => item.product_id));
      };
      fetchSavedItems();
    }

    const storeSubscription = supabase.channel('store_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` }, payload => {
        fetchStoreData();
      })
      .subscribe();

    const productsSubscription = supabase.channel('products_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `store_id=eq.${storeId}` }, payload => {
        fetchStoreData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(storeSubscription);
      supabase.removeChannel(productsSubscription);
    };
  }, [storeId, user]);

  const handleMessageSeller = (product?: any) => {
    if (!store || !user) return;
    
    let initialMessage = '';
    if (product) {
      initialMessage = `Hi, I'm interested in your product: "${product.title}" (ID: ${product.id}). Is it still available?`;
    } else {
      initialMessage = `Hi, I'm interested in your store "${store.name}". I'd like to inquire about your products.`;
    }

    setChatTarget({
      userId: store.owner_id,
      userName: store.name || 'Seller',
      initialMessage
    });
    setActiveTab('chat');
    if (product) setSelectedProduct(null);
  };

  const handleFollow = async () => {
    if (!user || followLoading) return;
    setFollowLoading(true);
    
    try {
      const currentFollowers = store?.followers || [];
      const newFollowers = following 
        ? currentFollowers.filter((id: string) => id !== user.id)
        : [...currentFollowers, user.id];

      const { error: storeError } = await supabase
        .from('stores')
        .update({ followers: newFollowers })
        .eq('id', storeId);

      if (storeError) throw storeError;

      const currentFollowing = profile?.following || [];
      const newFollowing = following
        ? currentFollowing.filter((id: string) => id !== storeId)
        : [...currentFollowing, storeId];

      const { error: userError } = await supabase
        .from('users')
        .update({ following: newFollowing })
        .eq('id', user.id);

      if (userError) throw userError;

      setFollowing(!following);
    } catch (error) {
      console.error('Error following store:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    if (!store) return;
    
    // In a real app, this would be a deep link to the store
    const shareUrl = window.location.href;
    const shareTitle = `Check out ${store.name} on the Marketplace`;
    const shareText = store.description || `Discover amazing products from ${store.name}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError' && !error.message?.includes('canceled')) {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareTitle}\n${shareUrl}`);
        alert('Store link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  const toggleSaveProduct = async (productId: string) => {
    if (!user) return;
    try {
      const isSaved = savedItemIds.includes(productId);
      if (isSaved) {
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        if (error) throw error;
        setSavedItemIds(prev => prev.filter(id => id !== productId));
      } else {
        const { error } = await supabase
          .from('saved_items')
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        setSavedItemIds(prev => [...prev, productId]);
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
    }
  };

  if (!store && !loading) return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6">
        <Store size={48} />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2">Store Not Found</h2>
      <p className="text-gray-500 font-bold mb-8">The store you are looking for might have been moved or closed.</p>
      <button 
        onClick={onClose}
        className="w-14 h-14 bg-gray-900 text-white rounded-2xl font-black hover:bg-emerald-600 transition-all flex items-center justify-center shadow-xl"
      >
        <ArrowLeft size={28} />
      </button>
    </div>
  );

  const highlights = store?.highlights || [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1531058020387-3be344556be6?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1488459711615-228239783f78?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?q=80&w=1000&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=1000&auto=format&fit=crop',
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-slate-50 overflow-y-auto">
      {/* Hero Section */}
      <div className="relative h-[45vh] bg-gray-900 border-b border-gray-200 shadow-sm">
        {store?.image_url ? (
          <img src={store.image_url} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-black opacity-60" />
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/20 to-transparent pointer-events-none" />
        
        {/* Simplified Back Button */}
        <div className="absolute top-8 left-8 flex items-center gap-4 z-20">
          <button 
            onClick={onClose}
            className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white/10 backdrop-blur-xl text-white rounded-[20px] hover:bg-white/20 transition-all border border-white/20 group shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-105"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          {store?.is_locked && (
            <div className="px-5 md:px-6 py-2.5 md:py-3 bg-rose-600/90 backdrop-blur-md text-white rounded-2xl shadow-xl flex items-center gap-2 animate-pulse border border-rose-500/50">
              <Lock size={18} />
              <span className="font-black text-xs md:text-sm uppercase tracking-widest hidden sm:inline">Store Locked</span>
            </div>
          )}
        </div>

        <div className="absolute -bottom-24 md:-bottom-20 left-0 right-0 px-4 md:px-8 z-10">
          <div className="max-w-7xl mx-auto flex flex-col items-center md:flex-row md:items-end gap-4 md:gap-8 text-center md:text-left">
            <div className="w-24 h-24 md:w-40 md:h-40 rounded-[30px] md:rounded-[36px] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-1.5 md:p-2 shrink-0 border border-gray-100">
              <div className="w-full h-full rounded-[28px] bg-emerald-50 flex items-center justify-center text-emerald-600 overflow-hidden relative group">
                {store?.image_url ? (
                  <img src={store.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" alt="Store logo" />
                ) : (
                  <Store size={48} className="opacity-50" />
                )}
                {store?.image_url && (
                  <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
            <div className="flex-1 pb-2 md:pb-6 relative z-10 flex flex-col items-center md:items-start">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-2 flex-wrap">
                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gray-900 drop-shadow-sm">{store?.name || 'Loading...'}</h1>
                {store?.verified && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100/80 backdrop-blur-sm text-emerald-700 rounded-full border border-emerald-200/50 shadow-sm">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verified</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-gray-600 font-bold text-sm md:text-base">
                <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-black/5">
                  <Star className="text-amber-500" size={18} fill="currentColor" />
                  <span className="text-gray-900">{Number(storeRating || 0).toFixed(1)}</span>
                  <span className="text-gray-400 text-xs hidden sm:inline">({storeReviews.length})</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-black/5">
                  <Users size={18} className="text-indigo-500" />
                  <span>{store?.followers?.length || 0} Followers</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-sm border border-black/5">
                  <MapPin size={18} className="text-rose-500" />
                  <span>{store?.location || 'Africa'}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center md:justify-end gap-3 pb-2 md:pb-6 shrink-0 relative z-10">
              {user && user.id !== store?.owner_id && (
                <button 
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-6 py-4 md:px-8 md:py-4 rounded-[20px] font-black transition-all shadow-sm flex items-center gap-2 border ${
                    following 
                    ? 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200 border-transparent shadow-[0_8px_30px_rgb(16,185,129,0.2)]'
                  }`}
                >
                  {followLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : following ? (
                    'Following'
                  ) : (
                    'Follow Store'
                  )}
                </button>
              )}
              {user && user.id !== store?.owner_id && (
                <button 
                  onClick={() => handleMessageSeller()}
                  className="p-4 bg-white text-gray-900 rounded-[20px] border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 font-bold"
                  title="Message Seller"
                >
                  <MessageSquare size={20} />
                  <span className="hidden lg:inline text-sm">Message</span>
                </button>
              )}
              <button 
                onClick={handleShare}
                className="p-4 bg-white text-gray-900 rounded-[20px] border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-sm font-bold flex items-center gap-2"
                title="Share Store"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-32 md:pt-28 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Sidebar */}
          <div className="space-y-6 md:space-y-12">
            <section className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info size={14} className="text-gray-300"/> About the Store
              </h3>
              <p className="text-gray-600 leading-relaxed font-medium text-sm md:text-base">
                {store?.description || 'No description provided.'}
              </p>
            </section>

            {/* Store Highlights - Facebook Style Grid */}
            <section className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                Store Highlights
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">New</span>
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {highlights.map((url: string, idx: number) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImage(url)}
                    className="aspect-square rounded-xl bg-gray-100 overflow-hidden cursor-pointer relative group"
                  >
                    {isVideo(url) ? (
                      <video src={url} className="w-full h-full object-cover pointer-events-none" muted loop playsInline autoPlay />
                    ) : (
                      <img src={url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ImageIcon size={16} className="text-white" />
                    </div>
                    {/* Video indicator */}
                    {isVideo(url) && (
                      <div className="absolute top-1 right-1 p-1 bg-black/40 backdrop-blur-md rounded-md">
                        <Play size={8} className="text-white fill-current" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-bold mt-3 text-center uppercase tracking-widest">
                Click to view full size
              </p>
            </section>
            
            <div className="p-6 md:p-8 bg-gradient-to-br from-gray-50 to-emerald-50/30 rounded-[24px] md:rounded-[32px] space-y-4 border border-gray-100 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex items-center justify-between text-sm">
                <span className="text-gray-500 font-bold uppercase tracking-wider text-[11px]">Trust Score</span>
                <span className="text-emerald-600 font-black text-lg">{store?.trust_score || 95}%</span>
              </div>
              <div className="relative z-10 w-full h-2.5 bg-gray-200/80 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${store?.trust_score || 95}%` }} />
              </div>
              <p className="relative z-10 text-[10px] text-gray-400 font-bold uppercase leading-tight flex items-start gap-1.5 mt-2">
                <ShieldCheck size={12} className="shrink-0 mt-0.5 text-emerald-500" />
                Verified by African Market Hub for quality and reliability.
              </p>
            </div>

            <section className="p-6 md:p-8 bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[24px] md:rounded-[32px] space-y-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Business Information</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                    <p className="text-sm font-bold text-gray-900">{store?.business_type || 'Retail'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Founded</p>
                    <p className="text-sm font-bold text-gray-900">{store?.founded_year || '2023'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Response Time</p>
                    <p className="text-sm font-bold text-gray-900">{store?.response_time || '< 1 hour'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Member Since</p>
                    <p className="text-sm font-bold text-gray-900">{store?.member_since ? new Date(store.member_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'March 2024'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="p-6 md:p-8 bg-gray-900 border border-gray-800 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-white rounded-[24px] md:rounded-[32px] relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Store Impact</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-3xl font-black text-white">{store?.total_sales || '1.2k'}+</p>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total Sales</p>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Check size={14} />
                    Top Rated Seller
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8 bg-white p-5 md:p-6 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <ShoppingBag size={20} />
                </div>
                Store Products
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 ml-2">
                  {products.length}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  user={user}
                  profile={profile}
                  cart={cart}
                  addToCart={onAddToCart}
                  setChatTarget={setChatTarget}
                  setActiveTab={setActiveTab}
                  toggleSaveProduct={toggleSaveProduct}
                  savedItemIds={savedItemIds}
                  setViewingStoreId={() => {}} // Already in store view
                  setSelectedProduct={(product) => {
                    setSelectedProduct(product);
                    setModalImageIndex(0);
                  }}
                  onEditProduct={onEditProduct}
                  onDeleteProduct={onDeleteProduct}
                  isStoreOwner={user && user.id === store?.owner_id}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
            >
              <div className="md:w-1/2 bg-gray-50 flex flex-col">
                <div className="aspect-square relative w-full">
                  <img 
                    src={selectedProduct.images?.[modalImageIndex] || 'https://placehold.co/400x400?text=No+Image'} 
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-6 left-6 p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm hover:bg-white transition-all z-10"
                  >
                    <XIcon size={24} />
                  </button>
                </div>
                {selectedProduct.images && selectedProduct.images.length > 1 && (
                  <div className="flex gap-4 p-6 overflow-x-auto bg-white border-b border-gray-100">
                    {selectedProduct.images.map((img: string, idx: number) => (
                      <button 
                        key={idx} 
                        onClick={() => setModalImageIndex(idx)} 
                        className={`w-20 h-20 rounded-2xl overflow-hidden border-4 shrink-0 transition-all ${modalImageIndex === idx ? 'border-emerald-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="md:w-1/2 flex flex-col h-full max-h-[90vh]">
                <div className="flex-1 overflow-y-auto p-8 md:p-12">
                  <div className="flex items-center gap-2 mb-6">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                    {selectedProduct.category}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">{selectedProduct.title}</h2>
                <div className="flex items-center gap-6 mb-8">
                  <div className="flex items-center gap-2">
                    <Star className="text-amber-500" size={20} fill="currentColor" />
                    <span className="font-black text-lg">{selectedProduct.rating ? Number(selectedProduct.rating).toFixed(1) : '5.0'}</span>
                    <span className="text-gray-400 text-sm">({selectedProduct.review_count || 0} reviews)</span>
                  </div>
                  <div className="w-px h-6 bg-gray-100" />
                  <div className="flex items-center gap-2 text-gray-400">
                    <MapPin size={18} />
                    <span className="font-bold text-sm uppercase tracking-widest">{selectedProduct.location}</span>
                  </div>
                </div>

                {/* Seller Info */}
                <div 
                  onClick={() => setSelectedProduct(null)}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl mb-8 cursor-pointer hover:bg-gray-100 transition-all group"
                  title="View Store"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden group-hover:scale-110 transition-transform">
                    {store?.image_url ? (
                      <img src={store.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-black text-xl">
                        {store?.name?.charAt(0) || 'S'}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Sold By</p>
                    <p className="font-black text-gray-900">{store?.name || 'African Merchant'}</p>
                  </div>
                </div>

                <p className="text-gray-500 text-lg leading-relaxed mb-12">{selectedProduct.description}</p>

                {/* Reviews Section */}
                <div className="mb-12">
                  <h4 className="text-xl font-black mb-6 flex items-center gap-2">
                    Customer Reviews
                    <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {reviews.length}
                    </span>
                  </h4>

                  {user && hasPurchased && (
                    <form onSubmit={handleSubmitReview} className="mb-8 p-6 bg-emerald-50 rounded-3xl space-y-4">
                      <p className="text-sm font-bold text-emerald-800">Share your experience</p>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className={`p-1 transition-all ${reviewRating >= star ? 'text-amber-500' : 'text-gray-300'}`}
                          >
                            <Star size={24} fill={reviewRating >= star ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        required
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Write your review here..."
                        className="w-full p-4 bg-white border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all h-24 resize-none text-sm"
                      />
                      <button
                        disabled={isReviewing}
                        type="submit"
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isReviewing ? <Loader2 className="animate-spin" size={20} /> : 'Submit Review'}
                      </button>
                    </form>
                  )}

                  <div className="space-y-6">
                    {reviews.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">No reviews yet.</p>
                    ) : (
                      reviews.map((review) => (
                        <div key={review.id} className="border-b border-gray-50 pb-6 last:border-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-bold text-gray-900">{review.user_name}</p>
                              <div className="flex gap-0.5 text-amber-500 mt-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} size={12} fill={review.rating >= star ? 'currentColor' : 'none'} />
                                ))}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                              {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Just now'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 leading-relaxed">{review.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-8 rounded-[32px] mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Price</span>
                    <PriceDisplay 
                      amount={selectedProduct.price} 
                      sourceCountry={store?.currency || 'Nigeria'} 
                      targetCountry={user?.user_metadata?.country}
                      className="text-4xl font-black text-emerald-600"
                      originalPriceClassName="text-sm font-bold text-gray-400 line-through ml-2"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Availability</span>
                    <span className="text-emerald-600 font-black uppercase tracking-widest text-xs">In Stock</span>
                  </div>
                </div>
                </div>
                
                {/* Sticky Bottom Bar */}
                <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between gap-6 shrink-0">
                  <PriceDisplay 
                    amount={selectedProduct.price} 
                    sourceCountry={store?.currency || 'Nigeria'} 
                    targetCountry={user?.user_metadata?.country}
                    className="text-3xl font-black text-gray-900 hidden sm:block"
                  />
                  <div className="flex gap-3 w-full sm:w-auto">
                    {user && user.id !== store?.owner_id && (() => {
                      const quantity = cart.filter((item: any) => item.id === selectedProduct.id).length;
                      const isAdded = quantity > 0;
                      const isLocked = store?.is_locked;

                      return (
                        <>
                          <button 
                            onClick={() => !isLocked && handleMessageSeller(selectedProduct)}
                            disabled={isLocked}
                            className="flex-1 sm:flex-none px-6 py-4 bg-gray-100 text-gray-900 rounded-2xl font-black hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <MessageSquare size={20} />
                            <span className="hidden sm:inline">Chat</span>
                          </button>
                          <button 
                            onClick={() => !isLocked && onAddToCart(selectedProduct)}
                            disabled={isLocked}
                            className={`flex-1 sm:flex-none px-8 py-4 text-white rounded-2xl font-black transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 ${
                              isAdded ? 'bg-emerald-700 shadow-emerald-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                            }`}
                          >
                            <ShoppingCart size={20} />
                            {isAdded ? 'Added' : 'Add to Cart'}
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-8 cursor-zoom-out"
          >
            <button className="absolute top-8 right-8 text-white hover:scale-110 transition-transform">
              <XIcon size={32} />
            </button>
            {isVideo(selectedImage) ? (
              <motion.video
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={selectedImage}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-3xl shadow-2xl"
              />
            ) : (
              <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={selectedImage}
                className="max-w-full max-h-full rounded-3xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoreView;
