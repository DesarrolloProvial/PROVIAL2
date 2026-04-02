import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, RefreshCw, MapPin } from 'lucide-react';
import { api } from '../../services/api';

const ICONOS = [
  { emoji: '📍', label: 'Marcador' },
  { emoji: '🏥', label: 'Hospital' },
  { emoji: '⛽', label: 'Combustible' },
  { emoji: '🚦', label: 'Semáforo' },
  { emoji: '🚧', label: 'Obstrucción' },
  { emoji: '🏛', label: 'Institución' },
  { emoji: '🏫', label: 'Escuela' },
  { emoji: '🏪', label: 'Comercio' },
  { emoji: '🔧', label: 'Taller' },
  { emoji: '⚠️', label: 'Peligro' },
  { emoji: '🚔', label: 'Policía' },
  { emoji: '🚑', label: 'Ambulancia' },
  { emoji: '🚒', label: 'Bomberos' },
  { emoji: '📡', label: 'Antena' },
  { emoji: '🌳', label: 'Zona verde' },
  { emoji: '💧', label: 'Agua' },
  { emoji: '🔥', label: 'Peligro fuego' },
  { emoji: '⭐', label: 'Destacado' },
  { emoji: '🔴', label: 'Alerta' },
  { emoji: '🟢', label: 'Habilitado' },
  { emoji: '🟡', label: 'Precaución' },
  { emoji: '🏗', label: 'Construcción' },
  { emoji: '🅿️', label: 'Parqueo' },
  { emoji: '🛡', label: 'Puesto control' },
];

interface Capa { id: number; nombre: string; color: string; icono: string; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  capas: Capa[];
  initialLat?: number;
  initialLng?: number;
}

export default function CrearPuntoMapaModal({ isOpen, onClose, onCreated, capas, initialLat, initialLng }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    capa_id: '' as string | number,
    titulo: '',
    descripcion: '',
    latitud: initialLat?.toString() ?? '',
    longitud: initialLng?.toString() ?? '',
    categoria: '',
    icono: '📍',
  });

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!form.capa_id || !form.titulo || !form.latitud || !form.longitud) {
      setError('Capa, título y coordenadas son requeridos');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.post(`/capas-mapa/${form.capa_id}/puntos`, {
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        latitud: parseFloat(form.latitud),
        longitud: parseFloat(form.longitud),
        categoria: form.categoria || undefined,
        icono_url: form.icono,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear punto');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="font-bold text-gray-900 dark:text-gray-100">Agregar Punto al Mapa</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capa *</label>
            <select
              value={form.capa_id}
              onChange={e => set('capa_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Seleccionar capa...</option>
              {capas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
            <input
              value={form.titulo}
              onChange={e => set('titulo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Nombre del punto"
            />
          </div>

          {/* Selector de icono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Icono — <span className="text-2xl">{form.icono}</span>
            </label>
            <div className="grid grid-cols-8 gap-1">
              {ICONOS.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => set('icono', emoji)}
                  title={label}
                  className={`w-9 h-9 flex items-center justify-center text-xl rounded-lg border-2 transition ${
                    form.icono === emoji
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-sm'
                      : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
            <input
              value={form.categoria}
              onChange={e => set('categoria', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Ej: Norte, KM 45, Zona 1..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitud *</label>
              <input
                type="number" step="0.000001"
                value={form.latitud}
                onChange={e => set('latitud', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="14.6407"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitud *</label>
              <input
                type="number" step="0.000001"
                value={form.longitud}
                onChange={e => set('longitud', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="-90.5133"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Descripción, notas, datos de contacto..."
            />
          </div>
        </div>

        <div className="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando...' : 'Guardar Punto'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
