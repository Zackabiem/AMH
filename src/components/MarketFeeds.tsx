import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, ShoppingCart, X, Loader2, Package, Search, Filter, MapPin, Star, ChevronRight, ChevronLeft, Heart, Store, ArrowRight, ArrowLeft, Truck, Upload, Image as ImageIcon, Bookmark, BookmarkCheck, Check, Edit3, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import Checkout from './Checkout';
import StoreView from './StoreView';
import ProductForm from './ProductForm';
import { formatPrice } from '../lib/currency';
import PriceDisplay from './PriceDisplay';
import ProductCard from './ProductCard';
import StatusViewer from './StatusViewer';

interface Product {
  id: string;
  sellerId: string;
  sellerName?: string;
  storeId?: string;
  storeName?: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  images?: string[];
  rating: number;
  reviewCount?: number;
  trustScore: number;
  isPromoted?: boolean;
  deliveryAvailable?: boolean;
  likes?: string[];
  tags?: string[];
  quantity?: number;
  sku?: string;
  currency?: string;
  createdAt: any;
}

interface Review {
  id: string;
  user_id: string;
  user_name: string;
  product_id: string;
  rating: number;
  comment: string;
  created_at: any;
}

interface MarketplaceProps {
  setActiveTab: (tab: string) => void;
  setChatTarget: (target: { userId: string; userName: string; initialMessage?: string } | null) => void;
}

