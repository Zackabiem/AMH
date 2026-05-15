import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Car, Bike, X, Loader2, CheckCircle2, Upload, UserCircle, FileText, ShieldCheck, CreditCard, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import imageCompression from 'browser-image-compression';

interface BecomeTransporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type Step = 'intro' | 'identity' | 'credentials' | 'vehicle' | 'guarantor' | 'payout' | 'success';

const BecomeTransporterModal: React.FC<BecomeTransporterModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { user, requestRole } = useAuth() || {};
  const [step, setStep] = useState<Step>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [kycData, setKycData] = useState({
    // Registration Type
    registrationType: 'individual' as 'individual' | 'enterprise',
    businessName: '',
    businessDescription: '',
    businessLogoUrl: '',
    mainParkLocation: '',
    
    // Identity
    legalName: '',
    phone: '',
    idType: 'national_id',
    idNumber: '',
    idDocumentUrl: '',
    profilePhotoUrl: '',
    address: '',
    proofOfAddressUrl: '',
    
    // Credentials
    driversLicenseNumber: '',
    driversLicenseExpiry: '',
    driversLicenseUrl: '',
    
    // Vehicle
    vehicleType: 'motorcycle',
    vehicleMakeModel: '',
    licensePlate: '',
    vehicleColor: '',
    vehicleRegUrl: '',
    vehicleInsuranceUrl: '',
    vehiclePhotoUrl: '',
    
    // Guarantor
    guarantorName: '',
    guarantorPhone: '',
    guarantorRelation: '',
    
    // Payout
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setError('');
    }
  }, [isOpen]);

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    const submitKyc = async (retryCount = 0) => {
      try {
        // Create KYC Application Document using JSONB for the data field
        const { error: kycError } = await supabase.from('kyc_applications').insert([{
          user_id: user.id,
          status: 'pending',
          data: {
            type: kycData.registrationType === 'enterprise' ? 'business_transporter' : 'individual_transporter',
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
            credentials: {
              driversLicenseNumber: kycData.driversLicenseNumber,
              driversLicenseExpiry: kycData.driversLicenseExpiry,
              driversLicenseUrl: kycData.driversLicenseUrl,
            },
            vehicle: {
              vehicleType: kycData.vehicleType,
              vehicleMakeModel: kycData.vehicleMakeModel,
              licensePlate: kycData.licensePlate,
              vehicleColor: kycData.vehicleColor,
              vehicleRegUrl: kycData.vehicleRegUrl,
              vehicleInsuranceUrl: kycData.vehicleInsuranceUrl,
              vehiclePhotoUrl: kycData.vehiclePhotoUrl,
            },
            guarantor: {
              guarantorName: kycData.guarantorName,
              guarantorPhone: kycData.guarantorPhone,
              guarantorRelation: kycData.guarantorRelation,
            },
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

        // Update user's pending roles and business info
        const { data: userDoc, error: userError } = await supabase
          .from('users')
          .select('pending_roles')
          .eq('id', user.id)
          .single();
          
        if (userError) throw userError;

        let currentPending: string[] = userDoc?.pending_roles || [];
        
        const updateData: any = {
          pending_roles: currentPending.includes('transporter') ? currentPending : [...currentPending, 'transporter'],
          vehicle_photo_url: kycData.vehiclePhotoUrl,
          photo_url: kycData.profilePhotoUrl,
          updated_at: new Date().toISOString()
        };

        if (kycData.registrationType === 'enterprise') {
          updateData.business_name = kycData.businessName;
          updateData.business_description = kycData.businessDescription;
          updateData.main_park_location = kycData.mainParkLocation;
          updateData.business_address = kycData.address;
          updateData.business_logo_url = kycData.businessLogoUrl;
        }

        await supabase.from('users').update(updateData).eq('id', user.id);

        if (requestRole) {
          await requestRole('transporter');
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
          // Upload public images to Cloudinary (e.g., vehicle photos, profile photos, logos)
          const folder = field === 'vehiclePhotoUrl' ? 'vehicles' : 
                         field === 'businessLogoUrl' ? 'logos' : 'profiles';
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
          // Upload private KYC documents to Supabase
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
              {step === 'intro' ? 'Become a Transporter' : 
               step === 'success' ? 'Application Submitted' : 'Driver Verification (KYC)'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          <div className="p-4 sm:p-6 md:p-8">
            <AnimatePresence mode="wait">
              {step === 'intro' && (
                <motion.div
                  key="intro"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-6"
                >
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                    <Truck size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-4">How are you registering?</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Choose the registration type that best fits your transport business.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <button 
                      onClick={() => { setKycData({...kycData, registrationType: 'individual'}); setStep('identity'); }}
                      className="p-6 rounded-3xl border-2 border-gray-100 hover:border-blue-600 hover:bg-blue-50 transition-all text-left group"
                    >
                      <UserCircle size={32} className="text-blue-600 mb-4" />
                      <p className="font-black text-lg text-gray-900">Individual Dispatcher</p>
                      <p className="text-sm text-gray-500">Independent driver or rider</p>
                    </button>
                    <button 
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('navigateToTransportCompanyLanding'));
                      }}
                      className="p-6 rounded-3xl border-2 border-gray-100 hover:border-blue-600 hover:bg-blue-50 transition-all text-left group"
                    >
                      <Building2 size={32} className="text-blue-600 mb-4" />
                      <p className="font-black text-lg text-gray-900">Transport Company</p>
                      <p className="text-sm text-gray-500">Registered logistics or transport park</p>
                    </button>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-6 mb-8 text-left">
                    <h4 className="font-bold text-blue-900 mb-4">What you'll need:</h4>
                    <ul className="space-y-3">
                      <li className="flex items-center text-blue-800"><CheckCircle2 size={18} className="mr-3 text-blue-600" /> Government ID & Profile Photo</li>
                      <li className="flex items-center text-blue-800"><CheckCircle2 size={18} className="mr-3 text-blue-600" /> Valid Driver's License</li>
                      <li className="flex items-center text-blue-800"><CheckCircle2 size={18} className="mr-3 text-blue-600" /> Vehicle Details & Registration</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {/* Step 1: Identity */}
              {step === 'identity' && (
                <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <UserCircle size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 1: Personal Identity</h3>
                      <p className="text-sm text-gray-500">We need to verify who you are.</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep('credentials'); }} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Legal Name *</label>
                        <input type="text" required value={kycData.legalName} onChange={e => setKycData({...kycData, legalName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="As on ID" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number *</label>
                        <input type="tel" required value={kycData.phone} onChange={e => setKycData({...kycData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+234..." />
                      </div>
                    </div>

                    {kycData.registrationType === 'enterprise' && (
                      <div className="space-y-5 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Business Name *</label>
                            <input type="text" required value={kycData.businessName} onChange={e => setKycData({...kycData, businessName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. God is Good Motors" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">Business Logo (Optional)</label>
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center relative hover:bg-gray-50 h-[50px] flex items-center justify-center">
                              <input type="file" onChange={handleFileUpload('businessLogoUrl', 'cloudinary')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                              <Upload className="text-gray-400 mr-2" size={16} />
                              <p className="text-xs font-medium text-gray-600 truncate">{kycData.businessLogoUrl ? "Logo Uploaded" : "Upload Logo"}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Main Park Location *</label>
                          <input type="text" required value={kycData.mainParkLocation} onChange={e => setKycData({...kycData, mainParkLocation: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Jibowu Park, Lagos" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1.5">Business Description *</label>
                          <textarea required value={kycData.businessDescription} onChange={e => setKycData({...kycData, businessDescription: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20" placeholder="Tell us about your transport company..." />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">ID Type *</label>
                        <select required value={kycData.idType} onChange={e => setKycData({...kycData, idType: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="national_id">National ID Card / NIN</option>
                          <option value="passport">International Passport</option>
                          <option value="voters_card">Voter's Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">ID Number *</label>
                        <input type="text" required value={kycData.idNumber} onChange={e => setKycData({...kycData, idNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Enter ID number" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Upload ID Document *</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center relative hover:bg-gray-50">
                          <input type="file" required={!kycData.idDocumentUrl} onChange={handleFileUpload('idDocumentUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,.pdf" />
                          <Upload className="mx-auto text-gray-400 mb-1" size={20} />
                          <p className="text-xs font-medium text-gray-600 truncate px-2">{kycData.idDocumentUrl || "Upload ID"}</p>
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

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Residential Address *</label>
                      <textarea required value={kycData.address} onChange={e => setKycData({...kycData, address: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none h-20" placeholder="Full home address" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="button" onClick={() => setStep('intro')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 order-2 sm:order-1">Back</button>
                      <button type="submit" className="w-full sm:flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 order-1 sm:order-2">Next: Credentials</button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Credentials */}
              {step === 'credentials' && (
                <motion.div key="credentials" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 2: Driver Credentials</h3>
                      <p className="text-sm text-gray-500">Verify your driving eligibility.</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep('vehicle'); }} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Driver's License Number *</label>
                        <input type="text" required value={kycData.driversLicenseNumber} onChange={e => setKycData({...kycData, driversLicenseNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Expiry Date *</label>
                        <input type="date" required value={kycData.driversLicenseExpiry} onChange={e => setKycData({...kycData, driversLicenseExpiry: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Upload Driver's License (Front & Back) *</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center relative hover:bg-gray-50">
                        <input type="file" required={!kycData.driversLicenseUrl} onChange={handleFileUpload('driversLicenseUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*,.pdf" />
                        <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                        <p className="text-sm font-medium text-gray-600">{kycData.driversLicenseUrl || "Click to upload"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="button" onClick={() => setStep('identity')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 order-2 sm:order-1">Back</button>
                      <button type="submit" className="w-full sm:flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 order-1 sm:order-2">Next: Vehicle Info</button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 3: Vehicle */}
              {step === 'vehicle' && (
                <motion.div key="vehicle" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <Car size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 3: Vehicle Information</h3>
                      <p className="text-sm text-gray-500">What will you be driving?</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep('guarantor'); }} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Vehicle Type *</label>
                        <select required value={kycData.vehicleType} onChange={e => setKycData({...kycData, vehicleType: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="bicycle">Bicycle</option>
                          <option value="motorcycle">Motorcycle / Bike</option>
                          <option value="car">Car</option>
                          <option value="minivan">Mini-Van</option>
                          <option value="truck">Box Truck</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Make & Model *</label>
                        <input type="text" required value={kycData.vehicleMakeModel} onChange={e => setKycData({...kycData, vehicleMakeModel: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Toyota Corolla" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">License Plate *</label>
                        <input type="text" required value={kycData.licensePlate} onChange={e => setKycData({...kycData, licensePlate: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. ABC-123-XY" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Vehicle Color *</label>
                        <input type="text" required value={kycData.vehicleColor} onChange={e => setKycData({...kycData, vehicleColor: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Silver" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Registration Doc *</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center relative hover:bg-gray-50">
                          <input type="file" required={!kycData.vehicleRegUrl} onChange={handleFileUpload('vehicleRegUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <p className="text-xs font-medium text-gray-600 truncate">{kycData.vehicleRegUrl || "Upload"}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Insurance Doc *</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center relative hover:bg-gray-50">
                          <input type="file" required={!kycData.vehicleInsuranceUrl} onChange={handleFileUpload('vehicleInsuranceUrl')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <p className="text-xs font-medium text-gray-600 truncate">{kycData.vehicleInsuranceUrl || "Upload"}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">Vehicle Photo *</label>
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center relative hover:bg-gray-50">
                          <input type="file" required={!kycData.vehiclePhotoUrl} onChange={handleFileUpload('vehiclePhotoUrl', 'cloudinary')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
                          <p className="text-xs font-medium text-gray-600 truncate">{kycData.vehiclePhotoUrl ? "Uploaded" : "Upload"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="button" onClick={() => setStep('credentials')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 order-2 sm:order-1">Back</button>
                      <button type="submit" className="w-full sm:flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 order-1 sm:order-2">Next: Guarantor</button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 4: Guarantor */}
              {step === 'guarantor' && (
                <motion.div key="guarantor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 4: Guarantor</h3>
                      <p className="text-sm text-gray-500">Provide an emergency contact or guarantor.</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3 mb-6">
                    <ShieldCheck className="text-blue-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-blue-800">
                      <span className="font-semibold">Notice:</span> Transporters may be required to provide guarantor details for accountability and security purposes.
                    </p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setStep('payout'); }} className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Guarantor Full Name *</label>
                      <input type="text" required value={kycData.guarantorName} onChange={e => setKycData({...kycData, guarantorName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Guarantor Phone *</label>
                        <input type="tel" required value={kycData.guarantorPhone} onChange={e => setKycData({...kycData, guarantorPhone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Relationship *</label>
                        <select required value={kycData.guarantorRelation} onChange={e => setKycData({...kycData, guarantorRelation: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                          <option value="">Select relationship...</option>
                          <option value="parent">Parent</option>
                          <option value="sibling">Sibling</option>
                          <option value="spouse">Spouse</option>
                          <option value="relative">Other Relative</option>
                          <option value="friend">Friend / Colleague</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="button" onClick={() => setStep('vehicle')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 order-2 sm:order-1">Back</button>
                      <button type="submit" className="w-full sm:flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 order-1 sm:order-2">Next: Payouts</button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 5: Payouts */}
              {step === 'payout' && (
                <motion.div key="payout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Step 5: Payout Details</h3>
                      <p className="text-sm text-gray-500">Where should we send your earnings?</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3 mb-6">
                    <ShieldCheck className="text-amber-500 shrink-0 mt-0.5" size={18} />
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Disclaimer:</span> Transporters operate independently. Africa Market Hub is not responsible for lost, stolen, or damaged goods. By submitting this application, you agree to these terms.
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
                      <input type="text" required value={kycData.bankName} onChange={e => setKycData({...kycData, bankName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. GTBank, Equity Bank" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Account Number *</label>
                      <input type="text" required value={kycData.accountNumber} onChange={e => setKycData({...kycData, accountNumber: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Account Name *</label>
                      <input type="text" required value={kycData.accountName} onChange={e => setKycData({...kycData, accountName: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Must match your legal name" />
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id="agreedToTerms"
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="agreedToTerms" className="text-sm font-medium text-gray-700 cursor-pointer">
                          I have read and agree to the <button type="button" className="text-blue-600 hover:underline font-bold">Transporter Privacy Rules</button> and <button type="button" className="text-blue-600 hover:underline font-bold">Terms of Service</button>.
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button type="button" onClick={() => setStep('guarantor')} className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 order-2 sm:order-1">Back</button>
                      <button type="submit" disabled={loading || !agreedToTerms} className="w-full sm:flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center disabled:opacity-70 order-1 sm:order-2">
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Application'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Success */}
              {step === 'success' && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Application Submitted!</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Your driver application has been received. Our team will review your documents and approve your transporter account shortly.
                  </p>
                  <button onClick={() => onComplete()} className="py-3 px-8 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200">
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

export default BecomeTransporterModal;
