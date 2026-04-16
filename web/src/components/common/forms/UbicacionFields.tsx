import { useState, useEffect } from 'react';
import { api } from '../../../services/api';
import { SENTIDOS } from '../../../constants/situacionTypes';
import MapPickerModal from './MapPickerModal';

interface Props {
  km: string;
  kmFin?: string;
  showKmFin?: boolean;
  sentido: string;
  latitud: string;
  longitud: string;
  departamentoId: number | null;
  municipioId: number | null;
  departamentos: any[];
  onChange: (field: string, value: any) => void;
}

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none';
const labelCls = 'text-xs text-gray-500 dark:text-gray-400';

export default function UbicacionFields({
  km, kmFin, showKmFin, sentido, latitud, longitud,
  departamentoId, municipioId, departamentos, onChange,
}: Props) {
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Cargar municipios cuando cambia departamento
  useEffect(() => {
    if (!departamentoId) {
      setMunicipios([]);
      return;
    }
    const load = async () => {
      try {
        const { data } = await api.get(`/geografia/departamentos/${departamentoId}/municipios`);
        setMunicipios(Array.isArray(data) ? data : data.municipios || []);
      } catch {
        setMunicipios([]);
      }
    };
    load();
  }, [departamentoId]);

  return (
    <>
      {/* MapPickerModal */}
      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={(lat, lng) => {
          onChange('latitud', lat.toFixed(6));
          onChange('longitud', lng.toFixed(6));
        }}
        initialLat={latitud ? parseFloat(latitud) : undefined}
        initialLng={longitud ? parseFloat(longitud) : undefined}
      />

      {/* Ubicacion */}
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-4 mb-2">Ubicacion</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>KM *</label>
          <input type="number" value={km} min={0} max={999} step={0.1}
            onChange={e => onChange('km', e.target.value)}
            className={inputCls} placeholder="0.0" />
        </div>
        {showKmFin && (
          <div>
            <label className={labelCls}>KM Fin</label>
            <input type="number" value={kmFin || ''} min={0} max={999} step={0.1}
              onChange={e => onChange('km_fin', e.target.value)}
              className={inputCls} placeholder="0.0" />
          </div>
        )}
        <div>
          <label className={labelCls}>Sentido *</label>
          <select value={sentido} onChange={e => onChange('sentido', e.target.value)}
            className={inputCls}>
            <option value="">Seleccionar</option>
            {SENTIDOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Latitud</label>
          <input type="text" value={latitud}
            onChange={e => onChange('latitud', e.target.value)}
            className={inputCls} placeholder="14.6349" />
        </div>
        <div>
          <label className={labelCls}>Longitud</label>
          <input type="text" value={longitud}
            onChange={e => onChange('longitud', e.target.value)}
            className={inputCls} placeholder="-90.5069" />
        </div>
      </div>
      {/* Botón pin en mapa */}
      <button
        type="button"
        onClick={() => setShowMapPicker(true)}
        className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
      >
        📍 {latitud && longitud ? 'Mover pin en mapa' : 'Seleccionar en mapa'}
      </button>

      {/* Departamento / Municipio */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className={labelCls}>Departamento</label>
          <select value={departamentoId || ''}
            onChange={e => {
              onChange('departamento_id', e.target.value ? parseInt(e.target.value) : null);
              onChange('municipio_id', null);
            }}
            className={inputCls}>
            <option value="">Seleccionar</option>
            {departamentos.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Municipio</label>
          <select value={municipioId || ''} disabled={!departamentoId}
            onChange={e => onChange('municipio_id', e.target.value ? parseInt(e.target.value) : null)}
            className={`${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`}>
            <option value="">Seleccionar</option>
            {municipios.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      </div>
    </>
  );
}
