import { useState } from 'react';
import { X, Save, RefreshCw, LogIn, LogOut } from 'lucide-react';
import { api } from '../../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  mode: 'iniciar' | 'finalizar';
  unidadId: number;
  unidadCodigo?: string;
  salidaId?: number; // required when mode === 'finalizar'
  rutas?: { id: number; codigo: string; nombre?: string }[];
}

export default function SalidaCOPModal({ isOpen, onClose, onDone, mode, unidadId, unidadCodigo, salidaId, rutas = [] }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    ruta_inicial_id: '' as string | number,
    km_inicial: '',
    combustible_inicial: '',
    observaciones_salida: '',
    km_final: '',
    combustible_final: '',
    observaciones_regreso: '',
  });

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      if (mode === 'iniciar') {
        await api.post('/salidas/cop/iniciar-unidad', {
          unidad_id: unidadId,
          ruta_inicial_id: form.ruta_inicial_id ? Number(form.ruta_inicial_id) : undefined,
          km_inicial: form.km_inicial ? parseFloat(form.km_inicial) : undefined,
          combustible_inicial: form.combustible_inicial ? parseFloat(form.combustible_inicial) : undefined,
          observaciones_salida: form.observaciones_salida || undefined,
        });
      } else {
        if (!salidaId) throw new Error('No hay salida activa para finalizar');
        await api.post(`/salidas/${salidaId}/finalizar`, {
          km_final: form.km_final ? parseFloat(form.km_final) : undefined,
          combustible_final: form.combustible_final ? parseFloat(form.combustible_final) : undefined,
          observaciones_regreso: form.observaciones_regreso || undefined,
        });
      }
      onDone();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al procesar');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isIniciar = mode === 'iniciar';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b rounded-t-xl ${isIniciar ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-2">
            {isIniciar ? <LogIn className="w-5 h-5 text-green-600" /> : <LogOut className="w-5 h-5 text-red-600" />}
            <div>
              <h2 className="font-bold text-gray-900">
                {isIniciar ? 'Iniciar Jornada' : 'Finalizar Jornada'}
              </h2>
              <p className="text-xs text-gray-500">Unidad: {unidadCodigo || unidadId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/50 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
          )}

          {isIniciar ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruta inicial</label>
                <select
                  value={form.ruta_inicial_id}
                  onChange={e => handleChange('ruta_inicial_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Sin ruta específica</option>
                  {rutas.map(r => (
                    <option key={r.id} value={r.id}>{r.codigo}{r.nombre ? ` - ${r.nombre}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KM inicial</label>
                  <input
                    type="number" min="0" step="0.1"
                    value={form.km_inicial}
                    onChange={e => handleChange('km_inicial', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Combustible (%)</label>
                  <input
                    type="number" min="0" max="100" step="5"
                    value={form.combustible_inicial}
                    onChange={e => handleChange('combustible_inicial', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={form.observaciones_salida}
                  onChange={e => handleChange('observaciones_salida', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Iniciado desde COP..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KM final</label>
                  <input
                    type="number" min="0" step="0.1"
                    value={form.km_final}
                    onChange={e => handleChange('km_final', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Combustible final (%)</label>
                  <input
                    type="number" min="0" max="100" step="5"
                    value={form.combustible_final}
                    onChange={e => handleChange('combustible_final', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones de regreso</label>
                <textarea
                  value={form.observaciones_regreso}
                  onChange={e => handleChange('observaciones_regreso', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Finalizado desde COP..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`px-5 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2 text-sm font-medium ${
              isIniciar ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Procesando...' : (isIniciar ? 'Iniciar Jornada' : 'Finalizar Jornada')}
          </button>
        </div>
      </div>
    </div>
  );
}
