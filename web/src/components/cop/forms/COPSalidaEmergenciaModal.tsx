import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/api';
import { X, Save, AlertTriangle, UserPlus, Trash2, Search } from 'lucide-react';

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
  rol_en_salida: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE';
}

const NIVELES_COMBUSTIBLE = [
  { value: 'RESERVA', label: '0',     sub: 'Reserva' },
  { value: '1/8',     label: '⅛',     sub: '' },
  { value: '1/4',     label: '¼',     sub: '' },
  { value: '3/8',     label: '⅜',     sub: '' },
  { value: '1/2',     label: '½',     sub: '' },
  { value: '5/8',     label: '⅝',     sub: '' },
  { value: '3/4',     label: '¾',     sub: '' },
  { value: '7/8',     label: '⅞',     sub: '' },
  { value: 'LLENO',   label: 'Lleno', sub: '' },
];

function FuelLevelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {NIVELES_COMBUSTIBLE.map(n => (
        <button
          key={n.value}
          type="button"
          onClick={() => onChange(value === n.value ? '' : n.value)}
          className={`flex flex-col items-center justify-center py-2 rounded-lg border-2 transition-all ${
            value === n.value
              ? 'border-orange-500 bg-orange-500 text-white'
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-300'
          }`}
        >
          <span className="text-sm font-bold leading-none">{n.label}</span>
          {n.sub && <span className="text-xs opacity-75">{n.sub}</span>}
        </button>
      ))}
    </div>
  );
}

