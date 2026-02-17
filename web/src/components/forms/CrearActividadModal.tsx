import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, actividadesAPI, catalogosAPI } from '../../services/api';
import {
  X, Save, RefreshCw, ChevronRight, ChevronLeft,
  Activity, Shield, Briefcase,
} from 'lucide-react';
import UbicacionFields from './UbicacionFields';
import DynamicActivityFields from './DynamicActivityFields';

// ============================================
// CONSTANTES
// ============================================
const CATEGORIA_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  OPERATIVO: { label: 'Operativo', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: Activity },
  APOYO: { label: 'Apoyo', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: Shield },
  ADMINISTRATIVO: { label: 'Administrativo', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200', icon: Briefcase },
};

// ============================================
// INTERFACES
// ============================================
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  unidades: any[];
  preselectedUnidadId?: number;
}

interface TipoActividad {
  id: number;
  nombre: string;
  icono?: string;
  color?: string;
  formulario_tipo?: string;
}

interface Categoria {
  id: string;
  codigo: string;
  nombre: string;
  tipos: TipoActividad[];
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function CrearActividadModal({ isOpen, onClose, onCreated, unidades, preselectedUnidadId }: Props) {
  const [step, setStep] = useState(1); // 1 = selector, 2 = formulario
  const [selectedTipo, setSelectedTipo] = useState<TipoActividad | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [form, setForm] = useState({
    unidad_id: '' as string | number,
    ruta_id: '' as string | number,
    km: '',
    sentido: '',
    latitud: '',
    longitud: '',
    departamento_id: null as number | null,
    municipio_id: null as number | null,
    observaciones: '',
  });
  const [datos, setDatos] = useState<Record<string, any>>({});

  // Catalogs
  const { data: categorias = [] } = useQuery<Categoria[]>({
    queryKey: ['catalogo-actividades'],
    queryFn: () => catalogosAPI.getCatalogoActividades(),
    enabled: isOpen,
  });

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => {
      const { data } = await api.get('/geografia/departamentos');
      return data.departamentos || data || [];
    },
    enabled: isOpen && step === 2,
  });

  const { data: rutas = [] } = useQuery({
    queryKey: ['rutas-all'],
    queryFn: async () => {
      const { data } = await api.get('/geografia/rutas');
      return data.rutas || data || [];
    },
    enabled: isOpen && step === 2,
  });

  // Auto-fill unidad from preselection
  useEffect(() => {
    if (isOpen && preselectedUnidadId && !form.unidad_id) {
      setForm(prev => ({ ...prev, unidad_id: preselectedUnidadId }));
    }
  }, [isOpen, preselectedUnidadId]);

  // Auto-fill ruta from selected unidad
  useEffect(() => {
    if (form.unidad_id) {
      const u = unidades.find((u: any) => u.unidad_id === Number(form.unidad_id));
      if (u?.ruta_activa_codigo) {
        const ruta = rutas.find((r: any) => r.codigo === u.ruta_activa_codigo);
        if (ruta) {
          setForm(prev => ({ ...prev, ruta_id: ruta.id }));
        }
      }
    }
  }, [form.unidad_id, unidades, rutas]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedTipo(null);
      setSelectedCategoria('');
      setExpandedCat(null);
      setForm({
        unidad_id: '', ruta_id: '', km: '', sentido: '', latitud: '', longitud: '',
        departamento_id: null, municipio_id: null, observaciones: '',
      });
      setDatos({});
      setError('');
    }
  }, [isOpen]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const selectTipo = (tipo: TipoActividad, categoria: string) => {
    setSelectedTipo(tipo);
    setSelectedCategoria(categoria);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!form.unidad_id) { setError('Selecciona una unidad'); return; }
    if (!form.km) { setError('Ingresa el kilometro'); return; }

    setSaving(true);
    setError('');

    try {
      // Clean temp fields from datos
      const cleanDatos = { ...datos };
      delete cleanDatos._tempTipo;
      delete cleanDatos._tempVel;

      const payload: any = {
        tipo_actividad_id: selectedTipo!.id,
        unidad_id: Number(form.unidad_id),
        ruta_id: form.ruta_id ? Number(form.ruta_id) : undefined,
        km: parseFloat(form.km),
        sentido: form.sentido || undefined,
        latitud: form.latitud ? parseFloat(form.latitud) : undefined,
        longitud: form.longitud ? parseFloat(form.longitud) : undefined,
        observaciones: form.observaciones || undefined,
        datos: Object.keys(cleanDatos).length > 0 ? cleanDatos : undefined,
      };

      await actividadesAPI.create(payload);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Error creando actividad:', err);
      setError(err.response?.data?.error || err.message || 'Error al crear la actividad');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // ============================================
  // PASO 1: Seleccionar tipo de actividad
  // ============================================
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
            <h2 className="text-xl font-bold text-gray-900">Nueva Actividad</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-gray-600 mb-4 text-sm">Selecciona la categoria y tipo de actividad:</p>

            {categorias.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Cargando catalogo...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categorias.map((cat: Categoria) => {
                  const config = CATEGORIA_CONFIG[cat.codigo] || CATEGORIA_CONFIG.OPERATIVO;
                  const CatIcon = config.icon;
                  const isExpanded = expandedCat === cat.id;

                  return (
                    <div key={cat.id} className={`border rounded-xl overflow-hidden ${isExpanded ? config.bgColor : 'border-gray-200'}`}>
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                        className={`w-full flex items-center gap-3 p-3 transition hover:bg-gray-50 ${isExpanded ? config.bgColor : ''}`}
                      >
                        <CatIcon className={`w-5 h-5 ${config.color}`} />
                        <span className={`font-semibold ${config.color}`}>{cat.nombre}</span>
                        <span className="text-xs text-gray-400 ml-1">({cat.tipos.length})</span>
                        <ChevronRight className={`w-4 h-4 ml-auto text-gray-400 transition ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-1">
                          {cat.tipos.map((tipo: TipoActividad) => (
                            <button
                              key={tipo.id}
                              onClick={() => selectTipo(tipo, cat.codigo)}
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm transition text-sm text-gray-700 flex items-center gap-2"
                            >
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                              {tipo.nombre}
                              <ChevronRight className="w-3 h-3 ml-auto text-gray-300" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // PASO 2: Formulario
  // ============================================
  const catConfig = CATEGORIA_CONFIG[selectedCategoria] || CATEGORIA_CONFIG.OPERATIVO;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setStep(1); setSelectedTipo(null); setDatos({}); }}
              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
              title="Cambiar tipo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selectedTipo?.nombre}</h2>
              <span className={`text-xs font-medium ${catConfig.color}`}>{catConfig.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Unidad y Ruta */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Unidad y Ruta</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
                <select
                  value={form.unidad_id}
                  onChange={(e) => handleChange('unidad_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar unidad...</option>
                  {unidades
                    .sort((a: any, b: any) => (a.unidad_codigo || '').localeCompare(b.unidad_codigo || ''))
                    .map((u: any) => (
                      <option key={u.unidad_id} value={u.unidad_id}>
                        {u.unidad_codigo} - {u.sede_nombre || 'Sin sede'}
                      </option>
                    ))
                  }
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
                <select
                  value={form.ruta_id}
                  onChange={(e) => handleChange('ruta_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar ruta...</option>
                  {rutas.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.codigo} {r.nombre ? `- ${r.nombre}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ubicacion */}
          <UbicacionFields
            km={form.km}
            sentido={form.sentido}
            latitud={form.latitud}
            longitud={form.longitud}
            departamentoId={form.departamento_id}
            municipioId={form.municipio_id}
            departamentos={departamentos}
            onChange={handleChange}
          />

          {/* Dynamic fields based on activity type */}
          {selectedTipo && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Datos de {selectedTipo.nombre}</h3>
              <DynamicActivityFields
                activityTypeName={selectedTipo.nombre}
                datos={datos}
                onDatosChange={setDatos}
                unidades={unidades}
              />
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Creando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Crear Actividad
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
