import React from 'react';
import { motion } from 'motion/react';
import { Building2, ArrowRight, Store, ShieldCheck, BarChart3, Users, CheckCircle2 } from 'lucide-react';

interface BusinessLandingProps {
  onRegisterClick: () => void;
  onBack: () => void;
}

const BusinessLanding: React.FC<BusinessLandingProps> = ({ onRegisterClick, onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 overflow-y-auto">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop')] bg-cover bg-center opacity-5" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-bold text-sm mb-8"
            >
              <Building2 size={16} />
              Enterprise Solutions for African Markets
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-7xl font-black text-gray-900 mb-8 tracking-tight leading-tight"
            >
              Scale your business <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">
                across borders.
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-500 mb-10 leading-relaxed"
            >
              Join thousands of registered companies reaching millions of buyers. Unlock multi-branch management, staff accounts, and enterprise analytics.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button 
                onClick={onRegisterClick}
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2 group"
              >
                Start Selling as a Business
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900 mb-4">Everything you need to grow</h2>
            <p className="text-gray-500 text-lg">Built specifically for registered companies and large-scale operations.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Store className="text-blue-600" size={32} />,
                title: "Multi-Branch Management",
                desc: "Manage multiple store locations, inventories, and staff from a single unified dashboard."
              },
              {
                icon: <Users className="text-emerald-600" size={32} />,
                title: "Staff Accounts",
                desc: "Assign roles like Manager, Accountant, or Staff with granular permission controls."
              },
              {
                icon: <BarChart3 className="text-indigo-600" size={32} />,
                title: "Enterprise Analytics",
                desc: "Deep insights into sales, customer behavior, and branch performance."
              },
              {
                icon: <ShieldCheck className="text-rose-600" size={32} />,
                title: "Verified Business Badge",
                desc: "Build instant trust with buyers through our rigorous corporate verification process."
              },
              {
                icon: <Building2 className="text-amber-600" size={32} />,
                title: "B2B Wholesale",
                desc: "Set bulk pricing, manage purchase orders, and connect with other businesses."
              },
              {
                icon: <CheckCircle2 className="text-cyan-600" size={32} />,
                title: "Priority Support",
                desc: "Get 24/7 access to our dedicated enterprise success team."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-900 py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-black text-white mb-6">Ready to scale your operations?</h2>
          <p className="text-blue-200 text-xl mb-10">Join the fastest growing B2B & B2C marketplace in Africa.</p>
          <button 
            onClick={onRegisterClick}
            className="px-8 py-4 bg-white text-blue-900 rounded-2xl font-black text-lg hover:bg-gray-50 transition-all shadow-xl flex items-center justify-center gap-2 mx-auto group"
          >
            Register Your Business
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessLanding;
