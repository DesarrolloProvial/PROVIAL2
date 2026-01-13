import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  TIPOS_HECHO_TRANSITO,
  SENTIDOS,
  AREAS,
  MATERIALES_VIA,
} from '../../constants/situacionTypes';
import VehiculoFormWeb from './VehiculoFormWeb';
import GruaFormWeb from './GruaFormWeb';
import AjustadorFormWeb from './AjustadorFormWeb';
import AutoridadSocorroWeb from './AutoridadSocorroWeb';
import ObstruccionSelectorWeb from './ObstruccionSelectorWeb';
import api from '../../services/api';

interface IncidenteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  situacion?: any;
  onSave?: () => void;
}

interface Vehiculo {
  tipo_vehiculo: string;
  marca: string;
  color: string;
  placa: string;
  placa_extranjera: boolean;
  piloto_nombre: string;
  piloto_dpi: string;
  piloto_telefono: string;
  estado_piloto: string;
  personas_asistidas: number;
  dano: string;
  cargado: boolean;
  tiene_contenedor: boolean;
  es_bus: boolean;
  pasajeros_bus: number;
  tiene_sancion: boolean;
  observaciones: string;
}

interface Departamento {
  id: number;
  nombre: string;
}

interface Municipio {
  id: number;
  nombre: string;
}

interface Grua {
  empresa: string;
  placa: string;
  tipo: string;
  piloto: string;
  traslado: boolean;
  traslado_a: string;
  costo_traslado: number | null;
}

interface Ajustador {
  empresa: string;
  nombre: string;
  telefono: string;
  vehiculo_placa: string;
  vehiculo_marca: string;
  vehiculo_color: string;
}

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'vehiculos', label: 'Vehículos' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'otros', label: 'Otros' },
  { id: 'evidencia', label: 'Evidencia' },
];

