import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Building2, UserCircle, FileText, ShieldCheck, CreditCard, X, Loader2, CheckCircle2, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import imageCompression from 'browser-image-compression';

interface BecomePropertyOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'selection' | 'identity' | 'professional' | 'guarantors' | 'payout' | 'success';

const BecomePropertyOwnerModal: React.FC<BecomePropertyOwnerModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { user, requestRole } = useAuth() || {};
  const [step, setStep] = useState<Step>('selection');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [kycData, setKycData] = useState({
    // Registration Type
    registrationType: 'individual' as 'individual' | 'enterprise',
    agencyName: '',
    agencyDescription: '',
    agencyLogoUrl: '',
    agencyAddress: '',
    agencyLicense: '',
    
    // Identity
    legalName: '',
    phone: '',
    idType: 'national_id',
    idNumber: '',
    idDocumentUrl: '',
    profilePhotoUrl: '',
    address: '',
    proofOfAddressUrl: '',
    
    // Professional (Optional for independent)
    associationName: '',
    associationIdUrl: '',
    
    // Guarantors (3 required)
    guarantor1Name: '',
    guarantor1Phone: '',
    guarantor1Email: '',
    guarantor1ConsentUrl: '',
    
    guarantor2Name: '',
    guarantor2Phone: '',
    guarantor2Email: '',
    guarantor2ConsentUrl: '',
    
    guarantor3Name: '',
    guarantor3Phone: '',
    guarantor3Email: '',
    guarantor3ConsentUrl: '',
    
    // Payout
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep('selection');
      setError('');
    }
  }, [isOpen]);

  const handleNavigateToAgencyLanding = () => {
    onClose();
    window.dispatchEvent(new CustomEvent('navigateToPropertyAgencyLanding'));
  };

  const handleIndividualSelect = () => {
    setStep('identity');
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    const submitKyc = async (retryCount = 0) => {
      try {
        const { error: kycError } = await supabase.from('kyc_applications').insert([{
          user_id: user.id,
          status: 'pending',
          data: {
            type: kycData.registrationType === 'enterprise' ? 'business_property_owner' : 'individual_property_owner',
            identity: {
              legalName: kycData.legalName,
              phone: kycData.phone,
              idType: kycData.idType,
              idNumber: kycData.idNumber,
              id_document_url: kycData.idDocumentUrl,
              profilePhotoUrl: kycData.profilePhotoUrl,
              address: kycData.address,
              proofOfAddressUrl: kycData.proofOfAddressUrl,
            },
            professional: {
              associationName: kycData.associationName,
              associationIdUrl: kycData.associationIdUrl,
            },
            guarantors: [
              {
                name: kycData.guarantor1Name,
                phone: kycData.guarantor1Phone,
                email: kycData.guarantor1Email,
                consentUrl: kycData.guarantor1ConsentUrl,
              },
              {
                name: kycData.guarantor2Name,
                phone: kycData.guarantor2Phone,
                email: kycData.guarantor2Email,
                consentUrl: kycData.guarantor2ConsentUrl,
              },
              {
                name: kycData.guarantor3Name,
                phone: kycData.guarantor3Phone,
                email: kycData.guarantor3Email,
                consentUrl: kycData.guarantor3ConsentUrl,
              }
            ],
            payout: {
              bankName: kycData.bankName,
              accountNumber: kycData.accountNumber,
              accountName: kycData.accountName,
            }
          }
        }]);

        if (kycError) {
          if (retryCount < 3 && (
            kycError.message?.includes('fetch') || 
            kycError.message?.includes('Lock') || 
            kycError.message?.includes('AbortError') ||
            kycError.message?.includes('steal') ||
            kycError.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => submitKyc(retryCount + 1), delay);
            return;
          }
          throw kycError;
        }

        // Update user's pending roles and agency info
        const { data: userDoc, error: userError } = await supabase
          .from('users')
          .select('pending_roles')
          .eq('id', user.id)
          .single();
          
        if (userError) throw userError;

        let currentPending: string[] = userDoc?.pending_roles || [];
        
        const updateData: any = {
          pending_roles: currentPending.includes('property_owner') ? currentPending : [...currentPending, 'property_owner'],
          photo_url: kycData.profilePhotoUrl,
          updated_at: new Date().toISOString()
        };

        if (kycData.registrationType === 'enterprise') {
          updateData.agency_name = kycData.agencyName;
          updateData.agency_description = kycData.agencyDescription;
          updateData.agency_license = kycData.agencyLicense;
          updateData.agency_address = kycData.address;
          updateData.agency_logo_url = kycData.agencyLogoUrl;
        }

        await supabase.from('users').update(updateData).eq('id', user.id);

        if (requestRole) {
          await requestRole('property_owner');
        }

        setStep('success');
      } catch (err: any) {
        console.error('Error submitting KYC:', err);
        setError(err.message || 'Failed to submit application. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    submitKyc();
  };

  const handleFileUpload = (field: keyof typeof kycData, destination: 'supabase' | 'cloudinary' = 'supabase') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        setLoading(true);
        setError('');
        
        let fileToUpload: File | Blob = file;
        
        // Compress if it's an image
        if (file.type.startsWith('image/')) {
          try {
            const options = {
              maxSizeMB: 0.8,
              maxWidthOrHeight: 1280,
              useWebWorker: true,
            };
            fileToUpload = await imageCompression(file, options);
            console.log(`Image compressed from ${file.size / 1024 / 1024}MB to ${fileToUpload.size / 1024 / 1024}MB`);
          } catch (compressionError) {
            console.warn('Image compression failed, uploading original:', compressionError);
          }
        }
        
        if (destination === 'cloudinary') {
          // Upload public images to Cloudinary (e.g., profile photos, logos)
          const folder = field === 'agencyLogoUrl' ? 'logos' : 'profiles';
          const signResponse = await fetch('/api/cloudinary/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder })
          });

          if (!signResponse.ok) {
            throw new Error('Failed to get upload signature.');
          }
          const signData = await signResponse.json();

          const formData = new FormData();
          formData.append('file', fileToUpload);
          formData.append('api_key', signData.apiKey);
          formData.append('timestamp', signData.timestamp);
          formData.append('signature', signData.signature);
          formData.append('folder', signData.folder);

          const uploadResponse = await fetch(
            `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
            { method: 'POST', body: formData }
          );

          if (!uploadResponse.ok) {
            throw new Error('Failed to upload image to Cloudinary');
          }

          const uploadData = await uploadResponse.json();
          setKycData(prev => ({ ...prev, [field]: uploadData.secure_url }));
        } else {
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const filePath = `${user.id}/${fileName}`;

          const { data, error: uploadError } = await supabase.storage
            .from('kyc-documents')
            .upload(filePath, fileToUpload, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;

          // Store the PATH instead of the public URL for private bucket security
          setKycData(prev => ({ ...prev, [field]: filePath }));
        }
      } catch (err: any) {
        console.error('Error uploading file:', err);
        setError(`Failed to upload document. ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-full items-start sm:items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-2xl shadow-2xl border border-black/5 overflow-hidden my-4 sm:my-8"
        >
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">
              {step === 'selection' ? 'List Properties' : 
               step === 'success' ? 'Application Submitted' : 'Property Owner KYC'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            <AnimatePresence mode="wait">
              {/* Step 0: Selection */}
              {step === 'selection' && (
                <motion.div key="selection" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center">
                  <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                    <Home size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4">How are you listing?</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Choose the registration type that best fits your property business.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <button 
                      onClick={() => { setKycData({...kycData, registrationType: 'individual'}); setStep('identity'); }}
                      className="p-6 rounded-3xl border-2 border-gray-100 hover:border-purple-600 hover:bg-purple-50 transition-all text-left group"
                    >
                      <UserCircle size={32} className="text-purple-600 mb-4" />
                      <p className="font-black text-lg text-gray-900">Individual Owner</p>
                      <p className="text-sm text-gray-500">Private landlord or property owner</p>
                    </button>
                    <button 
                      onClick={handleNavigateToAgencyLanding}
                      className="p-6 rounded-3xl border-2 border-gray-100 hover:border-purple-600 hover:bg-purple-50 transition-all text-left group"
                    >
                      <Building2 size={32} className="text-purple-600 mb-4" />
                      <p className="font-black text-lg text-gray-900">Property Agency</p>
                      <p className="text-sm text-gray-500">Registered real estate company</p>
                    </button>
                  </div>

                  <div className="bg-purple-50 rounded-2xl p-6 mb-8 text-left">
                    <h4 className="font-bold text-purple-900 mb-4">What you'll need:</h4>
                    <ul className="space-y-3">
                      <li className="flex items-center text-purple-800"><CheckCircle2 size={18} className="mr-3 text-purple-600" /> Government ID & Profile Photo</li>
                      {kycData.registrationType === 'enterprise' && (
                        <li className="flex items-center text-purple-800"><CheckCircle2 size={18} className="mr-3 text-purple-600" /> Agency License & Registration</li>
                      )}
                      <li className="flex items-center text-purple-800"><CheckCircle2 size={18} className="mr-3 text-purple-600" /> Proof of Ownership / Management</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Identity */}
              {step === 'identity' && (
                <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <UserCircle size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 1: Personal Identity</h3>
                      <p className="text-sm text-gray-500">We need to verify exactly who you are.</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep('professional'); }} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Legal Name *</label>
                        <input type="text" required value={kycData.legalName} onChange={e => setKycData({...kycData, legalName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="As on ID" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number *</label>
                        <input type="tel" required value={kycData.phone} onChange={e => setKycData({...kycData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="+234..." />
                      </div>
                    </div>

                    {kycData.registrationType === 'enterprise' && (
                      <div className="space-y-5 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Agency Name *</label>
                            <input type="text" required value={kycData.agencyName} onChange={e => setKycData({...kycData, agencyName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="e.g. Prime Realty Ltd" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Agency Logo (Optional)</label>
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center relative hover:bg-gray-50 h-[50px] flex items-center justify-center">
                              <input type="file" onChange={handleFileUpload('agencyLogoUrl', 'cloudinary')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                              <Upload className="text-gray-400 mr-2" size={16} />
                              <p className="text-xs font-medium text-gray-600 truncate">{kycData.agencyLogoUrl ? "Logo Uploaded" : "Upload Logo"}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Agency License No. *</label>
                          <input type="text" required value={kycData.agencyLicense} onChange={e => setKycData({...kycData, agencyLicense: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="RE-123456" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Agency Description *</label>
                          <textarea required value={kycData.agencyDescription} onChange={e => setKycData({...kycData, agencyDescription: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none resize-none h-20" placeholder="Tell us about your property agency..." />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">ID Type *</label>
                        <select required value={kycData.idType} onChange={e => setKycData({...kycData, idType: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                          <option value="national_id">National ID Card / NIN</option>
                          <option value="passport">International Passport</option>
                          <option value="voters_card">Voter's Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">ID Number *</label>
                        <input type="text" required value={kycData.idNumber} onChange={e => setKycData({...kycData, idNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Enter ID number" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Upload ID Document *</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center relative hover:bg-gray-50">
                          <input type="file" required={!kycData.idDocumentUrl} onChange={handleFileUpload('idDocumentUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,.pdf" />
                          <Upload className="mx-auto text-gray-400 mb-1" size={20} />
                          <p className="text-xs font-medium text-gray-600 truncate px-2">{kycData.idDocumentUrl || "Upload ID (Front & Back)"}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Live Selfie / Profile Photo *</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center relative hover:bg-gray-50">
                          <input type="file" required={!kycData.profilePhotoUrl} onChange={handleFileUpload('profilePhotoUrl', 'cloudinary')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                          <Upload className="mx-auto text-gray-400 mb-1" size={20} />
                          <p className="text-xs font-medium text-gray-600 truncate px-2">{kycData.profilePhotoUrl ? "Uploaded" : "Upload Selfie"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Residential Address *</label>
                        <textarea required value={kycData.address} onChange={e => setKycData({...kycData, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-24" placeholder="Full home address" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Proof of Address *</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center relative hover:bg-gray-50 h-24 flex flex-col justify-center">
                          <input type="file" required={!kycData.proofOfAddressUrl} onChange={handleFileUpload('proofOfAddressUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,.pdf" />
                          <Upload className="mx-auto text-gray-400 mb-1" size={20} />
                          <p className="text-xs font-medium text-gray-600 truncate px-2">{kycData.proofOfAddressUrl || "Utility Bill / Statement"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button type="submit" className="w-full py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200">Next: Professional Info</button>
                    </div>

                    <div className="pt-6 border-t border-gray-100 text-center">
                      <p className="text-sm text-gray-500">
                        Are you a registered agency?{' '}
                        <button 
                          type="button"
                          onClick={handleNavigateToAgencyLanding}
                          className="text-emerald-600 font-bold hover:underline"
                        >
                          Learn about our Enterprise Solutions
                        </button>
                      </p>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Professional Info */}
              {step === 'professional' && (
                <motion.div key="professional" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 2: Professional Details</h3>
                      <p className="text-sm text-gray-500">Optional for individual landlords.</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep('guarantors'); }} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Real Estate Association Name (Optional)</label>
                      <input type="text" value={kycData.associationName} onChange={e => setKycData({...kycData, associationName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. REDAN, ERCAAN" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Membership ID / Certificate (Optional)</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center relative hover:bg-gray-50">
                        <input type="file" onChange={handleFileUpload('associationIdUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,.pdf" />
                        <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                        <p className="text-sm font-medium text-gray-600">{kycData.associationIdUrl || "Click to upload certificate"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="button" onClick={() => setStep('identity')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 order-2 sm:order-1">Back</button>
                      <button type="submit" className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 order-1 sm:order-2">Next: Guarantors</button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 3: Guarantors */}
              {step === 'guarantors' && (
                <motion.div key="guarantors" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 3: Guarantors</h3>
                      <p className="text-sm text-gray-500">For security, we require 3 guarantors with signed consent letters.</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep('payout'); }} className="space-y-8">
                    
                    {/* Guarantor 1 */}
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-100">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">1</span>
                        First Guarantor
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                          <input type="text" required value={kycData.guarantor1Name} onChange={e => setKycData({...kycData, guarantor1Name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                          <input type="tel" required value={kycData.guarantor1Phone} onChange={e => setKycData({...kycData, guarantor1Phone: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                          <input type="email" required value={kycData.guarantor1Email} onChange={e => setKycData({...kycData, guarantor1Email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Consent Letter Upload *</label>
                          <div className="border border-dashed border-gray-300 rounded-lg p-2 text-center relative hover:bg-gray-100 bg-white">
                            <input type="file" required={!kycData.guarantor1ConsentUrl} onChange={handleFileUpload('guarantor1ConsentUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" />
                            <p className="text-xs font-medium text-gray-600 truncate">{kycData.guarantor1ConsentUrl || "Upload Letter"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Guarantor 2 */}
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-100">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">2</span>
                        Second Guarantor
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                          <input type="text" required value={kycData.guarantor2Name} onChange={e => setKycData({...kycData, guarantor2Name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                          <input type="tel" required value={kycData.guarantor2Phone} onChange={e => setKycData({...kycData, guarantor2Phone: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                          <input type="email" required value={kycData.guarantor2Email} onChange={e => setKycData({...kycData, guarantor2Email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Consent Letter Upload *</label>
                          <div className="border border-dashed border-gray-300 rounded-lg p-2 text-center relative hover:bg-gray-100 bg-white">
                            <input type="file" required={!kycData.guarantor2ConsentUrl} onChange={handleFileUpload('guarantor2ConsentUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" />
                            <p className="text-xs font-medium text-gray-600 truncate">{kycData.guarantor2ConsentUrl || "Upload Letter"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Guarantor 3 */}
                    <div className="bg-gray-50 p-4 sm:p-6 rounded-2xl border border-gray-100">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">3</span>
                        Third Guarantor
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                          <input type="text" required value={kycData.guarantor3Name} onChange={e => setKycData({...kycData, guarantor3Name: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number *</label>
                          <input type="tel" required value={kycData.guarantor3Phone} onChange={e => setKycData({...kycData, guarantor3Phone: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Email Address *</label>
                          <input type="email" required value={kycData.guarantor3Email} onChange={e => setKycData({...kycData, guarantor3Email: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Consent Letter Upload *</label>
                          <div className="border border-dashed border-gray-300 rounded-lg p-2 text-center relative hover:bg-gray-100 bg-white">
                            <input type="file" required={!kycData.guarantor3ConsentUrl} onChange={handleFileUpload('guarantor3ConsentUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".pdf,image/*" />
                            <p className="text-xs font-medium text-gray-600 truncate">{kycData.guarantor3ConsentUrl || "Upload Letter"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="button" onClick={() => setStep('professional')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 order-2 sm:order-1">Back</button>
                      <button type="submit" className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 order-1 sm:order-2">Next: Payouts</button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 4: Payouts */}
              {step === 'payout' && (
                <motion.div key="payout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 4: Payout Details</h3>
                      <p className="text-sm text-gray-500">Where should we send your property earnings?</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 mb-6">
                    <ShieldCheck className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Disclaimer:</span> Africa Market Hub does not verify ownership of listed properties. Users must conduct due diligence. By submitting this application, you agree to take full legal responsibility for the properties you list.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleKycSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Bank Name *</label>
                      <input type="text" required value={kycData.bankName} onChange={e => setKycData({...kycData, bankName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. GTBank, Equity Bank" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Account Number *</label>
                      <input type="text" required value={kycData.accountNumber} onChange={e => setKycData({...kycData, accountNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Account Name *</label>
                      <input type="text" required value={kycData.accountName} onChange={e => setKycData({...kycData, accountName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Must match your legal name" />
                    </div>

                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id="agreedToTerms"
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 bg-white border-gray-300 rounded focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="agreedToTerms" className="text-sm font-medium text-gray-700 cursor-pointer">
                          I have read and agree to the <button type="button" className="text-emerald-600 hover:underline font-bold">Property Owner Privacy Rules</button> and <button type="button" className="text-emerald-600 hover:underline font-bold">Terms of Service</button>.
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="button" onClick={() => setStep('guarantors')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 order-2 sm:order-1">Back</button>
                      <button type="submit" disabled={loading || !agreedToTerms} className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 flex items-center justify-center disabled:opacity-70 order-1 sm:order-2">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Application'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Success */}
              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Application Submitted!</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Your property owner application has been received. Our team will review your documents and guarantors shortly.
                  </p>
                  <button onClick={() => onComplete()} className="py-3 px-8 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                    Continue to Dashboard
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BecomePropertyOwnerModal;
