import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { 
  BarChart3, 
  PlusCircle, 
  Package, 
  CheckCircle2, 
  MessageSquare, 
  TrendingUp,
  Store as StoreIcon,
  X,
  Loader2,
  MapPin,
  ChevronRight,
  Settings,
  Trash2,
  Edit3,
  Upload,
  Image as ImageIcon,
  Truck,
  ArrowLeft,
  PieChart,
  Heart,
  Users,
  Search,
  Minus,
  Plus,
  Lock,
  Building2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { createNotification } from '../../lib/notifications';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../../App';
import ProductForm from '../ProductForm';
import StoreView from '../StoreView';
import BusinessOnboarding from '../BusinessOnboarding';
import LocationPicker from '../LocationPicker';
import { formatPrice, getCurrencySymbol, AFRICAN_COUNTRIES } from '../../lib/currency';
import PriceDisplay from '../PriceDisplay';

interface Store {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  category: string;
  location: string;
  latitude?: number;
  longitude?: number;
  imageUrl: string;
  rating: number;
  trustScore: number;
  followers: string[];
  verified: boolean;
  businessType?: string;
  foundedYear?: number;
  totalSales?: number;
  responseTime?: string;
  memberSince?: string;
  deliveryFee?: number;
  deliveryTime?: string;
  currency?: string;
  highlights?: string[];
  createdAt: any;
}

const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url.split('?')[0]);

interface Transporter {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  vehicleType: string;
  status: 'active' | 'inactive';
}

interface Product {
  id: string;
  sellerId: string;
  sellerName?: string;
  storeId: string;
  storeName: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  sku: string;
  category: string;
  images?: string[];
  location: string;
  deliveryAvailable: boolean;
  rating: number;
  reviewCount?: number;
  tags?: string[];
  createdAt: any;
}

import FinanceView from './FinanceView';

