import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, RefreshCw, MapPin } from 'lucide-react';
import { api } from '../../services/api';

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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b bg-blue-50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">Agregar Punto al Mapa</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/50 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capa *</label>
            <select
              value={form.capa_id}
              onChange={e => set('capa_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar capa...</option>
              {capas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={form.titulo}
              onChange={e => set('titulo', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Nombre del punto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <input
              value={form.categoria}
              onChange={e => set('categoria', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Ej: Norte, KM 45, Zona 1..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitud *</label>
              <input
                type="number" step="0.000001"
                value={form.latitud}
                onChange={e => set('latitud', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="14.6407"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitud *</label>
              <input
                type="number" step="0.000001"
                value={form.longitud}
                onChange={e => set('longitud', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="-90.5133"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Descripción, notas, datos de contacto..."
            />
          </div>
        </div>

        <div className="flex justify-between p-4 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
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
