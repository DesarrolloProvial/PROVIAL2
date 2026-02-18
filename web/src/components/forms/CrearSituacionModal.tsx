import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, situacionesAPI, catalogosAPI } from '../../services/api';
import {
  X, Save, RefreshCw, Plus,
  MapPin, Car, AlertTriangle, FileText,
  Users, ChevronRight, Shield,
} from 'lucide-react';
import {
  TIPOS_HECHO_TRANSITO,
  TIPOS_ASISTENCIA,
  TIPOS_EMERGENCIA,
} from '../../constants/situacionTypes';
import VehiculoFormWeb from './VehiculoFormWeb';
import ObstruccionForm, { getDefaultObstruccion, type ObstruccionData } from '../situaciones/ObstruccionForm';
import UbicacionFields from './UbicacionFields';
import CondicionesViaFields from './CondicionesViaFields';
import VictimasFields from './VictimasFields';
import RecursosSection from './RecursosSection';
import CausasSelectorWeb from './CausasSelectorWeb';

// ============================================
// CONSTANTES
// ============================================
const TIPOS_SITUACION_CREAR = [
  { value: 'HECHO_TRANSITO', label: 'Hecho de Transito', color: 'bg-red-500', icon: AlertTriangle },
  { value: 'ASISTENCIA_VEHICULAR', label: 'Asistencia Vehicular', color: 'bg-teal-500', icon: Car },
  { value: 'EMERGENCIA', label: 'Emergencia Vial', color: 'bg-orange-500', icon: AlertTriangle },
];

const emptyVehiculo = () => ({
  tipo_vehiculo: '',
  marca: '',
  color: '',
  placa: '',
  placa_extranjera: false,
  piloto_nombre: '',
  piloto_dpi: '',
  piloto_telefono: '',
  estado_piloto: 'ILESO',
  personas_asistidas: 0,
  dano: '',
  cargado: false,
  tiene_contenedor: false,
  es_bus: false,
  pasajeros_bus: 0,
  tiene_sancion: false,
  observaciones: '',
});

