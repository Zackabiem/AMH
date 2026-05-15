import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Info, Globe } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

const markers = [
  { id: 1, lng: 18.4241, lat: -33.9249, title: 'Cape Town Hub', type: 'Market' },
  { id: 2, lng: 3.3792, lat: 6.5244, title: 'Lagos Market', type: 'Logistics' },
  { id: 3, lng: 36.8219, lat: -1.2921, title: 'Nairobi Logistics', type: 'Market' },
  { id: 4, lng: 31.2357, lat: 30.0444, title: 'Cairo Property', type: 'Property' },
  { id: 5, lng: -0.1870, lat: 5.6037, title: 'Accra Port', type: 'Logistics' },
];

interface MapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  showOverlay?: boolean;
}

const Map: React.FC<MapProps> = ({ 
  center = [18.4241, -5], 
  zoom = 3, 
  height = 'h-screen',
  showOverlay = true 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapboxMap = useRef<mapboxgl.Map | null>(null);
  const [useMapbox, setUseMapbox] = useState(false);

  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (token && token.startsWith('pk.')) {
      setUseMapbox(true);
      mapboxgl.accessToken = token;
    } else {
      setUseMapbox(false);
    }
  }, []);

  useEffect(() => {
    if (!useMapbox || !mapContainer.current || mapboxMap.current) return;

    mapboxMap.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: center as [number, number],
      zoom: zoom
    });

    mapboxMap.current.addControl(new mapboxgl.NavigationControl());

    markers.forEach(m => {
      new mapboxgl.Marker({ color: '#059669' })
        .setLngLat([m.lng, m.lat])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-sm">${m.title}</h3>
            <p class="text-xs text-gray-500">${m.type}</p>
          </div>
        `))
        .addTo(mapboxMap.current!);
    });

    return () => {
      mapboxMap.current?.remove();
      mapboxMap.current = null;
    };
  }, [useMapbox, center, zoom]);

  if (!useMapbox) {
    return (
      <div className={`relative ${height} w-full bg-gray-50`}>
        <MapContainer 
          center={[center[1], center[0]]} 
          zoom={zoom} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map(m => (
            <Marker key={m.id} position={[m.lat, m.lng]}>
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-sm">{m.title}</h3>
                  <p className="text-xs text-gray-500">{m.type}</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {showOverlay && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-black/5 max-w-xs z-[1000]">
            <h3 className="font-bold text-emerald-600 mb-1 flex items-center gap-2">
              <Globe size={16} />
              AMH Live Map
            </h3>
            <p className="text-[10px] text-gray-500 mb-3">
              Showing active logistics and market hubs across Africa.
            </p>
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-xl border border-amber-100">
              <Info size={14} className="text-amber-600 shrink-0" />
              <p className="text-[9px] text-amber-800 leading-tight">
                Using OpenStreetMap. For high-performance vector maps, add a Mapbox token.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${height} w-full`}>
      <div ref={mapContainer} className="h-full w-full" />
      {showOverlay && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-black/5 max-w-xs z-10">
          <h3 className="font-bold text-emerald-600 mb-1 flex items-center gap-2">
            <MapPin size={16} />
            AMH Premium Map
          </h3>
          <p className="text-xs text-gray-500">Enhanced vector visualization active.</p>
        </div>
      )}
    </div>
  );
};

export default Map;
