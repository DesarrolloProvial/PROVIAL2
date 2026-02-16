import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, situacionesAPI } from '../../services/api';
import {
  X, Save, RefreshCw, Plus, Trash2,
  MapPin, Car, AlertTriangle, FileText,
  Users, ChevronDown, ChevronRight,
} from 'lucide-react';

// ============================================
// CONSTANTES
// ============================================
const TIPOS_SITUACION_CREAR = [
  { value: 'HECHO_TRANSITO', label: 'Hecho de Transito', color: 'bg-red-500', icon: AlertTriangle },
  { value: 'ASISTENCIA_VEHICULAR', label: 'Asistencia Vehicular', color: 'bg-teal-500', icon: Car },
  { value: 'EMERGENCIA', label: 'Emergencia Vial', color: 'bg-orange-500', icon: AlertTriangle },
];

const SENTIDOS = [
  { value: 'NORTE', label: 'Norte' },
  { value: 'SUR', label: 'Sur' },
  { value: 'ESTE', label: 'Este' },
  { value: 'OESTE', label: 'Oeste' },
  { value: 'AMBOS', label: 'Ambos sentidos' },
];

const CLIMAS = ['DESPEJADO', 'NUBLADO', 'LLUVIA', 'NEBLINA'];
const AREAS = ['URBANA', 'RURAL'];
const MATERIALES_VIA = ['ASFALTO', 'CONCRETO', 'TERRACERIA', 'ADOQUIN', 'EMPEDRADO', 'OTRO'];
const OBSTRUCCIONES = [
  { value: 'NO', label: 'No obstruye' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'TOTAL', label: 'Total' },
];
const ESTADOS_PILOTO = [
  { value: 'ILESO', label: 'Ileso' },
  { value: 'HERIDO', label: 'Herido' },
  { value: 'TRASLADADO', label: 'Trasladado' },
  { value: 'FALLECIDO', label: 'Fallecido' },
  { value: 'FUGADO', label: 'Fugado' },
];
const TIPOS_VEHICULO = [
  'Motocicleta', 'Sedan', 'Pick-up', 'Camion', 'Bus', 'Cabezal',
  'Rastra', 'Microbus', 'Panel', 'Bicicleta', 'Jeep', 'Maquinaria',
  'Ambulancia', 'Trailer', 'Otro',
];
const NIVELES_DANO = ['Leve', 'Moderado', 'Severo', 'Perdida Total'];

// ============================================
// INTERFACES
// ============================================
interface VehiculoForm {
  tipo_vehiculo: string;
  marca: string;
  color: string;
  placa: string;
  estado_piloto: string;
  personas_asistidas: number;
  dano: string;
  piloto_nombre: string;
  piloto_dpi: string;
  piloto_telefono: string;
  licencia_numero: string;
  licencia_tipo: string;
  observaciones: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  unidades: any[]; // resumen unidades
}

