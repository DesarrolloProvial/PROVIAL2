import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, actividadesAPI, catalogosAPI } from '../../../services/api';
import {
  X, Save, RefreshCw, ChevronRight, ChevronLeft,
  Activity, Shield, Briefcase, Check, Camera,
} from 'lucide-react';
import UbicacionFields from '../../common/forms/UbicacionFields';
import DynamicActivityFields from './DynamicActivityFields';
import SituacionMultimediaUploader from '../SituacionMultimediaUploader';

// ============================================
// HELPERS
// ============================================
const extractObservaciones = (obs: any): string | null => {
  if (!obs) return null;
  if (typeof obs === 'string') return obs;
  if (Array.isArray(obs) && obs.length > 0) return obs[obs.length - 1]?.mensaje ?? null;
  return null;
};

// ============================================
// CONSTANTES
// ============================================
const CATEGORIA_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  OPERATIVO: { label: 'Operativo', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', icon: Activity },
  APOYO: { label: 'Apoyo', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800', icon: Shield },
  ADMINISTRATIVO: { label: 'Administrativo', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800', icon: Briefcase },
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
  editActividadId?: number; // If provided, load existing actividad for editing
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
export default function CrearActividadModal({ isOpen, onClose, onCreated, unidades, preselectedUnidadId, editActividadId }: Props) {
  const isEditMode = !!editActividadId;
  const [step, setStep] = useState(isEditMode ? 2 : 1);
  const [selectedTipo, setSelectedTipo] = useState<TipoActividad | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');
  const [justCreatedId, setJustCreatedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'datos' | 'infografia'>('datos');

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
    requiere_infografia: false,
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

  // Load existing actividad for edit mode
  useEffect(() => {
    if (!isOpen || !editActividadId) return;
    let cancelled = false;
    setLoadingEdit(true);
    setStep(2);
    (async () => {
      try {
        const act = await actividadesAPI.getById(editActividadId);
        if (cancelled) return;
        const datosObj = act.datos
          ? (typeof act.datos === 'string' ? JSON.parse(act.datos) : act.datos)
          : {};
        setForm({
          unidad_id: act.unidad_id || '',
          ruta_id: act.ruta_id || '',
          km: act.km != null ? String(act.km) : '',
          sentido: act.sentido || '',
          latitud: act.latitud != null ? String(act.latitud) : '',
          longitud: act.longitud != null ? String(act.longitud) : '',
          departamento_id: datosObj.departamento_id || null,
          municipio_id: datosObj.municipio_id || null,
          observaciones: extractObservaciones(act.observaciones) || '',
          requiere_infografia: act.requiere_infografia || false,
        });
        if (Object.keys(datosObj).length > 0) {
          setDatos(datosObj);
        }
        // Find the tipo in catalog to set selectedTipo
        if (act.tipo_actividad_id && categorias.length > 0) {
          for (const cat of categorias) {
            const found = cat.tipos.find((t: TipoActividad) => t.id === act.tipo_actividad_id);
            if (found) {
              setSelectedTipo(found);
              setSelectedCategoria(cat.codigo);
              setStep(2);
              break;
            }
          }
        }
      } catch (err) {
        console.error('Error loading actividad:', err);
        setError('Error al cargar la actividad');
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, editActividadId, categorias]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedTipo(null);
      setSelectedCategoria('');
      setExpandedCat(null);
      setForm({
        unidad_id: '', ruta_id: '', km: '', sentido: '', latitud: '', longitud: '',
        departamento_id: null, municipio_id: null, observaciones: '', requiere_infografia: false,
      });
      setDatos({});
      setError('');
      setJustCreatedId(null);
      setActiveTab('datos');
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

      // Save departamento/municipio into datos JSONB (no dedicated columns in actividad)
      if (form.departamento_id) cleanDatos.departamento_id = form.departamento_id;
      if (form.municipio_id) cleanDatos.municipio_id = form.municipio_id;

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

      if (isEditMode) {
        await actividadesAPI.update(editActividadId!, payload);
        onCreated();
        onClose();
      } else {
        const created = await actividadesAPI.create(payload);
        onCreated();
        if (selectedTipo?.formulario_tipo !== 'NOVEDAD') {
          setJustCreatedId(created.id);
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      console.error('Error guardando actividad:', err);
      setError(err.response?.data?.error || err.message || 'Error al guardar la actividad');
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-t-xl">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{isEditMode ? 'Editar Actividad' : 'Nueva Actividad'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">Selecciona la categoria y tipo de actividad:</p>

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
                    <div key={cat.id} className={`border dark:border-gray-700 rounded-xl overflow-hidden ${isExpanded ? config.bgColor : 'border-gray-200'}`}>
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                        className={`w-full flex items-center gap-3 p-3 transition hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isExpanded ? config.bgColor : ''}`}
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
                              className="w-full text-left px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                            >
                              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                              {tipo.nombre}
                              <ChevronRight className="w-3 h-3 ml-auto text-gray-300 dark:text-gray-600" />
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
  const showMultimedia = isEditMode && selectedTipo?.formulario_tipo !== 'NOVEDAD';

  // ============================================
  // VISTA: Infografía post-creación
  // ============================================
  if (justCreatedId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Actividad creada</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Agrega infografía (fotos y videos)</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <SituacionMultimediaUploader actividadId={justCreatedId} />
          </div>
          <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Listo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-t-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setStep(1); setSelectedTipo(null); setDatos({}); }}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
              title="Cambiar tipo"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedTipo?.nombre}</h2>
              <span className={`text-xs font-medium ${catConfig.color}`}>{catConfig.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Tabs (edit mode only, non-NOVEDAD) */}
        {showMultimedia && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 px-4">
            <button
              onClick={() => setActiveTab('datos')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                activeTab === 'datos'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Datos
            </button>
            <button
              onClick={() => setActiveTab('infografia')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'infografia'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Infografía
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Infografía tab (edit mode) */}
          {showMultimedia && activeTab === 'infografia' && editActividadId && (
            <SituacionMultimediaUploader actividadId={editActividadId} />
          )}

          {/* Datos tab (or non-edit mode) */}
          {(!showMultimedia || activeTab === 'datos') && (
            <>
          {loadingEdit && (
            <div className="text-center py-8 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Cargando datos...</p>
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!loadingEdit && <>
          {/* Unidad */}
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Unidad</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unidad *</label>
              <select
                value={form.unidad_id}
                onChange={(e) => handleChange('unidad_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              {form.ruta_id ? (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Ruta asignada: {rutas.find((r: any) => r.id === Number(form.ruta_id))?.codigo || form.ruta_id}
                </p>
              ) : (
                form.unidad_id && <p className="mt-1 text-xs text-gray-400">Sin ruta asignada</p>
              )}
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
              <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Datos de {selectedTipo.nombre}</h3>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Observaciones adicionales..."
            />
          </div>

          {/* Requiere Infografía */}
          {selectedTipo?.nombre !== 'Parada de Comida' && selectedTipo?.nombre !== 'Baño' && (
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors w-max">
              <input
                type="checkbox"
                checked={form.requiere_infografia}
                onChange={(e) => handleChange('requiere_infografia', e.target.checked)}
                className="w-5 h-5 rounded border-indigo-400 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Requiere Infografía</span>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">Marcar si esta actividad necesita infografía gráfica</p>
              </div>
            </label>
          )}

          </> }
            </>
          )}
        </div>

        {/* Footer */}
        {(!showMultimedia || activeTab === 'datos') && (
        <div className="flex justify-between items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
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
                {isEditMode ? 'Guardando...' : 'Creando...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Guardar Cambios' : 'Crear Actividad'}
              </>
            )}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