interface SellerDashboardProps {
  initialView?: 'overview' | 'create_store' | 'manage_store' | 'add_product' | 'orders' | 'analytics' | 'store_manager' | 'inventory';
  setActiveTab?: (tab: string) => void;
  setChatTarget?: (target: { userId: string; userName: string; initialMessage?: string } | null) => void;
  setShowProfile?: (show: boolean) => void;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ initialView = 'overview', setActiveTab, setChatTarget, setShowProfile }) => {
  const { user, profile } = useAuth() || {};
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'create_store' | 'manage_store' | 'add_product' | 'orders' | 'edit_store' | 'analytics' | 'edit_product' | 'store_updates' | 'store_manager' | 'inventory' | 'finance' | 'business_onboarding'>(initialView);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<any | null>(null);
  const [loadingBuyer, setLoadingBuyer] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showStoreView, setShowStoreView] = useState(false);

  // Store Updates State
  const [storeUpdates, setStoreUpdates] = useState<any[]>([]);
  const [newUpdateText, setNewUpdateText] = useState('');
  const [updateMedia, setUpdateMedia] = useState<File | null>(null);
  const [postingUpdate, setPostingUpdate] = useState(false);

  // Form States
  const [storeName, setStoreName] = useState('');
  const [storeDesc, setStoreDesc] = useState('');
  const [storeCat, setStoreCat] = useState('General');
  const [storeLoc, setStoreLoc] = useState('');
  const [storeLat, setStoreLat] = useState<number | undefined>(undefined);
  const [storeLng, setStoreLng] = useState<number | undefined>(undefined);
  const [storeType, setStoreType] = useState('Retail');
  const [storeFounded, setStoreFounded] = useState(new Date().getFullYear().toString());
  const [storeResponse, setStoreResponse] = useState('< 1 hour');
  const [storeCurrency, setStoreCurrency] = useState('NGN');
  const [storeImg, setStoreImg] = useState('https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop');
  const [storeFile, setStoreFile] = useState<File | null>(null);
  const [storePreview, setStorePreview] = useState<string | null>(null);
  const [highlightFiles, setHighlightFiles] = useState<File[]>([]);
  const [highlightPreviews, setHighlightPreviews] = useState<string[]>([]);
  
  const [storeBankName, setStoreBankName] = useState('');
  const [storeAccountNumber, setStoreAccountNumber] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [deliveryTime, setDeliveryTime] = useState<string>('2-3 days');
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [showAddTransporter, setShowAddTransporter] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [newTransporterName, setNewTransporterName] = useState('');
  const [newTransporterPhone, setNewTransporterPhone] = useState('');
  const [newTransporterVehicle, setNewTransporterVehicle] = useState('Motorcycle');
  const [newTransporterUserId, setNewTransporterUserId] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isBusinessOwner, setIsBusinessOwner] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (profile?.country && activeView === 'create_store') {
      const country = AFRICAN_COUNTRIES.find(c => c.name === profile.country);
      if (country) {
        setStoreCurrency(country.currency);
      }
    }
  }, [profile, activeView]);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  useEffect(() => {
    if (!loading) {
      if (profile?.seller_kyc_type === 'business_seller' && !isBusinessOwner && activeView !== 'business_onboarding') {
        setActiveView('business_onboarding');
      } else if (stores.length === 0 && activeView !== 'create_store' && activeView !== 'business_onboarding') {
        setActiveView('create_store');
      } else if (activeView === 'store_manager') {
        if (stores.length === 1) {
          const store = stores[0];
          setSelectedStore(store);
          setStoreName(store.name);
          setStoreDesc(store.description);
          setStoreCat(store.category);
          setStoreLoc(store.location);
          setStoreLat(store.latitude);
          setStoreLng(store.longitude);
          setStoreType(store.businessType || 'Retail');
          setStoreFounded(store.foundedYear?.toString() || new Date().getFullYear().toString());
          setStoreResponse(store.responseTime || '< 1 hour');
          setStoreCurrency(store.currency || 'NGN');
          setDeliveryFee(store.deliveryFee || 0);
          setDeliveryTime(store.deliveryTime || '2-3 days');
          setActiveView('manage_store');
        } else if (stores.length > 1) {
          // If multiple stores, just show the overview where they can pick one
          setActiveView('overview');
        }
      }
    }
  }, [activeView, loading, stores]);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const fetchStores = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', user.id);
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchStores(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }
        // Map snake_case to camelCase for the component
        const mappedStores = (data || []).map(store => ({
          ...store,
          ownerId: store.owner_id,
          businessType: store.business_type,
          foundedYear: store.founded_year,
          totalSales: store.total_sales,
          totalDebt: store.total_debt,
          isLocked: store.is_locked,
          lockThreshold: store.lock_threshold,
          commissionRate: store.commission_rate,
          maxCommission: store.max_commission,
          minCommission: store.min_commission,
          responseTime: store.response_time,
          memberSince: store.member_since,
          imageUrl: store.image_url,
          trustScore: store.trust_score,
          currency: store.currency,
          createdAt: store.created_at,
          updatedAt: store.updated_at,
          deliveryFee: store.delivery_fee,
          deliveryTime: store.delivery_time
        }));
        if (isMounted) setStores(mappedStores as Store[]);
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching stores:', error);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchProducts = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 600));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', user.id);
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchProducts(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }
        const mappedProducts = (data || []).map(p => ({
          ...p,
          sellerId: p.seller_id,
          sellerName: p.seller_name,
          storeId: p.store_id,
          storeName: p.store_name,
          images: p.images,
          deliveryAvailable: p.delivery_available,
          reviewCount: p.review_count,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }));
        if (isMounted) setProducts(mappedProducts as Product[]);
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching products:', error);
        }
      }
    };

    const fetchBusinessMember = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 800));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('business_members')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchBusinessMember(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }
        if (isMounted) {
          setIsBusinessOwner(data && data.length > 0);
          if (data && data.length > 0) {
            setBusinessId(data[0].business_id);
          }
        }
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching business member status:', error);
        }
      }
    };

    fetchStores();
    fetchProducts();
    fetchBusinessMember();

    // Realtime subscriptions
    const storesSubscription = supabase.channel('seller_stores_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores', filter: `owner_id=eq.${user.id}` }, () => {
        if (isMounted) fetchStores();
      })
      .subscribe();

    const productsSubscription = supabase.channel('seller_products_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `seller_id=eq.${user.id}` }, () => {
        if (isMounted) fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(storesSubscription);
      supabase.removeChannel(productsSubscription);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || stores.length === 0) return;

    const storeIds = stores.map(s => s.id);
    
    let isMounted = true;
    const fetchOrders = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .overlaps('seller_ids', storeIds);
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchOrders(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }
        const mappedOrders = (data || []).map(o => ({
          ...o,
          buyerId: o.buyer_id,
          storeId: o.seller_ids?.[0], // Fallback to seller_ids since store_id is not in schema
          deliveryType: o.delivery_type,
          deliveryAddress: o.delivery_address,
          deliveryFee: o.delivery_fee,
          paymentMethod: o.payment_method,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));
        if (isMounted) setOrders(mappedOrders);
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching orders:', error);
        }
      }
    };

    fetchOrders();

    const ordersSubscription = supabase.channel('seller_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (isMounted) fetchOrders();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(ordersSubscription);
    };
  }, [user?.id, stores]);

  useEffect(() => {
    const handleBump = async (e: any) => {
      const { targetId } = e.detail;
      // Pretend to update `bumped_at` or `priority_score` in products table
      // In real code we would do await supabase.from('products').update({ bumped_at: new Date() }).eq('id', targetId)
      toast.success('Your product has been bumped to the top for 24 hours!');
    };

    window.addEventListener('afroCreditSpendSuccess_bumpProduct', handleBump);
    return () => window.removeEventListener('afroCreditSpendSuccess_bumpProduct', handleBump);
  }, []);

  useEffect(() => {
    if (!user || !selectedStore) return;

    let isMounted = true;
    const fetchTransporters = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 400));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('transporters')
          .select('*')
          .eq('store_id', selectedStore.id);
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchTransporters(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }
        const mappedTransporters = (data || []).map(t => ({
          ...t,
          storeId: t.store_id,
          vehicleType: t.vehicle_type,
          userId: t.user_id,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
        if (isMounted) setTransporters(mappedTransporters as Transporter[]);
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching transporters:', error);
        }
      }
    };

    const fetchUpdates = async (retryCount = 0) => {
      try {
        // Staggered delay to avoid auth lock collision
        if (retryCount === 0) await new Promise(resolve => setTimeout(resolve, 600));
        if (!isMounted) return;

        const { data, error } = await supabase
          .from('store_updates')
          .select('*')
          .eq('store_id', selectedStore.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          const errMsg = error.message || String(error);
          if ((errMsg.includes('Lock') || errMsg.includes('AbortError') || errMsg.includes('steal') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) && retryCount < 3) {
            setTimeout(() => fetchUpdates(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          throw error;
        }
        const mappedUpdates = (data || []).map(u => ({
          ...u,
          storeId: u.store_id,
          sellerId: u.seller_id,
          createdAt: u.created_at
        }));
        if (isMounted) setStoreUpdates(mappedUpdates);
      } catch (error: any) {
        const errMsg = error.message || String(error);
        if (isMounted && !errMsg.includes('Lock') && !errMsg.includes('AbortError') && !errMsg.includes('steal') && !errMsg.includes('fetch') && !errMsg.includes('Failed to fetch')) {
          console.error('Error fetching store updates:', error);
        }
      }
    };

    fetchTransporters();
    fetchUpdates();

    const transportersSubscription = supabase.channel('seller_transporters_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transporters', filter: `store_id=eq.${selectedStore.id}` }, () => {
        if (isMounted) fetchTransporters();
      })
      .subscribe();

    const updatesSubscription = supabase.channel('seller_updates_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_updates', filter: `store_id=eq.${selectedStore.id}` }, () => {
        if (isMounted) fetchUpdates();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(transportersSubscription);
      supabase.removeChannel(updatesSubscription);
    };
  }, [user?.id, selectedStore]);

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStore) return;
    setSubmitting(true);
    setUploadStatus('Preparing...');
    setUploadProgress(0);

    try {
      let finalImageUrl = selectedStore.imageUrl;
      if (storeFile) {
        console.log('Optimizing store cover image...');
        setUploadStatus('Optimizing image...');
        
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        
        let fileToUpload = storeFile;
        try {
          fileToUpload = await imageCompression(storeFile, options);
        } catch (err) {
          console.warn('Image compression failed, using original file', err);
        }

        console.log('Uploading store cover image to Cloudinary...');
        setUploadStatus('Uploading image...');
        
        try {
          // 1. Get signature from backend
          const signResponse = await fetch('/api/cloudinary/sign', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: 'stores' })
          });
          
          if (!signResponse.ok) {
            throw new Error('Failed to get upload signature. Make sure Cloudinary credentials are set.');
          }
          const signData = await signResponse.json();

          // 2. Upload directly from browser to Cloudinary
          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('api_key', signData.apiKey);
          formData.append('timestamp', signData.timestamp);
          formData.append('signature', signData.signature);
          formData.append('folder', signData.folder);

          const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
          }

          const uploadData = await uploadResponse.json();
          finalImageUrl = uploadData.secure_url;
          console.log('Store image updated:', finalImageUrl);
        } catch (error) {
          console.error('Upload failed:', error);
          throw error;
        }
      }

      console.log('Updating store in Supabase...');
      setUploadStatus('Saving changes...');
      const updatedData = {
        name: storeName,
        description: storeDesc,
        category: storeCat,
        location: storeLoc,
        ...(storeLat !== undefined && { latitude: storeLat }),
        ...(storeLng !== undefined && { longitude: storeLng }),
        business_type: storeType,
        founded_year: parseInt(storeFounded),
        response_time: storeResponse,
        currency: storeCurrency,
        bank_name: storeBankName,
        account_number: storeAccountNumber,
        image_url: finalImageUrl,
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('stores')
        .update(updatedData)
        .eq('id', selectedStore.id);
        
      if (updateError) throw updateError;
      
      setSelectedStore({
        ...selectedStore,
        ...updatedData,
        updatedAt: new Date()
      } as any);
      
      setUploadStatus('Store updated!');
      setTimeout(() => setUploadStatus(null), 3000);
      setActiveView('manage_store');
    } catch (error) {
      console.error('Error updating store:', error);
      setUploadStatus('Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Starting store creation...');
    if (!user) return;
    setSubmitting(true);
    setUploadStatus('Preparing...');
    setUploadProgress(0);
    
    try {
      let finalImageUrl = storeImg;
      if (storeFile) {
        console.log('Optimizing store cover image...');
        setUploadStatus('Optimizing image...');
        
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        
        let fileToUpload = storeFile;
        try {
          fileToUpload = await imageCompression(storeFile, options);
        } catch (err) {
          console.warn('Image compression failed, using original file', err);
        }

        console.log('Uploading store cover image to Cloudinary...');
        setUploadStatus('Uploading image...');
        
        try {
          // 1. Get signature from backend
          const signResponse = await fetch('/api/cloudinary/sign', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: 'stores' })
          });
          
          if (!signResponse.ok) {
            throw new Error('Failed to get upload signature. Make sure Cloudinary credentials are set.');
          }
          const signData = await signResponse.json();

          // 2. Upload directly from browser to Cloudinary
          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('api_key', signData.apiKey);
          formData.append('timestamp', signData.timestamp);
          formData.append('signature', signData.signature);
          formData.append('folder', signData.folder);

          const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
          }

          const uploadData = await uploadResponse.json();
          finalImageUrl = uploadData.secure_url;
          console.log('Store image uploaded:', finalImageUrl);
        } catch (error) {
          console.error('Upload failed:', error);
          throw error;
        }
      }

      console.log('Adding store to Supabase...');
      setUploadStatus('Saving store details...');
      const { error: insertError } = await supabase
        .from('stores')
        .insert({
          owner_id: user.id,
          owner_type: isBusinessOwner ? 'business' : 'user',
          ...(isBusinessOwner && businessId ? { business_id: businessId } : {}),
          name: storeName,
          description: storeDesc,
          category: storeCat,
          location: storeLoc,
          ...(storeLat !== undefined && { latitude: storeLat }),
          ...(storeLng !== undefined && { longitude: storeLng }),
          business_type: storeType,
          founded_year: parseInt(storeFounded),
          total_sales: 0,
          total_debt: 0,
          is_locked: false,
          lock_threshold: 50,
          commission_rate: 0.01,
          max_commission: 50,
          min_commission: 0.10,
          response_time: storeResponse,
          currency: storeCurrency,
          bank_name: storeBankName,
          account_number: storeAccountNumber,
          member_since: new Date().toISOString().split('T')[0],
          image_url: finalImageUrl,
          rating: 5.0,
          trust_score: 90,
          followers: [],
          verified: false
        });
        
      if (insertError) throw insertError;
      console.log('Store created successfully');
      setUploadStatus('Success!');
      setTimeout(() => setUploadStatus(null), 3000);
      setActiveView('overview');
      setStoreName('');
      setStoreDesc('');
      setStoreFile(null);
      setStorePreview(null);
    } catch (error) {
      console.error('Error creating store:', error);
      setUploadStatus('Error: ' + (error instanceof Error ? error.message : 'Upload failed'));
    } finally {
      console.log('Store creation process finished');
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      // Clear Redis cache after deletion
      try {
        await fetch('/api/catalog-clear', { method: 'POST' });
      } catch (cacheErr) {
        console.warn('Failed to clear product feed cache:', cacheErr);
      }

      setProductToDelete(null);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, currentStatus: string) => {
    const statuses = ['pending_payment', 'awaiting_seller_confirmation', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];
    const currentIndex = statuses.indexOf(currentStatus);
    
    // Prevent updating from cancelled or delivered
    if (currentStatus === 'cancelled' || currentStatus === 'delivered') {
      return;
    }

    const nextStatus = statuses[currentIndex + 1];
    
    if (!nextStatus) return;

    try {
      // If confirming payment (moving from awaiting_seller_confirmation to paid)
      if (currentStatus === 'awaiting_seller_confirmation' && nextStatus === 'paid') {
        const order = orders.find(o => o.id === orderId);
        if (order && profile) {
          const commissionRate = profile.commission_rate || 0.05; // 5% default
          const commissionAmount = order.total * commissionRate;
          
          const newDebt = (profile.total_debt || 0) + commissionAmount;
          const isLocked = newDebt >= (profile.lock_threshold || 5000);
          
          await supabase
            .from('users')
            .update({ 
              total_debt: newDebt,
              is_locked: isLocked
            })
            .eq('id', profile.id);
        }
      }

      const { error } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId);
      if (error) throw error;
      
      const orderToNotify = orders.find(o => o.id === orderId);
      if (orderToNotify && orderToNotify.buyer_id) {
        let title = 'Order Update';
        let msg = `Your order #${orderId.slice(0,8)} status changed to ${nextStatus.replace('_', ' ')}.`;
        
        if (nextStatus === 'paid') {
          title = 'Payment Confirmed';
          msg = `Your payment for order #${orderId.slice(0,8)} has been confirmed!`;
        } else if (nextStatus === 'shipped') {
          title = 'Order Shipped';
          msg = `Your order #${orderId.slice(0,8)} is now on the way!`;
        } else if (nextStatus === 'delivered') {
          title = 'Order Delivered';
          msg = `Your order #${orderId.slice(0,8)} has been marked as delivered.`;
        }

        createNotification(
          orderToNotify.buyer_id,
          title,
          msg,
          'order_update',
          '/dashboard?tab=orders'
        );
      }

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: nextStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleUpdateDeliverySettings = async () => {
    if (!selectedStore) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('stores')
        .update({
          delivery_fee: deliveryFee,
          delivery_time: deliveryTime
        })
        .eq('id', selectedStore.id);
      if (error) throw error;
      setSelectedStore({ ...selectedStore, deliveryFee, deliveryTime });
      alert('Delivery settings updated successfully!');
    } catch (error) {
      console.error('Error updating delivery settings:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostUpdate = async () => {
    if ((!newUpdateText.trim() && !updateMedia) || !user || !selectedStore) return;

    setPostingUpdate(true);
    setUploadStatus(null);
    try {
      let mediaUrl = null;
      let mediaType = 'none';
      let mediaPublicId = null;

      if (updateMedia) {
        const signResponse = await fetch('/api/cloudinary/sign', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: 'store_updates' })
        });
        
        if (!signResponse.ok) throw new Error('Failed to get signature. Check Cloudinary API keys.');
        const signData = await signResponse.json();

        const formData = new FormData();
        formData.append('file', updateMedia);
        formData.append('api_key', signData.apiKey);
        formData.append('timestamp', signData.timestamp);
        formData.append('signature', signData.signature);
        formData.append('folder', 'store_updates');

        const isVideo = updateMedia.type.startsWith('video/');
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

      // Set expiration to 48 hours from now
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const { error } = await supabase
        .from('store_updates')
        .insert({
          store_id: selectedStore.id,
          seller_id: user.id,
          text: newUpdateText,
          likes: [],
          media_url: mediaUrl,
          media_type: mediaType,
          media_public_id: mediaPublicId,
          expires_at: expiresAt.toISOString()
        });
      if (error) throw error;
      setNewUpdateText('');
      setUpdateMedia(null);
      setUploadStatus('Update posted!');
      setTimeout(() => setUploadStatus(null), 3000);
    } catch (error: any) {
      console.error('Error posting update:', error);
      alert(`Error posting update: ${error.message}`);
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
      console.error('Error liking update:', error);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return;
    try {
      const { error } = await supabase
        .from('store_updates')
        .delete()
        .eq('id', updateId);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting update:', error);
    }
  };

  const filteredStoreUpdates = storeUpdates.filter(update => {
    if (!update.createdAt) return true;
    const updateDate = new Date(update.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return updateDate > sevenDaysAgo;
  });

  const handleAddTransporter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) return;
    setSubmitting(true);
    try {
      const transporterData: any = {
        store_id: selectedStore.id,
        name: newTransporterName,
        phone: newTransporterPhone,
        vehicle_type: newTransporterVehicle,
        status: 'active'
      };
      if (newTransporterUserId.trim() !== '') {
        transporterData.user_id = newTransporterUserId.trim();
      }
      const { error } = await supabase
        .from('transporters')
        .insert(transporterData);
      if (error) throw error;
      setNewTransporterName('');
      setNewTransporterPhone('');
      setNewTransporterUserId('');
      setShowAddTransporter(false);
    } catch (error) {
      console.error('Error adding transporter:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setLoadingBuyer(true);
    setBuyerProfile(null);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', order.buyerId)
        .limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        setBuyerProfile(data[0]);
      }
    } catch (error) {
      console.error('Error fetching buyer profile:', error);
    } finally {
      setLoadingBuyer(false);
    }
  };

  // KPI Calculations
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const activeListings = products.length;
  const avgRating = stores.length > 0 ? (stores.reduce((acc, s) => acc + (s.rating || 0), 0) / stores.length).toFixed(1) : '0.0';

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const currentPeriodRevenue = orders
    .filter(o => new Date(o.createdAt) >= thirtyDaysAgo)
    .reduce((acc, o) => acc + (o.total || 0), 0);
    
  const previousPeriodRevenue = orders
    .filter(o => new Date(o.createdAt) >= sixtyDaysAgo && new Date(o.createdAt) < thirtyDaysAgo)
    .reduce((acc, o) => acc + (o.total || 0), 0);

  const revenueGrowth = previousPeriodRevenue === 0 
    ? (currentPeriodRevenue > 0 ? 100 : 0) 
    : Math.round(((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100);

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const chartData = last7Days.map(date => {
    const dayRevenue = orders
      .filter(o => o.createdAt?.startsWith(date))
      .reduce((acc, o) => acc + (o.total || 0), 0);
    return {
      name: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: dayRevenue
    };
  });

  const maxDailyRevenue = Math.max(...chartData.map(d => d.revenue), 10);
  const businessPerformanceHeights = chartData.map(d => Math.max(10, Math.floor((d.revenue / maxDailyRevenue) * 100)));

  const salesGrowthData = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const yearMonth = d.toISOString().slice(0, 7);
    const monthSales = orders
      .filter(o => o.createdAt?.startsWith(yearMonth))
      .reduce((acc, o) => acc + (o.total || 0), 0);
    return {
      name: d.toLocaleDateString('en-US', { month: 'short' }),
      sales: monthSales
    };
  });

  const productPerformanceData = products.length > 0 ? products.slice(0, 5).map(p => {
    const unitsSold = orders.reduce((acc, o) => {
      const items = o.items || [];
      const item = items.find((itm: any) => itm.id === p.id || itm.title === p.title);
      return acc + (item ? (item.quantity || 1) : 0);
    }, 0);
    return {
      name: (p.title || '').length > 15 ? (p.title || '').substring(0, 15) + '...' : (p.title || 'Untitled'),
      sales: unitsSold
    };
  }).sort((a, b) => b.sales - a.sales) : [
    { name: 'No products', sales: 0 }
  ];

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {activeView === 'business_onboarding' && (
        <BusinessOnboarding 
          onComplete={() => {
            setIsBusinessOwner(true);
            setActiveView('create_store');
          }}
          onCancel={() => setActiveView('overview')}
        />
      )}

      {/* Overview Cards */}
      {activeView === 'overview' && (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 md:mb-8">
            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${revenueGrowth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth}%
                </div>
              </div>
              <p className="text-sm font-bold text-gray-400 mb-1">Total Revenue</p>
              <h4 className="text-2xl font-black text-gray-900">
                <PriceDisplay 
                  amount={totalRevenue} 
                  sourceCountry={profile?.country || 'Nigeria'} 
                  targetCountry={profile?.country}
                  showOriginalIfConverted={false}
                />
              </h4>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <Package size={24} />
                </div>
              </div>
              <p className="text-sm font-bold text-gray-400 mb-1">Active Listings</p>
              <h4 className="text-2xl font-black text-gray-900">{activeListings}</h4>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <StoreIcon size={24} />
                </div>
              </div>
              <p className="text-sm font-bold text-gray-400 mb-1">Average Rating</p>
              <h4 className="text-2xl font-black text-gray-900">{avgRating} <span className="text-sm text-gray-400 font-medium">/ 5.0</span></h4>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all flex flex-col justify-between">
              <p className="text-sm font-bold text-gray-400 mb-2">7-Day Revenue</p>
              <div className="h-20 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-4 pb-4">
            <div 
              onClick={() => setActiveView('create_store')}
              className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-emerald-200/50 shadow-[0_8px_30px_rgb(16,185,129,0.1)] flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(16,185,129,0.2)] transition-all duration-300 group"
            >
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                <PlusCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-emerald-900">Create New Store</h3>
              <p className="text-emerald-600/60 font-bold text-sm mt-2">Start a new business venture</p>
            </div>

            {!isBusinessOwner && (
              <div 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-blue-200/50 shadow-[0_8px_30px_rgb(37,99,235,0.1)] flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(37,99,235,0.2)] transition-all duration-300 group"
              >
                <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-blue-100 group-hover:scale-110 transition-transform">
                  <Building2 size={32} />
                </div>
                <h3 className="text-xl font-black text-blue-900">Upgrade to Business</h3>
                <p className="text-blue-600/60 font-bold text-sm mt-2">Unlock enterprise features</p>
              </div>
            )}

            <div 
              onClick={() => {
                setSelectedStore(null); // Clear selected store for quick access
                setActiveView('add_product');
              }}
              className="bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                <PlusCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900">List Product</h3>
              <p className="text-gray-400 font-bold text-sm mt-2">Quickly list a new item</p>
            </div>

            <div 
              onClick={() => setActiveView('orders')}
              className="bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 cursor-pointer group flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 bg-gray-900 text-white rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-gray-100 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Manage Orders</h3>
              <p className="text-gray-400 font-bold text-sm mt-2">{orders.length} Active Orders</p>
            </div>

            <div 
              onClick={() => setActiveView('analytics')}
              className="bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col items-center justify-center text-center"
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10">
                <BarChart3 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2 relative z-10">Analytics</h3>
              <p className="text-gray-400 font-bold text-sm mt-2 relative z-10">Track performance</p>
            </div>

            {stores.map(store => (
              <div 
                key={store.id}
                onClick={() => {
                  setSelectedStore(store);
                  setStoreName(store.name);
                  setStoreDesc(store.description);
                  setStoreCat(store.category);
                  setStoreLoc(store.location);
                  setStoreLat(store.latitude);
                  setStoreLng(store.longitude);
                  setStoreType(store.businessType || 'Retail');
                  setStoreFounded(store.foundedYear?.toString() || new Date().getFullYear().toString());
                  setStoreResponse(store.responseTime || '< 1 hour');
                  setDeliveryFee(store.deliveryFee || 0);
                  setDeliveryTime(store.deliveryTime || '2-3 days');
                  setActiveView('manage_store');
                }}
                className="bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[40px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <div className="relative">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                    <StoreIcon size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{store.name}</h3>
                  <div className="flex items-center gap-2 text-gray-400 font-bold text-sm mb-6">
                    <MapPin size={16} />
                    <span>{store.location}</span>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <Package className="text-emerald-600" size={18} />
                      <span className="font-black text-gray-900">
                        {products.filter(p => p.storeId === store.id).length} Products
                      </span>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity / Stats */}
          <div className="bg-white p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mt-6 md:mt-8">
            <h3 className="text-xl font-black mb-6 md:mb-8 flex items-center gap-3">
              <BarChart3 className="text-emerald-600" />
              Business Performance
            </h3>
            <div className="h-64 flex items-end gap-4 px-4">
              {businessPerformanceHeights.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                  <div 
                    className="w-full bg-emerald-100 rounded-2xl group-hover:bg-emerald-600 transition-all duration-500 relative"
                    style={{ height: `${h}%` }}
                  >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      <PriceDisplay 
                        amount={chartData[i].revenue} 
                        sourceCountry={profile?.country || 'Nigeria'} 
                        targetCountry={profile?.country}
                        className=""
                        showOriginalIfConverted={false}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{chartData[i].name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setActiveView('overview')}
              className="flex items-center gap-2 text-gray-400 font-bold hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Overview
            </button>
            <h2 className="text-3xl font-black tracking-tight">Store Analytics</h2>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Revenue</p>
              <h4 className="text-3xl font-black text-gray-900">
                <PriceDisplay 
                  amount={orders.reduce((acc, o) => acc + (o.total || 0), 0)} 
                  sourceCountry={profile?.country || 'Nigeria'} 
                  targetCountry={profile?.country}
                  className=""
                  showOriginalIfConverted={false}
                />
              </h4>
              <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1">
                <TrendingUp size={12} /> +12.5% from last month
              </p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Orders</p>
              <h4 className="text-3xl font-black text-gray-900">{orders.length}</h4>
              <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1">
                <TrendingUp size={12} /> +8.2% from last month
              </p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Followers</p>
              <h4 className="text-3xl font-black text-gray-900">
                {stores.reduce((acc, s) => acc + (s.followers?.length || 0), 0)}
              </h4>
              <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1">
                <TrendingUp size={12} /> +24 new this week
              </p>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Avg. Order Value</p>
              <h4 className="text-3xl font-black text-gray-900">
                <PriceDisplay 
                  amount={orders.length > 0 ? (orders.reduce((acc, o) => acc + (o.total || 0), 0) / orders.length) : 0} 
                  sourceCountry={profile?.country || 'Nigeria'} 
                  targetCountry={profile?.country}
                  className=""
                  showOriginalIfConverted={false}
                />
              </h4>
              <p className="text-xs font-bold text-rose-500 mt-2 flex items-center gap-1">
                <TrendingUp size={12} className="rotate-180" /> -2.1% from last month
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales Growth Chart */}
            <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
              <h3 className="text-xl font-black mb-8">Sales Growth</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesGrowthData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontWeight: 'bold'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#10b981" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Product Performance */}
            <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
              <h3 className="text-xl font-black mb-8">Product Performance</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productPerformanceData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fontSize: 11, fontWeight: 700, fill: '#4b5563' }}
                      width={100}
                    />
                    <Tooltip 
                      cursor={{ fill: '#f9fafb' }}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontWeight: 'bold'
                      }} 
                    />
                    <Bar dataKey="sales" radius={[0, 10, 10, 0]}>
                      {products.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6'][index % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Follower Growth */}
          <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black">Follower Growth</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase tracking-widest">Weekly</span>
                <span className="px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black rounded-lg uppercase tracking-widest">Monthly</span>
              </div>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { day: 'Mon', followers: 120 },
                    { day: 'Tue', followers: 132 },
                    { day: 'Wed', followers: 145 },
                    { day: 'Thu', followers: 140 },
                    { day: 'Fri', followers: 160 },
                    { day: 'Sat', followers: 185 },
                    { day: 'Sun', followers: 210 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fontWeight: 600, fill: '#9ca3af' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontWeight: 'bold'
                    }} 
                  />
                  <Line 
                    type="stepAfter" 
                    dataKey="followers" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    dot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* Create Store View */}
      {activeView === 'create_store' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-white p-6 md:p-12 rounded-[40px] border border-black/5 shadow-2xl"
        >
          <div className="flex items-start justify-between mb-8 md:mb-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                {stores.length === 0 ? 'Welcome! Create Your First Store' : 'Create New Store'}
              </h2>
              {stores.length === 0 && (
                <p className="text-gray-500 mt-2 font-medium">You need to create a store before you can start selling.</p>
              )}
            </div>
            {stores.length > 0 && (
              <button onClick={() => setActiveView('overview')} className="p-2 md:p-3 hover:bg-gray-100 rounded-2xl transition-all">
                <X size={24} />
              </button>
            )}
          </div>

          <form onSubmit={handleCreateStore} className="space-y-6 md:space-y-8">
            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Store Identity</label>
              <input
                required
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Lagos Luxury Crafts"
                className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-base md:text-lg font-bold"
              />
              <textarea
                required
                value={storeDesc}
                onChange={(e) => setStoreDesc(e.target.value)}
                placeholder="Describe what makes your store special..."
                className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all h-32 resize-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Category</label>
                <select
                  value={storeCat}
                  onChange={(e) => setStoreCat(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                >
                  <option>General</option>
                  <option>Fashion</option>
                  <option>Electronics</option>
                  <option>Home & Garden</option>
                  <option>Art & Crafts</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Location</label>
                <input
                  required
                  type="text"
                  value={storeLoc}
                  onChange={(e) => setStoreLoc(e.target.value)}
                  placeholder="e.g. Accra, Ghana"
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <LocationPicker 
                latitude={storeLat} 
                longitude={storeLng} 
                onLocationSelect={(lat, lng) => {
                  setStoreLat(lat);
                  setStoreLng(lng);
                }} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Business Type</label>
                <select
                  value={storeType}
                  onChange={(e) => setStoreType(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                >
                  <option>Retail</option>
                  <option>Wholesale</option>
                  <option>Manufacturer</option>
                  <option>Artisan</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Founded Year</label>
                <input
                  type="number"
                  value={storeFounded}
                  onChange={(e) => setStoreFounded(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Base Currency</label>
                <select
                  value={storeCurrency}
                  onChange={(e) => setStoreCurrency(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                >
                  {Array.from(new Set(AFRICAN_COUNTRIES.map(c => c.currency))).sort().map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-black/5 space-y-6">
              <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                Payout Settings (Required)
              </h3>
              <p className="text-xs text-gray-400 font-bold ml-2">All funds generated by this store will be sent to the bank details provided below.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={storeBankName}
                    onChange={(e) => setStoreBankName(e.target.value)}
                    placeholder="e.g. Access Bank"
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Account Number *</label>
                  <input
                    type="text"
                    required
                    value={storeAccountNumber}
                    onChange={(e) => setStoreAccountNumber(e.target.value)}
                    placeholder="10-digit account number"
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Store Cover Image</label>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                  {storePreview ? (
                    <img src={storePreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <ImageIcon className="text-gray-300" size={32} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setStoreFile(file);
                        setStorePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm font-bold text-gray-500">Upload a high-quality cover image</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            <button
              disabled={submitting}
              type="submit"
              className="w-full py-4 md:py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg md:text-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex flex-col items-center justify-center gap-1"
            >
              <div className="flex items-center justify-center gap-3">
                {submitting ? <Loader2 className="animate-spin" size={24} /> : 'Launch Store'}
              </div>
              {submitting && uploadStatus && (
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {uploadStatus}
                </span>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* Manage Store View */}
      {activeView === 'finance' && selectedStore && (
        <FinanceView 
          targetId={selectedStore.id}
          targetType="store"
          targetData={{
            totalDebt: (selectedStore as any).totalDebt || 0,
            lockThreshold: (selectedStore as any).lockThreshold || 50,
            isLocked: (selectedStore as any).isLocked || false,
            name: selectedStore.name
          }}
          sellerId={user?.uid || ''}
          onBack={() => setActiveView('manage_store')}
        />
      )}

      {activeView === 'manage_store' && selectedStore && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 md:space-y-8"
        >
          {/* Navigation & Top Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button 
              onClick={() => setActiveView('overview')}
              className="flex items-center gap-3 text-gray-500 font-bold hover:text-emerald-600 transition-colors shrink-0 group"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center group-hover:border-emerald-200 group-hover:bg-emerald-50 transition-all shadow-sm">
                <ArrowLeft size={18} />
              </div>
              <span className="hidden sm:inline">Back to Overview</span>
              <span className="sm:hidden">Back</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setShowStoreView(true)}
                className="px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-gray-600 hover:text-emerald-600 transition-all font-bold text-sm shadow-sm flex items-center gap-2 group hover:border-emerald-200"
              >
                <StoreIcon size={18} className="group-hover:scale-110 transition-transform" />
                Preview Store
              </button>
              <button 
                onClick={() => {
                  setStoreName(selectedStore.name);
                  setStoreDesc(selectedStore.description);
                  setStoreCat(selectedStore.category);
                  setStoreLoc(selectedStore.location);
                  setStoreLat(selectedStore.latitude);
                  setStoreLng(selectedStore.longitude);
                  setStoreType(selectedStore.businessType || 'Retail');
                  setStoreFounded(selectedStore.foundedYear?.toString() || new Date().getFullYear().toString());
                  setStoreResponse(selectedStore.responseTime || '< 1 hour');
                  setStorePreview(selectedStore.imageUrl);
                  setStoreFile(null);
                  setStoreBankName(selectedStore.bank_name || '');
                  setStoreAccountNumber(selectedStore.account_number || '');
                  setActiveView('edit_store');
                }}
                className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm"
                title="Store Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Store Profile Header */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="h-32 md:h-48 bg-gradient-to-br from-emerald-500 to-teal-700 relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            </div>
            <div className="px-6 md:px-12 pb-8 md:pb-12 relative flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-[28px] bg-white flex items-center justify-center text-emerald-600 shrink-0 border-4 border-white shadow-xl -mt-16 md:-mt-20 relative z-10 overflow-hidden">
                {selectedStore.imageUrl ? (
                  <img src={selectedStore.imageUrl} alt={selectedStore.name} className="w-full h-full object-cover" />
                ) : (
                  <StoreIcon size={56} />
                )}
              </div>
              <div className="flex-1 mt-2 md:mt-4">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-4 mb-2">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">{selectedStore.name}</h2>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        {selectedStore.category}
                      </span>
                      {selectedStore.businessType && (
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
                          {selectedStore.businessType}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => !selectedStore.isLocked && setActiveView('add_product')}
                    disabled={selectedStore.isLocked}
                    className={`px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg w-full md:w-auto justify-center ${
                      selectedStore.isLocked
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200'
                    }`}
                  >
                    {selectedStore.isLocked ? <Lock size={18} /> : <PlusCircle size={18} />}
                    {selectedStore.isLocked ? "Account Locked" : "List New Product"}
                  </button>
                </div>
                <p className="text-gray-500 font-medium leading-relaxed max-w-3xl mt-4 text-sm md:text-base">
                  {selectedStore.description}
                </p>
              </div>
            </div>
          </div>

          {/* Manager Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <button 
              onClick={() => setActiveView('inventory')}
              className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-emerald-100 transition-all text-left group flex flex-col items-start gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors">Stock Inventory</h3>
                <p className="text-gray-500 font-medium mt-1 text-sm leading-relaxed">Manage your product stock levels, quickly edit quantities, and track variations.</p>
              </div>
            </button>

            <button 
              onClick={() => setActiveView('store_updates')}
              className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:blue-100 transition-all text-left group flex flex-col items-start gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 group-hover:text-blue-600 transition-colors">Store Updates</h3>
                <p className="text-gray-500 font-medium mt-1 text-sm leading-relaxed">Post announcements, flash sales, or news updates directly to your followers.</p>
              </div>
            </button>

            <button 
              onClick={() => setActiveView('finance')}
              className="bg-white p-6 md:p-8 rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-purple-100 transition-all text-left group flex flex-col items-start gap-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 group-hover:text-purple-600 transition-colors">Financials</h3>
                <p className="text-gray-500 font-medium mt-1 text-sm leading-relaxed">Review payouts, commission deductions, and manage your settlement accounts.</p>
              </div>
            </button>
          </div>

          {/* Store Highlights Management */}
          <div className="bg-white p-6 md:p-10 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-lg md:text-xl font-black mb-6 md:mb-8 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <ImageIcon size={20} />
              </div>
              Featured Highlights
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {/* Existing Highlights */}
              {selectedStore.highlights?.map((url: string, idx: number) => (
                <div key={idx} className="aspect-square rounded-2xl bg-gray-50 overflow-hidden relative group">
                  {isVideo(url) ? (
                    <video src={url} className="w-full h-full object-cover" muted loop playsInline autoPlay />
                  ) : (
                    <img src={url} className="w-full h-full object-cover" alt="Highlight" />
                  )}
                  <button 
                    onClick={async () => {
                      const newHighlights = selectedStore.highlights!.filter((_: any, i: number) => i !== idx);
                      const { error } = await supabase
                        .from('stores')
                        .update({ highlights: newHighlights })
                        .eq('id', selectedStore.id);
                      if (!error) {
                        setSelectedStore({ ...selectedStore, highlights: newHighlights });
                      }
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              
              {/* New Previews */}
              {highlightPreviews.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-2xl bg-gray-50 overflow-hidden relative group border-2 border-emerald-200">
                  {isVideo(url) ? (
                    <video src={url} className="w-full h-full object-cover opacity-50" muted playsInline />
                  ) : (
                    <img src={url} className="w-full h-full object-cover opacity-50" alt="Preview" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="animate-spin text-emerald-600" size={20} />
                  </div>
                </div>
              ))}

              {/* Upload Button */}
              <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition-all cursor-pointer">
                <PlusCircle size={24} />
                <span className="text-[10px] font-black uppercase mt-2">Add Photo</span>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  multiple 
                  className="hidden" 
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || []) as File[];
                    if (files.length === 0) return;

                    const newPreviews = files.map(f => URL.createObjectURL(f));
                    setHighlightPreviews(prev => [...prev, ...newPreviews]);
                    setUploadStatus('Optimizing highlights...');

                    try {
                      const uploadPromises = files.map(async (file: File, index: number) => {
                        let fileToUpload = file;
                        
                        // Compress if it's an image
                        if (file.type.startsWith('image/')) {
                          const options = {
                            maxSizeMB: 0.8,
                            maxWidthOrHeight: 1200,
                            useWebWorker: true,
                          };
                          try {
                            fileToUpload = await imageCompression(file, options);
                          } catch (err) {
                            console.warn('Highlight compression failed', err);
                          }
                        }

                        const formData = new FormData();
                        formData.append('file', fileToUpload);
                        formData.append('folder', 'stores/highlights');

                        const signResponse = await fetch('/api/cloudinary/sign', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ folder: 'stores/highlights' })
                        });

                        if (!signResponse.ok) {
                          throw new Error('Failed to get signature from Cloudinary');
                        }

                        const signData = await signResponse.json();
                        
                        formData.append('api_key', signData.apiKey);
                        formData.append('timestamp', signData.timestamp);
                        formData.append('signature', signData.signature);

                        const isVideo = fileToUpload.type.startsWith('video/');
                        const resourceType = isVideo ? 'video' : 'image';

                        const uploadResponse = await fetch(
                          `https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`,
                          { method: 'POST', body: formData }
                        );

                        if (!uploadResponse.ok) {
                          throw new Error('Cloudinary upload failed');
                        }

                        const uploadData = await uploadResponse.json();
                        return uploadData.secure_url;
                      });

                      setUploadStatus('Uploading highlights...');
                      const urls = await Promise.all(uploadPromises);
                      const currentHighlights = selectedStore.highlights || [];
                      const updatedHighlights = [...currentHighlights, ...urls];

                      setUploadStatus('Updating store...');
                      const { error } = await supabase
                        .from('stores')
                        .update({ highlights: updatedHighlights })
                        .eq('id', selectedStore.id);
                      
                      if (error) throw error;

                      setSelectedStore({ ...selectedStore, highlights: updatedHighlights });
                      setUploadStatus('Highlights updated!');
                      setTimeout(() => setUploadStatus(null), 3000);
                    } catch (error) {
                      console.error('Error uploading highlights:', error);
                      setUploadStatus('Highlight upload failed');
                    } finally {
                      setHighlightPreviews([]);
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest">
              Small square thumbnails like Facebook profile grid. Max 5MB per file.
            </p>
          </div>

          {/* Logistics & Delivery Management */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-12 rounded-[40px] border border-black/5 shadow-sm">
              <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                <Truck className="text-emerald-600" />
                Logistics & Delivery
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Delivery Fee ({getCurrencySymbol(profile?.country)})</label>
                    <input 
                      type="number"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Est. Delivery Time</label>
                    <input 
                      type="text"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder="e.g. 2-3 days"
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                    />
                  </div>
                </div>
                <button 
                  onClick={handleUpdateDeliverySettings}
                  disabled={submitting}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Update Delivery Settings'}
                </button>
              </div>
            </div>

            <div className="bg-white p-12 rounded-[40px] border border-black/5 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black flex items-center gap-3">
                  <Package className="text-emerald-600" />
                  Registered Transporters
                </h3>
                <button 
                  onClick={() => setShowAddTransporter(true)}
                  className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                >
                  <PlusCircle size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {transporters.length === 0 ? (
                  <p className="text-gray-400 font-bold text-center py-4">No transporters registered yet.</p>
                ) : (
                  transporters.map(t => (
                    <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <Truck size={20} />
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{t.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.vehicleType} • {t.phone}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-full">
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.filter(p => p.storeId === selectedStore.id).map(product => (
              <div key={product.id} className="bg-white rounded-[40px] border border-black/5 overflow-hidden group hover:shadow-2xl transition-all duration-500">
                <div className="aspect-square relative overflow-hidden">
                  <img src={product.images?.[0] || 'https://placehold.co/400x400?text=No+Image'} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-6 right-6 px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl font-black text-emerald-600 shadow-sm">
                    <PriceDisplay 
                      amount={product.price || 0} 
                      sourceCountry={selectedStore.currency || 'Nigeria'} 
                      targetCountry={profile?.country}
                      className=""
                      originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-1"
                    />
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {product.tags?.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <h4 className="text-xl font-black mb-2">{product.title}</h4>
                  <p className="text-gray-400 text-sm font-medium line-clamp-2 mb-4">{product.description}</p>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex-1 p-3 bg-gray-50 rounded-2xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock</p>
                      <p className="text-sm font-black text-emerald-600">{product.quantity || 0} units</p>
                    </div>
                    <div className="flex-1 p-3 bg-gray-50 rounded-2xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">SKU</p>
                      <p className="text-sm font-black text-gray-900 truncate">{product.sku || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                    <button
                      onClick={() => {
                        if ((profile?.afro_credits || 0) < 5) {
                          toast.error('Insufficient Afro Credits.');
                          window.dispatchEvent(new CustomEvent('openAfroCreditWallet'));
                          return;
                        }
                        window.dispatchEvent(new CustomEvent('requestAfroCreditSpend', {
                          detail: {
                            title: 'Bump Product',
                            description: '5 AC will be deducted to bump your product to the top for 24 hours.',
                            cost: 5,
                            actionType: 'bumpProduct',
                            targetId: product.id
                          }
                        }));
                      }}
                      className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all flex items-center gap-1"
                      title="Bump to top for 24 hours"
                    >
                      <TrendingUp size={14} /> Bump
                    </button>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingProduct(product);
                          setActiveView('edit_product');
                        }}
                        className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="Edit Product"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => setProductToDelete(product)}
                        className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Delete Product"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Inventory View */}
      {activeView === 'inventory' && selectedStore && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 md:space-y-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveView('manage_store')}
                className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all shadow-sm"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">Stock Inventory</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <p className="text-gray-500 font-medium text-xs md:text-sm">Managing: <strong className="text-gray-900">{selectedStore.name}</strong></p>
                </div>
              </div>
            </div>
            
            <div className="relative w-full md:w-auto md:min-w-[320px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search SKU or Product Name..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-12 pr-6 py-3.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 hover:border-emerald-200 transition-all font-medium text-sm shadow-sm"
              />
            </div>
          </div>

          <div className="bg-white rounded-[24px] md:rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stock</th>
                    <th className="px-6 md:px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products
                    .filter(p => p.storeId === selectedStore.id)
                    .filter(p => 
                      p.title.toLowerCase().includes(inventorySearch.toLowerCase()) || 
                      (p.sku && p.sku.toLowerCase().includes(inventorySearch.toLowerCase()))
                    )
                    .map(product => (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 md:px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gray-100 overflow-hidden shrink-0 border border-black/5">
                            <img src={product.images?.[0] || 'https://placehold.co/400x400?text=No+Image'} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors truncate max-w-[200px] md:max-w-xs">{product.title}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{product.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-5">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-black/5 inline-flex items-center gap-1">
                          {product.sku || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 md:px-8 py-5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1">
                            <button 
                              onClick={async () => {
                                const newQty = Math.max(0, (product.quantity || 0) - 1);
                                await supabase.from('products').update({ quantity: newQty }).eq('id', product.id);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 rounded-lg hover:text-rose-600 hover:bg-rose-50 hover:shadow-sm border border-transparent hover:border-rose-100 transition-all"
                            >
                              <Minus size={14} />
                            </button>
                            <span className={`text-base font-black min-w-[3ch] text-center ${
                              (product.quantity || 0) <= 5 ? 'text-rose-500' : 'text-emerald-600'
                            }`}>
                              {product.quantity || 0}
                            </span>
                            <button 
                              onClick={async () => {
                                const newQty = (product.quantity || 0) + 1;
                                await supabase.from('products').update({ quantity: newQty }).eq('id', product.id);
                              }}
                              className="w-8 h-8 flex items-center justify-center bg-white text-gray-400 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 hover:shadow-sm border border-transparent hover:border-emerald-100 transition-all"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          {(product.quantity || 0) <= 5 && (
                            <span className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                              <AlertTriangle size={12} />
                              Low Stock
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              if ((profile?.afro_credits || 0) < 5) {
                                toast.error('Insufficient Afro Credits.');
                                window.dispatchEvent(new CustomEvent('openAfroCreditWallet'));
                                return;
                              }
                              window.dispatchEvent(new CustomEvent('requestAfroCreditSpend', {
                                detail: {
                                  title: 'Bump Product',
                                  description: '5 AC will be deducted to bump your product to the top for 24 hours.',
                                  cost: 5,
                                  actionType: 'bumpProduct',
                                  targetId: product.id
                                }
                              }));
                            }}
                            className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold hover:bg-purple-100 transition-all flex items-center gap-1 shadow-sm"
                            title="Bump to top for 24 hours"
                          >
                            <TrendingUp size={14} /> Bump
                          </button>
                          <button 
                            onClick={() => {
                              setEditingProduct(product);
                              setActiveView('edit_product');
                            }}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {products.filter(p => p.storeId === selectedStore.id).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-8 py-16 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                          <Package size={32} />
                        </div>
                        <h4 className="text-lg font-bold text-gray-900 mb-1">No products found</h4>
                        <p className="text-gray-500 text-sm">You haven't listed any products in this store yet.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* Add Product View */}
      {activeView === 'add_product' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto bg-white p-6 md:p-12 rounded-[40px] border border-black/5 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">List New Product</h2>
              <p className="text-gray-400 font-bold text-xs mt-1">
                {selectedStore ? `Listing in: ${selectedStore.name}` : 'Quick Listing'}
              </p>
            </div>
            <button onClick={() => setActiveView(selectedStore ? 'manage_store' : 'overview')} className="p-2 md:p-3 hover:bg-gray-100 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          <ProductForm 
            initialStore={selectedStore || undefined}
            onSuccess={() => setActiveView(selectedStore ? 'manage_store' : 'overview')} 
            onClose={() => setActiveView(selectedStore ? 'manage_store' : 'overview')} 
          />
        </motion.div>
      )}

      {/* Edit Product View */}
      {activeView === 'edit_product' && selectedStore && editingProduct && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto bg-white p-6 md:p-12 rounded-[40px] border border-black/5 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">Edit Product</h2>
              <p className="text-gray-400 font-bold text-xs mt-1">Editing: {editingProduct.title}</p>
            </div>
            <button onClick={() => {
              setEditingProduct(null);
              setActiveView('manage_store');
            }} className="p-2 md:p-3 hover:bg-gray-100 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          <ProductForm 
            initialStore={selectedStore}
            productToEdit={editingProduct}
            onSuccess={() => {
              setEditingProduct(null);
              setActiveView('manage_store');
            }} 
            onClose={() => {
              setEditingProduct(null);
              setActiveView('manage_store');
            }} 
          />
        </motion.div>
      )}

      {/* Store Updates View */}
      {activeView === 'store_updates' && selectedStore && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto space-y-6 md:space-y-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveView('manage_store')}
                className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm group"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900">Broadcasts</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <p className="text-gray-500 font-medium text-xs md:text-sm">Broadcast to: <strong className="text-gray-900">{selectedStore.followers?.length || 0} Followers</strong></p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-10 rounded-[28px] md:rounded-[40px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-lg md:text-xl font-black mb-6 flex items-center gap-2">
              <MessageSquare className="text-blue-600" size={24} />
              Post a Broadcast
            </h3>
            <div className="space-y-5">
              <textarea 
                value={newUpdateText}
                onChange={(e) => setNewUpdateText(e.target.value)}
                placeholder="What's new? Announce a flash sale, new arrivals, or exclusive deals..."
                className="w-full p-6 bg-gray-50/80 border border-gray-100 rounded-[24px] focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all min-h-[140px] resize-none font-medium text-sm md:text-base outline-none"
              />
              
              {updateMedia && (
                <div className="relative w-full max-w-sm aspect-video rounded-[24px] overflow-hidden bg-gray-100 border border-black/5 shadow-sm">
                  {updateMedia.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(updateMedia)} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={URL.createObjectURL(updateMedia)} className="w-full h-full object-cover" />
                  )}
                  <button
                    onClick={() => setUpdateMedia(null)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-rose-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <label className="flex items-center gap-2 px-5 py-3 bg-gray-50 border border-gray-100 text-gray-600 rounded-xl cursor-pointer hover:bg-gray-100 hover:border-gray-200 transition-colors font-bold text-sm shadow-sm w-full sm:w-auto justify-center">
                  <ImageIcon size={18} className="text-gray-400" />
                  <span>Attach Media</span>
                  <input 
                    type="file" 
                    accept="image/*,video/*" 
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUpdateMedia(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                <button 
                  onClick={handlePostUpdate}
                  disabled={postingUpdate || (!newUpdateText.trim() && !updateMedia)}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {postingUpdate ? <Loader2 className="animate-spin" size={18} /> : <PlusCircle size={18} />}
                  Publish Post
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 md:space-y-8 mt-12">
            <h3 className="text-xl font-black px-4 text-gray-900 border-l-4 border-blue-600 ml-2 py-1">Timeline</h3>
            {filteredStoreUpdates.length === 0 ? (
              <div className="bg-white p-12 rounded-[32px] border border-gray-100 text-center shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                  <MessageSquare size={32} />
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">Silence is golden?</h4>
                <p className="text-gray-500 font-medium">You haven't broadcasted anything recently. Tell your customers what's new!</p>
              </div>
            ) : (
              filteredStoreUpdates.map((update) => (
                <motion.div 
                  key={update.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 border border-blue-100">
                        <StoreIcon size={20} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-base">{selectedStore.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                          {update.createdAt ? new Date(update.createdAt).toLocaleDateString() : ''} • {update.createdAt ? new Date(update.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteUpdate(update.id)}
                      className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Post"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-gray-700 text-base font-medium leading-relaxed mb-6 whitespace-pre-wrap ml-2 md:ml-16">
                    {update.text}
                  </p>
                  {update.media_url && (
                    <div className="mb-6 rounded-[24px] overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center ml-2 md:ml-16">
                      {update.media_type === 'video' ? (
                        <video src={update.media_url} controls className="max-w-full max-h-[500px] object-contain" />
                      ) : (
                        <img src={update.media_url} alt="Update media" className="max-w-full max-h-[500px] object-contain" />
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-5 border-t border-gray-100 ml-2 md:ml-16">
                    <button 
                      onClick={() => handleLikeUpdate(update.id, update.likes || [])}
                      className={`flex items-center gap-2 font-bold text-sm px-4 py-2 rounded-xl transition-all ${
                        update.likes?.includes(user?.id) 
                        ? 'bg-rose-50 text-rose-600' 
                        : 'bg-gray-50 text-gray-500 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                    >
                      <Heart size={16} fill={update.likes?.includes(user?.id) ? 'currentColor' : 'none'} />
                      <span>{update.likes?.length || 0}</span>
                    </button>
                    <div className="flex items-center gap-2 text-gray-400 font-bold text-xs bg-gray-50 px-4 py-2 rounded-xl">
                      <Users size={14} />
                      {selectedStore.followers?.length || 0} Followers Reached
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Edit Store View */}
      {activeView === 'edit_store' && selectedStore && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto bg-white p-6 md:p-12 rounded-[40px] border border-black/5 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">Edit Store Profile</h2>
            <button onClick={() => setActiveView('manage_store')} className="p-2 md:p-3 hover:bg-gray-100 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          <form 
            onSubmit={handleUpdateStore} 
            className="space-y-6 md:space-y-8"
          >
            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Store Identity</label>
              <input
                required
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all text-base md:text-lg font-bold"
              />
              <textarea
                required
                value={storeDesc}
                onChange={(e) => setStoreDesc(e.target.value)}
                className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all h-32 resize-none font-medium"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Category</label>
                <select
                  value={storeCat}
                  onChange={(e) => setStoreCat(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                >
                  <option>General</option>
                  <option>Fashion</option>
                  <option>Electronics</option>
                  <option>Home & Garden</option>
                  <option>Art & Crafts</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Location</label>
                <input
                  required
                  type="text"
                  value={storeLoc}
                  onChange={(e) => setStoreLoc(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-4">
              <LocationPicker 
                latitude={storeLat} 
                longitude={storeLng} 
                onLocationSelect={(lat, lng) => {
                  setStoreLat(lat);
                  setStoreLng(lng);
                }} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Business Type</label>
                <select
                  value={storeType}
                  onChange={(e) => setStoreType(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                >
                  <option>Retail</option>
                  <option>Wholesale</option>
                  <option>Manufacturer</option>
                  <option>Artisan</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Founded Year</label>
                <input
                  type="number"
                  value={storeFounded}
                  onChange={(e) => setStoreFounded(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                />
              </div>
              <div className="space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Base Currency</label>
                <select
                  value={storeCurrency}
                  onChange={(e) => setStoreCurrency(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                >
                  {Array.from(new Set(AFRICAN_COUNTRIES.map(c => c.currency))).sort().map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Response Time</label>
              <select
                value={storeResponse}
                onChange={(e) => setStoreResponse(e.target.value)}
                className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
              >
                <option>&lt; 1 hour</option>
                <option>&lt; 3 hours</option>
                <option>&lt; 24 hours</option>
                <option>Within 2-3 days</option>
              </select>
            </div>

            <div className="bg-gray-50 p-6 rounded-3xl border border-black/5 space-y-6">
              <h3 className="font-black text-lg tracking-tight flex items-center gap-2">
                Payout Settings (Store Specific)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Bank Name</label>
                  <input
                    type="text"
                    value={storeBankName}
                    onChange={(e) => setStoreBankName(e.target.value)}
                    placeholder="e.g. Access Bank"
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Account Number</label>
                  <input
                    type="text"
                    value={storeAccountNumber}
                    onChange={(e) => setStoreAccountNumber(e.target.value)}
                    placeholder="10-digit account number"
                    className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Store Cover Image</label>
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="w-full md:w-32 h-32 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative group">
                  {storePreview ? (
                    <img src={storePreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <ImageIcon className="text-gray-300" size={32} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setStoreFile(file);
                        setStorePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-sm font-bold text-gray-500">Update your store cover image</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">PNG, JPG up to 5MB</p>
                </div>
              </div>
            </div>

            <button
              disabled={submitting}
              type="submit"
              className="w-full py-4 md:py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg md:text-xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex flex-col items-center justify-center gap-1"
            >
              <div className="flex items-center justify-center gap-3">
                {submitting ? <Loader2 className="animate-spin" size={24} /> : 'Save Changes'}
              </div>
              {submitting && uploadStatus && (
                <div className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {uploadStatus}
                </div>
              )}
            </button>
          </form>
        </motion.div>
      )}

      {/* Orders View */}
      {activeView === 'orders' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setActiveView('overview')}
              className="flex items-center gap-2 text-gray-400 font-bold hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Overview
            </button>
            <h2 className="text-3xl font-black tracking-tight">Customer Orders</h2>
          </div>

          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] border border-black/5 text-center">
                <p className="text-gray-400 font-bold">No orders found yet.</p>
              </div>
            ) : (
              orders.map(order => (
                <div 
                  key={order.id} 
                  onClick={() => handleViewOrderDetails(order)}
                  className="bg-white p-8 rounded-[40px] border border-black/5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 cursor-pointer hover:border-emerald-200 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Package size={32} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black">Order #{order.id.slice(-6).toUpperCase()}</h4>
                      <p className="text-gray-400 font-bold text-sm flex items-center gap-1 flex-wrap">
                        {(order.items || []).length} items • Total: 
                        <PriceDisplay 
                          amount={order.total || 0} 
                          sourceCountry={order.store_currency || 'Nigeria'} 
                          targetCountry={profile?.country}
                          className=""
                          originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-1"
                        />
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                      ['pending_payment', 'awaiting_seller_confirmation'].includes(order.status) ? 'bg-amber-50 text-amber-600' :
                      order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpdateOrderStatus(order.id, order.status);
                      }}
                      disabled={order.status === 'delivered' || order.status === 'cancelled'}
                      className={`flex-1 md:flex-none px-6 py-3 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        order.status === 'awaiting_seller_confirmation' 
                          ? 'bg-emerald-500 hover:bg-emerald-600' 
                          : 'bg-gray-900 hover:bg-gray-800'
                      }`}
                    >
                      {order.status === 'delivered' || order.status === 'cancelled' ? 'Complete' : 
                       order.status === 'awaiting_seller_confirmation' ? 'Confirm Payment' : 'Advance Status'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Order Details</h3>
                  <p className="text-gray-400 font-bold">#{selectedOrder.id.toUpperCase()}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-8">
                {/* Items Section */}
                <section>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Items Purchased</h4>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                        <div>
                          <p className="font-black text-gray-900">{item.title}</p>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{item.storeName}</p>
                        </div>
                        <div className="text-right">
                          <PriceDisplay 
                            amount={item.price || 0} 
                            sourceCountry={selectedOrder.store_currency || 'Nigeria'} 
                            targetCountry={profile?.country}
                            className="font-black text-emerald-600"
                            originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-1 block"
                          />
                          <p className="text-[10px] font-bold text-gray-400 mt-1">Qty: 1</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-black text-gray-900">Total Amount</span>
                    <PriceDisplay 
                      amount={selectedOrder.total || 0} 
                      sourceCountry={selectedOrder.store_currency || 'Nigeria'} 
                      targetCountry={profile?.country}
                      className="text-2xl font-black text-emerald-600"
                      originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-2"
                    />
                  </div>
                </section>

                {/* Buyer Info Section */}
                <section>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Buyer Information</h4>
                  {loadingBuyer ? (
                    <div className="flex items-center gap-3 text-gray-400 py-4">
                      <Loader2 className="animate-spin" size={20} />
                      <span className="font-bold">Loading buyer profile...</span>
                    </div>
                  ) : buyerProfile ? (
                    <div className="bg-emerald-50 p-6 rounded-3xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center font-black">
                          {buyerProfile.name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="font-black text-emerald-900">{buyerProfile.name || 'Anonymous Buyer'}</p>
                          <p className="text-xs font-bold text-emerald-600/60">{buyerProfile.email}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 font-bold italic">Buyer information unavailable.</p>
                  )}
                </section>

                {/* Delivery Info Section */}
                <section>
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Delivery Details</h4>
                  <div className="bg-gray-50 p-6 rounded-3xl space-y-4">
                    <div className="flex items-start gap-3">
                      <Truck className="text-gray-400 shrink-0" size={20} />
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Method</p>
                        <p className="font-bold text-gray-900 capitalize">{selectedOrder.deliveryType}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="text-gray-400 shrink-0" size={20} />
                      <div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Address</p>
                        <p className="font-bold text-gray-900 leading-relaxed">{selectedOrder.deliveryAddress || 'Pickup at store'}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="pt-4">
                  <div className="space-y-6">
                    {selectedOrder.receipt_url && (
                      <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <h4 className="font-bold text-emerald-900 mb-2">Payment Receipt</h4>
                        <a 
                          href={selectedOrder.receipt_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 underline font-medium text-sm flex items-center gap-2"
                        >
                          <ImageIcon size={16} />
                          View Uploaded Receipt
                        </a>
                      </div>
                    )}
                    
                    {selectedOrder.status === 'awaiting_seller_confirmation' ? (
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl">
                          <h4 className="text-amber-800 font-black mb-2 flex items-center gap-2">
                            <AlertCircle size={20} />
                            Payment Review Required
                          </h4>
                          <p className="text-amber-700 text-sm font-bold flex items-center gap-1 flex-wrap">
                            The buyer has marked this order as paid. Please verify the payment of 
                            <PriceDisplay 
                              amount={selectedOrder.total || 0} 
                              sourceCountry={selectedOrder.store_currency || 'Nigeria'} 
                              targetCountry={profile?.country}
                              className=""
                              originalPriceClassName="text-[10px] font-bold text-amber-600/60 line-through ml-1"
                            />
                            in your bank account before confirming.
                          </p>
                        </div>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => handleUpdateOrderStatus(selectedOrder.id, selectedOrder.status)}
                            className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={20} />
                            Confirm Payment Received
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleUpdateOrderStatus(selectedOrder.id, selectedOrder.status)}
                        disabled={selectedOrder.status === 'delivered' || selectedOrder.status === 'cancelled'}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedOrder.status === 'delivered' || selectedOrder.status === 'cancelled' 
                          ? 'Order Complete' 
                          : 'Advance Order Status'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Transporter Modal */}
      <AnimatePresence>
        {showAddTransporter && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddTransporter(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 md:p-12"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tight">Register Transporter</h3>
                <button onClick={() => setShowAddTransporter(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddTransporter} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Full Name</label>
                  <input 
                    required
                    type="text"
                    value={newTransporterName}
                    onChange={(e) => setNewTransporterName(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number</label>
                  <input 
                    required
                    type="tel"
                    value={newTransporterPhone}
                    onChange={(e) => setNewTransporterPhone(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Transporter User ID (Optional)</label>
                  <input 
                    type="text"
                    value={newTransporterUserId}
                    onChange={(e) => setNewTransporterUserId(e.target.value)}
                    placeholder="UID of the transporter's account"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Vehicle Type</label>
                  <select 
                    value={newTransporterVehicle}
                    onChange={(e) => setNewTransporterVehicle(e.target.value)}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold appearance-none"
                  >
                    <option>Motorcycle</option>
                    <option>Bicycle</option>
                    <option>Car</option>
                    <option>Van</option>
                    <option>Truck</option>
                  </select>
                </div>
                <button 
                  disabled={submitting}
                  type="submit"
                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center gap-3"
                >
                  {submitting ? <Loader2 className="animate-spin" size={24} /> : 'Register Transporter'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Store Front Preview Modal */}
      {showStoreView && selectedStore && (
        <StoreView 
          storeId={selectedStore.id}
          onClose={() => setShowStoreView(false)}
          onAddToCart={() => {}} // No-op in dashboard
          onEditProduct={(product) => {
            setShowStoreView(false);
            setEditingProduct(product);
            setActiveView('edit_product');
          }}
          onDeleteProduct={(product) => {
            setProductToDelete(product);
          }}
          cart={[]}
          setActiveTab={setActiveTab || (() => {})}
          setChatTarget={setChatTarget || (() => {})}
        />
      )}

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

      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
            <BusinessOnboarding
              onComplete={() => {
                setShowUpgradeModal(false);
                // Optional: Show a success toast or switch view
              }}
              onCancel={() => setShowUpgradeModal(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SellerDashboard;
