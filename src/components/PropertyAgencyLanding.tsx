import React from 'react';
import { motion } from 'motion/react';
import { Building2, ArrowRight, Home, ShieldCheck, BarChart3, Users, CheckCircle2, Key, MapPin, Search } from 'lucide-react';

interface PropertyAgencyLandingProps {
  onRegisterClick: () => void;
  onBack: () => void;
}

const PropertyAgencyLanding: React.FC<PropertyAgencyLandingProps> = ({ onRegisterClick, onBack }) => {
  return (
    <div className="min-h-screen bg-white overflow-y-auto">
      {/* Hero Section */}
      <div className="relative pt-20 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-50 rounded-full blur-3xl opacity-50 -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 font-bold text-sm mb-8">
                <Building2 size={16} />
                Enterprise Real Estate Solutions
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight leading-[1.1]">
                The Future of <br/>
                <span className="text-emerald-600">Property Sales</span> <br/>
                in Africa.
              </h1>
              <p className="text-xl text-gray-500 mb-10 leading-relaxed">
                Empower your agency with enterprise-grade tools. Manage listings, track leads, and scale your brand across the continent's fastest growing marketplace.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button 
                  onClick={onRegisterClick}
                  className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2 group"
                >
                  Register Your Agency
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <div className="flex items-center gap-2 text-gray-500 font-medium">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  Verified Agency Badge
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="aspect-square rounded-[48px] overflow-hidden shadow-2xl relative">
                <img 
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2073&auto=format&fit=crop" 
                  alt="Modern Office" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
              
              {/* Floating Stats */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 hidden sm:block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Leads</p>
                    <p className="text-2xl font-black text-gray-900">+2,450</p>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 hidden sm:block"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Home size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Properties</p>
                    <p className="text-2xl font-black text-gray-900">Unlimited</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Enterprise Features */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-gray-900 mb-4">Built for Professionals</h2>
            <p className="text-gray-500 text-xl max-w-2xl mx-auto">Everything you need to manage a high-volume real estate business.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <ShieldCheck className="text-emerald-600" size={32} />,
                title: "Verified Agency Badge",
                desc: "Build instant trust with a corporate verification badge. Stand out from independent agents."
              },
              {
                icon: <Users className="text-blue-600" size={32} />,
                title: "Team Management",
                desc: "Add staff and agents to your agency account. Let them list properties under your brand."
              },
              {
                icon: <BarChart3 className="text-indigo-600" size={32} />,
                title: "Lead Analytics",
                desc: "Track which properties are performing best and manage your sales pipeline effectively."
              },
              {
                icon: <Key className="text-rose-600" size={32} />,
                title: "Bulk Listing Tools",
                desc: "Upload and manage hundreds of properties simultaneously with our advanced management tools."
              },
              {
                icon: <MapPin className="text-amber-600" size={32} />,
                title: "Regional Domination",
                desc: "Get featured in specific regions and categories to maximize your agency's visibility."
              },
              {
                icon: <Search className="text-cyan-600" size={32} />,
                title: "SEO Optimization",
                desc: "Your listings are automatically optimized for search engines to attract organic leads."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-lg">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-black text-gray-900 mb-12">Trusted by leading developers</h2>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale">
            {/* Placeholder Logos */}
            <div className="text-2xl font-black tracking-tighter">ESTATE_PRO</div>
            <div className="text-2xl font-black tracking-tighter">URBAN_DEV</div>
            <div className="text-2xl font-black tracking-tighter">GLOBAL_REALTY</div>
            <div className="text-2xl font-black tracking-tighter">PRIME_LAND</div>
            <div className="text-2xl font-black tracking-tighter">METRO_HOMES</div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-emerald-900 py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-800 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-800 rounded-full blur-3xl opacity-50 -translate-x-1/2 translate-y-1/2" />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <h2 className="text-5xl font-black text-white mb-8">Ready to dominate the market?</h2>
          <p className="text-emerald-200 text-xl mb-12 leading-relaxed">
            Join the elite network of verified real estate agencies on Africa's most advanced property marketplace.
          </p>
          <button 
            onClick={onRegisterClick}
            className="px-12 py-5 bg-white text-emerald-900 rounded-2xl font-black text-xl hover:bg-emerald-50 transition-all shadow-2xl flex items-center justify-center gap-3 mx-auto group"
          >
            Register Your Agency Now
            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PropertyAgencyLanding;
