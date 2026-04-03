import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { X, Save, AlertTriangle, UserPlus, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Brigada {
  id: number;
  nombre: string;
  chapa: string;
  sede_id: number;
  sede_nombre: string;
  rol_brigada?: string;
}

interface Unidad {
  id: number;
  codigo: string;
  tipo_unidad: string;
  sede_id: number;
  sede_nombre: string;
  disponible_transportes: boolean;
  instrucciones_transportes?: string;
}

interface Ruta {
  id: number;
  codigo: string;
  nombre: string;
}

interface MiembroSeleccionado {
  usuario_id: number;
  nombre: string;
  chapa: string;
  rol_en_salida: 'PILOTO' | 'COPILOTO' | 'AUXILIAR';
}

const SEDES: { id: number; nombre: string }[] = [
  { id: 1, nombre: 'Central' },
  { id: 2, nombre: 'Mazatenango' },
  { id: 3, nombre: 'Poptún' },
  { id: 4, nombre: 'San Cristóbal' },
  { id: 5, nombre: 'Quetzaltenango' },
  { id: 6, nombre: 'Coatepeque' },
  { id: 7, nombre: 'Palín' },
  { id: 8, nombre: 'Morales' },
  { id: 9, nombre: 'Río Dulce' },
];

export default function COPSalidaEmergenciaModal({ isOpen, onClose, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [sedeId, setSedeId] = useState('');
  const [unidadId, setUnidadId] = useState('');
  const [rutaId, setRutaId] = useState('');
  const [kmInicial, setKmInicial] = useState('');
  const [combustibleInicial, setCombustibleInicial] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [tripulacion, setTripulacion] = useState<MiembroSeleccionado[]>([]);
  const [addingMiembro, setAddingMiembro] = useState<{ userId: string; rol: 'PILOTO' | 'COPILOTO' | 'AUXILIAR' }>({
    userId: '',
    rol: 'AUXILIAR',
  });

  // Reset cuando se abre
  useEffect(() => {
    if (isOpen) {
      setSedeId('');
      setUnidadId('');
      setRutaId('');
      setKmInicial('');
      setCombustibleInicial('');
      setObservaciones('');
      setTripulacion([]);
      setAddingMiembro({ userId: '', rol: 'AUXILIAR' });
      setError('');
    }
  }, [isOpen]);

  // Limpiar unidad y tripulación al cambiar sede
  useEffect(() => {
    setUnidadId('');
    setTripulacion([]);
    setAddingMiembro({ userId: '', rol: 'AUXILIAR' });
  }, [sedeId]);

  const { data: todasUnidades = [] } = useQuery<Unidad[]>({
    queryKey: ['unidades-activas-cop'],
    queryFn: async () => {
      const { data } = await api.get('/unidades/activas');
      return data.unidades || [];
    },
    enabled: isOpen,
    staleTime: 60_000,
  });

  const { data: todasBrigadas = [] } = useQuery<Brigada[]>({
    queryKey: ['brigadas-activas-cop'],
    queryFn: async () => {
      const { data } = await api.get('/brigadas?activa=true');
      return data.brigadas || [];
    },
    enabled: isOpen,
    staleTime: 60_000,
  });

  const { data: rutas = [] } = useQuery<Ruta[]>({
    queryKey: ['rutas-cop'],
    queryFn: async () => {
      const { data } = await api.get('/geografia/rutas');
      return data.rutas || data || [];
    },
    enabled: isOpen,
    staleTime: 5 * 60_000,
  });

  const unidades = sedeId
    ? todasUnidades.filter(u => u.sede_id === Number(sedeId))
    : todasUnidades;

  const brigadas = sedeId
    ? todasBrigadas.filter(b => b.sede_id === Number(sedeId))
    : todasBrigadas;

  const brigadasDisponibles = brigadas.filter(
    b => !tripulacion.some(t => t.usuario_id === b.id)
  );

  const agregarMiembro = () => {
    if (!addingMiembro.userId) return;
    const brigada = todasBrigadas.find(b => b.id === Number(addingMiembro.userId));
    if (!brigada) return;
    setTripulacion(prev => [
      ...prev,
      {
        usuario_id: brigada.id,
        nombre: brigada.nombre,
        chapa: brigada.chapa,
        rol_en_salida: addingMiembro.rol,
      },
    ]);
    setAddingMiembro({ userId: '', rol: 'AUXILIAR' });
  };

  const quitarMiembro = (userId: number) => {
    setTripulacion(prev => prev.filter(t => t.usuario_id !== userId));
  };

  const handleSubmit = async () => {
    setError('');
    if (!unidadId) { setError('Selecciona una unidad'); return; }
    if (tripulacion.length === 0) { setError('Agrega al menos un integrante a la tripulación'); return; }

    setSaving(true);
    try {
      await api.post('/salidas/cop/iniciar-unidad', {
        unidad_id: Number(unidadId),
        ruta_inicial_id: rutaId ? Number(rutaId) : undefined,
        km_inicial: kmInicial ? Number(kmInicial) : undefined,
        combustible_inicial: combustibleInicial || undefined,
        observaciones_salida: observaciones || undefined,
        tripulacion,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error al iniciar la salida';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-red-600 rounded-t-xl">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">Sacar Unidad — COP</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Sede */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sede
            </label>
            <select
              value={sedeId}
              onChange={e => setSedeId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
            >
              <option value="">Todas las sedes</option>
              {SEDES.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          {/* Unidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unidad <span className="text-red-500">*</span>
            </label>
            <select
              value={unidadId}
              onChange={e => setUnidadId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
            >
              <option value="">Seleccionar unidad...</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>
                  {u.disponible_transportes === false ? '⚠ ' : ''}{u.codigo} — {u.tipo_unidad}{!sedeId ? ` (${u.sede_nombre})` : ''}
                </option>
              ))}
            </select>
            {(() => {
              const u = unidades.find(u => u.id === Number(unidadId));
              if (!u || u.disponible_transportes !== false) return null;
              return (
                <div className="mt-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2.5 text-sm text-orange-800 dark:text-orange-300">
                  <p className="font-semibold">⚠ Unidad marcada como no disponible por Transportes</p>
                  {u.instrucciones_transportes && (
                    <p className="mt-0.5 text-orange-700 dark:text-orange-400">{u.instrucciones_transportes}</p>
                  )}
                  <p className="mt-1 text-xs text-orange-600 dark:text-orange-500">La salida quedará registrada con esta observación.</p>
                </div>
              );
            })()}
          </div>

          {/* Ruta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ruta inicial <span className="text-xs text-gray-400">(opcional)</span>
            </label>
            <select
              value={rutaId}
              onChange={e => setRutaId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
            >
              <option value="">Sin ruta asignada</option>
              {rutas.map(r => (
                <option key={r.id} value={r.id}>
                  {r.codigo}{r.nombre ? ` — ${r.nombre}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Km y Combustible */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Km inicial
              </label>
              <input
                type="number"
                min="0"
                value={kmInicial}
                onChange={e => setKmInicial(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Combustible inicial
              </label>
              <select
                value={combustibleInicial}
                onChange={e => setCombustibleInicial(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
              >
                <option value="">—</option>
                <option value="100%">100%</option>
                <option value="75%">75%</option>
                <option value="50%">50%</option>
                <option value="25%">25%</option>
              </select>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observaciones
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Motivo de la salida..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
            />
          </div>

          {/* Tripulación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tripulación <span className="text-red-500">*</span>
            </label>

            {/* Miembros agregados */}
            {tripulacion.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {tripulacion.map(m => (
                  <div
                    key={m.usuario_id}
                    className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs font-mono text-gray-400 w-16 flex-shrink-0">{m.chapa}</span>
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{m.nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                      m.rol_en_salida === 'PILOTO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                      m.rol_en_salida === 'COPILOTO' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {m.rol_en_salida}
                    </span>
                    <button
                      onClick={() => quitarMiembro(m.usuario_id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar de brigada */}
            <div className="flex gap-2">
              <select
                value={addingMiembro.userId}
                onChange={e => setAddingMiembro(p => ({ ...p, userId: e.target.value }))}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
              >
                <option value="">Seleccionar brigada...</option>
                {brigadasDisponibles.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.chapa} — {b.nombre}
                  </option>
                ))}
              </select>
              <select
                value={addingMiembro.rol}
                onChange={e => setAddingMiembro(p => ({ ...p, rol: e.target.value as any }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:border-transparent focus:outline-none"
              >
                <option value="PILOTO">Piloto</option>
                <option value="COPILOTO">Copiloto</option>
                <option value="AUXILIAR">Auxiliar</option>
              </select>
              <button
                onClick={agregarMiembro}
                disabled={!addingMiembro.userId}
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm transition"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
            {brigadasDisponibles.length === 0 && brigadas.length === 0 && sedeId && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                No hay brigadas activas en esta sede
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-2.5 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !unidadId || tripulacion.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Iniciando...' : 'Iniciar salida'}
          </button>
        </div>
      </div>
    </div>
  );
}
