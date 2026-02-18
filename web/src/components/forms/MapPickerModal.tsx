import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import type { LeafletMouseEvent } from 'leaflet';
import { X, MapPin, Check } from 'lucide-react';

const pickerIcon = new Icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="46" viewBox="0 0 32 46">
      <path fill="#2563EB" stroke="#fff" stroke-width="2" d="M16 1C7.7 1 1 7.7 1 16c0 10.5 15 29 15 29s15-18.5 15-29C31 7.7 24.3 1 16 1z"/>
      <circle cx="16" cy="16" r="8" fill="#fff"/>
      <circle cx="16" cy="16" r="4" fill="#2563EB"/>
    </svg>
  `)}`,
  iconSize: [32, 46],
  iconAnchor: [16, 46],
  popupAnchor: [0, -40],
});

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    container.style.cursor = 'crosshair';
    const handler = (e: LeafletMouseEvent) => onPick(e.latlng.lat, e.latlng.lng);
    map.on('click', handler);
    return () => {
      map.off('click', handler);
      container.style.cursor = '';
    };
  }, [map, onPick]);
  return null;
}

export default function MapPickerModal({ isOpen, onClose, onConfirm, initialLat, initialLng }: Props) {
  const defaultCenter: [number, number] = [initialLat || 14.6407, initialLng || -90.5133];
  const [picked, setPicked] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );

  const handlePick = useCallback((lat: number, lng: number) => {
    setPicked([lat, lng]);
  }, []);

  const handleConfirm = () => {
    if (picked) {
      onConfirm(picked[0], picked[1]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ height: '75vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800">Seleccionar ubicación en mapa</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Hint */}
        <div className="px-4 py-2 bg-blue-50 text-blue-700 text-sm border-b">
          Haz clic en el mapa para seleccionar las coordenadas del incidente.
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <ClickHandler onPick={handlePick} />
            {picked && (
              <Marker position={picked} icon={pickerIcon} />
            )}
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-600">
            {picked ? (
              <span>
                <span className="font-medium text-gray-800">{picked[0].toFixed(6)}</span>
                {', '}
                <span className="font-medium text-gray-800">{picked[1].toFixed(6)}</span>
              </span>
            ) : (
              <span className="text-gray-400">Haz clic en el mapa...</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!picked}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 text-sm flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