// ============================================
// INTERFACES
// ============================================
interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  unidades: any[];
  preselectedUnidadId?: number;
  editSituacionId?: number; // If provided, load existing situacion for editing
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function CrearSituacionModal({ isOpen, onClose, onCreated, unidades, preselectedUnidadId, editSituacionId }: Props) {
  const isEditMode = !!editSituacionId;
  const [step, setStep] = useState(isEditMode ? 2 : 1);
  const [tipoSituacion, setTipoSituacion] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [form, setForm] = useState({
    unidad_id: '' as string | number,
    ruta_id: '' as string | number,
    km: '',
    km_fin: '',
    sentido: '',
    latitud: '',
    longitud: '',
    departamento_id: null as number | null,
    municipio_id: null as number | null,
    clima: '',
    area: '',
    material_via: '',
    obstruccion: getDefaultObstruccion() as ObstruccionData,
    observaciones: '',
    descripcion: '',
    // Subtipo
    subtipo_situacion: '',
    // Victimas
    heridos: 0,
    fallecidos: 0,
    ilesos: 0,
    heridos_leves: 0,
    heridos_graves: 0,
    trasladados: 0,
    fugados: 0,
    acuerdo_involucrados: false,
    acuerdo_detalle: '',
    // Via
    via_estado: '',
    via_topografia: '',
    via_geometria: '',
    via_peralte: '',
    via_condicion: '',
    // Grupo y causas
    grupo: '' as string | number,
    causas: [] as number[],
  });

  // Related data
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [gruas, setGruas] = useState<any[]>([]);
  const [ajustadores, setAjustadores] = useState<any[]>([]);
  const [autoridadesSeleccionadas, setAutoridadesSeleccionadas] = useState<string[]>([]);
  const [detallesAutoridades, setDetallesAutoridades] = useState<Record<string, any>>({});
  const [socorroSeleccionados, setSocorroSeleccionados] = useState<string[]>([]);
  const [detallesSocorro, setDetallesSocorro] = useState<Record<string, any>>({});

  // Catalogs
  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos'],
    queryFn: async () => {
      const { data } = await api.get('/geografia/departamentos');
      return data.departamentos || data || [];
    },
    enabled: isOpen,
  });

  const { data: rutas = [] } = useQuery({
    queryKey: ['rutas-all'],
    queryFn: async () => {
      const { data } = await api.get('/geografia/rutas');
      return data.rutas || data || [];
    },
    enabled: isOpen,
  });

  const { data: auxiliares } = useQuery({
    queryKey: ['auxiliares'],
    queryFn: () => catalogosAPI.getAuxiliares(),
    enabled: isOpen,
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

  // Load existing situacion for edit mode
  useEffect(() => {
    if (!isOpen || !editSituacionId) return;
    let cancelled = false;
    setLoadingEdit(true);
    setStep(2); // Skip step 1 immediately
    (async () => {
      try {
        const sit = await situacionesAPI.getById(editSituacionId);
        if (cancelled) return;

        // Map tipo_situacion to our local type
        const tipo = sit.tipo_situacion === 'INCIDENTE' ? 'HECHO_TRANSITO'
          : sit.tipo_situacion === 'ASISTENCIA_VEHICULAR' ? 'ASISTENCIA_VEHICULAR'
          : sit.tipo_situacion === 'EMERGENCIA' ? 'EMERGENCIA'
          : sit.tipo_situacion || '';

        setTipoSituacion(tipo);
        setStep(2); // Skip type selector

        setForm({
          unidad_id: sit.unidad_id || '',
          ruta_id: sit.ruta_id || '',
          km: sit.km != null ? String(sit.km) : '',
          km_fin: sit.km_fin != null ? String(sit.km_fin) : '',
          sentido: sit.sentido || '',
          latitud: sit.latitud != null ? String(sit.latitud) : '',
          longitud: sit.longitud != null ? String(sit.longitud) : '',
          departamento_id: sit.departamento_id || null,
          municipio_id: sit.municipio_id || null,
          clima: sit.clima || '',
          area: sit.area || '',
          material_via: sit.material_via || sit.tipo_pavimento || '',
          obstruccion: (sit.obstruccion_data && sit.obstruccion_data.tipo_obstruccion)
            ? sit.obstruccion_data
            : getDefaultObstruccion(),
          observaciones: sit.observaciones || '',
          descripcion: sit.descripcion || '',
          subtipo_situacion: sit.subtipo_situacion || '',
          heridos: sit.heridos || 0,
          fallecidos: sit.fallecidos || 0,
          ilesos: sit.ilesos || 0,
          heridos_leves: sit.heridos_leves || 0,
          heridos_graves: sit.heridos_graves || 0,
          trasladados: sit.trasladados || 0,
          fugados: sit.fugados || 0,
          acuerdo_involucrados: sit.acuerdo_involucrados || false,
          acuerdo_detalle: sit.acuerdo_detalle || '',
          via_estado: sit.via_estado || '',
          via_topografia: sit.via_topografia || '',
          via_geometria: sit.via_geometria || '',
          via_peralte: sit.via_peralte || '',
          via_condicion: sit.via_condicion || '',
          grupo: sit.grupo || '',
          causas: sit.causas?.map((c: any) => c.id || c) || [],
        });

        // Load vehiculos
        if (sit.vehiculos_involucrados?.length > 0) {
          setVehiculos(sit.vehiculos_involucrados.map((v: any) => ({
            tipo_vehiculo: v.tipo_vehiculo || v.vehiculo?.tipo_vehiculo || '',
            marca: v.marca || v.vehiculo?.marca || '',
            color: v.color || v.vehiculo?.color || '',
            placa: v.placa || v.vehiculo?.placa || '',
            placa_extranjera: v.placa_extranjera || v.vehiculo?.es_extranjero || false,
            piloto_nombre: v.nombre_piloto || v.piloto?.nombre || '',
            piloto_dpi: v.piloto_dpi || v.piloto?.dpi || '',
            piloto_telefono: v.piloto_telefono || '',
            estado_piloto: v.estado_piloto || 'ILESO',
            personas_asistidas: v.personas_asistidas || 0,
            dano: v.dano || v.danos_estimados || '',
            observaciones: v.observaciones || '',
            personas: v.datos_piloto?.personas || [],
            dispositivos: v.dispositivos || [],
            custodia_estado: v.custodia_estado || '',
            custodia_autoridad: v.custodia_datos?.autoridad || '',
            custodia_motivo: v.custodia_datos?.motivo || '',
            custodia_destino: v.custodia_datos?.destino || '',
          })));
        }

        // Load autoridades
        if (sit.autoridades?.length > 0) {
          const autoIds: string[] = [];
          const autoDetalles: Record<string, any> = {};
          const socIds: string[] = [];
          const socDetalles: Record<string, any> = {};
          sit.autoridades.forEach((a: any) => {
            if (['PNC', 'PMT', 'MP', 'EJERCITO'].includes(a.tipo)) {
              autoIds.push(a.tipo);
              autoDetalles[a.tipo] = a.datos || {};
            } else {
              socIds.push(a.tipo);
              socDetalles[a.tipo] = a.datos || {};
            }
          });
          setAutoridadesSeleccionadas(autoIds);
          setDetallesAutoridades(autoDetalles);
          setSocorroSeleccionados(socIds);
          setDetallesSocorro(socDetalles);
        }
      } catch (err) {
        console.error('Error loading situacion:', err);
        setError('Error al cargar la situacion');
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, editSituacionId]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setTipoSituacion('');
      setActiveTab('general');
      setForm({
        unidad_id: '', ruta_id: '', km: '', km_fin: '', sentido: '', latitud: '', longitud: '',
        departamento_id: null, municipio_id: null, clima: '', area: '', material_via: '',
        obstruccion: getDefaultObstruccion() as ObstruccionData, observaciones: '', descripcion: '', subtipo_situacion: '',
        heridos: 0, fallecidos: 0, ilesos: 0, heridos_leves: 0, heridos_graves: 0,
        trasladados: 0, fugados: 0, acuerdo_involucrados: false, acuerdo_detalle: '',
        via_estado: '', via_topografia: '', via_geometria: '',
        via_peralte: '', via_condicion: '', grupo: '', causas: [],
      });
      setVehiculos([]);
      setGruas([]);
      setAjustadores([]);
      setAutoridadesSeleccionadas([]);
      setDetallesAutoridades({});
      setSocorroSeleccionados([]);
      setDetallesSocorro({});
      setError('');
    }
  }, [isOpen]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleVehiculoChange = (index: number, field: string, value: any) => {
    setVehiculos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Subtipo options based on tipo
  const getSubtipoOptions = () => {
    if (tipoSituacion === 'HECHO_TRANSITO') return TIPOS_HECHO_TRANSITO;
    if (tipoSituacion === 'ASISTENCIA_VEHICULAR') return TIPOS_ASISTENCIA;
    if (tipoSituacion === 'EMERGENCIA') return TIPOS_EMERGENCIA;
    return [];
  };

  const getSubtipoLabel = () => {
    if (tipoSituacion === 'HECHO_TRANSITO') return 'Tipo de Hecho';
    if (tipoSituacion === 'ASISTENCIA_VEHICULAR') return 'Tipo de Asistencia';
    if (tipoSituacion === 'EMERGENCIA') return 'Tipo de Emergencia';
    return 'Subtipo';
  };

  // Resolve subtipo to tipo_X_id from auxiliares
  const resolveSubtipoId = () => {
    if (!auxiliares || !form.subtipo_situacion) return {};
    const sub = form.subtipo_situacion;
    if (tipoSituacion === 'HECHO_TRANSITO') {
      const match = (auxiliares.tipos_hecho || []).find((t: any) => t.nombre === sub);
      return match ? { tipo_hecho_id: match.id } : {};
    }
    if (tipoSituacion === 'ASISTENCIA_VEHICULAR') {
      const match = (auxiliares.tipos_asistencia || []).find((t: any) => t.nombre === sub);
      return match ? { tipo_asistencia_id: match.id } : {};
    }
    if (tipoSituacion === 'EMERGENCIA') {
      const match = (auxiliares.tipos_emergencia || []).find((t: any) => t.nombre === sub);
      return match ? { tipo_emergencia_id: match.id } : {};
    }
    return {};
  };

  // Tabs config based on tipo
  const getTabs = () => {
    const tabs: { id: string; label: string; icon: any }[] = [
      { id: 'general', label: 'General', icon: MapPin },
    ];
    if (tipoSituacion === 'HECHO_TRANSITO') {
      tabs.push({ id: 'victimas', label: 'Victimas', icon: Users });
      tabs.push({ id: 'vehiculos', label: 'Vehiculos', icon: Car });
      tabs.push({ id: 'via', label: 'Via', icon: FileText });
      tabs.push({ id: 'recursos', label: 'Recursos', icon: Shield });
    }
    if (tipoSituacion === 'ASISTENCIA_VEHICULAR') {
      tabs.push({ id: 'vehiculos', label: 'Vehiculos', icon: Car });
      tabs.push({ id: 'recursos', label: 'Recursos', icon: Shield });
    }
    if (tipoSituacion === 'EMERGENCIA') {
      tabs.push({ id: 'recursos', label: 'Recursos', icon: Shield });
    }
    return tabs;
  };

  const handleSubmit = async () => {
    if (!form.unidad_id) { setError('Selecciona una unidad'); return; }
    if (!form.km) { setError('Ingresa el kilometro'); return; }

    setSaving(true);
    setError('');

    try {
      const subtipoIds = resolveSubtipoId();

      const payload: any = {
        unidad_id: Number(form.unidad_id),
        ruta_id: Number(form.ruta_id),
        tipo_situacion: tipoSituacion,
        km: parseFloat(form.km),
        sentido: form.sentido || undefined,
        latitud: form.latitud ? parseFloat(form.latitud) : undefined,
        longitud: form.longitud ? parseFloat(form.longitud) : undefined,
        departamento_id: form.departamento_id || undefined,
        municipio_id: form.municipio_id || undefined,
        clima: form.clima || undefined,
        area: form.area || undefined,
        material_via: form.material_via || undefined,
        obstruccion: form.obstruccion,
        observaciones: form.observaciones || undefined,
        subtipo_situacion: form.subtipo_situacion || undefined,
        ...subtipoIds,
      };

      // Hecho de transito specific
      if (tipoSituacion === 'HECHO_TRANSITO') {
        payload.heridos = form.heridos;
        payload.fallecidos = form.fallecidos;
        payload.ilesos = form.ilesos;
        payload.heridos_leves = form.heridos_leves;
        payload.heridos_graves = form.heridos_graves;
        payload.trasladados = form.trasladados;
        payload.fugados = form.fugados;
        payload.acuerdo_involucrados = form.acuerdo_involucrados;
        payload.acuerdo_detalle = form.acuerdo_detalle || undefined;
        payload.via_estado = form.via_estado || undefined;
        payload.via_topografia = form.via_topografia || undefined;
        payload.via_geometria = form.via_geometria || undefined;
        payload.via_peralte = form.via_peralte || undefined;
        payload.via_condicion = form.via_condicion || undefined;
        if (form.grupo) payload.grupo = Number(form.grupo);
        if (form.causas.length > 0) payload.causas = form.causas;
      }

      // Emergencia specific
      if (tipoSituacion === 'EMERGENCIA') {
        payload.descripcion = form.descripcion || undefined;
        if (form.km_fin) payload.km_fin = parseFloat(form.km_fin);
      }

      // Vehiculos (include personas, dispositivos, custodia)
      if (vehiculos.length > 0) {
        payload.vehiculos = vehiculos.map((v: any) => ({
          ...v,
          personas: v.personas || [],
          dispositivos: v.dispositivos || [],
        }));
      }

      // Gruas
      if (gruas.length > 0) {
        payload.gruas = gruas;
      }

      // Ajustadores
      if (ajustadores.length > 0) {
        payload.ajustadores = ajustadores;
      }

      // Autoridades y socorro
      if (autoridadesSeleccionadas.length > 0 || socorroSeleccionados.length > 0) {
        payload.autoridades_socorro = {
          autoridades: autoridadesSeleccionadas,
          detalles_autoridades: detallesAutoridades,
          socorro: socorroSeleccionados,
          detalles_socorro: detallesSocorro,
        };
      }

      if (isEditMode) {
        await situacionesAPI.update(editSituacionId!, payload);
      } else {
        await situacionesAPI.create(payload);
      }
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Error guardando situacion:', err);
      setError(err.response?.data?.error || err.message || 'Error al crear la situacion');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // ============================================
  // PASO 1: Seleccionar tipo
  // ============================================
  if (step === 1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
            <h2 className="text-xl font-bold text-gray-900">{isEditMode ? 'Editar Situacion' : 'Nueva Situacion'}</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">Selecciona el tipo de situacion a reportar:</p>
            <div className="space-y-3">
              {TIPOS_SITUACION_CREAR.map(tipo => (
                <button
                  key={tipo.value}
                  onClick={() => { setTipoSituacion(tipo.value); setStep(2); }}
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition group"
                >
                  <div className={`p-3 rounded-lg ${tipo.color} text-white`}>
                    <tipo.icon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 group-hover:text-blue-700">{tipo.label}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // PASO 2: Formulario completo
  // ============================================
  const tabs = getTabs();
  const tipoConfig = TIPOS_SITUACION_CREAR.find(t => t.value === tipoSituacion);
  const isHechoTransito = tipoSituacion === 'HECHO_TRANSITO';
  const isEmergencia = tipoSituacion === 'EMERGENCIA';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            {!isEditMode && (
              <button
                onClick={() => setStep(1)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
                title="Cambiar tipo"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {isEditMode ? `Editar: ${tipoConfig?.label}` : `Nueva: ${tipoConfig?.label}`}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-white px-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'vehiculos' && vehiculos.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {vehiculos.length}
                </span>
              )}
              {tab.id === 'recursos' && (gruas.length + ajustadores.length + autoridadesSeleccionadas.length + socorroSeleccionados.length) > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
                  {gruas.length + ajustadores.length + autoridadesSeleccionadas.length + socorroSeleccionados.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loadingEdit ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600">Cargando datos...</span>
            </div>
          ) : (<>

          {/* TAB: General */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Unidad */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Unidad</h3>
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
                  {form.ruta_id ? (
                    <p className="mt-1 text-xs text-blue-600">
                      Ruta asignada: {rutas.find((r: any) => r.id === Number(form.ruta_id))?.codigo || form.ruta_id}
                    </p>
                  ) : (
                    form.unidad_id && <p className="mt-1 text-xs text-gray-400">Sin ruta asignada</p>
                  )}
                </div>
              </div>

              {/* Subtipo */}
              {getSubtipoOptions().length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">{getSubtipoLabel()}</h3>
                  <select
                    value={form.subtipo_situacion}
                    onChange={(e) => handleChange('subtipo_situacion', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {getSubtipoOptions().map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Ubicacion (shared component) */}
              <UbicacionFields
                km={form.km}
                kmFin={form.km_fin}
                showKmFin={isEmergencia}
                sentido={form.sentido}
                latitud={form.latitud}
                longitud={form.longitud}
                departamentoId={form.departamento_id}
                municipioId={form.municipio_id}
                departamentos={departamentos}
                onChange={handleChange}
              />

              {/* Condiciones (shared component) */}
              <CondicionesViaFields
                clima={form.clima}
                area={form.area}
                materialVia={form.material_via}
                onChange={handleChange}
              />

              {/* Obstruccion */}
              <ObstruccionForm
                value={form.obstruccion}
                onChange={(val) => handleChange('obstruccion', val)}
                sentidoSituacion={form.sentido}
              />

              {/* Descripcion (emergencia) */}
              {isEmergencia && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion de Emergencia</label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => handleChange('descripcion', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Describa la emergencia..."
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
          )}

          {/* TAB: Victimas (solo HECHO_TRANSITO) */}
          {activeTab === 'victimas' && isHechoTransito && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-800">Conteo de Victimas</h3>
              <VictimasFields
                heridos={form.heridos}
                heridos_leves={form.heridos_leves}
                heridos_graves={form.heridos_graves}
                fallecidos={form.fallecidos}
                ilesos={form.ilesos}
                trasladados={form.trasladados}
                fugados={form.fugados}
                acuerdo_involucrados={form.acuerdo_involucrados}
                acuerdo_detalle={form.acuerdo_detalle}
                onChange={handleChange}
              />
            </div>
          )}

          {/* TAB: Vehiculos */}
          {activeTab === 'vehiculos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Vehiculos Involucrados ({vehiculos.length})</h3>
                <button
                  onClick={() => setVehiculos(prev => [...prev, emptyVehiculo()])}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Vehiculo
                </button>
              </div>

              {vehiculos.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay vehiculos registrados.</p>
                  <button
                    type="button"
                    onClick={() => setVehiculos([emptyVehiculo()])}
                    className="text-blue-500 hover:text-blue-600 font-medium mt-2"
                  >
                    + Agregar primer vehiculo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {vehiculos.map((vehiculo, idx) => (
                    <VehiculoFormWeb
                      key={idx}
                      index={idx}
                      vehiculo={vehiculo}
                      onChange={handleVehiculoChange}
                      onRemove={(i) => setVehiculos(prev => prev.filter((_, j) => j !== i))}
                      auxiliares={auxiliares}
                      dispositivosCatalogo={auxiliares?.dispositivos_seguridad || []}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Via (solo HECHO_TRANSITO) */}
          {activeTab === 'via' && isHechoTransito && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-800">Estado de la Via</h3>
              <CondicionesViaFields
                clima={form.clima}
                area={form.area}
                materialVia={form.material_via}
                viaEstado={form.via_estado}
                viaTopografia={form.via_topografia}
                viaGeometria={form.via_geometria}
                viaPeralte={form.via_peralte}
                viaCondicion={form.via_condicion}
                showViaDetails={true}
                onChange={handleChange}
              />

              {/* Grupo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo (número)</label>
                <input
                  type="number"
                  min="0"
                  value={form.grupo}
                  onChange={(e) => handleChange('grupo', e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Número de grupo"
                />
              </div>

              {/* Causas del Hecho */}
              <CausasSelectorWeb
                causas={auxiliares?.causas_hecho || []}
                selected={form.causas}
                onChange={(ids) => handleChange('causas', ids)}
              />
            </div>
          )}

          {/* TAB: Recursos */}
          {activeTab === 'recursos' && (
            <RecursosSection
              gruas={gruas}
              ajustadores={ajustadores}
              autoridadesSeleccionadas={autoridadesSeleccionadas}
              detallesAutoridades={detallesAutoridades}
              socorroSeleccionados={socorroSeleccionados}
              detallesSocorro={detallesSocorro}
              onGruasChange={setGruas}
              onAjustadoresChange={setAjustadores}
              onAutoridadesChange={setAutoridadesSeleccionadas}
              onDetallesAutoridadesChange={setDetallesAutoridades}
              onSocorroChange={setSocorroSeleccionados}
              onDetallesSocorroChange={setDetallesSocorro}
              showGruas={tipoSituacion !== 'EMERGENCIA'}
              showAjustadores={tipoSituacion !== 'EMERGENCIA'}
            />
          )}

          </>)}
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
                {isEditMode ? 'Guardando...' : 'Creando...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? 'Guardar Cambios' : 'Crear Situacion'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
