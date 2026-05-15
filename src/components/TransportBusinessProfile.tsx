import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Truck, 
  MapPin, 
  Phone, 
  Globe, 
  ShieldCheck, 
  Star, 
  ArrowLeft, 
  Navigation, 
  Calendar,
  MessageSquare,
  Share2,
  Info,
  X,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TransportBusinessProfileProps {
  businessId: string;
  onBack: () => void;
  onContact: (userId: string, userName: string) => void;
}

interface BusinessData {
  id: string;
  name: string;
  email: string;
  phone: string;
  business_name?: string;
  business_description?: string;
  business_logo_url?: string;
  business_address?: string;
  main_park_location?: string;
  primary_routes?: string[];
  fleet_size?: number;
  verification_status?: string;
  rating?: number;
  vehicle_photo_url?: string;
}

const TransportBusinessProfile: React.FC<TransportBusinessProfileProps> = ({ businessId, onBack, onContact }) => {
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', businessId)
          .single();

        if (error) throw error;
        
        // Map user fields to business profile fields if needed
        const mappedBusiness = {
          ...data,
          name: data.business_name || data.name,
          description: data.business_description || data.description || 'Verified transport company providing reliable logistics and passenger services.',
          parkLocation: data.main_park_location || data.business_address || 'Main Terminal',
          logoUrl: data.business_logo_url || data.photo_url,
          rating: data.rating || 4.8,
          reviewCount: data.review_count || 124,
          fleetSize: data.fleet_size || 15,
          verificationStatus: data.verification_status || 'verified',
          primaryRoutes: data.primary_routes || ['Lagos - Abuja', 'Lagos - Port Harcourt', 'Abuja - Kano'],
          amenities: data.amenities || ['Air Conditioning', 'Charging Ports', 'Professional Drivers', 'Real-time Tracking']
        };
        
        setBusiness(mappedBusiness);
      } catch (error) {
        console.error('Error fetching business profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [businessId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6 text-gray-400">
          <Info size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Business Not Found</h2>
        <p className="text-gray-500 mb-8">The transport business you're looking for doesn't exist or has been removed.</p>
        <button onClick={onBack} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all">
          Back to Discovery
        </button>
      </div>
    );
  }

  const handleConfirmBooking = () => {
    if (!agreedToTerms) return;
    setIsBookingModalOpen(false);
    onContact(business.id, business.business_name || business.name);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 bg-emerald-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=2075&auto=format&fit=crop')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-900 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-6 h-full flex flex-col justify-between py-8 relative z-10">
          <button 
            onClick={onBack}
            className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex flex-col md:flex-row items-end gap-6">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[40px] p-2 shadow-2xl border-4 border-white/20 overflow-hidden shrink-0">
              {business.business_logo_url ? (
                <img src={business.business_logo_url} alt={business.business_name} className="w-full h-full object-cover rounded-[32px]" />
              ) : (
                <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-600 rounded-[32px]">
                  <Truck size={48} />
                </div>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  {business.business_name || business.name}
                </h1>
                {business.verification_status === 'verified' && (
                  <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                    <ShieldCheck size={20} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-emerald-100/80 font-bold text-sm">
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-emerald-400" />
                  {business.main_park_location || business.business_address || 'Location not specified'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                  {business.rating || '4.8'} (120+ Reviews)
                </div>
              </div>
            </div>
            <div className="flex gap-3 pb-2 w-full md:w-auto">
              <button 
                onClick={() => setIsBookingModalOpen(true)}
                className="flex-1 md:flex-none px-8 py-4 bg-white text-emerald-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <Truck size={18} />
                Request Transporter
              </button>
              <button 
                onClick={() => onContact(business.id, business.business_name || business.name)}
                className="w-14 h-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all"
              >
                <MessageSquare size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Info className="text-emerald-600" size={24} />
                About the Business
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <p className="text-gray-600 text-lg leading-relaxed bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                  {business.business_description || "This transport company provides reliable logistics and passenger transport services across major routes. Committed to safety, efficiency, and customer satisfaction."}
                </p>
                {business.vehicle_photo_url && (
                  <div className="bg-white p-4 rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Primary Vehicle</p>
                    <img 
                      src={business.vehicle_photo_url} 
                      alt="Transporter Vehicle" 
                      className="w-full h-48 object-cover rounded-2xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Navigation className="text-emerald-600" size={24} />
                Primary Routes & Parks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(business.primary_routes || ['Lagos - Abuja', 'Nairobi - Mombasa', 'Accra - Kumasi']).map((route, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <Navigation size={20} />
                      </div>
                      <div>
                        <p className="font-black text-gray-900">{route}</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Daily Departures</p>
                      </div>
                    </div>
                    <ArrowLeft className="rotate-180 text-gray-300 group-hover:text-emerald-500 transition-all" size={20} />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Star className="text-emerald-600" size={24} />
                Recent Reviews
              </h2>
              <div className="space-y-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full" />
                        <div>
                          <p className="font-bold text-gray-900">John Doe</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} className="text-amber-400 fill-amber-400" />)}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">2 days ago</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      "Excellent service! The park was clean, and the vehicle left exactly on time. Highly recommended for long-distance travel."
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar Info */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-xl sticky top-24">
              <h3 className="text-xl font-black text-gray-900 mb-8">Business Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                    <p className="font-bold text-gray-900">{business.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Website</p>
                    <p className="font-bold text-emerald-600">www.{business.business_name?.toLowerCase().replace(/\s+/g, '') || 'transport'}.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Member Since</p>
                    <p className="font-bold text-gray-900">January 2024</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
                    <Truck size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fleet Size</p>
                    <p className="font-bold text-gray-900">{business.fleet_size || 10}+ Vehicles</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-50">
                <button 
                  onClick={() => setIsBookingModalOpen(true)}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <Truck size={18} />
                  Request Booking
                </button>
              </div>
            </div>

            <div className="bg-emerald-900 p-8 rounded-[40px] text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <h4 className="text-lg font-black mb-2 relative z-10">Verified Business</h4>
              <p className="text-emerald-100/70 text-sm leading-relaxed mb-6 relative z-10">
                This business has completed our rigorous KYC process and is a trusted partner.
              </p>
              <ShieldCheck size={48} className="text-emerald-400/20 absolute bottom-4 right-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-black/5 overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h3 className="text-xl font-black text-gray-900">Request Transporter</h3>
                <button onClick={() => setIsBookingModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <p className="text-sm text-amber-800 leading-relaxed">
                    <span className="font-bold block mb-1">Disclaimer</span>
                    Transporters operate independently. Africa Market Hub is not responsible for lost, stolen, or damaged goods.
                  </p>
                </div>

                <div className="mb-8">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        className="peer appearance-none w-5 h-5 border-2 border-gray-300 rounded-md checked:bg-emerald-600 checked:border-emerald-600 transition-colors"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                      />
                      <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none">
                        <path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600 font-medium group-hover:text-gray-900 transition-colors">
                      I understand that transporters are independent operators and I accept the terms of service.
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleConfirmBooking}
                  disabled={!agreedToTerms}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransportBusinessProfile;
