import { useState } from 'react';
import { api } from '../../../services/api';
import { X, Play } from 'lucide-react';

const NIVELES_COMBUSTIBLE = [
  { value: 'RESERVA', label: '0' },
  { value: '1/8',     label: '⅛' },
  { value: '1/4',     label: '¼' },
  { value: '3/8',     label: '⅜' },
  { value: '1/2',     label: '½' },
  { value: '5/8',     label: '⅝' },
  { value: '3/4',     label: '¾' },
  { value: '7/8',     label: '⅞' },
  { value: 'LLENO',   label: 'Lleno' },
];

interface Props {
  asignacion: {
    asignacion_id: number;
    unidad_id: number;
    unidad_codigo: string;
    ruta_codigo: string;
    ruta_nombre: string;
    km_inicio: number | null;
  };
  onClose: () => void;
  onCreated: () => void;
}

export default function IniciarDesdeAsignacionModal({ asignacion, onClose, onCreated }: Props) {
  const [kmInicial, setKmInicial]           = useState(asignacion.km_inicio ? String(asignacion.km_inicio) : '');
  const [combustible, setCombustible]       = useState('');
  const [observaciones, setObservaciones]   = useState('');
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!combustible) { setError('Selecciona el nivel de combustible'); return; }
    setSaving(true);
    try {
      await api.post('/salidas/cop/iniciar-unidad', {
        unidad_id:         asignacion.unidad_id,
        asignacion_id:     asignacion.asignacion_id,
        km_inicial:        kmInicial ? Number(kmInicial) : undefined,
        combustible_fraccion: combustible,
        observaciones_salida: observaciones || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar la salida');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-600 rounded-t-xl">
          <div>
            <h2 className="text-lg font-bold text-white">Dar salida — {asignacion.unidad_codigo}</h2>
            <p className="text-blue-100 text-sm">{asignacion.ruta_codigo} — {asignacion.ruta_nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Km inicial</label>
            <input
              type="number"
              value={kmInicial}
              onChange={e => setKmInicial(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Odómetro actual..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nivel de combustible *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {NIVELES_COMBUSTIBLE.map(n => (
                <button
                  key={n.value}
                  onClick={() => setCombustible(n.value)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition ${
                    combustible === n.value
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Opcional..."
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {saving ? 'Iniciando...' : 'Dar salida'}
          </button>
        </div>
      </div>
    </div>
  );
}
