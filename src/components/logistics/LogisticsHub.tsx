import React, { useState, useEffect } from 'react';
import { OpenLayersMap } from './OpenLayersMap';
import { supabase } from '../../lib/supabase';
import { Search, MapPin, Navigation, Truck, UserCircle, Star, Phone, Menu, X, ShieldCheck, Building2, Loader2, List } from 'lucide-react';
import { useAuth } from '../../App';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const COUNTRY_CENTERS: Record<string, {lat: number, lng: number}> = {
  "Nigeria": { lat: 9.0820, lng: 8.6753 },
  "South Africa": { lat: -30.5595, lng: 22.9375 },
  "Kenya": { lat: -0.0236, lng: 37.9062 },
  "Ghana": { lat: 7.9465, lng: -1.0232 },
  "Egypt": { lat: 26.8206, lng: 30.8025 },
  "Tanzania": { lat: -6.3690, lng: 34.8888 },
  "Uganda": { lat: 1.3733, lng: 32.2903 },
  "Rwanda": { lat: -1.9403, lng: 29.8739 },
  "Morocco": { lat: 31.7917, lng: -7.0926 },
  "Senegal": { lat: 14.4974, lng: -14.4524 },
};

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  const d = R * c; 
  return d;
}

export const LogisticsHub: React.FC = () => {
  const { profile } = useAuth() || {};
  const [tab, setTab] = useState<'dispatcher' | 'fleet'>('dispatcher');
  const [liveDrivers, setLiveDrivers] = useState<any[]>([]);
  const [mapMarkers, setMapMarkers] = useState<any[]>([]);
  const [pickup, setPickup] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [dropoff, setDropoff] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Filters and Driver Discovery
  const [vehicleFilter, setVehicleFilter] = useState<string>('Any Vehicle Type');
  const [radiusFilter, setRadiusFilter] = useState<number>(3);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Text-based fallback Search State for Dispatcher
  const [activeInput, setActiveInput] = useState<'pickup' | 'dropoff' | null>(null);
  const [searchQueryLocation, setSearchQueryLocation] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fleet state
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Listen to my transport requests to notify when a driver accepts
  useEffect(() => {
    if (!profile?.id) return;
    const requestChannel = supabase.channel(`passenger_requests_${profile.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'transport_requests',
        filter: `passenger_id=eq.${profile.id}`
      }, payload => {
        if (payload.new && payload.new.status === 'accepted' && payload.old.status !== 'accepted') {
           toast.success('Your driver has accepted the job and is on the way!', {
             duration: 8000,
             icon: '🚗'
           });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(requestChannel); };
  }, [profile?.id]);

  // Nominatim OpenStreetMap Geocoding (Professional, Free, Global including Africa)
  useEffect(() => {
    if (!searchQueryLocation || activeInput === null) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const q = encodeURIComponent(searchQueryLocation);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`);
        const data = await res.json();
        setSearchResults(data || []);
      } catch (err) {
        console.error('Geocoding error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [searchQueryLocation, activeInput]);

  // Fetch Drivers
  useEffect(() => {
    if (tab !== 'dispatcher') return;
    const fetchDrivers = async () => {
      const { data } = await supabase.from('live_drivers').select('*').eq('is_online', true);
      if (data) setLiveDrivers(data);
    };
    fetchDrivers();
    const channel = supabase.channel('live_drivers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_drivers', filter: 'is_online=eq.true' }, payload => {
        fetchDrivers();
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tab]);

  // Fetch Transport Companies
  useEffect(() => {
    if (tab !== 'fleet') return;
    let isMounted = true;
    const fetchTransporters = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('users').select('*').contains('roles', ['transporter']).eq('is_locked', false);
        if (data && isMounted) {
          setBusinesses(data.filter(b => b.business_name || b.roles?.includes('transporter')));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchTransporters();
    return () => { isMounted = false; };
  }, [tab]);

  // Derived state for map center
  const mapCenter = React.useMemo(() => {
    // If we just clicked a text search location, center on it
    if (activeInput === null && pickup && !dropoff) return { lat: pickup.lat, lng: pickup.lng };
    if (activeInput === null && dropoff) return { lat: dropoff.lat, lng: dropoff.lng };
    
    // Otherwise fallback to the user's country center, or default to general Africa
    if (profile?.country && COUNTRY_CENTERS[profile.country]) {
      return COUNTRY_CENTERS[profile.country];
    }
    
    // Default fallback to Nigeria if no country or country not in map
    return { lat: 9.0820, lng: 8.6753 };
  }, [pickup, dropoff, activeInput, profile?.country]);

  // Derived filtered drivers based on distance and vehicle type
  const filteredDrivers = React.useMemo(() => {
    let drivers = liveDrivers;
    
    // 1. Vehicle Type Filter
    if (vehicleFilter !== 'Any Vehicle Type') {
      drivers = drivers.filter(d => d.vehicle_type === vehicleFilter);
    }
    
    // 2. Geospatial Radius Filter (requires pickup point)
    if (pickup) {
      drivers = drivers.map(d => {
        const dist = getDistanceFromLatLonInKm(pickup.lat, pickup.lng, d.current_lat, d.current_lng);
        return { ...d, distance: dist };
      }).filter(d => d.distance <= radiusFilter)
      .sort((a, b) => a.distance - b.distance);
    }
    
    return drivers;
  }, [liveDrivers, vehicleFilter, radiusFilter, pickup]);

  // Map markers effect
  useEffect(() => {
    const updatedMarkers = filteredDrivers.map(d => ({
      id: d.id,
      lat: d.current_lat,
      lng: d.current_lng,
      type: 'driver',
      label: d.vehicle_type
    }));
    if (pickup) updatedMarkers.push({ id: 'pickup', lat: pickup.lat, lng: pickup.lng, type: 'pickup' });
    if (dropoff) updatedMarkers.push({ id: 'dropoff', lat: dropoff.lat, lng: dropoff.lng, type: 'dropoff' });
    setMapMarkers(updatedMarkers);
  }, [pickup, dropoff, filteredDrivers]);

  const handleMapClick = (lat: number, lng: number) => {
    if (tab !== 'dispatcher') return;
    if (!pickup) setPickup({ lat, lng, address: 'Pinned Location' });
    else if (!dropoff) setDropoff({ lat, lng, address: 'Pinned Location' });
    else { setPickup({ lat, lng, address: 'Pinned Location' }); setDropoff(null); }
    setIsSidebarOpen(true);
  };

  const selectLocation = (loc: any) => {
    // Nominatim returns lat and lon as strings
    const newLoc = { 
      lat: parseFloat(loc.lat), 
      lng: parseFloat(loc.lon), 
      address: loc.display_name.split(',')[0] // Use the primary location name
    };
    
    if (activeInput === 'pickup') {
      setPickup(newLoc);
    } else if (activeInput === 'dropoff') {
      setDropoff(newLoc);
    }
    setActiveInput(null);
    setSearchQueryLocation('');
    setSearchResults([]);
  };

  const requestRide = async () => {
    if (!pickup || !dropoff || !profile?.id || !selectedDriverId) return;
    
    setIsRequesting(true);
    try {
      const { error } = await supabase.from('transport_requests').insert({
        passenger_id: profile.id, driver_id: selectedDriverId,
        pickup_lat: pickup.lat, pickup_lng: pickup.lng, pickup_address: pickup.address,
        dropoff_lat: dropoff.lat, dropoff_lng: dropoff.lng, dropoff_address: dropoff.address,
        status: 'pending', agreed_price: 1500
      });
      if (error) throw error;
      toast.success('Job request sent! Waiting for driver to accept...');
      setPickup(null); setDropoff(null); setSelectedDriverId(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setIsRequesting(false);
    }
  };

  const filteredBusinesses = businesses.filter(b => 
    (b.business_name || b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.main_park_location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh-64px)] pb-24 md:pb-0 bg-white overflow-hidden relative">
      
      {/* Top Toggle Navigation - Floating at Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex border p-1 border-gray-100 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl w-[340px]">
        <button 
          onClick={() => setTab('dispatcher')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'dispatcher' ? 'bg-black text-white shadow-md transform scale-[1.02]' : 'text-gray-500 hover:text-black'}`}
        >
          Hire Dispatcher
        </button>
        <button 
          onClick={() => setTab('fleet')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'fleet' ? 'bg-black text-white shadow-md transform scale-[1.02]' : 'text-gray-500 hover:text-black'}`}
        >
          Travel Companies
        </button>
      </div>

      {tab === 'dispatcher' ? (
        <div className="flex-1 relative flex overflow-hidden">
          {/* Map Area */}
          <div className="flex-1 relative">
            <OpenLayersMap center={mapCenter} className="w-full h-full" markers={mapMarkers} onMapClick={handleMapClick} />
            
            <AnimatePresence>
              {!isSidebarOpen && (
                <motion.button 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setIsSidebarOpen(true)}
                  className="absolute top-20 left-4 z-20 w-12 h-12 bg-white rounded-2xl shadow-2xl border border-black/10 flex items-center justify-center text-gray-800 hover:bg-gray-50 transition-colors"
                >
                  <Menu size={24} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Collapsible Request Sidebar */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute left-0 top-0 bottom-0 z-20 w-full sm:w-[400px] bg-white border-r border-black/5 shadow-[20px_0_40px_-15px_rgba(0,0,0,0.1)] flex flex-col"
              >
                <div className="p-6 pt-24 pb-6 flex-1 overflow-y-auto refine-scrollbar">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-gray-900">Request Ride</h3>
                    <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-4 relative">
                     <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200" />

                     {/* Pickup Input Component */}
                     <div className="relative z-10">
                       <div 
                         onClick={() => { setActiveInput(activeInput === 'pickup' ? null : 'pickup'); setSearchQueryLocation(''); }}
                         className={`bg-white rounded-2xl border ${activeInput === 'pickup' ? 'border-emerald-500 shadow-md ring-2 ring-emerald-50' : 'border-gray-100 shadow-sm hover:border-emerald-500'} p-4 transition-all cursor-text`}
                       >
                          <div className="flex gap-4 items-center mb-1">
                             <div className="w-4 h-4 rounded-full bg-emerald-100 border-4 border-emerald-500 shrink-0" />
                             <p className="text-xs font-bold text-gray-400 tracking-wide uppercase flex-1">Pickup Location</p>
                          </div>
                          
                          {activeInput === 'pickup' ? (
                            <input 
                              autoFocus 
                              value={searchQueryLocation}
                              onChange={(e) => setSearchQueryLocation(e.target.value)}
                              placeholder="Where are you?" 
                              className="w-full pl-8 outline-none border-none text-sm font-bold text-gray-900 bg-transparent"
                            />
                          ) : (
                            <p className={`pl-8 text-sm font-bold truncate ${pickup ? 'text-gray-900' : 'text-gray-400'}`}>
                              {pickup ? pickup.address || `${pickup.lat.toFixed(4)}, ${pickup.lng.toFixed(4)}` : 'Tap to search or click map'}
                            </p>
                          )}
                       </div>
                       
                       {/* Dropdown for Pickup Search */}
                       <AnimatePresence>
                         {activeInput === 'pickup' && (
                           <motion.div 
                             initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                             className="absolute left-0 right-0 top-full mt-3 bg-white border border-gray-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden z-30"
                           >
                             <div className="max-h-[300px] overflow-y-auto refine-scrollbar">
                               {isSearching ? (
                                 <div className="p-6 flex flex-col items-center justify-center text-gray-400 gap-3 text-sm">
                                   <Loader2 size={24} className="animate-spin text-emerald-500" />
                                   <span className="font-medium">Finding exact location...</span>
                                 </div>
                               ) : searchResults.length > 0 ? (
                                 searchResults.map((loc, i) => {
                                   const parts = loc.display_name.split(',');
                                   const mainName = parts[0];
                                   const subName = parts.slice(1).join(',').trim();
                                   
                                   return (
                                     <button key={i} onClick={() => selectLocation(loc)} className="w-full text-left p-4 hover:bg-emerald-50/50 flex items-start gap-4 border-b border-gray-50 last:border-0 transition-colors group">
                                       <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                                          <MapPin size={16} className="text-gray-400 group-hover:text-emerald-600" />
                                       </div>
                                       <div className="flex flex-col pe-2">
                                         <span className="text-sm font-black text-gray-900 line-clamp-1">{mainName}</span>
                                         {subName && <span className="text-xs font-medium text-gray-500 line-clamp-1 mt-0.5">{subName}</span>}
                                       </div>
                                     </button>
                                   );
                                 })
                               ) : (
                                 <div className="p-3">
                                    {profile?.address && !searchQueryLocation && (
                                      <button 
                                        onClick={() => {
                                          setSearchQueryLocation(profile.address!);
                                        }}
                                        className="w-full text-left p-3 hover:bg-emerald-50 rounded-xl flex items-center gap-3 transition-colors border border-gray-100"
                                      >
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                          <UserCircle size={16} className="text-emerald-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-900">Use Profile Address</p>
                                          <p className="text-[10px] text-gray-500 line-clamp-1">{profile.address}</p>
                                        </div>
                                      </button>
                                    )}
                                    <div className="p-4 text-center text-sm text-gray-400 font-medium">
                                      {searchQueryLocation ? 'No map locations found.' : 'Start typing to search...'}
                                    </div>
                                 </div>
                               )}
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>

                     {/* Dropoff Input Component */}
                     <div className="relative z-0">
                       <div 
                         onClick={() => { setActiveInput(activeInput === 'dropoff' ? null : 'dropoff'); setSearchQueryLocation(''); }}
                         className={`bg-white rounded-2xl border ${activeInput === 'dropoff' ? 'border-orange-500 shadow-md ring-4 ring-orange-100' : 'border-gray-100 shadow-sm hover:border-orange-200'} p-4 transition-all cursor-text`}
                       >
                          <div className="flex gap-4 items-center mb-1.5">
                             <div className="w-4 h-4 rounded-sm bg-orange-100 border-4 border-orange-500 shrink-0" />
                             <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase flex-1">Drop-off Location</p>
                          </div>
                          
                          {activeInput === 'dropoff' ? (
                            <input 
                              autoFocus 
                              value={searchQueryLocation}
                              onChange={(e) => setSearchQueryLocation(e.target.value)}
                              placeholder="Where to?" 
                              className="w-full pl-8 outline-none border-none text-[15px] font-bold text-gray-900 bg-transparent placeholder-gray-300"
                            />
                          ) : (
                            <p className={`pl-8 text-[15px] font-bold truncate ${dropoff ? 'text-gray-900' : 'text-gray-400'}`}>
                              {dropoff ? dropoff.address || `${dropoff.lat.toFixed(4)}, ${dropoff.lng.toFixed(4)}` : 'Tap to search or click map'}
                            </p>
                          )}
                       </div>

                       {/* Dropdown for Dropoff Search */}
                       <AnimatePresence>
                         {activeInput === 'dropoff' && (
                           <motion.div 
                             initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                             className="absolute left-0 right-0 top-full mt-3 bg-white border border-gray-100 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] rounded-2xl overflow-hidden z-30"
                           >
                             <div className="max-h-[300px] overflow-y-auto refine-scrollbar">
                               {isSearching ? (
                                 <div className="p-6 flex flex-col items-center justify-center text-gray-400 gap-3 text-sm">
                                   <Loader2 size={24} className="animate-spin text-orange-500" />
                                   <span className="font-medium">Finding exact location...</span>
                                 </div>
                               ) : searchResults.length > 0 ? (
                                 searchResults.map((loc, i) => {
                                   const parts = loc.display_name.split(',');
                                   const mainName = parts[0];
                                   const subName = parts.slice(1).join(',').trim();
                                   
                                   return (
                                     <button key={i} onClick={() => selectLocation(loc)} className="w-full text-left p-4 hover:bg-orange-50/50 flex items-start gap-4 border-b border-gray-50 last:border-0 transition-colors group">
                                       <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-orange-100 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                                          <Navigation size={16} className="text-gray-400 group-hover:text-orange-600" />
                                       </div>
                                       <div className="flex flex-col pe-2">
                                         <span className="text-sm font-black text-gray-900 line-clamp-1">{mainName}</span>
                                         {subName && <span className="text-xs font-medium text-gray-500 line-clamp-1 mt-0.5">{subName}</span>}
                                       </div>
                                     </button>
                                   );
                                 })
                               ) : (
                                 <div className="p-3">
                                    {profile?.address && !searchQueryLocation && (
                                      <button 
                                        onClick={() => setSearchQueryLocation(profile.address!)}
                                        className="w-full text-left p-3 hover:bg-orange-50 rounded-xl flex items-center gap-3 transition-colors border border-gray-100"
                                      >
                                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                          <UserCircle size={16} className="text-orange-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold text-gray-900">Use Profile Address</p>
                                          <p className="text-[10px] text-gray-500 line-clamp-1">{profile.address}</p>
                                        </div>
                                      </button>
                                    )}
                                    <div className="p-4 text-center text-sm text-gray-400 font-medium">
                                      {searchQueryLocation ? 'No map locations found.' : 'Start typing to search...'}
                                    </div>
                                 </div>
                               )}
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                  </div>

                  {/* Backdrop to close active inputs */}
                  {activeInput && (
                    <div onClick={() => setActiveInput(null)} className="fixed inset-0 z-0 bg-transparent" />
                  )}

                  {/* Filter & Discovery Section */}
                  <div className="mt-8 space-y-4">
                    <div className="flex gap-2 relative z-0">
                      <select 
                        value={vehicleFilter}
                        onChange={(e) => setVehicleFilter(e.target.value)}
                        className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-emerald-500"
                      >
                        <option value="Any Vehicle Type">Any Vehicle</option>
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Standard Car">Standard Car</option>
                        <option value="Mini-Van">Mini-Van</option>
                        <option value="Open Bucket">Open Bucket</option>
                        <option value="Flatbed Truck">Flatbed Truck</option>
                      </select>

                      <select 
                        value={radiusFilter}
                        onChange={(e) => setRadiusFilter(Number(e.target.value))}
                        className="w-24 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-emerald-500"
                      >
                        <option value={1}>1 km</option>
                        <option value={2}>2 km</option>
                        <option value={3}>3 km</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between px-2 pt-2 border-b border-gray-100 pb-2">
                       <span className="text-xs font-black tracking-widest text-gray-400 uppercase">Available Dispatchers</span>
                       <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{filteredDrivers.length} Found</span>
                    </div>

                    {/* Driver List */}
                    <div className="space-y-3 pt-2 max-h-[25vh] overflow-y-auto refine-scrollbar pe-2 pb-4">
                      {filteredDrivers.length > 0 ? (
                        filteredDrivers.map((driver) => (
                          <div 
                            key={driver.id} 
                            onClick={() => setSelectedDriverId(driver.id)}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                              selectedDriverId === driver.id ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 w-3/4">
                              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                                <UserCircle size={20} />
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-black text-gray-900 line-clamp-1">{driver.full_name || 'Verified Driver'}</p>
                                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider line-clamp-1">{driver.vehicle_type || 'Vehicle'}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                               <div className="flex items-center gap-1 justify-end text-amber-500 text-xs font-black">
                                 <Star size={12} className="fill-current" /> 4.9
                               </div>
                               {driver.distance !== undefined && (
                                 <p className="text-[10px] font-bold text-gray-400 mt-1">{driver.distance.toFixed(1)} km away</p>
                               )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                          <Truck size={24} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-gray-500 font-medium text-sm">No dispatchers found.</p>
                          <p className="text-gray-400 text-xs mt-1">Try expanding radius or changing vehicle.</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)] z-10 relative shrink-0">
                  <button 
                    disabled={!pickup || !dropoff || isRequesting || !selectedDriverId}
                    onClick={requestRide}
                    className="w-full py-4 bg-black text-white rounded-2xl font-black hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isRequesting ? <Loader2 className="animate-spin" size={20} /> : <Truck size={20} />}
                    {!pickup ? 'Enter Pickup Location' : !dropoff ? 'Enter Drop-off Location' : !selectedDriverId ? 'Select a Dispatcher' : 'Send Job Request'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      ) : (
        <div className="flex-1 overflow-y-auto w-full bg-gray-50">
          <div className="max-w-7xl mx-auto w-full p-6 pt-24">
            
            {/* Travel Companies Header */}
            <div className="bg-emerald-900 rounded-[40px] p-8 md:p-12 text-white mb-12 relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <h2 className="text-4xl md:text-5xl font-black mb-4">Find Travel Companies</h2>
                <p className="text-emerald-100 text-lg md:text-xl max-w-xl mb-8">Search trusted transport operators, view schedules, and book trips across Africa.</p>

                <div className="flex flex-col md:flex-row gap-4 bg-white/10 backdrop-blur-md p-2 rounded-3xl border border-white/20 max-w-3xl">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white/10 rounded-2xl">
                    <MapPin size={20} className="text-emerald-200" />
                    <input type="text" placeholder="Search for routes, companies, or terminals..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent border-none focus:ring-0 text-white placeholder-emerald-200 w-full outline-none font-medium" />
                  </div>
                  <button className="px-8 py-4 bg-white text-emerald-900 rounded-2xl font-black hover:bg-emerald-50 transition-colors shadow-lg active:scale-95">Search</button>
                </div>
              </div>
              <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-emerald-800 rounded-full blur-3xl opacity-50 pointer-events-none" />
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-[40px] border border-black/5 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                  <Building2 size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">No Transport Companies Found</h3>
                <p className="text-gray-500 font-medium">We couldn't find any registered travel companies matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBusinesses.map((business) => (
                  <motion.div
                    key={business.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -5 }}
                    className="group bg-white border border-black/5 rounded-[32px] overflow-hidden hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] hover:border-emerald-500/30 transition-all duration-300"
                  >
                    <div className="h-36 bg-emerald-50 relative">
                      {business.business_logo_url ? (
                        <img src={business.business_logo_url} alt={business.business_name || business.name} className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-50" />
                      )}
                      
                      {/* Verification Badge */}
                      {business.verification_status === 'verified' && (
                        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-emerald-700 shadow-sm border border-emerald-100">
                          <ShieldCheck size={14} className="text-emerald-500" />
                          Verified
                        </div>
                      )}

                      <div className="absolute -bottom-10 left-6">
                        <div className="w-20 h-20 bg-white rounded-[20px] p-1 shadow-lg border border-black/5 z-10 relative">
                          {business.photo_url || business.business_logo_url ? (
                            <img src={business.business_logo_url || business.photo_url} alt="Profile" className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className="w-full h-full bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                              <Building2 size={32} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-14">
                      <div className="mb-4">
                        <h3 className="text-xl font-black text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-1 mb-1">
                          {business.business_name || business.name}
                        </h3>
                        <p className="text-gray-500 text-sm font-medium">Interstate Travel & Fleet Services</p>
                      </div>

                      <div className="flex items-center gap-4 mb-6">
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 bg-amber-50 px-3 py-1.5 rounded-xl">
                          <Star size={16} className="text-amber-500 fill-amber-500" /> {business.rating || '4.8'}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 bg-gray-50 px-3 py-1.5 rounded-xl border border-black/5">
                          <Truck size={16} className="text-gray-500" /> {business.fleet_size || '10+'} Vehicles
                        </div>
                      </div>

                      <div className="pt-6 border-t border-gray-100 flex gap-3">
                        <button className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-black/5">
                          <Phone size={16} /> Contact
                        </button>
                        <button className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-emerald-100 active:scale-95">
                          View Routes
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
