import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, Building2, ArrowRight, X, Loader2, CheckCircle2, Upload, MapPin, CreditCard, UserCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { cn } from '../lib/utils';
import LocationPicker from './LocationPicker';
import imageCompression from 'browser-image-compression';

interface BecomeSellerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  isUpgrade?: boolean;
}

  type Step = 'selection' | 'business_form' | 'kyc_identity' | 'kyc_payout' | 'success';

const BecomeSellerModal: React.FC<BecomeSellerModalProps> = ({ isOpen, onClose, onComplete, isUpgrade = false }) => {
  const { user, requestRole } = useAuth() || {};
  const [step, setStep] = useState<Step>(isUpgrade ? 'business_form' : 'selection');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingStore, setExistingStore] = useState<any>(null);
  const [convertStore, setConvertStore] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    businessType: 'sole_proprietor',
    registrationNumber: '',
    email: '',
    phone: '',
    address: ''
  });

  const [kycData, setKycData] = useState({
    type: 'individual_seller' as 'individual_seller' | 'business_seller',
    legalName: '',
    idType: 'national_id',
    idNumber: '',
    idDocumentUrl: '',
    profilePhotoUrl: '',
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  useEffect(() => {
    if (isOpen) {
      setStep(isUpgrade ? 'business_form' : 'selection');
      setError('');
      setFormData({
        name: '',
        businessType: 'sole_proprietor',
        registrationNumber: '',
        email: '',
        phone: '',
        address: ''
      });
      setKycData({
        type: kycData.type,
        legalName: '',
        idType: 'national_id',
        idNumber: '',
        idDocumentUrl: '',
        profilePhotoUrl: '',
        bankName: '',
        accountNumber: '',
        accountName: ''
      });
    }
  }, [isOpen, isUpgrade]);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && user) {
      const checkExistingStore = async (retryCount = 0) => {
        try {
          const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('owner_id', user.id)
            .eq('owner_type', 'user')
            .limit(1);
            
          if (error) {
            if (retryCount < 3 && (
              error.message?.includes('fetch') || 
              error.message?.includes('Lock') || 
              error.message?.includes('AbortError') ||
              error.message?.includes('steal') ||
              error.message?.includes('Failed to fetch')
            )) {
              const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
              setTimeout(() => isMounted && checkExistingStore(retryCount + 1), delay);
              return;
            }
            throw error;
          }

          if (isMounted && data && data.length > 0) {
            setExistingStore(data[0]);
          }
        } catch (err) {
          console.error("Error checking existing store:", err);
        }
      };
      checkExistingStore();
    }
    return () => { isMounted = false; };
  }, [isOpen, user]);

  const handleIndividualSelect = () => {
    setKycData(prev => ({ ...prev, type: 'individual_seller' }));
    setStep('kyc_identity');
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    const submitKyc = async (retryCount = 0) => {
      try {
        // Create KYC Application Document
        const { error: kycError } = await supabase.from('kyc_applications').insert([{
          user_id: user.id,
          status: 'pending',
          data: {
            type: kycData.type,
            legal_name: kycData.legalName,
            id_type: kycData.idType,
            id_number: kycData.idNumber,
            id_document_url: kycData.idDocumentUrl,
            profile_photo_url: kycData.profilePhotoUrl
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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

        // Update user's pending roles
        const { data: userDoc, error: userError } = await supabase
          .from('users')
          .select('pending_roles')
          .eq('id', user.id)
          .single();
          
        if (userError) throw userError;

        let currentPending: string[] = userDoc?.pending_roles || [];
        
        if (!currentPending.includes('seller')) {
          await supabase.from('users').update({
            pending_roles: [...currentPending, 'seller'],
            photo_url: kycData.profilePhotoUrl,
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
        }

        if (requestRole) {
          await requestRole('seller');
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

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');

    const submitBusiness = async (retryCount = 0) => {
      try {
        const { data: businessData, error: businessError } = await supabase.from('businesses').insert([{
          name: formData.name,
          business_type: formData.businessType,
          owner_user_id: user.id,
          registration_number: formData.registrationNumber,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]).select().single();

        if (businessError) {
          if (retryCount < 3 && (
            businessError.message?.includes('fetch') || 
            businessError.message?.includes('Lock') || 
            businessError.message?.includes('AbortError') ||
            businessError.message?.includes('steal') ||
            businessError.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => submitBusiness(retryCount + 1), delay);
            return;
          }
          throw businessError;
        }
        const businessId = businessData.id;

        await supabase.from('business_members').insert([{
          business_id: businessId,
          user_id: user.id,
          role: 'owner',
          status: 'active',
          added_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

        // Update user's pending roles
        const { data: userDoc, error: userError } = await supabase
          .from('users')
          .select('pending_roles')
          .eq('id', user.id)
          .single();
          
        if (userError) throw userError;

        let currentPending: string[] = userDoc?.pending_roles || [];
        
        if (!currentPending.includes('seller')) {
          await supabase.from('users').update({
            pending_roles: [...currentPending, 'seller'],
            photo_url: kycData.profilePhotoUrl,
            updated_at: new Date().toISOString()
          }).eq('id', user.id);
        }

        if (requestRole) {
          await requestRole('seller');
        }

        setStep('success');
      } catch (err: any) {
        console.error('Error creating business:', err);
        setError(err.message || 'Failed to register business. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    submitBusiness();
  };

  // File upload handler for Supabase Storage
  const handleFileUpload = (field: 'idDocumentUrl' | 'proofOfAddressUrl' | 'profilePhotoUrl', destination: 'supabase' | 'cloudinary' = 'supabase') => async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          const folder = 'profiles';
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
          // Create a unique file path: kyc/user_id/timestamp_filename
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
          const filePath = `${user.id}/${fileName}`;

          // Upload to 'kyc-documents' bucket
          const { data, error: uploadError } = await supabase.storage
            .from('kyc-documents')
            .upload(filePath, fileToUpload, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error details:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
          }

          // Store the PATH instead of the public URL for private bucket security
          setKycData(prev => ({ ...prev, [field]: filePath }));
          console.log(`Successfully uploaded ${field} to Supabase Storage (Path):`, filePath);
        }
      } catch (err: any) {
        console.error('Error uploading file:', err);
        setError(err.message || 'Failed to upload document. Please try again.');
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
            {step === 'selection' ? 'Become a Seller' : 
             step === 'business_form' ? 'Register Business' : 
             step === 'success' ? 'Application Submitted' : 'Seller Verification (KYC)'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          <AnimatePresence mode="wait">
            {step === 'selection' && (
              <motion.div
                key="selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <p className="text-gray-500 text-lg mb-8">How would you like to sell on the platform?</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={handleIndividualSelect}
                    className="flex flex-col text-left p-6 rounded-3xl border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Store size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Individual Seller</h3>
                    <p className="text-sm text-gray-500 mb-6 flex-1">
                      Perfect for sole proprietors, side-hustlers, and independent merchants. Manage your own store directly.
                    </p>
                    <div className="flex items-center text-emerald-600 font-bold text-sm mt-auto">
                      Continue as Individual <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setKycData(prev => ({ ...prev, type: 'business_seller' }));
                      setStep('kyc_identity');
                    }}
                    className="flex flex-col text-left p-6 rounded-3xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Building2 size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Registered Business</h3>
                    <p className="text-sm text-gray-500 mb-6 flex-1">
                      For registered companies. Unlock multi-branch management, staff accounts, and enterprise features.
                    </p>
                    <div className="flex items-center text-blue-600 font-bold text-sm mt-auto">
                      Register Business <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* KYC Step 1: Identity */}
            {step === 'kyc_identity' && (
              <motion.div
                key="kyc_identity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <UserCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Step 1: Personal Identity</h3>
                    <p className="text-sm text-gray-500">We need to verify your identity to keep the marketplace safe.</p>
                  </div>
                </div>

                <form onSubmit={handleKycSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={kycData.legalName}
                      onChange={e => setKycData({...kycData, legalName: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="As it appears on your ID"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">ID Type *</label>
                      <select
                        required
                        value={kycData.idType}
                        onChange={e => setKycData({...kycData, idType: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                      >
                        <option value="national_id">National ID Card / NIN</option>
                        <option value="passport">International Passport</option>
                        <option value="drivers_license">Driver's License</option>
                        <option value="voters_card">Voter's Card</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">ID Number *</label>
                      <input
                        type="text"
                        required
                        value={kycData.idNumber}
                        onChange={e => setKycData({...kycData, idNumber: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                        placeholder="Enter ID number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Upload ID Document *</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                        <input 
                          type="file" 
                          required={!kycData.idDocumentUrl}
                          onChange={handleFileUpload('idDocumentUrl')}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          accept="image/*,.pdf"
                        />
                        <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                        <p className="text-sm font-medium text-gray-600">
                          {kycData.idDocumentUrl ? (
                            <span className="text-emerald-600 flex items-center justify-center gap-2">
                              <CheckCircle2 size={16} /> Document Uploaded
                            </span>
                          ) : "Click to upload ID"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Profile Photo / Selfie *</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors relative">
                        <input 
                          type="file" 
                          required={!kycData.profilePhotoUrl}
                          onChange={handleFileUpload('profilePhotoUrl', 'cloudinary')}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                          accept="image/*"
                        />
                        <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                        <p className="text-sm font-medium text-gray-600">
                          {kycData.profilePhotoUrl ? (
                            <span className="text-emerald-600 flex items-center justify-center gap-2">
                              <CheckCircle2 size={16} /> Photo Uploaded
                            </span>
                          ) : "Click to upload Photo"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 mt-4">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        id="agreedToTermsKyc"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 bg-white border-gray-300 rounded focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="agreedToTermsKyc" className="text-sm font-medium text-gray-700 cursor-pointer">
                        I have read and agree to the <button type="button" className="text-emerald-600 hover:underline font-bold">Seller Privacy Rules</button> and <button type="button" className="text-emerald-600 hover:underline font-bold">Terms of Service</button>.
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep('selection')}
                      className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors order-2 sm:order-1"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !agreedToTerms}
                      className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center disabled:opacity-70 order-1 sm:order-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : 'Submit Application'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Business Registration Form */}
            {step === 'business_form' && (
              <motion.div
                key="business_form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Business Details</h3>
                    <p className="text-sm text-gray-500">Register your company to unlock enterprise features.</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleBusinessSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Legal Business Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. Zack Technologies Ltd"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Business Type *</label>
                      <select
                        required
                        value={formData.businessType}
                        onChange={e => setFormData({...formData, businessType: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                      >
                        <option value="sole_proprietor">Sole Proprietor</option>
                        <option value="limited">Limited Company (LLC/Ltd)</option>
                        <option value="enterprise">Enterprise / Corp</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Registration / CAC No.</label>
                      <input
                        type="text"
                        value={formData.registrationNumber}
                        onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Business Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1.5">Business Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        placeholder="+234..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Headquarters Address *</label>
                    <textarea
                      required
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-24"
                      placeholder="Full street address"
                    />
                  </div>

                  {existingStore && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          id="convertStore"
                          type="checkbox"
                          checked={convertStore}
                          onChange={(e) => setConvertStore(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label htmlFor="convertStore" className="text-sm font-bold text-gray-900 cursor-pointer">
                          Convert existing store to Business Branch
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          We found your existing store "{existingStore.name}". Checking this will automatically link it to your new business as the main branch, keeping all your products and history.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        id="agreedToTermsBusiness"
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label htmlFor="agreedToTermsBusiness" className="text-sm font-medium text-gray-700 cursor-pointer">
                        I have read and agree to the <button type="button" className="text-blue-600 hover:underline font-bold">Business Privacy Rules</button> and <button type="button" className="text-blue-600 hover:underline font-bold">Terms of Service</button>.
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    {!isUpgrade && (
                      <button
                        type="button"
                        onClick={() => setStep('selection')}
                        className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors order-2 sm:order-1"
                      >
                        Back
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !agreedToTerms}
                      className="w-full sm:flex-1 py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center disabled:opacity-70 order-1 sm:order-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : 'Register Business'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Application Submitted!</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                  Your application has been received. Our team will review your documents and approve your seller account shortly.
                </p>
                <button
                  onClick={() => onComplete()}
                  className="py-3 px-8 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                >
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

export default BecomeSellerModal;