export default function IncidenteFormModal({
  isOpen,
  onClose,
  situacion,
  onSave,
}: IncidenteFormModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    tipoIncidente: '',
    km: '',
    sentido: '',
    departamento_id: null as number | null,
    municipio_id: null as number | null,
    direccion_detallada: '',
    obstruccion: '',
    danios_materiales: false,
    danios_infraestructura: false,
    descripcion_danios_infra: '',
    observaciones: '',
    autoridadesSeleccionadas: [] as string[],
    detallesAutoridades: {} as Record<string, any>,
    socorroSeleccionados: [] as string[],
    detallesSocorro: {} as Record<string, any>,
    // Campos accidentología (boleta)
    area: '',
    material_via: '',
    no_grupo_operativo: '',
  });

  const [vehiculos, setVehiculos] = useState<Partial<Vehiculo>[]>([]);
  const [gruas, setGruas] = useState<Partial<Grua>[]>([]);
  const [ajustadores, setAjustadores] = useState<Partial<Ajustador>[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      cargarDepartamentos();
      if (situacion) {
        // Cargar datos de la situación existente
        // Los detalles pueden venir en situacion.detalles (nueva estructura) o directamente
        const detalles = situacion.detalles || {};
        const daniosData = detalles.danios || {};
        const subtipoData = detalles.subtipo || {};
        const autoridadesSocorro = detalles.autoridades_socorro || {};

        setFormData({
          tipoIncidente: subtipoData.subtipo || situacion.subtipo_situacion || situacion.tipo_situacion || '',
          km: situacion.km?.toString() || '',
          sentido: situacion.sentido || '',
          departamento_id: situacion.departamento_id || null,
          municipio_id: situacion.municipio_id || null,
          direccion_detallada: situacion.direccion_detallada || '',
          obstruccion: situacion.obstruccion || '',
          danios_materiales: daniosData.materiales ?? situacion.danios_materiales ?? false,
          danios_infraestructura: daniosData.infraestructura ?? situacion.danios_infraestructura ?? false,
          descripcion_danios_infra: daniosData.descripcion_infra || situacion.descripcion_danios_infra || '',
          observaciones: situacion.observaciones || '',
          autoridadesSeleccionadas: autoridadesSocorro.autoridades || situacion.autoridades || [],
          detallesAutoridades: autoridadesSocorro.detalles_autoridades || situacion.detalles_autoridades || {},
          socorroSeleccionados: autoridadesSocorro.socorro || situacion.unidades_socorro || [],
          detallesSocorro: autoridadesSocorro.detalles_socorro || situacion.detalles_socorro || {},
          // Campos accidentología
          area: detalles.area || situacion.area || '',
          material_via: detalles.material_via || situacion.material_via || '',
          no_grupo_operativo: detalles.no_grupo_operativo || situacion.no_grupo_operativo || '',
        });
        // Cargar vehículos, grúas y ajustadores desde detalles o directamente
        setVehiculos(detalles.vehiculos || situacion.vehiculos || []);
        setGruas(detalles.gruas || situacion.gruas || []);
        setAjustadores(detalles.ajustadores || situacion.ajustadores || []);
      } else {
        // Reset form para nuevo
        resetForm();
      }
    }
  }, [isOpen, situacion]);

  // Cargar municipios cuando cambie departamento
  useEffect(() => {
    if (formData.departamento_id) {
      cargarMunicipios(formData.departamento_id);
    } else {
      setMunicipios([]);
    }
  }, [formData.departamento_id]);

  const cargarDepartamentos = async () => {
    try {
      const response = await api.get('/geografia/departamentos');
      // La API puede devolver {departamentos: [...]} o directamente [...]
      const data = response.data;
      if (Array.isArray(data)) {
        setDepartamentos(data);
      } else if (data && Array.isArray(data.departamentos)) {
        setDepartamentos(data.departamentos);
      } else {
        setDepartamentos([]);
      }
    } catch (error) {
      console.error('Error cargando departamentos:', error);
      setDepartamentos([]);
    }
  };

  const cargarMunicipios = async (deptoId: number) => {
    try {
      const response = await api.get(`/geografia/departamentos/${deptoId}/municipios`);
      // La API puede devolver {municipios: [...]} o directamente [...]
      const data = response.data;
      if (Array.isArray(data)) {
        setMunicipios(data);
      } else if (data && Array.isArray(data.municipios)) {
        setMunicipios(data.municipios);
      } else {
        setMunicipios([]);
      }
    } catch (error) {
      console.error('Error cargando municipios:', error);
      setMunicipios([]);
    }
  };

  const resetForm = () => {
    setFormData({
      tipoIncidente: '',
      km: '',
      sentido: '',
      departamento_id: null,
      municipio_id: null,
      direccion_detallada: '',
      obstruccion: '',
      danios_materiales: false,
      danios_infraestructura: false,
      descripcion_danios_infra: '',
      observaciones: '',
      autoridadesSeleccionadas: [],
      detallesAutoridades: {},
      socorroSeleccionados: [],
      detallesSocorro: {},
      // Campos accidentología
      area: '',
      material_via: '',
      no_grupo_operativo: '',
    });
    setVehiculos([]);
    setGruas([]);
    setAjustadores([]);
    setActiveTab('general');
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVehiculoChange = (index: number, field: string, value: any) => {
    setVehiculos((prev) => {
      const newVehiculos = [...prev];
      newVehiculos[index] = { ...newVehiculos[index], [field]: value };
      return newVehiculos;
    });
  };

  const addVehiculo = () => {
    setVehiculos((prev) => [
      ...prev,
      {
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
      },
    ]);
  };

  const removeVehiculo = (index: number) => {
    setVehiculos((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers para Grúas
  const handleGruaChange = (index: number, field: string, value: any) => {
    setGruas((prev) => {
      const newGruas = [...prev];
      newGruas[index] = { ...newGruas[index], [field]: value };
      return newGruas;
    });
  };

  const addGrua = () => {
    setGruas((prev) => [
      ...prev,
      {
        empresa: '',
        placa: '',
        tipo: '',
        piloto: '',
        traslado: false,
        traslado_a: '',
        costo_traslado: null,
      },
    ]);
  };

  const removeGrua = (index: number) => {
    setGruas((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers para Ajustadores
  const handleAjustadorChange = (index: number, field: string, value: any) => {
    setAjustadores((prev) => {
      const newAjustadores = [...prev];
      newAjustadores[index] = { ...newAjustadores[index], [field]: value };
      return newAjustadores;
    });
  };

  const addAjustador = () => {
    setAjustadores((prev) => [
      ...prev,
      {
        empresa: '',
        nombre: '',
        telefono: '',
        vehiculo_placa: '',
        vehiculo_marca: '',
        vehiculo_color: '',
      },
    ]);
  };

  const removeAjustador = (index: number) => {
    setAjustadores((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.tipoIncidente) {
      alert('Seleccione el tipo de incidente');
      setActiveTab('general');
      return;
    }
    if (!formData.km) {
      alert('Ingrese el kilómetro');
      setActiveTab('general');
      return;
    }
    if (vehiculos.length === 0) {
      alert('Agregue al menos un vehículo');
      setActiveTab('vehiculos');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        km: parseFloat(formData.km),
        sentido: formData.sentido,
        departamento_id: formData.departamento_id,
        municipio_id: formData.municipio_id,
        direccion_detallada: formData.direccion_detallada,
        obstruccion: formData.obstruccion,
        observaciones: formData.observaciones,
        vehiculos,
        gruas,
        ajustadores,
        subtipo_situacion: formData.tipoIncidente,
        // Datos de daños
        danios: {
          materiales: formData.danios_materiales,
          infraestructura: formData.danios_infraestructura,
          descripcion_infra: formData.descripcion_danios_infra,
        },
        // Datos de autoridades y socorro
        autoridades_socorro: {
          autoridades: formData.autoridadesSeleccionadas,
          detalles_autoridades: formData.detallesAutoridades,
          socorro: formData.socorroSeleccionados,
          detalles_socorro: formData.detallesSocorro,
        },
      };

      if (situacion?.id) {
        await api.patch(`/situaciones/${situacion.id}`, dataToSave);
      } else {
        // Para crear nuevo, necesitaríamos más datos (unidad, ruta, etc.)
        // Por ahora solo actualizamos
      }

      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('Error guardando incidente:', error);
      alert(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {situacion ? 'Editar Incidente' : 'Nuevo Incidente'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
              {tab.id === 'vehiculos' && vehiculos.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-600 rounded-full px-2 py-0.5 text-xs">
                  {vehiculos.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: General */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Ubicación y Tipo</h3>

              {/* Ruta actual (solo lectura) */}
              {situacion && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  <div className="text-xs font-semibold text-blue-600">Ruta Actual</div>
                  <div className="text-lg font-bold text-gray-800">
                    {situacion.ruta_codigo || 'Sin ruta'}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Incidente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Hecho *
                  </label>
                  <select
                    value={formData.tipoIncidente}
                    onChange={(e) => handleChange('tipoIncidente', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_HECHO_TRANSITO.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>

                {/* Kilómetro y Sentido */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kilómetro *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.km}
                      onChange={(e) => handleChange('km', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sentido
                    </label>
                    <select
                      value={formData.sentido}
                      onChange={(e) => handleChange('sentido', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar...</option>
                      {SENTIDOS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Departamento y Municipio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <select
                    value={formData.departamento_id || ''}
                    onChange={(e) => handleChange('departamento_id', e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {departamentos.map((dep) => (
                      <option key={dep.id} value={dep.id}>{dep.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Municipio
                  </label>
                  <select
                    value={formData.municipio_id || ''}
                    onChange={(e) => handleChange('municipio_id', e.target.value ? parseInt(e.target.value) : null)}
                    disabled={!formData.departamento_id}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {formData.departamento_id ? 'Seleccionar...' : 'Seleccione departamento'}
                    </option>
                    {municipios.map((mun) => (
                      <option key={mun.id} value={mun.id}>{mun.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dirección detallada */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección o Referencia
                </label>
                <input
                  type="text"
                  value={formData.direccion_detallada}
                  onChange={(e) => handleChange('direccion_detallada', e.target.value)}
                  placeholder="Ej: Frente a gasolinera Shell..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Datos de Boleta (Accidentología) */}
              <h3 className="text-lg font-semibold text-gray-700 mt-6 mb-4">Datos de Boleta</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Área */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Área
                  </label>
                  <select
                    value={formData.area}
                    onChange={(e) => handleChange('area', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {AREAS.map((a) => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                </div>

                {/* Material de vía */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material de la Vía
                  </label>
                  <select
                    value={formData.material_via}
                    onChange={(e) => handleChange('material_via', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar...</option>
                    {MATERIALES_VIA.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Grupo Operativo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. Grupo Operativo
                  </label>
                  <input
                    type="text"
                    value={formData.no_grupo_operativo}
                    onChange={(e) => handleChange('no_grupo_operativo', e.target.value)}
                    placeholder="Ej: G-1, G-2..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Obstrucción */}
              <ObstruccionSelectorWeb
                value={formData.obstruccion}
                onChange={(val) => handleChange('obstruccion', val)}
              />
            </div>
          )}

          {/* Tab: Vehículos */}
          {activeTab === 'vehiculos' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">
                  Vehículos Involucrados ({vehiculos.length})
                </h3>
                <button
                  type="button"
                  onClick={addVehiculo}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agregar Vehículo
                </button>
              </div>

              {vehiculos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <div className="text-gray-400 text-5xl mb-4">🚗</div>
                  <p className="text-gray-500 mb-4">No hay vehículos registrados</p>
                  <button
                    type="button"
                    onClick={addVehiculo}
                    className="text-blue-500 hover:text-blue-600 font-medium"
                  >
                    + Agregar primer vehículo
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {vehiculos.map((vehiculo, index) => (
                    <VehiculoFormWeb
                      key={index}
                      index={index}
                      vehiculo={vehiculo}
                      onChange={handleVehiculoChange}
                      onRemove={removeVehiculo}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Recursos */}
          {activeTab === 'recursos' && (
            <div className="space-y-6">
              {/* Sección: Grúas */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-amber-700">
                    Grúas ({gruas.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addGrua}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Grúa
                  </button>
                </div>

                {gruas.length === 0 ? (
                  <div className="text-center py-6 bg-amber-50 rounded-lg border border-dashed border-amber-300">
                    <p className="text-amber-600 text-sm">No hay grúas registradas</p>
                  </div>
                ) : (
                  gruas.map((grua, index) => (
                    <GruaFormWeb
                      key={index}
                      index={index}
                      grua={grua}
                      onChange={handleGruaChange}
                      onRemove={removeGrua}
                    />
                  ))
                )}
              </div>

              {/* Sección: Ajustadores */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-green-700">
                    Ajustadores ({ajustadores.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addAjustador}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Ajustador
                  </button>
                </div>

                {ajustadores.length === 0 ? (
                  <div className="text-center py-6 bg-green-50 rounded-lg border border-dashed border-green-300">
                    <p className="text-green-600 text-sm">No hay ajustadores registrados</p>
                  </div>
                ) : (
                  ajustadores.map((ajustador, index) => (
                    <AjustadorFormWeb
                      key={index}
                      index={index}
                      ajustador={ajustador}
                      onChange={handleAjustadorChange}
                      onRemove={removeAjustador}
                    />
                  ))
                )}
              </div>

              {/* Sección: Autoridades y Socorro */}
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Autoridades y Socorro</h3>

                <AutoridadSocorroWeb
                  tipo="autoridad"
                  seleccionados={formData.autoridadesSeleccionadas}
                  detalles={formData.detallesAutoridades}
                  onSelectionChange={(val) => handleChange('autoridadesSeleccionadas', val)}
                  onDetallesChange={(val) => handleChange('detallesAutoridades', val)}
                />

                <AutoridadSocorroWeb
                  tipo="socorro"
                  seleccionados={formData.socorroSeleccionados}
                  detalles={formData.detallesSocorro}
                  onSelectionChange={(val) => handleChange('socorroSeleccionados', val)}
                  onDetallesChange={(val) => handleChange('detallesSocorro', val)}
                />
              </div>
            </div>
          )}

          {/* Tab: Otros */}
          {activeTab === 'otros' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-700">Daños y Observaciones</h3>

              {/* Daños */}
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.danios_materiales}
                    onChange={(e) => handleChange('danios_materiales', e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Daños Materiales</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.danios_infraestructura}
                    onChange={(e) => handleChange('danios_infraestructura', e.target.checked)}
                    className="h-5 w-5 text-blue-600 rounded border-gray-300"
                  />
                  <span className="text-gray-700">Daños a Infraestructura</span>
                </label>

                {formData.danios_infraestructura && (
                  <div className="ml-8">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descripción de daños a infraestructura
                    </label>
                    <textarea
                      value={formData.descripcion_danios_infra}
                      onChange={(e) => handleChange('descripcion_danios_infra', e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones Generales
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => handleChange('observaciones', e.target.value)}
                  rows={4}
                  placeholder="Escriba cualquier observación adicional..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Tab: Evidencia */}
          {activeTab === 'evidencia' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Evidencia Fotográfica</h3>

              {situacion?.id ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <div className="text-4xl mb-4">📸</div>
                  <p className="text-gray-500 mb-2">
                    La carga de evidencia debe realizarse desde la app móvil.
                  </p>
                  <p className="text-sm text-gray-400">
                    Situación ID: {situacion.id}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="text-yellow-700">
                    Primero guarde el incidente para poder agregar evidencia.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {situacion ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