// Dropdown con búsqueda reutilizable
function SearchSelect({
  placeholder,
  value,
  onChange,
  options,
  renderOption,
  renderSelected,
  disabled,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: { id: number; searchText: string; label: React.ReactNode; badge?: React.ReactNode }[];
  renderOption?: (o: any) => React.ReactNode;
  renderSelected?: (id: string) => React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = q
    ? options.filter(o => o.searchText.toLowerCase().includes(q.toLowerCase()))
    : options;

  const selected = value ? options.find(o => String(o.id) === value) : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(o => !o); setQ(''); }}
        className="w-full flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-left disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        <span className={selected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}>
          {selected ? (renderSelected ? renderSelected(value) : selected.searchText) : placeholder}
        </span>
        {value && (
          <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 flex-shrink-0"
            onClick={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
          />
        )}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-56 flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">Sin resultados</p>
            ) : (
              filtered.map(o => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => { onChange(String(o.id)); setOpen(false); setQ(''); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between gap-2 ${
                    String(o.id) === value ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'
                  }`}
                >
                  <span>{renderOption ? renderOption(o) : o.searchText}</span>
                  {o.badge}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  const [addingMiembro, setAddingMiembro] = useState<{ userId: string; rol: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE' }>({
    userId: '',
    rol: 'ACOMPAÑANTE',
  });

  useEffect(() => {
    if (isOpen) {
      setSedeId(''); setUnidadId(''); setRutaId(''); setKmInicial('');
      setCombustibleInicial(''); setObservaciones('');
      setTripulacion([]); setAddingMiembro({ userId: '', rol: 'ACOMPAÑANTE' });
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    setUnidadId('');
    setTripulacion([]);
    setAddingMiembro({ userId: '', rol: 'ACOMPAÑANTE' });
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

  const unidades = sedeId ? todasUnidades.filter(u => u.sede_id === Number(sedeId)) : todasUnidades;
  const brigadas = sedeId ? todasBrigadas.filter(b => b.sede_id === Number(sedeId)) : todasBrigadas;
  const brigadasDisponibles = brigadas.filter(b => !tripulacion.some(t => t.usuario_id === b.id));

  const unidadSeleccionada = unidades.find(u => u.id === Number(unidadId));

  const unidadOptions = unidades.map(u => ({
    id: u.id,
    searchText: `${u.codigo} ${u.tipo_unidad} ${u.sede_nombre}`,
    label: null,
    badge: u.disponible_transportes === false
      ? <span className="text-xs text-orange-500 flex-shrink-0">No disponible</span>
      : undefined,
  }));

  const rutaOptions = rutas.map(r => ({
    id: r.id,
    searchText: `${r.codigo}${r.nombre ? ' ' + r.nombre : ''}`,
    label: null,
  }));

  const brigadaOptions = brigadasDisponibles.map(b => ({
    id: b.id,
    searchText: `${b.chapa} ${b.nombre}`,
    label: null,
  }));

  const agregarMiembro = () => {
    if (!addingMiembro.userId) return;
    const brigada = todasBrigadas.find(b => b.id === Number(addingMiembro.userId));
    if (!brigada) return;
    setTripulacion(prev => [...prev, {
      usuario_id: brigada.id,
      nombre: brigada.nombre,
      chapa: brigada.chapa,
      rol_en_salida: addingMiembro.rol,
    }]);
    setAddingMiembro({ userId: '', rol: 'ACOMPAÑANTE' });
  };

  const handleSubmit = async () => {
    setError('');
    if (!unidadId) { setError('Selecciona una unidad'); return; }
    if (tripulacion.length === 0) { setError('Agrega al menos un integrante a la tripulación'); return; }
    setSaving(true);
    try {
      await api.post('/salidas/cop/salida-emergencia', {
        unidad_id: Number(unidadId),
        ruta_id: rutaId ? Number(rutaId) : undefined,
        km_inicial: kmInicial ? Number(kmInicial) : undefined,
        combustible_fraccion: combustibleInicial || undefined,
        observaciones_salida: observaciones || undefined,
        tripulacion,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar la salida');
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sede</label>
            <select
              value={sedeId}
              onChange={e => setSedeId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
            >
              <option value="">Todas las sedes</option>
              {SEDES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          {/* Unidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unidad <span className="text-red-500">*</span>
            </label>
            <SearchSelect
              placeholder="Buscar unidad..."
              value={unidadId}
              onChange={setUnidadId}
              options={unidadOptions}
              renderOption={o => {
                const u = unidades.find(u => u.id === o.id);
                return (
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{u?.codigo}</span>
                    <span className="text-gray-500 dark:text-gray-400">{u?.tipo_unidad}{!sedeId && u ? ` · ${u.sede_nombre}` : ''}</span>
                  </span>
                );
              }}
              renderSelected={() => {
                const u = unidades.find(u => u.id === Number(unidadId));
                return u ? `${u.codigo} — ${u.tipo_unidad}` : '';
              }}
            />
            {unidadSeleccionada?.disponible_transportes === false && (
              <div className="mt-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg px-3 py-2.5 text-sm text-orange-800 dark:text-orange-300">
                <p className="font-semibold">⚠ Unidad marcada como no disponible por Transportes</p>
                {unidadSeleccionada.instrucciones_transportes && (
                  <p className="mt-0.5">{unidadSeleccionada.instrucciones_transportes}</p>
                )}
                <p className="mt-1 text-xs opacity-75">La salida quedará registrada con esta observación.</p>
              </div>
            )}
          </div>

          {/* Ruta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ruta inicial <span className="text-xs text-gray-400">(opcional)</span>
            </label>
            <SearchSelect
              placeholder="Buscar ruta..."
              value={rutaId}
              onChange={setRutaId}
              options={rutaOptions}
              renderOption={o => {
                const r = rutas.find(r => r.id === o.id);
                return (
                  <span className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{r?.codigo}</span>
                    {r?.nombre && <span className="text-gray-500 dark:text-gray-400">{r.nombre}</span>}
                  </span>
                );
              }}
              renderSelected={() => {
                const r = rutas.find(r => r.id === Number(rutaId));
                return r ? `${r.codigo}${r.nombre ? ' — ' + r.nombre : ''}` : '';
              }}
            />
          </div>

          {/* Km inicial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Km inicial</label>
            <input
              type="number" min="0"
              value={kmInicial}
              onChange={e => setKmInicial(e.target.value)}
              placeholder="0"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Combustible inicial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Combustible inicial <span className="text-xs text-gray-400">(opcional)</span>
            </label>
            <FuelLevelPicker value={combustibleInicial} onChange={setCombustibleInicial} />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
            <input
              type="text"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Motivo de la salida..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          {/* Tripulación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tripulación <span className="text-red-500">*</span>
            </label>

            {tripulacion.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {tripulacion.map(m => (
                  <div key={m.usuario_id} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
                    <span className="text-xs font-mono text-gray-400 w-16 flex-shrink-0">{m.chapa}</span>
                    <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{m.nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                      m.rol_en_salida === 'PILOTO' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                      m.rol_en_salida === 'COPILOTO' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                    }`}>{m.rol_en_salida}</span>
                    <button onClick={() => setTripulacion(p => p.filter(t => t.usuario_id !== m.usuario_id))}
                      className="p-1 text-gray-400 hover:text-red-500 transition flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <div className="flex-1">
                <SearchSelect
                  placeholder="Seleccionar brigada..."
                  value={addingMiembro.userId}
                  onChange={v => setAddingMiembro(p => ({ ...p, userId: v }))}
                  options={brigadaOptions}
                  renderOption={o => {
                    const b = todasBrigadas.find(b => b.id === o.id);
                    return (
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400 w-14 flex-shrink-0">{b?.chapa}</span>
                        <span>{b?.nombre}</span>
                      </span>
                    );
                  }}
                  renderSelected={() => {
                    const b = todasBrigadas.find(b => b.id === Number(addingMiembro.userId));
                    return b ? `${b.chapa} — ${b.nombre}` : '';
                  }}
                />
              </div>
              <select
                value={addingMiembro.rol}
                onChange={e => setAddingMiembro(p => ({ ...p, rol: e.target.value as any }))}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="PILOTO">Piloto</option>
                <option value="COPILOTO">Copiloto</option>
                <option value="ACOMPAÑANTE">Acompañante</option>
              </select>
              <button
                onClick={agregarMiembro}
                disabled={!addingMiembro.userId}
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg text-sm transition"
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
            {brigadasDisponibles.length === 0 && sedeId && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">No hay brigadas activas en esta sede</p>
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
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !unidadId || tripulacion.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Iniciando...' : 'Iniciar salida'}
          </button>
        </div>
      </div>
    </div>
  );
}