const MarketFeeds: React.FC<MarketplaceProps> = ({ setActiveTab, setChatTarget }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<Product[]>([]);
  const [cartConflict, setCartConflict] = useState<Product | null>(null);
  const [checkoutOrder, setCheckoutOrder] = useState<any>(null);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [viewingStoreId, setViewingStoreId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [savedItemIds, setSavedItemIds] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { user, profile } = useAuth() || {};

  // Status Updates State
  const [statusUpdates, setStatusUpdates] = useState<any[]>([]);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState<number | null>(null);
  const [statusProgress, setStatusProgress] = useState(0);
  
  // Quick Post Status State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showNoStoreAlert, setShowNoStoreAlert] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusMedia, setStatusMedia] = useState<File | null>(null);
  const [postingStatus, setPostingStatus] = useState(false);
  const [sellerStore, setSellerStore] = useState<any>(null);

  // Pull-to-Refresh State
  const [pullStartY, setPullStartY] = useState(0);
  const [pullMoveY, setPullMoveY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<number | ''>('');
  const [maxPrice, setMaxPrice] = useState<number | ''>('');
  const [minRating, setMinRating] = useState<number>(0);
  const [minTrustScore, setMinTrustScore] = useState(0);
  const [deliveryOnly, setDeliveryOnly] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const categories = ['All', 'Fashion', 'Agriculture', 'Crafts', 'Electronics', 'Food', ...(user ? ['Favorites'] : [])];

  const [isCacheHit, setIsCacheHit] = useState<boolean | null>(null);

  const PAGE_SIZE = 8;

  const fetchProducts = async (isNextPage = false, retryCount = 0) => {
    if (isNextPage) setLoadingMore(true);
    else setLoading(true);

    try {
      // Small delay on initial load to avoid collision with App.tsx auth calls
      if (!isNextPage && retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      const pageNum = isNextPage ? (Math.floor(products.length / PAGE_SIZE) + 1) : 1;
      
    // 1. Call our new cached Vercel API instead of Supabase directly
    const queryParams = new URLSearchParams({
      category: selectedCategory,
      search: searchQuery,
      page: pageNum.toString(),
      limit: PAGE_SIZE.toString()
    });
    const url = `/api/catalog-data?${queryParams.toString()}`;

    let newProducts = [];
    let _isCacheHit = false;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const result = await response.json();
      newProducts = result.products || [];
      _isCacheHit = result.cached || false;
    } catch (apiError) {
      console.warn('API error in MarketFeeds, falling back to direct DB:', apiError);
      // Fallback: fetch directly from Supabase
      let query = supabase
        .from('products')
        .select('*')
        .eq('store_is_locked', false);
      
      if (selectedCategory !== 'All') {
        query = query.eq('category', selectedCategory);
      }
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,seller_name.ilike.%${searchQuery}%`);
      }
      const offset = (pageNum - 1) * PAGE_SIZE;
      const { data, error } = await query
        .order('is_promoted', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
        
      if (error) throw error;
      newProducts = data || [];
    }

    setIsCacheHit(_isCacheHit); 

      if (isNextPage) {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newProducts.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setProducts(newProducts);
      }

      setLastDoc(newProducts.length > 0 ? newProducts[newProducts.length - 1] : null);
      setHasMore(newProducts.length === PAGE_SIZE);
    } catch (error: any) {
      const errMsg = error.message || String(error);
      console.error(`Error fetching products (Attempt ${retryCount + 1}):`, error);
      
      // 2. Retry logic for API call
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        console.log(`Retrying API fetch in ${Math.round(delay)}ms...`);
        setTimeout(() => fetchProducts(isNextPage, retryCount + 1), delay);
        return;
      }

      // 3. Fallback: If API fails after retries, try direct Supabase fetch as a safety net
      setIsCacheHit(false);
      console.log('Falling back to direct Supabase fetch...');
      try {
        let query = supabase
          .from('products')
          .select('*')
          .eq('store_is_locked', false)
          .order('created_at', { ascending: false });

        if (selectedCategory !== 'All' && selectedCategory !== 'Favorites') {
          query = query.eq('category', selectedCategory);
        }

        if (searchQuery) {
          query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
        }

        const from = isNextPage ? products.length : 0;
        const to = from + PAGE_SIZE - 1;

        const { data: fallbackData, error: fallbackError } = await query.range(from, to);

        if (fallbackError) throw fallbackError;

        if (fallbackData) {
          const mappedData = fallbackData.map(p => ({
            id: p.id,
            sellerId: p.seller_id,
            sellerName: p.seller_name,
            storeId: p.store_id,
            storeName: p.store_name,
            title: p.title,
            description: p.description,
            price: p.price,
            category: p.category,
            location: p.location,
            images: p.images,
            rating: p.rating,
            reviewCount: p.review_count,
            trustScore: p.trust_score,
            isPromoted: p.is_promoted,
            deliveryAvailable: p.delivery_available,
            likes: p.likes,
            tags: p.tags,
            quantity: p.quantity,
            sku: p.sku,
            createdAt: p.created_at
          }));

          if (isNextPage) {
            setProducts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const uniqueNew = mappedData.filter(p => !existingIds.has(p.id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setProducts(mappedData);
          }
          setLastDoc(mappedData.length > 0 ? mappedData[mappedData.length - 1] : null);
          setHasMore(mappedData.length === PAGE_SIZE);
        }
      } catch (directError: any) {
        console.error('Direct Supabase fetch also failed:', directError);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    fetchProducts(false);
    fetchStatusUpdates();
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchProducts();
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const fetchStatusUpdates = async () => {
    try {
      // 1. Get user's following list
      let following: string[] = [];
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('following')
          .eq('id', user.id)
          .single();
        if (userData?.following) {
          following = userData.following;
        }
      }

      // 2. Fetch updates (global or from followed stores)
      let query = supabase
        .from('store_updates')
        .select(`
          *,
          store:stores(name, image_url)
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        // Filter in memory since Supabase OR doesn't easily support array inclusion + boolean
        const filtered = data.filter(update => 
          update.is_global || (update.store_id && following.includes(update.store_id))
        );
        
        // Group by store so each store has one "Story" ring containing multiple updates
        const grouped = filtered.reduce((acc: any[], update) => {
          const authorId = update.is_global ? 'admin' : update.store_id;
          const existing = acc.find(g => g.authorId === authorId);
          if (existing) {
            existing.updates.push(update);
          } else {
            acc.push({
              authorId,
              isGlobal: update.is_global,
              authorName: update.is_global ? 'African Market Hub' : update.store?.name || 'Store',
              authorImage: update.is_global ? '/logo.png' : update.store?.image_url,
              updates: [update]
            });
          }
          return acc;
        }, []);

        setStatusUpdates(grouped);
      }
    } catch (error) {
      console.error('Error fetching status updates:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchStatusUpdates();
    }
    
    // Also trigger cleanup of expired updates
    fetch('/api/updates/cleanup', { method: 'POST' }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let isMounted = true;
    const fetchStore = async () => {
      if (user && profile?.active_role === 'seller') {
        try {
          const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', user.id)
            .limit(1);
          
          if (data && data.length > 0 && isMounted) {
            setSellerStore(data[0]);
          }
        } catch (err) {
          console.error('Error fetching seller store:', err);
        }
      }
    };
    fetchStore();
    return () => { isMounted = false; };
  }, [user, profile]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY > 0) {
      const y = e.touches[0].clientY;
      const distance = y - pullStartY;
      if (distance > 0) {
        setPullMoveY(Math.min(distance, 100)); // Max pull distance
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullMoveY > 60) {
      setIsRefreshing(true);
      await Promise.all([
        fetchProducts(false),
        fetchStatusUpdates()
      ]);
      setIsRefreshing(false);
    }
    setPullStartY(0);
    setPullMoveY(0);
  };

  const handleQuickPostStatus = async () => {
    if ((!statusText.trim() && !statusMedia) || !user || !sellerStore) return;

    setPostingStatus(true);
    try {
      let mediaUrl = null;
      let mediaType = 'none';
      let mediaPublicId = null;

      if (statusMedia) {
        const signResponse = await fetch('/api/cloudinary/sign', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'store_updates' })
        });
        
        if (!signResponse.ok) throw new Error('Failed to get Cloudinary signature. Check API keys.');
        const signData = await signResponse.json();

        const formData = new FormData();
        formData.append('file', statusMedia);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', signData.timestamp);
        formData.append('signature', signData.signature);
        formData.append('folder', 'store_updates');

        const isVideo = statusMedia.type.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';
        mediaType = isVideo ? 'video' : 'image';

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`,
          { method: 'POST', body: formData }
        );

        if (!uploadResponse.ok) throw new Error('Failed to upload media to Cloudinary');
        const uploadData = await uploadResponse.json();
        mediaUrl = uploadData.secure_url;
        mediaPublicId = uploadData.public_id;
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { error } = await supabase
        .from('store_updates')
        .insert({
          store_id: sellerStore.id,
          seller_id: user.id,
          text: statusText,
          likes: [],
          media_url: mediaUrl,
          media_type: mediaType,
          media_public_id: mediaPublicId,
          expires_at: expiresAt.toISOString()
        });
        
      if (error) throw error;
      
      setStatusText('');
      setStatusMedia(null);
      setShowStatusModal(false);
      fetchStatusUpdates();
    } catch (error: any) {
      console.error('Error posting update:', error);
      alert(`Failed to post status update: ${error.message || 'Unknown error'}`);
    } finally {
      setPostingStatus(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setSavedItemIds([]);
      return;
    }

    let isMounted = true;
    const fetchSavedItems = async (retryCount = 0) => {
      try {
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('saved_items')
          .select('product_id')
          .eq('user_id', user.id);
          
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchSavedItems(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }

        if (data && isMounted) {
          setSavedItemIds(data.map(item => item.product_id));
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (!errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching saved items:', error);
        }
      }
    };
    
    fetchSavedItems();

    const subscription = supabase.channel(`saved_items:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_items', filter: `user_id=eq.${user.id}` }, payload => {
        if (isMounted) fetchSavedItems();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedProduct) {
      setReviews([]);
      setHasPurchased(false);
      return;
    }

    let isMounted = true;
    const fetchReviews = async (retryCount = 0) => {
      try {
        if (!isMounted) return;
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .eq('product_id', selectedProduct.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch')) && retryCount < 2) {
            setTimeout(() => fetchReviews(retryCount + 1), 500);
            return;
          }
          throw error;
        }

        if (data && isMounted) {
          setReviews(data);
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (!errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch')) {
          console.error('Error fetching reviews:', error);
        }
      }
    };
    
    fetchReviews();

    const subscription = supabase.channel(`reviews:${selectedProduct.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `product_id=eq.${selectedProduct.id}` }, payload => {
        if (isMounted) fetchReviews();
      })
      .subscribe();

    // Check if purchased
    if (user) {
      const checkPurchase = async (retryCount = 0) => {
        try {
          if (!isMounted) return;
          const { data, error } = await supabase
            .from('orders')
            .select('items')
            .eq('buyer_id', user.id)
            .eq('status', 'delivered');
            
          if (error) {
            if ((error.message?.includes('Lock') || error.message?.includes('AbortError')) && retryCount < 2) {
              setTimeout(() => checkPurchase(retryCount + 1), 500);
              return;
            }
            throw error;
          }

          if (data && isMounted) {
            const purchased = data.some(order => {
              const items = order.items || [];
              return items.some((item: any) => item.id === selectedProduct.id);
            });
            setHasPurchased(purchased);
          }
        } catch (error: any) {
          if (!error.message?.includes('Lock') && !error.message?.includes('AbortError')) {
            console.error('Error checking purchase:', error);
          }
        }
      };
      checkPurchase();
    }

    return () => {
      isMounted = false;
      supabase.removeChannel(subscription);
    };
  }, [selectedProduct?.id, user?.id]);

  const toggleSaveProduct = async (productId: string) => {
    if (!user) return;

    try {
      const { data: existingSaves, error: fetchError } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (fetchError) throw fetchError;

      if (!existingSaves || existingSaves.length === 0) {
        // Add to saved_items collection
        await supabase
          .from('saved_items')
          .insert({
            user_id: user.id,
            product_id: productId
          });
          
        // Add to product likes array
        const product = products.find(p => p.id === productId);
        if (product) {
          const currentLikes = product.likes || [];
          if (!currentLikes.includes(user.id)) {
            await supabase
              .from('products')
              .update({ likes: [...currentLikes, user.id] })
              .eq('id', productId);
          }
        }
      } else {
        // Remove from saved_items collection
        await supabase
          .from('saved_items')
          .delete()
          .eq('id', existingSaves[0].id);
          
        // Remove from product likes array
        const product = products.find(p => p.id === productId);
        if (product) {
          const currentLikes = product.likes || [];
          const newLikes = currentLikes.filter(id => id !== user.id);
          await supabase
            .from('products')
            .update({ likes: newLikes })
            .eq('id', productId);
        }
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
        
      if (error) throw error;
      
      // Clear Redis cache after deletion
      try {
        await fetch('/api/catalog-clear', { method: 'POST' });
        console.log('Product feed cache cleared after deletion');
      } catch (cacheErr) {
        console.warn('Failed to clear product feed cache:', cacheErr);
      }

      setProductToDelete(null);
      // Remove from local state immediately
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProduct) return;

    setIsReviewing(true);
    try {
      const reviewData = {
        user_id: user.id,
        user_name: profile?.username || 'Anonymous Buyer',
        product_id: selectedProduct.id,
        store_id: selectedProduct.storeId,
        rating: reviewRating,
        comment: reviewComment
      };

      await supabase
        .from('reviews')
        .insert(reviewData);

      // Update product average rating (simplified)
      const newReviewCount = (selectedProduct.reviewCount || 0) + 1;
      const newRating = ((selectedProduct.rating || 0) * (selectedProduct.reviewCount || 0) + reviewRating) / newReviewCount;

      await supabase
        .from('products')
        .update({
          rating: Number((newRating || 0).toFixed(1)),
          review_count: newReviewCount
        })
        .eq('id', selectedProduct.id);

      setReviewComment('');
      setReviewRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setIsReviewing(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.storeName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' 
      ? true 
      : selectedCategory === 'Favorites' 
        ? savedItemIds.includes(p.id)
        : p.category === selectedCategory;
    
    const matchesPrice = (minPrice === '' || p.price >= minPrice) && 
                         (maxPrice === '' || p.price <= maxPrice);
    const matchesRating = (p.rating || 0) >= minRating;
    const matchesTrust = (p.trustScore || 0) >= minTrustScore;
    const matchesDelivery = !deliveryOnly || p.deliveryAvailable;
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.every(tag => p.tags?.includes(tag));

    return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesTrust && matchesDelivery && matchesTags;
  });

  const allTags: string[] = Array.from(new Set(products.flatMap(p => p.tags || []))).sort() as string[];

  const toggleFilterTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const resetFilters = () => {
    setMinPrice('');
    setMaxPrice('');
    setMinRating(0);
    setMinTrustScore(0);
    setDeliveryOnly(false);
    setSelectedTags([]);
  };

  const addToCart = (product: Product) => {
    if (cart.length > 0 && cart[0].storeId !== product.storeId) {
      setCartConflict(product);
      return;
    }
    setCart(prev => [...prev, product]);
    // Optional: show toast
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!user) {
      alert('Please log in or create an account to proceed to checkout.');
      return;
    }
    
    try {
      const storeId = cart[0].storeId;
      const storeName = cart[0].storeName;
      const total = cart.reduce((sum, item) => sum + item.price, 0);
      const paymentReference = `MH-${Math.floor(Math.random() * 10000)}-${Math.floor(Math.random() * 10000)}`;

      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          seller_ids: [storeId],
          items: cart.map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            quantity: 1, // Assuming quantity 1 for now
            storeId: item.storeId,
            storeName: item.storeName
          })),
          total,
          status: 'pending_payment'
        })
        .select('id, items')
        .single();

      if (error) {
        console.error("Order Insert Error:", error);
        throw error;
      }

      setCheckoutOrder({
        id: orderData.id,
        storeId,
        storeName,
        total,
        paymentReference,
        items: cart
      });
      
      setCart([]);
      setShowCart(false);
      setShowCheckout(true);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to proceed to checkout. Please try again.');
    }
  };

  return (
    <div 
      className="p-6 pb-24 md:pb-6 max-w-7xl mx-auto min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="fixed top-0 left-0 w-full flex justify-center z-50 pointer-events-none transition-transform duration-200"
        style={{ transform: `translateY(${Math.min(pullMoveY, 60)}px)`, opacity: pullMoveY > 10 ? 1 : 0 }}
      >
        <div className="bg-white rounded-full p-2 shadow-lg flex items-center justify-center">
          <Loader2 className={`text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`} size={24} style={{ transform: `rotate(${pullMoveY * 3}deg)` }} />
        </div>
      </div>

      <header className="mb-12">
        {/* Status Bar */}
        {(statusUpdates.length > 0 || profile?.active_role === 'seller') && (
          <div className="mb-8 -mx-6 px-6 overflow-x-auto scrollbar-hide flex gap-3 pb-4 snap-x relative">
            {/* Add Status Ring (Sellers Only) */}
            {profile?.active_role === 'seller' && (
              <button
                onClick={() => {
                  if (!sellerStore) {
                    setShowNoStoreAlert(true);
                    return;
                  }
                  setShowStatusModal(true);
                }}
                className="flex-shrink-0 relative w-24 h-36 md:w-28 md:h-44 rounded-2xl overflow-hidden group border border-gray-200 bg-gray-100 shadow-sm transition-transform hover:scale-[1.02] snap-start"
              >
                {/* Background (Store Image or generic) */}
                <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/20 z-10" />
                {sellerStore?.image_url ? (
                  <img src={sellerStore.image_url} alt="My Store" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400">
                    <Store size={32} />
                  </div>
                )}
                
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent z-10" />
                
                <div className="absolute bottom-3 inset-x-0 flex flex-col items-center z-20">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white mb-1 shadow-sm">
                    <Plus size={16} strokeWidth={3} />
                  </div>
                  <span className="text-[11px] font-bold text-white tracking-wide drop-shadow-md">
                    Create Story
                  </span>
                </div>
              </button>
            )}

            {statusUpdates.map((group, index) => {
              const firstUpdate = group.updates[0];
              const isVideo = firstUpdate?.media_type === 'video';

              return (
                <button
                  key={group.authorId}
                  onClick={() => {
                    setSelectedStatusIndex(index);
                    setStatusProgress(0);
                  }}
                  className="flex-shrink-0 relative w-24 h-36 md:w-28 md:h-44 rounded-2xl overflow-hidden border border-black/10 bg-gray-100 shadow-sm transition-transform hover:scale-[1.02] group snap-start"
                >
                  {/* Status Media Background */}
                  {firstUpdate?.media_url ? (
                    isVideo ? (
                      <div className="absolute inset-0 w-full h-full bg-black">
                        <video src={firstUpdate.media_url} className="w-full h-full object-cover" muted playsInline />
                      </div>
                    ) : (
                      <img src={firstUpdate.media_url} alt={group.authorName} className="absolute inset-0 w-full h-full object-cover" />
                    )
                  ) : (
                     <div className="absolute inset-0 flex p-3 items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
                        <span className="text-xs font-bold text-center line-clamp-4 leading-tight">{firstUpdate?.content || ''}</span>
                     </div>
                  )}
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent z-10" />
                  
                  {/* Author Profile Picture (Top Left, Facebook Style) */}
                  <div className="absolute top-2.5 left-2.5 z-20">
                    <div className="w-8 h-8 rounded-full p-[2px] bg-emerald-500 shadow-sm relative">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white">
                        {group.authorImage ? (
                          <img src={group.authorImage} alt={group.authorName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-bold text-[10px]">
                            {group.authorName.charAt(0)}
                          </div>
                        )}
                      </div>
                      {group.isGlobal && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-[2px] rounded-full border border-white shadow-sm">
                          <Check size={8} strokeWidth={4} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Author Name */}
                  <div className="absolute bottom-2.5 left-2.5 right-2 text-left z-20">
                    <span className="text-[11px] font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                      {group.authorName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            {isCacheHit !== null && (
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                isCacheHit ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isCacheHit ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isCacheHit ? 'Redis Optimized' : 'Direct Sync'}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="Search products, stores, or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white border border-black/5 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
              />
            </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-6 py-4 rounded-2xl font-bold flex items-center gap-2 transition-all border ${
                  showFilters || minPrice !== '' || maxPrice !== '' || minRating > 0 || minTrustScore > 0 || deliveryOnly || selectedTags.length > 0
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                    : 'bg-white text-gray-500 border-black/5 hover:bg-gray-50'
                }`}
              >
                <Filter size={20} />
                <span className="hidden sm:inline">Filters</span>
                {(minPrice !== '' || maxPrice !== '' || minRating > 0 || minTrustScore > 0 || deliveryOnly || selectedTags.length > 0) && (
                  <span className="w-2 h-2 bg-emerald-600 rounded-full" />
                )}
              </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-4 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                    : 'bg-white text-gray-500 border border-black/5 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 p-8 bg-white rounded-[32px] border border-black/5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Price Range (USD)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm"
                    />
                    <span className="text-gray-300">—</span>
                    <input 
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Minimum Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setMinRating(minRating === star ? 0 : star)}
                        className={`p-2 rounded-xl transition-all ${
                          minRating >= star ? 'bg-amber-50 text-amber-500' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <Star size={20} fill={minRating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Seller Trust Score</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={minTrustScore}
                      onChange={(e) => setMinTrustScore(Number(e.target.value))}
                      className="flex-1 accent-emerald-600 h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-black text-emerald-600 w-12">{minTrustScore}%+</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Delivery Options</label>
                  <button
                    onClick={() => setDeliveryOnly(!deliveryOnly)}
                    className={`w-full p-4 rounded-2xl font-bold flex items-center justify-between transition-all ${
                      deliveryOnly ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck size={20} />
                      <span>Delivery Available</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full relative transition-all ${deliveryOnly ? 'bg-white/30' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${deliveryOnly ? 'left-5' : 'left-1'}`} />
                    </div>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tags</label>
                    <button 
                      onClick={resetFilters}
                      className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                    >
                      Reset All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                    {allTags.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No tags available</p>
                    ) : (
                      allTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => toggleFilterTag(tag)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            selectedTags.includes(tag)
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div className="md:col-span-3 flex justify-end pt-4 border-t border-gray-50">
                  <button 
                    onClick={resetFilters}
                    className="text-xs font-black text-gray-400 uppercase tracking-widest hover:text-rose-500 transition-colors flex items-center gap-2"
                  >
                    <X size={14} />
                    Reset All Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-96 bg-gray-100 rounded-[40px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-32 bg-white rounded-[40px] border border-black/5">
              <div className="w-24 h-24 bg-gray-50 text-gray-300 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                <Package size={48} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-400 max-w-xs mx-auto">Try adjusting your search or category filters to find what you're looking for.</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <ProductCard 
                key={product.id}
                product={product}
                user={user}
                profile={profile}
                cart={cart}
                addToCart={addToCart}
                setChatTarget={setChatTarget}
                setActiveTab={setActiveTab}
                toggleSaveProduct={toggleSaveProduct}
                savedItemIds={savedItemIds}
                setViewingStoreId={setViewingStoreId}
                setSelectedProduct={(product) => {
                  setSelectedProduct(product);
                  setModalImageIndex(0);
                }}
                onEditProduct={(product: any) => setEditingProduct(product)}
                onDeleteProduct={(product: any) => setProductToDelete(product)}
                isStoreOwner={user && user.id === product.sellerId}
              />
            ))
          )}
        </div>
      )}

      {hasMore && !loading && filteredProducts.length > 0 && (
        <div className="mt-16 text-center">
          <button
            disabled={loadingMore}
            onClick={() => fetchProducts(true)}
            className="px-10 py-5 bg-white border border-black/5 rounded-2xl font-black text-gray-900 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-3 mx-auto"
          >
            {loadingMore ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Loading...
              </>
            ) : (
              <>
                Load More Products
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      )}

      {/* Product Details Full-Screen Overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[60] bg-white overflow-y-auto"
          >
            {/* Top Navigation */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-4 flex items-center justify-between">
              <button 
                onClick={() => setSelectedProduct(null)} 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold transition-colors"
              >
                <ArrowLeft size={20} /> Back to Marketplace
              </button>
              {profile?.active_role !== 'seller' && (
                <button 
                  onClick={() => setShowCart(true)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ShoppingCart size={24} />
                  {cart.length > 0 && (
                    <span className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                      {cart.length}
                    </span>
                  )}
                </button>
              )}
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
              {/* Product Details (50/50 split) */}
              <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 mb-16">
                {/* Left: Images */}
                <div className="lg:w-1/2 flex flex-col gap-4">
                  <div className="aspect-square relative w-full rounded-[32px] overflow-hidden bg-gray-50 border border-gray-100">
                    <img 
                      src={selectedProduct.images?.[modalImageIndex] || 'https://placehold.co/400x400?text=No+Image'} 
                      alt={selectedProduct.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  {selectedProduct.images && selectedProduct.images.length > 1 && (
                    <div className="flex gap-4 overflow-x-auto pb-2">
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

                {/* Right: Info */}
                <div className="lg:w-1/2 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      {selectedProduct.category}
                    </span>
                    {selectedProduct.isPromoted && (
                      <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        Sponsored
                      </span>
                    )}
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">{selectedProduct.title}</h2>
                  
                  <div className="flex items-center gap-6 mb-8">
                    <div className="flex items-center gap-2">
                      <Star className="text-amber-500" size={20} fill="currentColor" />
                      <span className="font-black text-lg">{selectedProduct.rating ? Number(selectedProduct.rating).toFixed(1) : '5.0'}</span>
                      <span className="text-gray-400 text-sm">({selectedProduct.reviewCount || 0} reviews)</span>
                    </div>
                    <div className="w-px h-6 bg-gray-100" />
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin size={18} />
                      <span className="font-bold text-sm uppercase tracking-widest">{selectedProduct.location}</span>
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 font-black text-xl flex items-center justify-center overflow-hidden">
                        {selectedProduct.storeName?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Sold by</p>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-gray-900">{selectedProduct.storeName || 'Merchant'}</p>
                          <div className="flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Star size={10} className="text-emerald-600" fill="currentColor" />
                            <span className="text-[10px] font-black text-emerald-600">{selectedProduct.trustScore || 95}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setViewingStoreId(selectedProduct.storeId || null);
                        setSelectedProduct(null);
                      }}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm"
                    >
                      View Store
                    </button>
                  </div>

                  <p className="text-gray-500 text-lg leading-relaxed mb-8">{selectedProduct.description}</p>

                  {selectedProduct.tags && selectedProduct.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                      {selectedProduct.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-8 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px] block mb-1">Price</span>
                        <PriceDisplay 
                          amount={selectedProduct.price} 
                          sourceCountry={selectedProduct.currency || 'Nigeria'} 
                          targetCountry={user?.user_metadata?.country}
                          className="text-4xl font-black text-emerald-600"
                          originalPriceClassName="text-sm font-bold text-gray-400 line-through ml-2"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px] block mb-1">Availability</span>
                        <span className={`font-black uppercase tracking-widest text-sm ${selectedProduct.quantity && selectedProduct.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {selectedProduct.quantity && selectedProduct.quantity > 0 ? `${selectedProduct.quantity} In Stock` : 'Out of Stock'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      {profile?.active_role !== 'seller' && (() => {
                        const quantity = cart.filter((item: any) => item.id === selectedProduct.id).length;
                        const isAdded = quantity > 0;
                        return (
                          <button 
                            onClick={() => addToCart(selectedProduct)}
                            className={`flex-1 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3 relative ${
                              isAdded 
                              ? 'bg-emerald-600 text-white shadow-emerald-100' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100'
                            }`}
                          >
                            <div className="relative">
                              {isAdded ? <Check size={24} /> : <ShoppingCart size={24} />}
                              {quantity > 0 && (
                                <span className="absolute -top-2 -right-2 bg-white text-emerald-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                  {quantity}
                                </span>
                              )}
                            </div>
                            {isAdded ? 'Added to Cart' : 'Add to Cart'}
                          </button>
                        );
                      })()}
                      
                      {user && profile?.active_role !== 'seller' && (
                        <button 
                          onClick={() => toggleSaveProduct(selectedProduct.id)}
                          className={`p-4 bg-white border border-gray-200 rounded-2xl transition-all shadow-sm ${
                            savedItemIds.includes(selectedProduct.id) ? 'text-rose-500 border-rose-200 bg-rose-50' : 'text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <Heart size={24} fill={savedItemIds.includes(selectedProduct.id) ? "currentColor" : "none"} />
                        </button>
                      )}
                      
                      {user && selectedProduct.sellerId !== user.uid && (
                        <button 
                          onClick={() => {
                            const initialMessage = `Hi, I'm interested in your product: "${selectedProduct.title}" (ID: ${selectedProduct.id}). Is it still available?`;
                            setChatTarget({ 
                              userId: selectedProduct.sellerId, 
                              userName: selectedProduct.sellerName || selectedProduct.storeName || 'Seller',
                              initialMessage
                            });
                            setActiveTab('chat');
                            setSelectedProduct(null);
                          }}
                          className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl transition-all border border-emerald-100 hover:bg-emerald-100 shadow-sm"
                          title="Message Seller"
                        >
                          <MessageSquare size={24} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* More from this store */}
              {products.filter(p => p.storeId === selectedProduct.storeId && p.id !== selectedProduct.id).length > 0 && (
                <div className="mt-16 pt-16 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black tracking-tight">More from {selectedProduct.storeName || 'this store'}</h3>
                    <button 
                      onClick={() => {
                        setViewingStoreId(selectedProduct.storeId || null);
                        setSelectedProduct(null);
                      }}
                      className="text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1"
                    >
                      View All <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="flex overflow-x-auto gap-6 pb-8 snap-x scrollbar-hide">
                    {products.filter(p => p.storeId === selectedProduct.storeId && p.id !== selectedProduct.id).map(p => (
                      <div key={p.id} className="min-w-[280px] max-w-[280px] snap-start">
                        <ProductCard 
                          product={p} 
                          addToCart={addToCart} 
                          cart={cart} 
                          toggleSaveProduct={toggleSaveProduct}
                          savedItemIds={savedItemIds}
                          setViewingStoreId={setViewingStoreId}
                          setSelectedProduct={(product) => {
                            setSelectedProduct(product);
                            setModalImageIndex(0);
                            // Scroll to top when selecting a new product
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          isStoreOwner={user && user.id === p.sellerId}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCart(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-black/5 flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tight">Your Cart</h3>
                <button onClick={() => setShowCart(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cart.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-gray-50 text-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <ShoppingCart size={40} />
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Your cart is empty</p>
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="flex gap-4 p-4 bg-gray-50 rounded-2xl">
                      <img src={item.images?.[0] || 'https://placehold.co/100x100?text=No+Image'} className="w-20 h-20 object-cover rounded-xl" referrerPolicy="no-referrer" />
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 line-clamp-1">{item.title}</h4>
                        <PriceDisplay 
                          amount={item.price} 
                          sourceCountry={item.currency || 'Nigeria'} 
                          targetCountry={user?.user_metadata?.country}
                          className="text-emerald-600 font-black"
                          originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-2"
                        />
                        <button 
                          onClick={() => removeFromCart(idx)}
                          className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-2 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 border-t border-black/5 bg-gray-50/50">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Total</span>
                  <PriceDisplay 
                    amount={cart.reduce((sum, item) => sum + item.price, 0)} 
                    sourceCountry={cart[0]?.currency || 'Nigeria'} 
                    targetCountry={user?.user_metadata?.country}
                    className="text-3xl font-black text-gray-900"
                    originalPriceClassName="text-sm font-bold text-gray-400 line-through ml-2 block text-right"
                  />
                </div>
                <button 
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  Proceed to Checkout
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Checkout View */}
      {showCheckout && checkoutOrder && (
        <Checkout 
          order={checkoutOrder} 
          onClose={() => {
            setShowCheckout(false);
            setCheckoutOrder(null);
          }} 
          onSuccess={() => {
            setShowCheckout(false);
            setCheckoutOrder(null);
            setActiveTab('dashboard');
          }}
        />
      )}
      {/* Store View */}
      {viewingStoreId && (
        <StoreView 
          storeId={viewingStoreId} 
          onClose={() => setViewingStoreId(null)} 
          onAddToCart={addToCart}
          onEditProduct={(product) => setEditingProduct(product)}
          onDeleteProduct={(product) => setProductToDelete(product)}
          cart={cart}
          setActiveTab={setActiveTab}
          setChatTarget={setChatTarget}
        />
      )}
      {/* Add/Edit Product Modal */}
      <AnimatePresence>
        {(isModalOpen || editingProduct) && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-6 md:p-10 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tight">
                  {editingProduct ? 'Edit Product' : 'List New Product'}
                </h3>
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                  }} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <ProductForm 
                productToEdit={editingProduct}
                onSuccess={() => {
                  setIsModalOpen(false);
                  setEditingProduct(null);
                }} 
                onClose={() => {
                  setIsModalOpen(false);
                  setEditingProduct(null);
                }} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setProductToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl p-12 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black mb-4">Delete Listing?</h3>
              <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                Are you sure you want to remove <span className="text-gray-900 font-black">"{productToDelete.title}"</span>? This action cannot be undone.
              </p>
              <div className="flex flex-col gap-4">
                <button
                  disabled={submitting}
                  onClick={() => handleDeleteProduct(productToDelete.id)}
                  className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black text-lg hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 flex items-center justify-center gap-3"
                >
                  {submitting ? <Loader2 className="animate-spin" size={24} /> : 'Yes, Delete Listing'}
                </button>
                <button
                  onClick={() => setProductToDelete(null)}
                  className="w-full py-5 bg-gray-50 text-gray-500 rounded-2xl font-black text-lg hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart Conflict Modal */}
      <AnimatePresence>
        {cartConflict && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setCartConflict(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-md relative z-10 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Store size={32} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">Different Store</h3>
              <p className="text-gray-500 mb-8">
                You already have items from <span className="font-bold text-gray-900">{cart[0]?.storeName}</span> in your cart. 
                <br/><br/>
                Our marketplace requires you to checkout from one store at a time.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setCartConflict(null);
                    setShowCart(true);
                  }}
                  className="w-full py-4 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
                  Checkout Current Cart
                </button>
                <button
                  onClick={() => {
                    setCart([cartConflict]);
                    setCartConflict(null);
                  }}
                  className="w-full py-4 px-4 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Clear Cart & Add New Item
                </button>
                <button
                  onClick={() => setCartConflict(null)}
                  className="w-full py-4 px-4 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Viewer Modal */}
      {selectedStatusIndex !== null && (
        <StatusViewer 
          statusGroups={statusUpdates}
          initialGroupIndex={selectedStatusIndex}
          onClose={() => setSelectedStatusIndex(null)}
          onVisitStore={(storeId) => setViewingStoreId(storeId)}
        />
      )}

      {/* Quick Post Status Modal */}
      <AnimatePresence>
        {showStatusModal && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStatusModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-black/5"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10 sticky top-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0 shadow-sm relative">
                    {sellerStore?.image_url ? (
                      <img src={sellerStore.image_url} alt="Store avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-emerald-50">
                        <Store size={20} className="text-emerald-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full border border-black/5 shadow-inner" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-tight tracking-tight">{sellerStore?.name || 'Your Store'}</h3>
                    <p className="text-[11px] font-bold text-gray-400">Posting to local feed</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowStatusModal(false)} 
                  className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Input Area */}
              <div className="p-6 md:p-8 overflow-y-auto max-h-[60vh] flex flex-col gap-4">
                <textarea 
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value)}
                  placeholder="What's new in your store? Share updates, deals, or new arrivals..."
                  className="w-full text-lg sm:text-xl md:text-2xl font-medium text-gray-800 placeholder:text-gray-300 border-none bg-transparent outline-none resize-none min-h-[120px] transition-all"
                  style={{ height: Math.max(120, statusText.length > 50 ? 160 : 120) + 'px' }}
                />
                
                <AnimatePresence>
                  {statusMedia && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, scale: 0.95 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: 0.95 }}
                      className="relative w-full rounded-[24px] overflow-hidden group shadow-sm border border-gray-100 bg-gray-50 mt-2"
                    >
                      {/* Subdued overlay on hover to make close button pop */}
                      <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" />
                      
                      {/* Premium blurred backdrop for vertical/odd-ratio images */}
                      {statusMedia.type.startsWith('image/') && (
                         <div className="absolute inset-0 z-0 bg-black">
                           <img src={URL.createObjectURL(statusMedia)} className="w-full h-full object-cover blur-2xl opacity-40 scale-110" />
                         </div>
                      )}

                      <div className="relative z-10 flex items-center justify-center min-h-[200px] max-h-[350px]">
                        {statusMedia.type.startsWith('image/') ? (
                          <img src={URL.createObjectURL(statusMedia)} alt="Preview" className="max-w-full max-h-[350px] object-contain shadow-sm" />
                        ) : (
                          <video src={URL.createObjectURL(statusMedia)} className="w-full max-h-[350px] object-cover" autoPlay muted loop playsInline />
                        )}
                      </div>
                      
                      <button
                        onClick={() => setStatusMedia(null)}
                        className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all shadow-sm"
                      >
                        <X size={14} strokeWidth={3} />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 z-10 mt-auto">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label className="group flex items-center justify-center w-12 h-12 bg-white border border-gray-200 text-emerald-600 rounded-2xl cursor-pointer hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-emerald-500/20">
                      <ImageIcon size={22} className="group-hover:scale-110 transition-transform" />
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setStatusMedia(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                    <div className="text-[10px] font-bold text-gray-400 leading-[1.1] uppercase tracking-widest hidden sm:block selection:bg-transparent">
                      Add Media<br/>Photo • Video
                    </div>
                  </div>

                  <button 
                    onClick={handleQuickPostStatus}
                    disabled={postingStatus || (!statusText.trim() && !statusMedia)}
                    className="flex-1 max-w-[200px] h-12 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:hover:scale-100 hover:-translate-y-0.5 active:translate-y-0 shadow-[0_8px_16px_-6px_rgba(5,150,105,0.4)] flex items-center justify-center gap-2"
                  >
                    {postingStatus ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Plus strokeWidth={2.5} size={18} />
                        <span>Post</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* No Store Alert Modal */}
      <AnimatePresence>
        {showNoStoreAlert && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNoStoreAlert(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Store size={32} />
              </div>
              <h3 className="text-xl font-black mb-3">Store Required</h3>
              <p className="text-gray-500 font-medium mb-8">
                Please set up your store profile in the Seller Dashboard before posting a status.
              </p>
              <button
                onClick={() => setShowNoStoreAlert(false)}
                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Sellers */}
      {profile?.active_role === 'seller' && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-24 right-6 z-40 bg-emerald-600 text-white p-4 rounded-full shadow-2xl shadow-emerald-600/30 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          title="List Product"
        >
          <Plus size={28} strokeWidth={3} />
        </button>
      )}

      {/* Floating Cart Button (FAB) for Buyers */}
      <AnimatePresence>
        {profile?.active_role !== 'seller' && cart.length > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setShowCart(true)}
            className="fixed bottom-24 right-6 z-40 bg-gray-900 text-white p-4 rounded-full shadow-2xl shadow-gray-900/30 hover:bg-black hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            title="View Cart"
          >
            <div className="relative">
              <ShoppingCart size={28} />
              <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-gray-900">
                {cart.length}
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketFeeds;
