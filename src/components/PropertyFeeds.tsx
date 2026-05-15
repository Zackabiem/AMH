import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, MapPin, DollarSign, Plus, X, Loader2, Search, Filter, Building2, LandPlot, Store, Lock, ShieldCheck, Star, ArrowRight, UserCircle, Map as MapIcon, List, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import imageCompression from 'browser-image-compression';
import { formatPrice } from '../lib/currency';
import PriceDisplay from './PriceDisplay';
import { OpenLayersMap } from './logistics/OpenLayersMap';

interface Property {
  id: string;
  owner_id: string;
  title: string;
  location: string;
  price: number;
  type: string;
  image_url: string;
  description: string;
  features: string[];
  owner_is_locked: boolean;
  created_at: any;
  lat?: number;
  lng?: number;
  owner?: {
    display_name?: string;
    username?: string;
    photo_url?: string;
    verification_status?: string;
  };
}

interface Agency {
  id: string;
  display_name?: string;
  username?: string;
  photo_url?: string;
  rating?: number;
}

const PropertyFeeds: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isCacheHit, setIsCacheHit] = useState<boolean | null>(null);
  const { user, profile } = useAuth() || {};

  const propertyTypes = ['All', 'Warehouse', 'Land', 'Office', 'Retail', 'Residential'];

  const handleWhatsAppContact = (property: Property) => {
    const phone = property.owner?.username ? '+2348000000000' : '+2348000000000'; // Defaulting for demo
    const message = `Hi ${property.owner?.display_name || property.owner?.username || 'Agent'}, I found your listing "${property.title}" on African Market Hub. Is it still available for inspection?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  useEffect(() => {
    let isMounted = true;
    const cacheKey = `propertyFeeds-${selectedType}-${searchQuery}`;

    const fetchData = async (retryCount = 0) => {
      // Show loading indicator early if not already loaded from local cache
      const localCache = sessionStorage.getItem(cacheKey);
      if (!localCache && properties.length === 0) setLoading(true);

      try {
        // Query params for Redis optimized API
        const queryParams = new URLSearchParams();
        if (selectedType !== 'All') queryParams.append('category', selectedType);
        if (searchQuery) queryParams.append('search', searchQuery);
        queryParams.append('limit', '50'); // You can adjust

        const url = `/api/estate-data?${queryParams.toString()}`;
        
        let propData: Property[] = [];
        let _isCacheHit = false;

        try {
          const res = await fetch(url);
          if (res.ok) {
            const result = await res.json();
            propData = result.properties as Property[];
            _isCacheHit = result.cached;
          } else {
             throw new Error('API route failed, falling back to direct db');
          }
        } catch (apiError) {
          console.warn('API error, falling back to direct DB fetch:', apiError);
          // Fallback direct DB fetch Properties with Owner info
          let query = supabase
            .from('properties')
            .select(`
              *,
              owner:owner_id (
                display_name,
                username,
                photo_url
              )
            `)
            .eq('owner_is_locked', false);
            
          if (selectedType !== 'All') {
            query = query.eq('type', selectedType);
          }
          if (searchQuery) {
            query = query.or(`title.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`);
          }

          const { data, error: propError } = await query
            .order('created_at', { ascending: false })
            .limit(50);
            
          if (propError) throw propError;
          propData = data as any;
        }

        // Fetch Verified Agencies (direct DB is fine for agencies as it's small)
        const { data: agencyData, error: agencyError } = await supabase
          .from('users')
          .select('id, display_name, username, photo_url')
          .contains('roles', ['property_owner'])
          .limit(10);

        if (agencyError) throw agencyError;

        if (isMounted) {
          setProperties(propData || []);
          setAgencies(agencyData || []);
          setIsCacheHit(_isCacheHit);
          setLoading(false);
          // Update local cache for immediate subsequent loads
          sessionStorage.setItem(cacheKey, JSON.stringify(propData));
        }
      } catch (error: any) {
        if (retryCount < 3 && (error.message?.includes('fetch') || error.message?.includes('Lock'))) {
          setTimeout(() => fetchData(retryCount + 1), 1000);
          return;
        }
        if (isMounted) {
          console.error('Error fetching properties data:', error);
          setLoading(false);
          // Fallback to local cache if offline
          if (localCache) {
             setProperties(JSON.parse(localCache));
             setIsCacheHit(true);
          }
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [selectedType, searchQuery]);

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.owner?.username?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'All' || p.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'warehouse': return <Building2 size={20} />;
      case 'land': return <LandPlot size={20} />;
      case 'retail': return <Store size={20} />;
      default: return <Home size={20} />;
    }
  };

  return (
    <div className="p-6 pb-24 md:pb-6 max-w-7xl mx-auto">
      <header className="mb-4 md:mb-8">
        <div className="flex justify-end items-center mb-8 gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            {isCacheHit !== null && (
              <div className={`hidden md:flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                isCacheHit ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isCacheHit ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`} />
                {isCacheHit ? 'Redis Optimized' : 'Direct Sync'}
              </div>
            )}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
               <button 
                 onClick={() => setViewMode('list')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
               >
                 <List size={16} /> List
               </button>
               <button 
                 onClick={() => setViewMode('map')}
                 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
               >
                 <MapIcon size={16} /> Map
               </button>
            </div>
            {profile?.active_role === 'property_owner' && (
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigateToDashboard'))}
                className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                List Property
              </button>
            )}
          </div>
        </div>

        {/* Verified Agencies Spotlight */}
        {!loading && agencies.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                Verified Agencies
              </h3>
              <button className="text-xs font-bold text-emerald-600 hover:underline">View All Agencies</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
              {agencies.map((agency) => (
                <motion.div
                  key={agency.id}
                  whileHover={{ y: -5 }}
                  className="flex-shrink-0 w-64 bg-white p-6 rounded-[32px] border border-black/5 shadow-sm hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl overflow-hidden border border-black/5 flex items-center justify-center">
                      {agency.photo_url ? (
                        <img src={agency.photo_url} alt={agency.username || agency.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 size={24} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-gray-900 truncate group-hover:text-emerald-600 transition-colors">{agency.username || agency.display_name}</h4>
                      <div className="flex items-center gap-1">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span className="text-[10px] font-black text-gray-500">{agency.rating || '4.9'}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('navigateToPropertyAgency', { detail: { agencyId: agency.id } }))}
                    className="w-full py-2 bg-gray-50 text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all"
                  >
                    View Listings
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 relative z-20">
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Search by location, title, or agency..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border border-black/5 rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {propertyTypes.map(pt => (
              <button
                key={pt}
                onClick={() => setSelectedType(pt)}
                className={`px-6 py-4 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                  selectedType === pt 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                    : 'bg-white text-gray-500 border border-black/5 hover:bg-gray-50'
                }`}
              >
                {pt}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-[400px] relative overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
             <Loader2 className="animate-spin text-emerald-600" size={40} />
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white rounded-[40px] border border-black/5">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8">
              <Home size={48} />
            </div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">No properties found</h3>
            <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">Try adjusting your search or filters to find the perfect space for your needs.</p>
          </div>
        ) : viewMode === 'map' ? (
          /* MAP VIEW */
          <div className="w-full h-full rounded-[32px] overflow-hidden border border-gray-200 shadow-inner relative flex mb-12">
             <div className="flex-1 h-full bg-gray-100 relative min-h-[500px]">
               <OpenLayersMap center={{lat: 9.082, lng: 8.6753}} zoom={12} markers={filteredProperties.filter(p => p.lat && p.lng).map((p, i) => ({ id: p.id, lat: Number(p.lat), lng: Number(p.lng), type: 'pickup', label: p.type }))} className="w-full h-full" />
             </div>
             
             {/* Map Side Panel */}
             <div className="hidden md:flex w-96 flex-col bg-white/95 backdrop-blur-md border-l border-gray-200 shadow-2xl h-full min-h-[500px] z-10 overflow-y-auto refine-scrollbar">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                   <p className="font-bold text-sm text-gray-600">{filteredProperties.length} active listings found</p>
                </div>
                <div className="p-4 space-y-4">
                  {filteredProperties.map(prop => (
                    <div key={prop.id} className="bg-white border text-left border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col">
                       <div className="h-40 bg-gray-200 relative overflow-hidden">
                          {prop.image_url ? (
                            <img src={prop.image_url} alt={prop.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                              <Home size={32} className="mb-2 opacity-50" />
                            </div>
                          )}
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black shadow-sm flex items-center gap-1.5">
                            {getTypeIcon(prop.type)} {prop.type}
                          </div>
                       </div>
                       <div className="p-4">
                          <h4 className="font-black text-gray-900 line-clamp-1 mb-1">{prop.title}</h4>
                          <p className="text-gray-500 text-xs flex items-center gap-1 mb-3">
                            <MapPin size={12} /> <span className="line-clamp-1">{prop.location}</span>
                          </p>
                          <div className="flex items-center justify-between mt-auto">
                            <div className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-black shrink-0">
                               <PriceDisplay amount={prop.price} />
                            </div>
                            <button 
                              onClick={() => handleWhatsAppContact(prop)}
                              className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                            >
                              Message
                            </button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        ) : (
          /* LIST VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
            {filteredProperties.map((prop) => (
              <motion.div
                key={prop.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[48px] overflow-hidden border border-black/5 group cursor-pointer hover:shadow-2xl transition-all duration-700 flex flex-col"
              >
                <div className="h-72 bg-gray-50 relative overflow-hidden">
                  <img 
                    src={prop.image_url} 
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-md px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-2">
                    {getTypeIcon(prop.type)}
                    {prop.type}
                  </div>
                  {prop.owner?.verification_status === 'verified' && (
                    <div className="absolute top-8 right-8 bg-emerald-600 text-white p-2 rounded-xl shadow-lg">
                      <ShieldCheck size={16} />
                    </div>
                  )}
                  <div className="absolute bottom-8 right-8">
                    <div className="bg-white text-gray-900 px-6 py-2 rounded-2xl font-black text-lg shadow-lg flex items-baseline gap-1">
                      <PriceDisplay 
                        amount={prop.price} 
                        sourceCountry={/* We assume prop DB would have owner.country eventually */ 'Nigeria'} 
                        targetCountry={profile?.country}
                        className=""
                        originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-2"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-10 flex-1 flex flex-col">
                  <div 
                    className="flex items-center gap-3 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigateToPropertyAgency', { detail: { agencyId: prop.owner_id } }))}
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-black/5">
                      {prop.owner?.photo_url ? (
                        <img src={prop.owner.photo_url} alt={prop.owner.username || prop.owner.display_name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600">
                          <UserCircle size={16} />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      {prop.owner?.username || prop.owner?.display_name}
                    </span>
                  </div>

                  <h3 className="text-2xl font-black mb-4 group-hover:text-emerald-600 transition-colors line-clamp-1">{prop.title}</h3>
                  
                  <div className="flex items-center gap-2 text-gray-500 mb-6">
                    <MapPin size={18} className="text-emerald-500" />
                    <span className="text-sm font-bold uppercase tracking-widest">{prop.location}</span>
                  </div>
                  
                  <p className="text-gray-500 text-sm line-clamp-2 mb-8 leading-relaxed flex-1">{prop.description || 'No description provided.'}</p>
                  
                  <div className="flex justify-between items-center pt-8 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <Star size={16} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black text-gray-900">4.9</span>
                      <span className="text-[10px] text-gray-400 font-bold">(24 Reviews)</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleWhatsAppContact(prop); }} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-100 transition-all text-sm">
                      Message
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyFeeds;
