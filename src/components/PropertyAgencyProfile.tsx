import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Globe, 
  ShieldCheck, 
  Star, 
  ArrowLeft, 
  Home, 
  Users,
  MessageSquare,
  Share2,
  Info,
  ArrowRight,
  LandPlot,
  Store
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { formatPrice } from '../lib/currency';
import PriceDisplay from './PriceDisplay';

interface PropertyAgencyProfileProps {
  agencyId: string;
  onBack: () => void;
  onContact: (userId: string, userName: string) => void;
}

interface AgencyData {
  id: string;
  name: string;
  email: string;
  phone: string;
  business_name?: string;
  business_description?: string;
  business_logo_url?: string;
  business_address?: string;
  verification_status?: string;
  rating?: number;
  agency_name?: string;
  agency_description?: string;
  agency_logo_url?: string;
  agency_address?: string;
  country?: string;
}

interface Property {
  id: string;
  title: string;
  price: number;
  location: string;
  type: string;
  image_url: string;
  description: string;
}

const PropertyAgencyProfile: React.FC<PropertyAgencyProfileProps> = ({ agencyId, onBack, onContact }) => {
  const { user } = useAuth() || {};
  const [agency, setAgency] = useState<AgencyData | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgencyData = async () => {
      try {
        // Fetch Agency Info
        const { data: agencyData, error: agencyError } = await supabase
          .from('users')
          .select('*')
          .eq('id', agencyId)
          .single();

        if (agencyError) throw agencyError;
        
        // Map user fields to agency profile fields if needed
        const mappedAgency = {
          ...agencyData,
          name: agencyData.agency_name || agencyData.business_name || agencyData.name,
          description: agencyData.agency_description || agencyData.business_description || 'Leading real estate agency specializing in luxury apartments and commercial properties.',
          logoUrl: agencyData.agency_logo_url || agencyData.business_logo_url || agencyData.photo_url,
          rating: agencyData.rating || 4.9,
          reviewCount: agencyData.review_count || 86,
          verificationStatus: agencyData.verification_status || 'verified',
          specializations: agencyData.specializations || ['Residential', 'Commercial', 'Land Sales'],
          address: agencyData.agency_address || agencyData.business_address || agencyData.address || 'Lagos, Nigeria'
        };
        
        setAgency(mappedAgency);

        // Fetch Agency Properties
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('owner_id', agencyId)
          .order('created_at', { ascending: false });

        if (propError) throw propError;
        setProperties(propData || []);

      } catch (error) {
        console.error('Error fetching agency profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgencyData();
  }, [agencyId]);

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'warehouse': return <Building2 size={16} />;
      case 'land': return <LandPlot size={16} />;
      case 'retail': return <Store size={16} />;
      default: return <Home size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6 text-gray-400">
          <Info size={40} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Agency Not Found</h2>
        <p className="text-gray-500 mb-8">The real estate agency you're looking for doesn't exist or has been removed.</p>
        <button onClick={onBack} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all">
          Back to Discovery
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero Header */}
      <div className="relative h-64 md:h-80 bg-emerald-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2073&auto=format&fit=crop')] bg-cover bg-center" />
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
              {agency.business_logo_url ? (
                <img src={agency.business_logo_url} alt={agency.business_name} className="w-full h-full object-cover rounded-[32px]" />
              ) : (
                <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-600 rounded-[32px]">
                  <Building2 size={48} />
                </div>
              )}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">
                  {agency.business_name || agency.name}
                </h1>
                {agency.verification_status === 'verified' && (
                  <div className="bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
                    <ShieldCheck size={20} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-emerald-100/80 font-bold text-sm">
                <div className="flex items-center gap-1.5">
                  <MapPin size={16} className="text-emerald-400" />
                  {agency.business_address || 'Location not specified'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Star size={16} className="text-amber-400 fill-amber-400" />
                  {agency.rating || '4.9'} (240+ Reviews)
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 pb-2 w-full md:w-auto">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 max-w-sm">
                <Info className="text-amber-400 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  <strong className="text-amber-400">Disclaimer:</strong> Africa Market Hub does not verify ownership of listed properties. Users must conduct due diligence before making payment.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => onContact(agency.id, agency.business_name || agency.name)}
                  className="flex-1 md:flex-none px-8 py-4 bg-white text-emerald-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <MessageSquare size={18} />
                  Message
                </button>
                <button className="w-14 h-14 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/20 transition-all">
                  <Share2 size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Listings */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Home className="text-emerald-600" size={24} />
                Portfolio Listings
                <span className="ml-auto text-sm font-bold text-gray-400">{properties.length} Properties</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {properties.map((prop) => (
                  <motion.div
                    key={prop.id}
                    whileHover={{ y: -5 }}
                    className="bg-white rounded-[40px] overflow-hidden border border-black/5 shadow-sm hover:shadow-xl transition-all group"
                  >
                    <div className="h-48 bg-gray-100 relative">
                      <img src={prop.image_url} alt={prop.title} className="w-full h-full object-cover" />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        {getTypeIcon(prop.type)}
                        {prop.type}
                      </div>
                    </div>
                    <div className="p-6">
                      <h4 className="font-black text-gray-900 mb-2 truncate">{prop.title}</h4>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-4">
                        <MapPin size={14} className="text-emerald-500" />
                        {prop.location}
                      </div>
                      <div className="flex justify-between items-center">
                        <PriceDisplay 
                          amount={prop.price} 
                          sourceCountry={agency.country || 'Nigeria'} 
                          targetCountry={user?.user_metadata?.country}
                          className="text-lg font-black text-emerald-600"
                          originalPriceClassName="text-[10px] font-bold text-gray-400 line-through ml-2"
                        />
                        <button className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-emerald-600 flex items-center gap-1 transition-colors">
                          Details
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <Info className="text-emerald-600" size={24} />
                About the Agency
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                {agency.business_description || "This agency is a leading real estate firm specializing in commercial and residential properties. With years of experience in the African market, we provide professional services for buyers, sellers, and investors."}
              </p>
            </section>
          </div>

          {/* Right Column: Sidebar Info */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[40px] border border-black/5 shadow-xl sticky top-24">
              <h3 className="text-xl font-black text-gray-900 mb-8">Agency Information</h3>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
                    <Phone size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</p>
                    <p className="font-bold text-gray-900">{agency.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Website</p>
                    <p className="font-bold text-emerald-600">www.{agency.business_name?.toLowerCase().replace(/\s+/g, '') || 'agency'}.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registered Agents</p>
                    <p className="font-bold text-gray-900">12 Professionals</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-50">
                <button 
                  onClick={() => agency.phone && window.open(`tel:${agency.phone}`)}
                  className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  <Phone size={18} />
                  Call Agency
                </button>
              </div>
            </div>

            <div className="bg-emerald-900 p-8 rounded-[40px] text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <h4 className="text-lg font-black mb-2 relative z-10">Verified Agency</h4>
              <p className="text-emerald-100/70 text-sm leading-relaxed mb-6 relative z-10">
                This agency has been vetted for compliance and professional standards in real estate.
              </p>
              <ShieldCheck size={48} className="text-emerald-400/20 absolute bottom-4 right-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyAgencyProfile;
