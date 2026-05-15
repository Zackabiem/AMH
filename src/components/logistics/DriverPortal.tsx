import React, { useState, useEffect } from 'react';
import { OpenLayersMap } from './OpenLayersMap';
import { supabase } from '../../lib/supabase';
import { Power, MapPin, Navigation, Truck, BellRing } from 'lucide-react';
import { useAuth } from '../../App';
import { toast } from 'sonner';

export const DriverPortal: React.FC = () => {
  const { profile } = useAuth() || {};
  const [driverRef, setDriverRef] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number}>({ lat: 6.5244, lng: 3.3792 }); // Lagos default
  const [incomingRequest, setIncomingRequest] = useState<any>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const setupDriver = async () => {
      // 1. Find or create the driver row in live_drivers
      const { data: existing, error } = await supabase
        .from('live_drivers')
        .select('*')
        .eq('user_id', profile.id)
        .single();

      if (existing) {
        setDriverRef(existing);
        setIsOnline(existing.is_online);
      } else {
        // Mock a driver creation
        const { data: newDriver } = await supabase
          .from('live_drivers')
          .insert({
            user_id: profile.id,
            vehicle_type: 'Car',
            vehicle_plate: 'XYZ-123',
            is_online: false,
            current_lat: currentLocation.lat,
            current_lng: currentLocation.lng
          })
          .select()
          .single();
        
        if (newDriver) {
          setDriverRef(newDriver);
        }
      }
    };
    setupDriver();
  }, [profile?.id]);

  // Listen for ride requests
  useEffect(() => {
    if (!driverRef?.id || !isOnline) return;

    const reqChannel = supabase.channel(`driver_requests_${driverRef.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'transport_requests',
        filter: `driver_id=eq.${driverRef.id}`
      }, payload => {
        setIncomingRequest(payload.new);
        
        // Play notification sound (simulated UI popup for now)
        toast.custom((t) => (
          <div className="bg-emerald-600 text-white p-4 rounded-2xl flex items-center gap-3">
             <BellRing className="animate-bounce" />
             <div>
               <p className="font-bold">New Ride Request!</p>
               <p className="text-sm">Passenger is waiting nearby.</p>
             </div>
          </div>
        ), { duration: 10000 });
      })
      .subscribe();

    return () => { supabase.removeChannel(reqChannel); };
  }, [driverRef?.id, isOnline]);

  const toggleOnline = async () => {
    if (!driverRef) return;
    
    if (!isOnline) {
      if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition(
           (pos) => setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
           (err) => console.warn('No GPS, using default location', err)
         );
      }
      
      try {
        await supabase
          .from('live_drivers')
          .update({ 
            is_online: true,
            current_lat: currentLocation.lat,
            current_lng: currentLocation.lng,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', driverRef.id);
        
        setIsOnline(true);
        toast.success('You are now Online!');
      } catch (e) {
        toast.error('Failed to update status');
      }
      return;
    }

    try {
      await supabase
        .from('live_drivers')
        .update({ 
          is_online: false,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', driverRef.id);
      
      setIsOnline(false);
      toast.success('You went Offline.');
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  const acceptRequest = async () => {
    if (!incomingRequest) return;
    await supabase.from('transport_requests').update({ status: 'accepted' }).eq('id', incomingRequest.id);
    toast.success('Job Accepted! Please proceed to pickup.');
    setIncomingRequest(null); // In reality we move this to active job view
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-150px)] rounded-[40px] overflow-hidden flex flex-col md:flex-row shadow-sm border border-black/5 bg-white relative">
       
       {/* Sidebar UI */}
       <div className="w-full md:w-96 bg-white border-r border-gray-100 flex flex-col relative z-20">
         <div className="p-8 pb-4">
           <h2 className="text-2xl font-black mb-1">Driver Portal</h2>
           <p className="text-gray-500 font-medium text-sm">Manage your deliveries and rides.</p>
         </div>

         {/* The Big Toggle */}
         <div className="p-8 pt-4 flex flex-col items-center">
            <button 
              onClick={toggleOnline}
              className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-3 transition-all transform active:scale-95 shadow-2xl ${
                isOnline 
                  ? 'bg-emerald-500 text-white shadow-emerald-200 border-4 border-emerald-400' 
                  : 'bg-gray-100 text-gray-400 shadow-gray-200 border-4 border-white'
              }`}
            >
              <Power size={48} />
              <span className="font-black tracking-widest uppercase">{isOnline ? 'Online' : 'Go Online'}</span>
            </button>
            <p className={`mt-6 text-sm font-bold ${isOnline ? 'text-emerald-600' : 'text-gray-400'}`}>
              {isOnline ? 'Listening for requests...' : 'You are currently offline.'}
            </p>
         </div>

         <div className="flex-1 bg-gray-50 p-6 rounded-t-3xl">
           <h3 className="font-bold text-gray-900 mb-4">Today's Earnings</h3>
           <div className="bg-white p-4 rounded-2xl shadow-sm">
              <p className="text-3xl font-black">₦0</p>
              <p className="text-sm font-medium text-gray-500">0 trips completed</p>
           </div>
         </div>
       </div>

       {/* Map View */}
       <div className="flex-1 relative z-10">
         <OpenLayersMap 
           className="w-full h-full"
           markers={[{ id: 'me', ...currentLocation, type: 'driver', label: 'You' }]}
           center={currentLocation}
           zoom={15}
         />

         {/* Incoming Request Popup OVERLAY */}
         {incomingRequest && (
           <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white rounded-[32px] p-6 shadow-2xl border-4 border-emerald-500 animate-in slide-in-from-top fade-in">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-black text-gray-900">New Request!</h3>
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 animate-pulse">
                  <BellRing size={20} />
                </div>
              </div>
              <div className="space-y-3 mb-6">
                 <div className="flex items-center gap-3">
                   <MapPin className="text-amber-500" size={16} />
                   <p className="text-sm font-bold truncate">Pick-up: Lat {incomingRequest.pickup_lat.toFixed(4)}, Lng {incomingRequest.pickup_lng.toFixed(4)}</p>
                 </div>
                 <div className="flex items-center gap-3">
                   <Navigation className="text-emerald-500" size={16} />
                   <p className="text-sm font-bold truncate">Drop-off: Lat {incomingRequest.dropoff_lat.toFixed(4)}, Lng {incomingRequest.dropoff_lng.toFixed(4)}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setIncomingRequest(null)} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">Decline</button>
                 <button onClick={acceptRequest} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200">Accept</button>
              </div>
           </div>
         )}
       </div>
    </div>
  );
};
