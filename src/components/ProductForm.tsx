import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Loader2, Truck, Tag, Package, Store, Check, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import imageCompression from 'browser-image-compression';
import { formatPrice } from '../lib/currency';
import PriceDisplay from './PriceDisplay';

interface ProductFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  initialStore?: {
    id: string;
    name: string;
    location: string;
    trustScore: number;
    currency?: string;
  };
  productToEdit?: any;
}

const ProductForm: React.FC<ProductFormProps> = ({ onClose, onSuccess, initialStore, productToEdit }) => {
  const { user } = useAuth() || {};
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Fashion');
  const [quantity, setQuantity] = useState('1');
  const [sku, setSku] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);
  const [storeDeliveryInfo, setStoreDeliveryInfo] = useState<{ fee: number; time: string } | null>(null);
  const [userStores, setUserStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStore?.id || '');
  const [selectedStoreCurrency, setSelectedStoreCurrency] = useState<string>(initialStore?.currency || 'NGN');
  const [loadingStores, setLoadingStores] = useState(false);

  useEffect(() => {
    if (productToEdit) {
      setTitle(productToEdit.title || '');
      setDescription(productToEdit.description || '');
      setPrice(productToEdit.price?.toString() || '');
      setCategory(productToEdit.category || 'Fashion');
      setQuantity(productToEdit.quantity?.toString() || '1');
      setSku(productToEdit.sku || '');
      setTags(productToEdit.tags || []);
      setDeliveryAvailable(productToEdit.deliveryAvailable ?? true);
      setPreviews(productToEdit.images?.length ? productToEdit.images : (productToEdit.imageUrl ? [productToEdit.imageUrl] : []));
    }
  }, [productToEdit]);

  const categories = ['Fashion', 'Agriculture', 'Crafts', 'Electronics', 'Food', 'Home & Garden', 'Art & Crafts', 'Food & Groceries'];

  useEffect(() => {
    let isMounted = true;
    const fetchStoreInfo = async (retryCount = 0) => {
      if (initialStore) {
        // If we have initialStore, we might still need to fetch the full store doc for delivery info
        try {
          const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', user?.id)
            .limit(1)
            .single();
            
          if (error) {
            if (retryCount < 3 && (
              error.message?.includes('fetch') || 
              error.message?.includes('Lock') || 
              error.message?.includes('AbortError') ||
              error.message?.includes('steal') ||
              error.message?.includes('Failed to fetch')
            )) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              setTimeout(() => isMounted && fetchStoreInfo(retryCount + 1), delay);
              return;
            }
            throw error;
          }

          if (isMounted && data) {
            setStoreDeliveryInfo({
              fee: data.delivery_fee || 0,
              time: data.delivery_time || '2-3 days'
            });
          }
        } catch (err) {
          console.warn('Error fetching store delivery info:', err);
        }
      } else if (user) {
        setLoadingStores(true);
        try {
          const { data: stores, error } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', user.id);
            
          if (error) {
            if (retryCount < 3 && (
              error.message?.includes('fetch') || 
              error.message?.includes('Lock') || 
              error.message?.includes('AbortError') ||
              error.message?.includes('steal') ||
              error.message?.includes('Failed to fetch')
            )) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              setTimeout(() => isMounted && fetchStoreInfo(retryCount + 1), delay);
              return;
            }
            throw error;
          }

          if (isMounted && stores) {
            setUserStores(stores);
            
            if (stores.length > 0) {
              const firstStore = stores[0];
              setSelectedStoreId(firstStore.id);
              setStoreDeliveryInfo({
                fee: firstStore.delivery_fee || 0,
                time: firstStore.delivery_time || '2-3 days'
              });
            }
          }
        } catch (err) {
          console.warn('Error fetching stores:', err);
        } finally {
          if (isMounted) setLoadingStores(false);
        }
      }
    };
    fetchStoreInfo();
    return () => { isMounted = false; };
  }, [user?.id, initialStore]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title || !price || !quantity || !sku) {
      alert('Please fill in all required fields (Title, Price, Quantity, SKU)');
      return;
    }

    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Please enter a valid price');
      return;
    }

    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      alert('Please enter a valid non-negative quantity');
      return;
    }

    if (!sku.trim()) {
      alert('Please enter a valid SKU');
      return;
    }

    setSubmitting(true);
    setUploadStatus('Optimizing image...');
    
    const performSubmit = async (retryCount = 0) => {
      try {
        // Use a consistent placeholder if no image is provided and it's a new product
        const placeholderImage = 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1000&auto=format&fit=crop';
        let imageUrls: string[] = productToEdit?.images || (productToEdit?.imageUrl ? [productToEdit.imageUrl] : []);
        
        if (files.length > 0) {
          setUploadStatus('Uploading images to CDN...');
          const newImageUrls: string[] = [];

          for (let i = 0; i < files.length; i++) {
            const currentFile = files[i];
            console.log(`Starting image upload for file ${i + 1}/${files.length}:`, currentFile.name);
            setUploadStatus(`Uploading image ${i + 1} of ${files.length}...`);
            
            // Compress image before upload
            const options = {
              maxSizeMB: 0.8,
              maxWidthOrHeight: 1280,
              useWebWorker: true,
            };

            let fileToUpload: File | Blob = currentFile;
            try {
              const compressedFile = await imageCompression(currentFile, options);
              fileToUpload = compressedFile as File;
              console.log(`Product image compressed from ${currentFile.size / 1024 / 1024}MB to ${fileToUpload.size / 1024 / 1024}MB`);
            } catch (compressionError) {
              console.warn('Product image compression failed, uploading original:', compressionError);
            }

            try {
              // 1. Get secure upload signature from our Vercel API
              const signResponse = await fetch('/api/cloudinary/sign', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: 'products' })
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
                throw new Error('Failed to upload image to Cloudinary');
              }

              const uploadData = await uploadResponse.json();
              newImageUrls.push(uploadData.secure_url);
              console.log(`Successfully uploaded image ${i + 1} to Cloudinary:`, uploadData.secure_url);
            } catch (uploadError: any) {
              console.error(`Cloudinary upload failed for image ${i + 1}:`, uploadError);
              throw new Error(`Cloudinary upload failed: ${uploadError.message}`);
            }
          }
          
          // If we uploaded new files, we replace existing ones or append? 
          // For simplicity, if they select new files, we replace. 
          // A more complex UI would allow adding/removing individually, but for now we replace if new files are selected.
          imageUrls = newImageUrls;
        }

        if (imageUrls.length === 0) {
          imageUrls = [placeholderImage];
        }

        setUploadStatus('Saving product...');

        if (productToEdit) {
          const { error } = await supabase
            .from('products')
            .update({
              title,
              description,
              price: parsedPrice,
              quantity: parsedQuantity,
              sku: sku.trim(),
              category,
              images: imageUrls,
              delivery_available: deliveryAvailable,
              tags,
              updated_at: new Date().toISOString()
            })
            .eq('id', productToEdit.id);
            
          if (error) {
            if (retryCount < 3 && (
              error.message?.includes('fetch') || 
              error.message?.includes('Lock') || 
              error.message?.includes('AbortError') ||
              error.message?.includes('steal') ||
              error.message?.includes('Failed to fetch')
            )) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              setTimeout(() => performSubmit(retryCount + 1), delay);
              return;
            }
            throw error;
          }
        } else {
          let productLocation = initialStore?.location || 'Lagos, Nigeria';
          let storeId = selectedStoreId || initialStore?.id || '';
          let storeName = initialStore?.name || user?.user_metadata?.username || 'African Merchant';
          let trustScore = initialStore?.trustScore || 90;
          let storeIsLocked = (initialStore as any)?.isLocked || false;

          if (!initialStore && selectedStoreId) {
            const selectedStore = userStores.find(s => s.id === selectedStoreId);
            if (selectedStore) {
              productLocation = selectedStore.location;
              storeName = selectedStore.name;
              trustScore = selectedStore.trust_score || 90;
              storeIsLocked = selectedStore.is_locked || false;
            }
          } else if (!initialStore && !selectedStoreId) {
            try {
              const { data: storeData, error } = await supabase
                .from('stores')
                .select('*')
                .eq('owner_id', user.id)
                .limit(1)
                .single();
                
              if (error) {
                if (retryCount < 3 && (
                  error.message?.includes('fetch') || 
                  error.message?.includes('Lock') || 
                  error.message?.includes('AbortError') ||
                  error.message?.includes('steal') ||
                  error.message?.includes('Failed to fetch')
                )) {
                  const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                  setTimeout(() => performSubmit(retryCount + 1), delay);
                  return;
                }
                throw error;
              }

              if (storeData) {
                productLocation = storeData.location;
                storeId = storeData.id;
                storeName = storeData.name;
                trustScore = storeData.trust_score || 90;
                storeIsLocked = storeData.is_locked || false;
              }
            } catch (storeErr) {
              console.warn('Could not fetch store info, using defaults:', storeErr);
            }
          }

          const { error } = await supabase
            .from('products')
            .insert({
              seller_id: user.id,
              seller_name: user?.user_metadata?.username || 'African Merchant',
              store_id: storeId,
              store_name: storeName,
              title,
              description,
              price: parsedPrice,
              quantity: parsedQuantity,
              sku: sku.trim(),
              category,
              location: productLocation,
              images: imageUrls,
              delivery_available: deliveryAvailable,
              rating: 5.0,
              review_count: 0,
              tags,
              trust_score: trustScore,
              store_is_locked: storeIsLocked
            });
            
          if (error) {
            if (retryCount < 3 && (
              error.message?.includes('fetch') || 
              error.message?.includes('Lock') || 
              error.message?.includes('AbortError') ||
              error.message?.includes('steal') ||
              error.message?.includes('Failed to fetch')
            )) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              setTimeout(() => performSubmit(retryCount + 1), delay);
              return;
            }
            throw error;
          }
        }

        if (onSuccess) onSuccess();
        
        // Clear Redis cache after successful product creation/update
        try {
          await fetch('/api/catalog-clear', { method: 'POST' });
          console.log('Product feed cache cleared');
        } catch (cacheErr) {
          console.warn('Failed to clear product feed cache:', cacheErr);
        }

        onClose();
      } catch (error) {
        console.error('Error saving product:', error);
      } finally {
        setSubmitting(false);
      }
    };

    performSubmit();
  };

  return (
    <div className="space-y-8 pb-8">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Store & Identity */}
        {!initialStore && !productToEdit && (
          <div className="bg-slate-50/50 p-6 sm:p-8 rounded-[32px] border border-slate-100/60 space-y-4">
            <div className="flex items-center gap-2 mb-2 pb-4 border-b border-gray-50">
              <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Store size={16} />
              </div>
              <h3 className="text-xl font-black text-gray-900">Select Store</h3>
            </div>
            
            {loadingStores ? (
              <div className="flex items-center gap-3 text-emerald-600 font-bold p-5 bg-emerald-50 rounded-[20px]">
                <Loader2 className="animate-spin" size={18} />
                Loading your stores...
              </div>
            ) : userStores.length > 0 ? (
              <div className="relative">
                <select
                  required
                  value={selectedStoreId}
                  onChange={(e) => {
                    setSelectedStoreId(e.target.value);
                    const store = userStores.find(s => s.id === e.target.value);
                    if (store) {
                      setSelectedStoreCurrency(store.currency || 'NGN');
                      setStoreDeliveryInfo({
                        fee: store.delivery_fee || store.deliveryFee || 0,
                        time: store.delivery_time || store.deliveryTime || '2-3 days'
                      });
                    }
                  }}
                  className="w-full px-5 py-4 sm:px-6 sm:py-5 bg-white border border-gray-200 rounded-[20px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-gray-900 appearance-none text-base sm:text-lg shadow-sm"
                >
                  <option value="" disabled>Choose a store to list in...</option>
                  {userStores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-emerald-600" />
                </div>
              </div>
            ) : (
              <div className="p-5 bg-rose-50 border border-rose-100 text-rose-600 rounded-[20px] text-sm font-bold flex items-center gap-3">
                <Info size={18} className="shrink-0" />
                You need to create a store first before listing products.
              </div>
            )}
          </div>
        )}

        {/* Section 2: Basic Info */}
        <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Package size={16} />
            </div>
            <h3 className="text-xl font-black text-gray-900">Basic Information</h3>
          </div>

          <div className="space-y-2">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Product Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-gray-200 shadow-sm rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-lg text-gray-900 placeholder:text-gray-300"
              placeholder="e.g. Handwoven Kente Cloth"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-gray-200 shadow-sm rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-900 appearance-none"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-transparent border-t-gray-400" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Tags</label>
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="w-full px-5 py-4 bg-white border border-gray-200 shadow-sm rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-medium text-gray-900 placeholder:text-gray-400 pl-11"
                  placeholder="Type tag & press Enter"
                />
                <Tag size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tags.map(tag => (
                <span key={tag} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-emerald-100 shadow-sm">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="w-4 h-4 bg-emerald-200 text-emerald-800 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors">
                    <X size={10} strokeWidth={3} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-gray-200 shadow-sm rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all h-36 resize-none font-medium text-gray-800 placeholder:text-gray-300 leading-relaxed"
              placeholder="Tell buyers exactly what they will receive. Include dimensions, materials, and care instructions..."
            />
          </div>
        </div>

        {/* Section 3: Pricing & Inventory */}
        <div className="bg-slate-50/50 p-6 sm:p-8 rounded-[32px] border border-slate-100/60 space-y-6">
          <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              $
            </div>
            <h3 className="text-xl font-black text-gray-900">Pricing & Inventory</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 relative">
              <label className="block text-[11px] font-black text-emerald-600 uppercase tracking-widest pl-1">Price</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-black">{selectedStoreCurrency}</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full pl-16 pr-5 py-5 bg-emerald-50/50 border border-emerald-100 rounded-[20px] focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-black text-2xl text-gray-900 placeholder:text-emerald-200"
                  placeholder="0.00"
                />
              </div>

              {price && parseFloat(price) > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 p-4 bg-white rounded-[20px] border border-gray-200 shadow-sm space-y-3 overflow-hidden"
                >
                  <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                    <span className="flex items-center gap-1.5"><Info size={14}/> Platform Fee (1%)</span>
                    <span className="text-rose-500/80">
                      -<PriceDisplay 
                        amount={(() => {
                          const p = parseFloat(price);
                          let fee = p * 0.01;
                          if (fee < 0.10) fee = 0.10;
                          if (fee > 50) fee = 50;
                          return fee;
                        })()} 
                        sourceCountry={selectedStoreCurrency || 'Nigeria'} 
                        targetCountry={user?.user_metadata?.country}
                        className=""
                        showOriginalIfConverted={false}
                      />
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200/60">
                    <span className="uppercase tracking-wider text-[11px] font-black text-gray-500">Net Earnings</span>
                    <span className="text-sm font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-lg border border-emerald-200/50 shadow-sm">
                      <PriceDisplay 
                        amount={(() => {
                          const p = parseFloat(price);
                          let fee = p * 0.01;
                          if (fee < 0.10) fee = 0.10;
                          if (fee > 50) fee = 50;
                          return (p - fee);
                        })()} 
                        sourceCountry={selectedStoreCurrency || 'Nigeria'} 
                        targetCountry={user?.user_metadata?.country}
                        className=""
                        showOriginalIfConverted={false}
                      />
                    </span>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Stock Quantity</label>
                <div className="relative">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-gray-200 shadow-sm rounded-[20px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-gray-900 placeholder:text-gray-300 pr-16"
                    placeholder="0"
                  />
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black text-gray-300 uppercase pointer-events-none">Items</div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Inventory SKU</label>
                <input
                  required
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-gray-200 shadow-sm rounded-[20px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono font-bold text-gray-700 text-sm md:text-base placeholder:text-gray-300"
                  placeholder="e.g. HW-KENTE-001"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Media & Delivery */}
        <div className="bg-slate-50/50 p-6 sm:p-8 rounded-[32px] border border-slate-100/60 space-y-6">
          <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Upload size={16} />
            </div>
            <h3 className="text-xl font-black text-gray-900">Media & Shipping</h3>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1">Product Images <span className="text-gray-300 font-bold lowercase tracking-normal ml-1">(max 4)</span></label>
              <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">Square format best</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {previews.map((prev, idx) => (
                <div key={idx} className="aspect-square bg-white rounded-[24px] border border-gray-200 overflow-hidden relative group shadow-sm transition-transform hover:scale-[1.02]">
                  <img src={prev} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                  {idx === 0 && (
                    <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md shadow-sm">
                      Cover
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPreviews(p => p.filter((_, i) => i !== idx));
                      setFiles(f => f.filter((_, i) => i !== idx));
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm text-gray-900 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white shadow-sm hover:scale-110 active:scale-95"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              
              {previews.length < 4 && (
                <label className="aspect-square bg-white rounded-[24px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all font-bold text-gray-400 hover:text-emerald-600 shadow-sm group">
                  <div className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const selectedFiles = Array.from(e.target.files || []) as File[];
                      if (selectedFiles.length > 0) {
                        if (files.length + selectedFiles.length > 4) {
                          setUploadStatus('Maximum 4 images allowed.');
                          setTimeout(() => setUploadStatus(null), 3000);
                          return;
                        }
                        setFiles(prev => [...prev, ...selectedFiles]);
                        const newPreviews = selectedFiles.map(f => URL.createObjectURL(f));
                        setPreviews(prev => [...prev, ...newPreviews]);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            {uploadStatus && (
              <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="text-emerald-600 text-xs font-bold bg-emerald-50 p-3 rounded-xl inline-flex items-center gap-2 border border-emerald-100">
                 {uploadStatus.includes('Error') || uploadStatus.includes('Maximum') ? <X size={14} className="text-rose-500"/> : <Loader2 className="animate-spin" size={14} />}
                 <span className={uploadStatus.includes('Error') || uploadStatus.includes('Maximum') ? 'text-rose-600' : ''}>{uploadStatus}</span>
              </motion.div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-50">
            <div className="space-y-4">
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1">Shipping Settings</label>
              
              <button
                type="button"
                onClick={() => setDeliveryAvailable(!deliveryAvailable)}
                className={`w-full p-5 rounded-[24px] transition-all flex items-center justify-between border-2 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 ${
                  deliveryAvailable 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm' 
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${deliveryAvailable ? 'bg-emerald-500 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                    <Truck size={22} className={deliveryAvailable ? "translate-x-0.5 transition-transform" : ""} />
                  </div>
                  <div className="text-left">
                    <div className="font-black text-base">{deliveryAvailable ? 'Delivery is Available' : 'No Delivery'}</div>
                    <div className={`text-xs font-medium mt-0.5 ${deliveryAvailable ? 'text-emerald-600/80' : 'text-gray-400'}`}>
                      {deliveryAvailable ? 'Customers can order this for shipping' : 'In-store pickup only'}
                    </div>
                  </div>
                </div>
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm ${deliveryAvailable ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-300 text-transparent'}`}>
                  <Check size={16} strokeWidth={3} />
                </div>
              </button>

              <AnimatePresence>
                {deliveryAvailable && storeDeliveryInfo && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-[20px] flex md:items-center flex-col md:flex-row justify-between mt-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Info size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">Global Store Shipping Rules applied</p>
                          <p className="text-sm font-bold text-gray-800 mt-0.5">
                            {storeDeliveryInfo.time} delivery for 
                            <span className="text-emerald-600 ml-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              <PriceDisplay 
                                amount={storeDeliveryInfo.fee} 
                                sourceCountry={selectedStoreCurrency || 'Nigeria'} 
                                targetCountry={user?.user_metadata?.country}
                                className=""
                                showOriginalIfConverted={false}
                              />
                            </span>
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-100 self-start md:self-auto shrink-0">Default</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Floating Submit Action */}
        <div className="sticky bottom-4 z-20 pt-4">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-gray-50/80 to-transparent -top-12 -bottom-10 pointer-events-none" />
          <button
            disabled={submitting}
            type="submit"
            className="relative w-full h-16 bg-emerald-600 text-white rounded-[24px] font-black text-lg uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-[0_16px_32px_-12px_rgba(5,150,105,0.6)] flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:bg-emerald-600 hover:-translate-y-1 active:translate-y-0 group border border-emerald-500"
          >
            <div className="absolute inset-0 bg-emerald-400 mix-blend-overlay opacity-0 group-hover:opacity-20 transition-opacity rounded-[24px]" />
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>{uploadStatus?.includes('Error') ? 'Failed' : 'Processing...'}</span>
              </>
            ) : (
              <>
                {productToEdit ? <Check size={24} strokeWidth={2.5} /> : <Upload size={24} strokeWidth={2.5} />}
                <span>{productToEdit ? 'Update Listing' : 'Publish Product'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
