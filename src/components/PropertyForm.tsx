import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Upload, Loader2, Home, Building2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { toast } from 'sonner';

interface PropertyFormProps {
  onClose: () => void;
  onSuccess?: () => void;
  propertyToEdit?: any;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ onClose, onSuccess, propertyToEdit }) => {
  const { user } = useAuth() || {};
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('Residential');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');

  const propertyTypes = ['Residential', 'Office', 'Warehouse', 'Retail', 'Land'];

  useEffect(() => {
    if (propertyToEdit) {
      setTitle(propertyToEdit.title || '');
      setDescription(propertyToEdit.description || '');
      setPrice(propertyToEdit.price?.toString() || '');
      setType(propertyToEdit.type || 'Residential');
      setLocation(propertyToEdit.location || '');
      setLat(propertyToEdit.lat?.toString() || '');
      setLng(propertyToEdit.lng?.toString() || '');
      setPreview(propertyToEdit.image_url || '');
    }
  }, [propertyToEdit]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const uploadImage = async (fileToUpload: File): Promise<string> => {
    const ext = fileToUpload.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${ext}`;
    const filePath = `properties/${user?.id}/${fileName}`;
    
    setUploadStatus('Uploading image...');
    
    // Check if bucket exists/is accessible by uploading. If the bucket doesn't exist, this might fail, so we fallback to a placeholder if we want
    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(filePath, fileToUpload);

    if (uploadError) {
      if (!uploadError.message.includes('Bucket not found') && !uploadError.message.includes('not exist')) {
        throw uploadError;
      }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('public')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    setUploadStatus('Processing...');

    try {
      let finalImageUrl = preview;
      
      if (file) {
        finalImageUrl = await uploadImage(file);
      }

      const propertyData = {
        owner_id: user.id,
        title,
        description,
        price: parseFloat(price) || 0,
        type,
        location,
        lat: parseFloat(lat) || null,
        lng: parseFloat(lng) || null,
        image_url: finalImageUrl
      };

      if (propertyToEdit) {
        setUploadStatus('Updating listing...');
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', propertyToEdit.id);
        
        if (error) throw error;
        toast.success('Property updated successfully!');
      } else {
        setUploadStatus('Creating listing...');
        const { error } = await supabase
          .from('properties')
          .insert([propertyData]);
          
        if (error) throw error;
        toast.success('Property listed successfully!');
      }

      if (onSuccess) onSuccess();

      try {
        await fetch('/api/estate-clear', { method: 'POST' });
        console.log('Property feed cache cleared');
      } catch (cacheErr) {
        console.warn('Failed to clear property feed cache:', cacheErr);
      }

    } catch (error: any) {
      console.error('Error saving property:', error);
      toast.error(error.message || 'Error saving property');
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl bg-white h-full overflow-y-auto refine-scrollbar flex flex-col shadow-2xl"
      >
        <div className="sticky top-0 bg-white/90 backdrop-blur-md z-10 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">{propertyToEdit ? 'Edit Property' : 'Add New Property'}</h2>
            <p className="text-gray-500 text-sm mt-1">Fill out the details below to list your property.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-gray-50 text-gray-500 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 p-8">
          <form id="property-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Property Image</label>
              <div 
                className={`w-full h-48 border-2 border-dashed rounded-3xl overflow-hidden relative flex flex-col items-center justify-center transition-colors group cursor-pointer ${
                  preview ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400'
                }`}
                onClick={() => document.getElementById('property-image-upload')?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-black/5 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={20} className="text-gray-400" />
                    </div>
                    <span className="font-bold text-gray-600">Click to upload image</span>
                    <span className="text-gray-400 text-xs mt-1">JPEG, PNG up to 5MB</span>
                  </>
                )}
                <input 
                  id="property-image-upload"
                  type="file" 
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Property Title</label>
                <input 
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 5 Bedroom Detached Duplex"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Price (NGN)</label>
                <input 
                  type="number"
                  required
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 150000000"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Property Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all appearance-none"
                >
                  {propertyTypes.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Location/Address</label>
                <div className="flex items-center gap-2">
                  <div className="bg-gray-100 p-4 rounded-xl text-gray-500">
                    <MapPin size={20} />
                  </div>
                  <input 
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. 123 Banana Island, Lagos"
                    className="flex-1 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Latitude (Map)</label>
                <input 
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 6.454"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Longitude (Map)</label>
                <input 
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. 3.4"
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                <textarea 
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the property, features, and nearby landmarks..."
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                />
              </div>
            </div>

          </form>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50 mt-auto">
          <button
            type="submit"
            form="property-form"
            disabled={submitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                <span>{uploadStatus || 'Processing...'}</span>
              </>
            ) : (
              <>
                {propertyToEdit ? 'Save Changes' : 'List Property'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PropertyForm;
