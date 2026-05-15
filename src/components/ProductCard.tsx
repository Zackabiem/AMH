import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Check, Heart, MapPin, Truck, Star, ChevronLeft, ChevronRight, Edit3, Trash2, Store } from 'lucide-react';
import PriceDisplay from './PriceDisplay';

const ProductCard = ({
  product,
  user,
  profile,
  cart,
  addToCart,
  setChatTarget,
  setActiveTab,
  toggleSaveProduct,
  savedItemIds,
  setViewingStoreId,
  setSelectedProduct,
  onEditProduct,
  onDeleteProduct,
  isStoreOwner
}: any) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = product.images?.length ? product.images : ['https://placehold.co/400x400?text=No+Image'];
  const [isHovered, setIsHovered] = useState(false);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const quantity = cart?.filter((item: any) => item.id === product.id).length || 0;
  const isAdded = quantity > 0;
  const isSaved = savedItemIds?.includes(product.id) || false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 flex flex-col relative"
    >
      {/* Image Container */}
      <div className="aspect-[4/5] bg-gray-50 relative overflow-hidden cursor-pointer" onClick={() => setSelectedProduct?.(product)}>
        <img 
          src={images[currentImageIndex]} 
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          referrerPolicy="no-referrer"
        />
        
        {/* Carousel Controls */}
        {images.length > 1 && (
          <>
            <AnimatePresence>
              {isHovered && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={prevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-800 shadow-sm hover:bg-white hover:scale-110 transition-all"
                >
                  <ChevronLeft size={18} />
                </motion.button>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {isHovered && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={nextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-gray-800 shadow-sm hover:bg-white hover:scale-110 transition-all"
                >
                  <ChevronRight size={18} />
                </motion.button>
              )}
            </AnimatePresence>
            
            {/* Dots */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_: any, idx: number) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Badges */}
        {(product.isPromoted || product.is_promoted) && (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2 py-1 bg-gray-900/90 backdrop-blur text-white text-[9px] font-bold uppercase tracking-wider rounded shadow-sm">
              Promoted
            </span>
          </div>
        )}

        {/* Action Buttons (Top Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {isStoreOwner && onEditProduct && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEditProduct(product);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-emerald-600 shadow-sm hover:bg-white transition-all active:scale-90"
              title="Edit Product"
            >
              <Edit3 size={14} />
            </button>
          )}
          {isStoreOwner && onDeleteProduct && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDeleteProduct(product);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-rose-500 shadow-sm hover:bg-white transition-all active:scale-90"
              title="Delete Product"
            >
              <Trash2 size={14} />
            </button>
          )}
          {user && profile?.active_role !== 'seller' && toggleSaveProduct && !isStoreOwner && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleSaveProduct(product.id);
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md shadow-sm transition-all active:scale-90 ${
                isSaved ? 'bg-rose-50 text-rose-500' : 'bg-white/90 text-gray-600 hover:bg-white hover:text-gray-900'
              }`}
            >
              <Heart size={14} fill={isSaved ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        {/* Floating Add to Cart Button */}
        {profile?.active_role !== 'seller' && addToCart && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            className={`absolute bottom-3 right-3 flex items-center justify-center w-10 h-10 rounded-full transition-all shadow-md active:scale-90 z-10 ${
              isAdded ? 'bg-emerald-500 text-white' : 'bg-white text-gray-900 hover:bg-emerald-500 hover:text-white'
            }`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={isAdded ? 'added' : 'not-added'}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isAdded ? <Check size={18} /> : <Plus size={18} />}
              </motion.div>
            </AnimatePresence>
            
            <AnimatePresence>
              {quantity > 0 && (
                <motion.span 
                  key={quantity}
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm"
                >
                  {quantity}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-1">
        <div className="flex justify-between items-start gap-2 cursor-pointer" onClick={() => setSelectedProduct?.(product)}>
          <h3 className="font-bold text-gray-900 line-clamp-1 text-sm group-hover:text-emerald-600 transition-colors">{product.title}</h3>
          <PriceDisplay 
            amount={product.price} 
            sourceCountry={product.currency || 'Nigeria'} 
            targetCountry={user?.user_metadata?.country}
            className="font-black text-gray-900 text-sm shrink-0"
          />
        </div>
        
        {/* Store Link */}
        {product.storeName && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setViewingStoreId?.(product.storeId);
            }}
            className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors w-fit mb-1"
          >
            <Store size={10} />
            <span>{product.storeName}</span>
          </button>
        )}
        
        <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 cursor-pointer" onClick={() => setSelectedProduct?.(product)}>
          <span className="flex items-center gap-1"><MapPin size={10} /> {product.location || 'Africa'}</span>
          <div className="flex items-center gap-2">
            {(product.deliveryAvailable || product.delivery_available) && (
              <span className="flex items-center gap-1 text-emerald-600"><Truck size={10} /></span>
            )}
            <span className="flex items-center gap-1"><Star size={10} className="text-amber-400" fill="currentColor" /> {product.rating ? Number(product.rating).toFixed(1) : '5.0'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
