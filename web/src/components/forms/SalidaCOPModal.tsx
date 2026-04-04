import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Save, RefreshCw, LogIn, LogOut, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

const NIVELES = [
  { value: '0',     label: 'Reserva' },
  { value: '0.125', label: '1/8' },
  { value: '0.25',  label: '1/4' },
  { value: '0.375', label: '3/8' },
  { value: '0.5',   label: '1/2' },
  { value: '0.625', label: '5/8' },
  { value: '0.75',  label: '3/4' },
  { value: '0.875', label: '7/8' },
  { value: '1',     label: 'Lleno' },
];

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
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
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
          combustible_inicial: form.combustible_inicial !== '' ? parseFloat(form.combustible_inicial) : undefined,
          observaciones_salida: form.observaciones_salida || undefined,
        });
        onDone();
        onClose();
      } else {
        if (!salidaId) throw new Error('No hay salida activa para finalizar');
        await api.post(`/salidas/${salidaId}/finalizar`, {
          km_final: form.km_final ? parseFloat(form.km_final) : undefined,
          combustible_final: form.combustible_final !== '' ? parseFloat(form.combustible_final) : undefined,
          observaciones_regreso: form.observaciones_regreso || undefined,
        });
        onDone();
        onClose();
        navigate('/cop/mapa');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al procesar');
      setConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isIniciar = mode === 'iniciar';

  // Diálogo de confirmación para finalizar
  if (!isIniciar && confirm) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">¿Finalizar jornada?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Unidad {unidadCodigo || unidadId}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Esta acción es <span className="font-semibold text-red-600 dark:text-red-400">permanente e irreversible</span>.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Una vez finalizada, ya no se podrá editar ningún registro de esta jornada (situaciones, actividades, km, combustible). Serás redirigido al mapa.
            </p>
            {error && (
              <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                {saving ? 'Finalizando...' : 'Sí, finalizar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b dark:border-gray-700 rounded-t-xl ${isIniciar ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
          <div className="flex items-center gap-2">
            {isIniciar ? <LogIn className="w-5 h-5 text-green-600 dark:text-green-400" /> : <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />}
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-100">
                {isIniciar ? 'Iniciar Jornada' : 'Finalizar Jornada'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unidad: {unidadCodigo || unidadId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>
          )}

          {isIniciar ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ruta inicial</label>
                <select
                  value={form.ruta_inicial_id}
                  onChange={e => handleChange('ruta_inicial_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Sin ruta específica</option>
                  {rutas.map(r => (
                    <option key={r.id} value={r.id}>{r.codigo}{r.nombre ? ` - ${r.nombre}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KM inicial</label>
                  <input
                    type="number" min="0" step="0.1"
                    value={form.km_inicial}
                    onChange={e => handleChange('km_inicial', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Combustible</label>
                  <select
                    value={form.combustible_inicial}
                    onChange={e => handleChange('combustible_inicial', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sin registrar</option>
                    {NIVELES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                <textarea
                  value={form.observaciones_salida}
                  onChange={e => handleChange('observaciones_salida', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Iniciado desde COP..."
                />
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Registra el km y combustible final antes de continuar. Una vez confirmado, la jornada quedará cerrada permanentemente.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">KM final</label>
                  <input
                    type="number" min="0" step="0.1"
                    value={form.km_final}
                    onChange={e => handleChange('km_final', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Combustible final</label>
                  <select
                    value={form.combustible_final}
                    onChange={e => handleChange('combustible_final', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Sin registrar</option>
                    {NIVELES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones de regreso</label>
                <textarea
                  value={form.observaciones_regreso}
                  onChange={e => handleChange('observaciones_regreso', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Finalizado desde COP..."
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={isIniciar ? handleSubmit : () => setConfirm(true)}
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
