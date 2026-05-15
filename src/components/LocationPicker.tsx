import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

const LocationMarker = ({ position, setPosition, onLocationSelect }: any) => {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onLocationSelect(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, 15);
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const LocationPicker: React.FC<LocationPickerProps> = ({ latitude, longitude, onLocationSelect }) => {
  const [position, setPosition] = useState<L.LatLng | null>(
    latitude && longitude ? new L.LatLng(latitude, longitude) : null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocateMe = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const newPos = new L.LatLng(latitude, longitude);
        setPosition(newPos);
        onLocationSelect(latitude, longitude);
        setLoading(false);
      },
      (err) => {
        setError('Unable to retrieve your location. Please ensure location services are enabled.');
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">Precise Location (GPS)</label>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
          Locate Me
        </button>
      </div>
      
      {error && <p className="text-xs text-red-500">{error}</p>}
      
      <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 relative z-0">
        <MapContainer
          center={position || [0, 0]}
          zoom={position ? 15 : 2}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} setPosition={setPosition} onLocationSelect={onLocationSelect} />
        </MapContainer>
        
        {!position && !loading && (
          <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px] flex items-center justify-center z-[400] pointer-events-none">
            <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm text-gray-600 flex items-center gap-2">
              <MapPin size={16} />
              Click "Locate Me" or tap on the map
            </div>
          </div>
        )}
      </div>
      
      {position && (
        <p className="text-xs text-gray-500">
          Selected Coordinates: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default LocationPicker;