const emptyVehiculo = (): VehiculoForm => ({
  tipo_vehiculo: '',
  marca: '',
  color: '',
  placa: '',
  estado_piloto: 'ILESO',
  personas_asistidas: 0,
  dano: '',
  piloto_nombre: '',
  piloto_dpi: '',
  piloto_telefono: '',
  licencia_numero: '',
  licencia_tipo: '',
  observaciones: '',
});

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
export default function CrearSituacionModal({ isOpen, onClose, onCreated, unidades }: Props) {
  const [step, setStep] = useState(1); // 1 = tipo, 2 = formulario
  const [tipoSituacion, setTipoSituacion] = useState('');
  const [activeTab, setActiveTab] = useState('general');
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
    clima: '',
    area: '',
    material_via: '',
    obstruye: 'NO',
    observaciones: '',
    // Victimas (hecho transito)
    heridos: 0,
    fallecidos: 0,
    ilesos: 0,
    heridos_leves: 0,
    heridos_graves: 0,
    trasladados: 0,
    fugados: 0,
    acuerdo_involucrados: false,
    acuerdo_detalle: '',
    // Via (hecho transito)
    via_estado: '',
    via_topografia: '',
    via_geometria: '',
    // Emergencia
    km_fin: '',
    descripcion: '',
  });

  const [vehiculos, setVehiculos] = useState<VehiculoForm[]>([]);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [expandedVehiculos, setExpandedVehiculos] = useState<Set<number>>(new Set([0]));

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

  // Load municipios on dept change
  useEffect(() => {
    if (form.departamento_id) {
      api.get(`/geografia/departamentos/${form.departamento_id}/municipios`)
        .then(res => setMunicipios(res.data.municipios || res.data || []))
        .catch(() => setMunicipios([]));
    } else {
      setMunicipios([]);
    }
  }, [form.departamento_id]);

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
      setTipoSituacion('');
      setActiveTab('general');
      setForm(prev => ({ ...prev, unidad_id: '', ruta_id: '', km: '', sentido: '', latitud: '', longitud: '', departamento_id: null, municipio_id: null, clima: '', area: '', material_via: '', obstruye: 'NO', observaciones: '', heridos: 0, fallecidos: 0, ilesos: 0, heridos_leves: 0, heridos_graves: 0, trasladados: 0, fugados: 0, acuerdo_involucrados: false, acuerdo_detalle: '', via_estado: '', via_topografia: '', via_geometria: '', km_fin: '', descripcion: '' }));
      setVehiculos([]);
      setError('');
    }
  }, [isOpen]);

  const handleChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const addVehiculo = () => {
    setVehiculos(prev => [...prev, emptyVehiculo()]);
    setExpandedVehiculos(prev => new Set([...prev, vehiculos.length]));
  };

  const updateVehiculo = (index: number, field: string, value: any) => {
    setVehiculos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeVehiculo = (index: number) => {
    setVehiculos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleVehiculoExpanded = (index: number) => {
    setExpandedVehiculos(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
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
    }
    if (tipoSituacion === 'ASISTENCIA_VEHICULAR') {
      tabs.push({ id: 'vehiculos', label: 'Vehiculos', icon: Car });
    }
    return tabs;
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.unidad_id) { setError('Selecciona una unidad'); return; }
    if (!form.ruta_id) { setError('Selecciona una ruta'); return; }
    if (!form.km) { setError('Ingresa el kilometro'); return; }

    setSaving(true);
    setError('');

    try {
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
        obstruccion: { obstruye: form.obstruye },
        observaciones: form.observaciones || undefined,
      };

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
      }

      if (tipoSituacion === 'EMERGENCIA') {
        payload.descripcion = form.descripcion || undefined;
        if (form.km_fin) payload.km_fin = parseFloat(form.km_fin);
      }

      if (vehiculos.length > 0) {
        payload.vehiculos = vehiculos.map(v => ({
          tipo_vehiculo: v.tipo_vehiculo,
          marca: v.marca,
          color: v.color,
          placa: v.placa,
          estado_piloto: v.estado_piloto,
          personas_asistidas: v.personas_asistidas,
          dano: v.dano,
          piloto_nombre: v.piloto_nombre,
          piloto_dpi: v.piloto_dpi,
          piloto_telefono: v.piloto_telefono,
          licencia_numero: v.licencia_numero,
          licencia_tipo: v.licencia_tipo,
          observaciones: v.observaciones,
        }));
      }

      await situacionesAPI.create(payload);
      onCreated();
      onClose();
    } catch (err: any) {
      console.error('Error creando situacion:', err);
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
            <h2 className="text-xl font-bold text-gray-900">Nueva Situacion</h2>
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"
              title="Cambiar tipo"
            >
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Nueva: {tipoConfig?.label}
              </h2>
            </div>
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
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* TAB: General */}
          {activeTab === 'general' && (
            <div className="space-y-6">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruta *</label>
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
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Ubicacion</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kilometro *</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.km}
                      onChange={(e) => handleChange('km', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 45.5"
                    />
                  </div>
                  {tipoSituacion === 'EMERGENCIA' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Km Fin</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.km_fin}
                        onChange={(e) => handleChange('km_fin', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sentido</label>
                    <select
                      value={form.sentido}
                      onChange={(e) => handleChange('sentido', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {SENTIDOS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lat/Lng manual */}
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                    <input
                      type="text"
                      value={form.latitud}
                      onChange={(e) => handleChange('latitud', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: 14.6349"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                    <input
                      type="text"
                      value={form.longitud}
                      onChange={(e) => handleChange('longitud', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: -90.5069"
                    />
                  </div>
                </div>
              </div>

              {/* Departamento / Municipio */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Ubicacion Geografica</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                    <select
                      value={form.departamento_id || ''}
                      onChange={(e) => handleChange('departamento_id', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {departamentos.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                    <select
                      value={form.municipio_id || ''}
                      onChange={(e) => handleChange('municipio_id', e.target.value ? Number(e.target.value) : null)}
                      disabled={!form.departamento_id}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">{form.departamento_id ? 'Seleccionar...' : 'Seleccione departamento primero'}</option>
                      {municipios.map((m: any) => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Condiciones */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Condiciones</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Clima</label>
                    <select
                      value={form.clima}
                      onChange={(e) => handleChange('clima', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {CLIMAS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                    <select
                      value={form.area}
                      onChange={(e) => handleChange('area', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {AREAS.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Material Via</label>
                    <select
                      value={form.material_via}
                      onChange={(e) => handleChange('material_via', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {MATERIALES_VIA.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Obstruccion */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Obstruccion de Via</h3>
                <div className="flex gap-3">
                  {OBSTRUCCIONES.map(o => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => handleChange('obstruye', o.value)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        form.obstruye === o.value
                          ? o.value === 'TOTAL' ? 'border-red-500 bg-red-50 text-red-700'
                          : o.value === 'PARCIAL' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripcion (emergencia) */}
              {tipoSituacion === 'EMERGENCIA' && (
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
          {activeTab === 'victimas' && tipoSituacion === 'HECHO_TRANSITO' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-800">Conteo de Victimas</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { field: 'heridos', label: 'Heridos', color: 'text-orange-600' },
                  { field: 'heridos_leves', label: 'Heridos Leves', color: 'text-yellow-600' },
                  { field: 'heridos_graves', label: 'Heridos Graves', color: 'text-red-600' },
                  { field: 'fallecidos', label: 'Fallecidos', color: 'text-red-800' },
                  { field: 'ilesos', label: 'Ilesos', color: 'text-green-600' },
                  { field: 'trasladados', label: 'Trasladados', color: 'text-blue-600' },
                  { field: 'fugados', label: 'Fugados', color: 'text-gray-600' },
                ].map(({ field, label, color }) => (
                  <div key={field} className="bg-gray-50 rounded-lg p-3">
                    <label className={`block text-xs font-medium ${color} mb-1`}>{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={(form as any)[field]}
                      onChange={(e) => handleChange(field, parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg font-bold"
                    />
                  </div>
                ))}
              </div>

              {/* Acuerdo */}
              <div className="mt-6">
                <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100">
                  <input
                    type="checkbox"
                    checked={form.acuerdo_involucrados}
                    onChange={(e) => handleChange('acuerdo_involucrados', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <div>
                    <span className="font-medium text-gray-800">Acuerdo entre involucrados</span>
                    <p className="text-xs text-gray-500">Marcar si las partes llegaron a un acuerdo</p>
                  </div>
                </label>
                {form.acuerdo_involucrados && (
                  <textarea
                    value={form.acuerdo_detalle}
                    onChange={(e) => handleChange('acuerdo_detalle', e.target.value)}
                    rows={2}
                    className="w-full mt-3 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Detalles del acuerdo..."
                  />
                )}
              </div>
            </div>
          )}

          {/* TAB: Vehiculos */}
          {activeTab === 'vehiculos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Vehiculos Involucrados ({vehiculos.length})</h3>
                <button
                  onClick={addVehiculo}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Vehiculo
                </button>
              </div>

              {vehiculos.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Car className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay vehiculos registrados.</p>
                  <p className="text-sm">Agrega al menos uno para un reporte completo.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vehiculos.map((v, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header vehiculo */}
                      <div
                        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer"
                        onClick={() => toggleVehiculoExpanded(idx)}
                      >
                        <div className="flex items-center gap-3">
                          {expandedVehiculos.has(idx) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          <span className="font-medium">
                            Vehiculo #{idx + 1}
                            {v.tipo_vehiculo && ` - ${v.tipo_vehiculo}`}
                            {v.placa && ` (${v.placa})`}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeVehiculo(idx); }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Body vehiculo */}
                      {expandedVehiculos.has(idx) && (
                        <div className="p-4 space-y-4">
                          {/* Datos basicos */}
                          <div className="grid md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
                              <select
                                value={v.tipo_vehiculo}
                                onChange={(e) => updateVehiculo(idx, 'tipo_vehiculo', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                              >
                                <option value="">Seleccionar...</option>
                                {TIPOS_VEHICULO.map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Placa</label>
                              <input
                                type="text"
                                value={v.placa}
                                onChange={(e) => updateVehiculo(idx, 'placa', e.target.value.toUpperCase())}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded uppercase"
                                placeholder="P-123ABC"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                              <input
                                type="text"
                                value={v.marca}
                                onChange={(e) => updateVehiculo(idx, 'marca', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                              <input
                                type="text"
                                value={v.color}
                                onChange={(e) => updateVehiculo(idx, 'color', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Estado Piloto</label>
                              <select
                                value={v.estado_piloto}
                                onChange={(e) => updateVehiculo(idx, 'estado_piloto', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                              >
                                {ESTADOS_PILOTO.map(ep => (
                                  <option key={ep.value} value={ep.value}>{ep.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Nivel de Dano</label>
                              <select
                                value={v.dano}
                                onChange={(e) => updateVehiculo(idx, 'dano', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                              >
                                <option value="">Sin dato</option>
                                {NIVELES_DANO.map(d => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Datos piloto */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Datos del Piloto</p>
                            <div className="grid md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                                <input
                                  type="text"
                                  value={v.piloto_nombre}
                                  onChange={(e) => updateVehiculo(idx, 'piloto_nombre', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">DPI</label>
                                <input
                                  type="text"
                                  value={v.piloto_dpi}
                                  onChange={(e) => updateVehiculo(idx, 'piloto_dpi', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Telefono</label>
                                <input
                                  type="text"
                                  value={v.piloto_telefono}
                                  onChange={(e) => updateVehiculo(idx, 'piloto_telefono', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">No. Licencia</label>
                                <input
                                  type="text"
                                  value={v.licencia_numero}
                                  onChange={(e) => updateVehiculo(idx, 'licencia_numero', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo Licencia</label>
                                <select
                                  value={v.licencia_tipo}
                                  onChange={(e) => updateVehiculo(idx, 'licencia_tipo', e.target.value)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                >
                                  <option value="">Sin dato</option>
                                  {['A', 'B', 'C', 'M', 'E'].map(t => (
                                    <option key={t} value={t}>Tipo {t}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Personas Asistidas</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={v.personas_asistidas}
                                  onChange={(e) => updateVehiculo(idx, 'personas_asistidas', parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Observaciones vehiculo */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                            <input
                              type="text"
                              value={v.observaciones}
                              onChange={(e) => updateVehiculo(idx, 'observaciones', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                              placeholder="Notas adicionales del vehiculo..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Via (solo HECHO_TRANSITO) */}
          {activeTab === 'via' && tipoSituacion === 'HECHO_TRANSITO' && (
            <div className="space-y-6">
              <h3 className="font-semibold text-gray-800">Estado de la Via</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Via</label>
                  <select
                    value={form.via_estado}
                    onChange={(e) => handleChange('via_estado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {['BUENA', 'REGULAR', 'MALA'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topografia</label>
                  <select
                    value={form.via_topografia}
                    onChange={(e) => handleChange('via_topografia', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {['PLANA', 'ONDULADA', 'MONTANOSA'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Geometria</label>
                  <select
                    value={form.via_geometria}
                    onChange={(e) => handleChange('via_geometria', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {['RECTA', 'CURVA', 'INTERSECCION', 'ROTONDA'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
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
                Crear Situacion
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
