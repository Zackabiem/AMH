import React, { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';
import { fromLonLat, toLonLat } from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Icon, Circle, Fill, Stroke } from 'ol/style';

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  type: 'driver' | 'pickup' | 'dropoff';
  label?: string;
}

interface OpenLayersMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MarkerData[];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export const OpenLayersMap: React.FC<OpenLayersMapProps> = ({
  center = { lat: 9.0820, lng: 8.6753 }, // Default to Nigeria center
  zoom = 6,
  markers = [],
  onMapClick,
  className = 'w-full h-[400px] rounded-xl overflow-hidden'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const vectorSourceRef = useRef(new VectorSource());

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current) return;

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
    });

    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([center.lng, center.lat]),
        zoom: zoom,
        enableRotation: false,
      }),
      controls: [] // Remove default zoom controls for cleaner UI
    });

    setMap(initialMap);

    return () => {
      initialMap.setTarget(undefined);
    };
  }, []); // Run once on mount

  // Handle map center updates
  useEffect(() => {
    if (!map) return;
    map.getView().animate({
      center: fromLonLat([center.lng, center.lat]),
      duration: 500, // Smooth transition
    });
  }, [center, map]);

  // Handle markers updates
  useEffect(() => {
    if (!map) return;
    
    // Clear old markers
    vectorSourceRef.current.clear();

    // Add new markers
    markers.forEach(marker => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([marker.lng, marker.lat])),
      });

      // Style based on marker type
      let color = '#3b82f6'; // default blue
      if (marker.type === 'driver') color = '#10b981'; // emerald
      if (marker.type === 'pickup') color = '#f59e0b'; // amber
      if (marker.type === 'dropoff') color = '#ef4444'; // red

      feature.setStyle(new Style({
        image: new Circle({
          radius: 8,
          fill: new Fill({ color }),
          stroke: new Stroke({ color: '#ffffff', width: 2 })
        })
      }));

      vectorSourceRef.current.addFeature(feature);
    });
  }, [markers, map]);

  // Handle map clicks
  useEffect(() => {
    if (!map || !onMapClick) return;

    const clickHandler = (e: any) => {
      const coords = toLonLat(e.coordinate);
      onMapClick(coords[1], coords[0]); // Return lat, lng
    };

    map.on('click', clickHandler);

    return () => {
      map.un('click', clickHandler);
    };
  }, [map, onMapClick]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="absolute inset-0" />
      
      {/* Map UI Overlay placeholders */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button 
          onClick={() => map && map.getView().setZoom((map.getView().getZoom() || 6) + 1)}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center font-bold text-gray-700 hover:text-emerald-600 border border-gray-100"
        >
          +
        </button>
        <button 
          onClick={() => map && map.getView().setZoom((map.getView().getZoom() || 6) - 1)}
          className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center font-bold text-gray-700 hover:text-emerald-600 border border-gray-100"
        >
          -
        </button>
      </div>
    </div>
  );
};
