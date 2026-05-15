import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronRight, Store, Home, Truck, User } from 'lucide-react';

interface PublicNavbarProps {
  setActiveTab: (tab: string) => void;
  hideNavigation?: boolean;
}

export default function PublicNavbar({ setActiveTab, hideNavigation = false }: PublicNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'business_landing', label: 'Sell on AMH', icon: Store },
    { id: 'property_agency_landing', label: 'Real Estate Agency', icon: Home },
    { id: 'transport_company_landing', label: 'Logistics Partner', icon: Truck },
  ];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-20">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="African Market Hub" className="h-12 w-auto object-contain" />
        </div>

        {!hideNavigation && (
          <>
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className="text-sm font-bold text-gray-600 hover:text-emerald-600 transition-colors flex items-center gap-2"
                >
                  <link.icon size={16} />
                  {link.label}
                </button>
              ))}
            </nav>

            <button
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </>
        )}
      </div>

      {/* Mobile Menu */}
      {!hideNavigation && mobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-gray-100 shadow-xl p-4 flex flex-col gap-2">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => {
                setActiveTab(link.id);
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-between w-full p-4 hover:bg-gray-50 rounded-xl transition-colors font-bold text-gray-700"
            >
              <div className="flex items-center gap-3">
                <link.icon size={20} className="text-emerald-600" />
                {link.label}
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          ))}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => {
                setActiveTab('auth');
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200"
            >
              <User size={18} />
              Sign In / Register
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
