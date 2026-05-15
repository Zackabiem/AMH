import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../App';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Globe, 
  UserCircle, 
  Edit3, 
  Save, 
  X, 
  Camera,
  CheckCircle2,
  Loader2,
  Upload,
  Bell,
  ShieldCheck,
  Plus,
  Trash2,
  Star,
  ShoppingBag,
  Store,
  Truck,
  Home,
  CreditCard,
  Building2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

import imageCompression from 'browser-image-compression';

const UserProfile: React.FC = () => {
  const { user, profile, updateProfile, switchRole } = useAuth() || {};
  const isProfileComplete = profile && profile.phone && profile.country && profile.state && profile.address;
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    otherNames: '',
    address: '',
    phone: '',
    dob: '',
    gender: '',
    nationality: '',
    country: '',
    state: '',
    lga: '',
    bio: '',
    addresses: [] as any[],
    notificationPreferences: {
      email: true,
      sms: false,
      push: true
    }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [lgas, setLgas] = useState<any[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingLgas, setLoadingLgas] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCountries = async (retryCount = 0) => {
      setLoadingCountries(true);
      try {
        const { data, error } = await supabase
          .from('countries')
          .select('*')
          .order('name');
        
        if (error) {
          if (retryCount < 3 && (
            error.message?.includes('fetch') || 
            error.message?.includes('Lock') || 
            error.message?.includes('AbortError') ||
            error.message?.includes('steal') ||
            error.message?.includes('Failed to fetch')
          )) {
            const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
            setTimeout(() => isMounted && fetchCountries(retryCount + 1), delay);
            return;
          }
          throw error;
        }
        if (isMounted) setCountries(data || []);
      } catch (err) {
        console.error('Error fetching countries:', err);
      } finally {
        if (isMounted) setLoadingCountries(false);
      }
    };
    fetchCountries();
    return () => { isMounted = false; };
  }, []);

  // Fetch States when Country changes
  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.country) {
        setStates([]);
        return;
      }
      setLoadingStates(true);
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ country: formData.country })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.error) {
          setStates(result.data.states || []);
        }
      } catch (err: any) {
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          console.warn('States API unreachable or blocked by CORS. Using fallback empty list.');
        } else {
          console.error('Error fetching states:', err);
        }
        setStates([]);
      } finally {
        setLoadingStates(false);
      }
    };
    fetchStates();
  }, [formData.country]);

  // Fetch Cities/LGAs when State changes
  useEffect(() => {
    const fetchLgas = async () => {
      if (!formData.state || !formData.country) {
        setLgas([]);
        return;
      }
      setLoadingLgas(true);
      try {
        const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            country: formData.country,
            state: formData.state 
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (!result.error) {
          setLgas(result.data || []);
        }
      } catch (err: any) {
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          console.warn('Cities API unreachable or blocked by CORS. Using fallback empty list.');
        } else {
          console.error('Error fetching LGAs:', err);
        }
        setLgas([]);
      } finally {
        setLoadingLgas(false);
      }
    };
    fetchLgas();
  }, [formData.state, formData.country]);

  useEffect(() => {
    if (profile) {
      const initialData = {
        username: profile.username || '',
        firstName: profile.first_name || profile.firstName || '',
        lastName: profile.last_name || profile.lastName || '',
        otherNames: profile.other_names || profile.otherNames || '',
        address: profile.address || '',
        phone: profile.phone || '',
        dob: profile.dob || '',
        gender: profile.gender || '',
        nationality: profile.nationality || '',
        country: profile.country || '',
        state: profile.state || '',
        lga: profile.lga || '',
        bio: profile.bio || '',
        addresses: profile.addresses || [],
        notificationPreferences: profile.notification_preferences || profile.notificationPreferences || {
          email: true,
          sms: false,
          push: true
        }
      };
      setFormData(initialData);
      setHasUnsavedChanges(false);
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setHasUnsavedChanges(true);
    
    // Reset state and LGA if country changes
    if (name === 'country') {
      setFormData(prev => ({ ...prev, country: value, state: '', lga: '' }));
      return;
    }

    // Reset LGA if state changes
    if (name === 'state') {
      setFormData(prev => ({ ...prev, state: value, lga: '' }));
      return;
    }

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name.startsWith('notify_')) {
        const pref = name.replace('notify_', '');
        setFormData(prev => ({
          ...prev,
          notificationPreferences: {
            ...prev.notificationPreferences,
            [pref]: checked
          }
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTogglePreference = (pref: string) => {
    if (!isEditing) return;
    setHasUnsavedChanges(true);
    setFormData(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [pref]: !(prev.notificationPreferences as any)[pref]
      }
    }));
  };

  const handleAddAddress = () => {
    setHasUnsavedChanges(true);
    const newAddress = {
      id: Math.random().toString(36).substr(2, 9),
      label: '',
      address: '',
      isDefault: (formData.addresses || []).length === 0
    };
    setFormData(prev => ({
      ...prev,
      addresses: [...(prev.addresses || []), newAddress]
    }));
  };

  const handleRemoveAddress = (id: string) => {
    setHasUnsavedChanges(true);
    setFormData(prev => ({
      ...prev,
      addresses: (prev.addresses || []).filter(a => a.id !== id)
    }));
  };

  const handleAddressChange = (id: string, field: string, value: string | boolean) => {
    setHasUnsavedChanges(true);
    setFormData(prev => ({
      ...prev,
      addresses: (prev.addresses || []).map(a => {
        if (a.id === id) {
          if (field === 'isDefault' && value === true) {
            // Unset other defaults if this one is set to true
            return { ...a, [field]: value };
          }
          return { ...a, [field]: value };
        }
        if (field === 'isDefault' && value === true) {
          return { ...a, isDefault: false };
        }
        return a;
      })
    }));
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setShowDiscardModal(true);
    }
  };

  const confirmDiscard = () => {
    if (profile) {
      setFormData({
        username: profile.username || '',
        firstName: profile.first_name || profile.firstName || '',
        lastName: profile.last_name || profile.lastName || '',
        otherNames: profile.other_names || profile.otherNames || '',
        address: profile.address || '',
        phone: profile.phone || '',
        dob: profile.dob || '',
        gender: profile.gender || '',
        nationality: profile.nationality || '',
        country: profile.country || '',
        state: profile.state || '',
        lga: profile.lga || '',
        bio: profile.bio || '',
        addresses: profile.addresses || [],
        notificationPreferences: profile.notification_preferences || profile.notificationPreferences || {
          email: true,
          sms: false,
          push: true
        }
      });
    }
    setHasUnsavedChanges(false);
    setShowDiscardModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateProfile) return;
    
    // Validate required fields
    if (!formData.phone || !formData.country || !formData.state || !formData.address) {
      alert("Please fill in all required fields: Phone, Country, State, and Address.");
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    setIsSaving(true);
    try {
      // Map camelCase to snake_case for Supabase
      const mappedData = {
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        other_names: formData.otherNames,
        address: formData.address,
        phone: formData.phone,
        dob: formData.dob,
        gender: formData.gender,
        nationality: formData.nationality,
        country: formData.country,
        state: formData.state,
        lga: formData.lga,
        bio: formData.bio,
        addresses: formData.addresses,
        notification_preferences: formData.notificationPreferences
      };
      await updateProfile(mappedData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setShowPasswordPrompt(false);
      setPasswordInput('');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Failed to save profile: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
      setIsVerifyingPassword(false);
    }
  };

  const handlePasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    
    setIsVerifyingPassword(true);
    setPasswordError('');
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordInput
      });
      
      if (error) {
        setPasswordError('Incorrect password. Please try again.');
        setIsVerifyingPassword(false);
        return;
      }
      
      // Password verified, proceed with save
      await performSave();
    } catch (err) {
      setPasswordError('An error occurred. Please try again.');
      setIsVerifyingPassword(false);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !updateProfile) return;

    setIsUploadingPhoto(true);
    setUploadError(null);
    setUploadStatus('Optimizing image...');

    try {
      const uid = profile.id;
      if (!uid) {
        throw new Error('User ID not found in profile');
      }

      // Compress image
      const options = {
        maxSizeMB: 0.5, // Target 500KB
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };

      let fileToUpload: File | Blob = file;
      try {
        fileToUpload = await imageCompression(file, options);
        console.log(`Compressed from ${file.size / 1024 / 1024}MB to ${fileToUpload.size / 1024 / 1024}MB`);
      } catch (compressionError) {
        console.warn('Compression failed, uploading original:', compressionError);
      }

      setUploadStatus('Uploading to server...');
      
      // 1. Get secure upload signature from our Vercel API
      const signResponse = await fetch('/api/cloudinary/sign', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'profiles' })
      });
      if (!signResponse.ok) {
        throw new Error('Failed to get upload signature. Make sure Cloudinary credentials are set.');
      }
      const signData = await signResponse.json();

      // 2. Upload directly from browser to Cloudinary
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('api_key', signData.apiKey);
      formData.append('timestamp', signData.timestamp);
      formData.append('signature', signData.signature);
      formData.append('folder', signData.folder);

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image to Cloudinary');
      }

      setUploadStatus('Finalizing...');
      const uploadData = await uploadResponse.json();
      const publicUrl = uploadData.secure_url;
      
      console.log('Download URL obtained:', publicUrl);
      
      await updateProfile({ photo_url: publicUrl });
      setUploadStatus(null);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      setUploadError(message);
      alert(`Upload failed: ${message}`);
      
      setUploadStatus(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-[40px] border border-black/5 shadow-sm overflow-hidden">
        {/* Header / Cover */}
        <div className="h-48 bg-emerald-600 relative">
          <div className="absolute -bottom-16 left-12">
            <div className="relative group">
              <div className="w-32 h-32 bg-white rounded-[32px] p-2 shadow-xl">
                <div className="w-full h-full bg-emerald-100 rounded-[24px] flex flex-col items-center justify-center text-emerald-600 overflow-hidden">
                  {isUploadingPhoto ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin" size={32} />
                      <p className="text-[8px] font-black uppercase tracking-widest px-2 text-center leading-tight">
                        {uploadStatus || 'Processing...'}
                      </p>
                    </div>
                  ) : profile.photo_url ? (
                    <img src={profile.photo_url} className="w-full h-full object-cover rounded-[20px]" alt="Profile" />
                  ) : (
                    <User size={64} />
                  )}
                </div>
              </div>
              <label className="absolute bottom-2 right-2 p-2 bg-white rounded-xl shadow-lg text-gray-500 hover:text-emerald-600 transition-colors cursor-pointer">
                <Camera size={18} />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleProfilePictureChange}
                  disabled={isUploadingPhoto}
                />
              </label>
            </div>
            {uploadError && (
              <div className="absolute -bottom-24 left-0 w-64 bg-rose-50 text-rose-600 p-3 rounded-xl text-[10px] font-bold border border-rose-100 shadow-sm">
                Upload Error: {uploadError}
              </div>
            )}
          </div>
        </div>

        <div className="pt-20 pb-12 px-12">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-gray-900">
                {profile.first_name && profile.last_name ? `${profile.first_name} ${profile.last_name}` : profile.username}
              </h2>
              <div className="flex items-center gap-4 mt-1">
                <p className="text-gray-500 font-bold">@{profile.username || 'username'}</p>
                {profile.buyerTrustScore !== undefined && (
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                    <Star size={10} fill="currentColor" />
                    Trust Score: {profile.buyerTrustScore}%
                  </div>
                )}
              </div>
            </div>
            
            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-bold hover:bg-emerald-100 transition-all"
              >
                <Edit3 size={18} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Password Prompt Modal for Bank Details */}
          <AnimatePresence>
            {showPasswordPrompt && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
                >
                  <div className="flex items-center gap-3 mb-4 text-amber-600">
                    <ShieldCheck size={28} />
                    <h3 className="text-xl font-black text-gray-900">Security Verification</h3>
                  </div>
                  <p className="text-gray-500 font-bold mb-6">
                    You are about to change your sensitive bank details. For your security, please re-enter your password to confirm.
                  </p>
                  
                  <form onSubmit={handlePasswordVerify} className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-black/5 rounded-2xl font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Enter your password"
                        required
                      />
                      {passwordError && (
                        <p className="text-rose-500 text-sm mt-2 flex items-center gap-1 font-bold">
                          <AlertCircle size={14} />
                          {passwordError}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordPrompt(false);
                          setPasswordInput('');
                          setPasswordError('');
                        }}
                        className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isVerifyingPassword}
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                      >
                        {isVerifyingPassword ? <Loader2 className="animate-spin" size={16} /> : 'Verify & Save'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {showDiscardModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl"
              >
                <h3 className="text-xl font-black text-gray-900 mb-2">Discard Changes?</h3>
                <p className="text-gray-500 font-bold mb-8">You have unsaved changes. Are you sure you want to discard them?</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDiscardModal(false)}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all"
                  >
                    Keep Editing
                  </button>
                  <button 
                    onClick={confirmDiscard}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-700 transition-all shadow-lg shadow-rose-100"
                  >
                    Discard
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {saveSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center gap-3 font-bold text-sm border border-emerald-100"
            >
              <CheckCircle2 size={18} />
              Profile updated successfully!
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-12">
            {isEditing && (
              <div className="flex justify-end gap-3 mb-8">
                <button 
                  type="submit"
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            )}
            {/* Basic Info Section */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                <UserCircle size={14} />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Username</label>
                  <div className="relative">
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">@</div>
                    <input 
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="johndoe"
                      className="w-full pl-10 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold disabled:bg-gray-50/50 disabled:text-gray-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">First Name</label>
                  <input 
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="John"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Last Name</label>
                  <input 
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Doe"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Other Names</label>
                  <input 
                    type="text"
                    name="otherNames"
                    value={formData.otherNames}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="Middle Name"
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      placeholder="+234 800 000 0000"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Demographic Section */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                <Globe size={14} />
                Demographics & Location
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Gender</label>
                  <select 
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900 appearance-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Nationality</label>
                  <select 
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleChange}
                    disabled={!isEditing || loadingCountries}
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900 appearance-none"
                  >
                    <option value="">Select Nationality</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Country</label>
                  <select 
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    disabled={!isEditing || loadingCountries}
                    required
                    className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900 appearance-none"
                  >
                    <option value="">Select Country</option>
                    {countries.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">State / Province</label>
                  <div className="relative">
                    <select 
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      disabled={!isEditing || loadingStates || !formData.country}
                      required
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900 appearance-none"
                    >
                      <option value="">{loadingStates ? 'Loading States...' : 'Select State'}</option>
                      {states.map((s, idx) => (
                        <option key={idx} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                    {loadingStates && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald-600" size={16} />}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Local Government / City</label>
                  <div className="relative">
                    <select 
                      name="lga"
                      value={formData.lga}
                      onChange={handleChange}
                      disabled={!isEditing || loadingLgas || !formData.state}
                      className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900 appearance-none"
                    >
                      <option value="">{loadingLgas ? 'Loading Cities...' : 'Select City / LGA'}</option>
                      {lgas.map((l, idx) => (
                        <option key={idx} value={l}>{l}</option>
                      ))}
                    </select>
                    {loadingLgas && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-emerald-600" size={16} />}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Residential Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      placeholder="123 Market Street, Lagos"
                      className="w-full pl-14 pr-6 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 transition-all font-bold disabled:bg-gray-50/50 disabled:text-gray-900"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Bio Section */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                <Edit3 size={14} />
                About You
              </h3>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Bio / Description</label>
                <textarea 
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  disabled={!isEditing}
                  placeholder="Tell us a bit about yourself..."
                  className="w-full px-6 py-4 bg-gray-50 border-none rounded-3xl focus:ring-2 focus:ring-emerald-500 transition-all font-medium h-32 resize-none disabled:bg-gray-50/50 disabled:text-gray-900"
                />
              </div>
            </section>

            {/* Shipping Addresses Section */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                  <MapPin size={14} />
                  Shipping Addresses
                </h3>
                {isEditing && (
                  <button 
                    type="button"
                    onClick={handleAddAddress}
                    className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition-colors"
                  >
                    <Plus size={12} />
                    Add Address
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                {(formData.addresses || []).length === 0 ? (
                  <div className="p-8 bg-gray-50 rounded-3xl text-center border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 text-sm font-medium">No shipping addresses saved yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {(formData.addresses || []).map((addr) => (
                      <div 
                        key={addr.id} 
                        className={cn(
                          "p-6 rounded-3xl border transition-all relative group",
                          addr.isDefault ? "bg-emerald-50/30 border-emerald-100" : "bg-gray-50 border-black/5"
                        )}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                              addr.isDefault ? "bg-emerald-600 text-white" : "bg-white text-gray-400"
                            )}>
                              <MapPin size={20} />
                            </div>
                            <div>
                              {isEditing ? (
                                <input 
                                  type="text"
                                  value={addr.label}
                                  onChange={(e) => handleAddressChange(addr.id, 'label', e.target.value)}
                                  placeholder="Address Label (e.g. Home)"
                                  className="bg-transparent border-none p-0 text-sm font-black text-gray-900 focus:ring-0 placeholder:text-gray-300"
                                />
                              ) : (
                                <p className="text-sm font-black text-gray-900">{addr.label || 'Untitled Address'}</p>
                              )}
                              {addr.isDefault && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">Default</span>
                              )}
                            </div>
                          </div>
                          {isEditing && (
                            <button 
                              type="button"
                              onClick={() => handleRemoveAddress(addr.id)}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>

                        <div className="space-y-1">
                          {isEditing ? (
                            <textarea 
                              value={addr.address}
                              onChange={(e) => handleAddressChange(addr.id, 'address', e.target.value)}
                              placeholder="Full delivery address..."
                              className="w-full px-4 py-3 bg-white border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 h-20 resize-none"
                            />
                          ) : (
                            <p className="text-sm font-bold text-gray-600 leading-relaxed">{addr.address || 'No address details provided.'}</p>
                          )}
                        </div>

                        {isEditing && (
                          <div className="mt-4 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAddressChange(addr.id, 'isDefault', !addr.isDefault)}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                addr.isDefault 
                                  ? "bg-emerald-600 text-white" 
                                  : "bg-white text-gray-400 border border-black/5 hover:bg-gray-50"
                              )}
                            >
                              {addr.isDefault ? <CheckCircle2 size={12} /> : <div className="w-3 h-3 rounded-full border-2 border-current" />}
                              {addr.isDefault ? 'Default Address' : 'Set as Default'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Notification Preferences Section */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                <Bell size={14} />
                Notification Preferences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Order updates & receipts' },
                  { id: 'sms', label: 'SMS Alerts', desc: 'Delivery status & urgent info' },
                  { id: 'push', label: 'Push Notifications', desc: 'Real-time app alerts' }
                ].map((pref) => (
                  <div key={pref.id} className="p-6 bg-gray-50 rounded-3xl border border-black/5 flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm",
                        (formData.notificationPreferences as any)[pref.id] ? "bg-emerald-100 text-emerald-600" : "bg-white text-gray-400"
                      )}>
                        <Bell size={20} />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePreference(pref.id)}
                        disabled={!isEditing}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          (formData.notificationPreferences as any)[pref.id] ? "bg-emerald-600" : "bg-gray-200",
                          !isEditing && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <motion.div 
                          animate={{ x: (formData.notificationPreferences as any)[pref.id] ? 24 : 4 }}
                          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{pref.label}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-1 leading-relaxed">{pref.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Account Security Section */}
            <section>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                <ShieldCheck size={14} />
                Account Status
              </h3>
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-emerald-900">Verified Account</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Your account is in good standing</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Buyer Trust Score</p>
                  <p className="text-2xl font-black text-emerald-900">{profile.buyerTrustScore || 100}%</p>
                </div>
              </div>
            </section>

            {isEditing && (
              <div className="flex justify-end gap-3 pt-8 border-t border-black/5">
                {isProfileComplete && (
                  <button 
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 bg-gray-50 text-gray-500 px-6 py-3 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                )}
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Changes
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
