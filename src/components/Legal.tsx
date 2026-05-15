import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, FileText, Lock, CreditCard, Truck, Home, UserCheck, ArrowLeft } from 'lucide-react';

interface LegalProps {
  onBack?: () => void;
  initialSection?: string;
}

const Legal: React.FC<LegalProps> = ({ onBack, initialSection = 'terms' }) => {
  const [activeSection, setActiveSection] = useState(initialSection);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  const sections = [
    { id: 'terms', title: 'Terms & Conditions', icon: FileText },
    { id: 'privacy', title: 'Privacy Policy', icon: Lock },
    { id: 'payment', title: 'Payment & Refund Policy', icon: CreditCard },
    { id: 'dispatch', title: 'Pickup & Dispatch Policy', icon: Truck },
    { id: 'transporter', title: 'Transporter Agreement', icon: Shield },
    { id: 'property', title: 'Property Listing Agreement', icon: Home },
    { id: 'kyc', title: 'KYC Policy', icon: UserCheck },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'terms':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Terms and Conditions</h2>
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mb-8">Effective Date: October 2023 | Platform: African Market Hub</p>
            
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">1.1 Platform Description</h3>
                <p>African Market Hub is a multi-service digital platform that connects buyers, sellers, transporters, and property providers across Africa. The platform facilitates interactions between users but does not own, sell, deliver, or process payments for goods or services listed.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">1.2 Marketplace Role & Limitation of Liability</h3>
                <p className="mb-3">African Market Hub acts strictly as a technology intermediary. The platform:</p>
                <ul className="list-disc pl-6 space-y-2 mb-3">
                  <li>Does not own listed products or properties.</li>
                  <li>Does not employ transporters or dispatch riders.</li>
                  <li>Does not process, hold, or escrow payments.</li>
                  <li>Does not guarantee the completion of transactions.</li>
                </ul>
                <p>African Market Hub shall not be liable for user disputes, financial losses, fraudulent listings, transport incidents, or business misrepresentations.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">1.3 User Responsibilities & Age Requirement</h3>
                <p>Users must be 18 years or older. Users agree to provide accurate information, use valid identity documents, and not engage in fraud, illegal listings, or impersonation. Users are fully responsible for their listings, transactions, and interactions. Businesses are responsible for all actions performed by their staff accounts.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">1.4 Dispute Resolution & Governing Law</h3>
                <ul className="list-disc pl-6 space-y-4">
                  <li><strong>User-to-User Disputes:</strong> Because African Market Hub is not a party to any transaction, any disputes arising between users (e.g., Buyer and Seller, or User and Transporter) must be resolved directly between the parties involved, in accordance with the local laws of their respective jurisdictions or applicable cross-border trade agreements. African Market Hub is held harmless and will not mediate such disputes.</li>
                  <li><strong>User-to-Platform Disputes:</strong> Any legal claim against African Market Hub regarding the use of the software shall be governed by the laws of the Federal Republic of Nigeria, without regard to conflict of law principles.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">1.5 Intellectual Property & Modifications</h3>
                <p>The African Market Hub branding, software, and logos belong to the platform. User-generated content belongs to the users. African Market Hub reserves the right to update these terms at any time and will notify users of significant changes. African Market Hub may suspend or terminate accounts for fraudulent activity, fake KYC documents, or abuse of the platform.</p>
              </section>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Privacy Policy</h2>
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">2.1 Data Collection</h3>
                <p>We collect profile information, contact details, and KYC documents (ID cards, business registrations, licenses) necessary to verify users and facilitate trust on the platform.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">2.2 Data Usage & Sharing</h3>
                <p>Your data is used to operate the platform. To facilitate transactions, necessary details (e.g., phone numbers, addresses, account details) are shared between transacting parties (e.g., a Buyer and a Transporter). We do not sell your personal data to third parties.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">2.3 Security</h3>
                <p>We implement standard security measures to protect your KYC documents and personal data from unauthorized access.</p>
              </section>
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Payment & Refund Policy</h2>
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">3.1 Payment Disclaimer</h3>
                <p>African Market Hub does not process or hold payments. Buyers make payments directly to sellers or service providers using external bank transfers or payment methods. African Market Hub is not responsible for payment disputes, incorrect transfers, fraudulent sellers, or non-delivery after payment.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">3.2 Payment Reference Requirement</h3>
                <p>African Market Hub generates a unique order reference (e.g., AMH-102-58392) for every checkout. Buyers MUST include this reference in their bank transfer narration. Payments without a reference may not be confirmed.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">3.3 Payment Receipt Requirement</h3>
                <p>Buyers must upload a payment receipt after completing the transfer. Sellers must verify the bank alert, the reference number, and the uploaded receipt before clicking "CONFIRM PAYMENT". African Market Hub is not responsible for incorrect confirmations.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">3.4 Refunds & Returns</h3>
                <p>Because African Market Hub does not process payments, <strong>the platform cannot issue refunds</strong>. All requests for refunds, returns, or exchanges must be negotiated and executed directly between the Buyer and the Seller.</p>
              </section>
            </div>
          </div>
        );
      case 'dispatch':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Pickup & Dispatch Policy</h2>
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <p className="mb-4">After a seller confirms payment, the order becomes "READY FOR PICKUP". The buyer must choose a delivery option:</p>
              <ul className="list-disc pl-6 space-y-4">
                <li><strong>Option 1 (Self Pickup):</strong> Buyer goes to the store to pick up the item.</li>
                <li><strong>Option 2 (Seller Dispatch):</strong> The seller uses their own company dispatcher or logistics team. The business is fully responsible for this delivery.</li>
                <li><strong>Option 3 (Marketplace Transporter):</strong> The buyer clicks "REQUEST TRANSPORTER" to broadcast the job to nearby independent transporters on the platform.</li>
              </ul>
            </div>
          </div>
        );
      case 'transporter':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Transporter Agreement & Liability</h2>
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">5.1 Independent Contractors</h3>
                <p>Transporters operate as independent contractors, not employees of African Market Hub.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">5.2 Delivery Flow</h3>
                <p>Transporters must follow the platform flow: Accept Request → Arrive at Store → Item Picked → In Transit → Delivered.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">5.3 Liability</h3>
                <p>Transporters are solely responsible for item safety, correct delivery, and missing items. African Market Hub is not liable for lost items, damaged goods, delayed delivery, or theft during transport.</p>
              </section>
            </div>
          </div>
        );
      case 'property':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Property Listing Agreement</h2>
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">6.1 Ownership Disclaimer</h3>
                <p>African Market Hub does not verify the legal ownership of listed properties.</p>
              </section>
              <section>
                <h3 className="text-xl font-bold text-gray-900 mb-3">6.2 Due Diligence</h3>
                <p>Users (buyers/renters) MUST conduct their own physical inspections, legal due diligence, and verification before making any payments or signing agreements. African Market Hub accepts no liability for real estate fraud or misrepresentation.</p>
              </section>
            </div>
          </div>
        );
      case 'kyc':
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900 mb-6">KYC (Know Your Customer) Policy</h2>
            <div className="space-y-8 text-gray-600 leading-relaxed">
              <p className="mb-4">To maintain a safe marketplace, users may be required to submit verification documents:</p>
              <ul className="list-disc pl-6 space-y-4">
                <li><strong>Individual Sellers:</strong> Government ID card.</li>
                <li><strong>Business Sellers:</strong> Business registration documents and Director ID.</li>
                <li><strong>Transporters:</strong> Driver's license, vehicle information, and guarantor details.</li>
                <li><strong>Property Owners/Agencies:</strong> Government ID and relevant property/agency documentation.</li>
              </ul>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {onBack && (
          <button 
            onClick={onBack}
            className="mb-8 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-bold"
          >
            <ArrowLeft size={20} />
            Back to App
          </button>
        )}
        
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">Legal Documents</h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Please review the policies and agreements that govern your use of African Market Hub.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-80 shrink-0">
            <div className="bg-white rounded-3xl p-4 shadow-sm border border-black/5 sticky top-24">
              <div className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left font-bold transition-all ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-gray-400'} />
                      {section.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-black/5"
            >
              {renderContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Legal;
