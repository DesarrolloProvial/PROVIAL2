import { useState, useEffect } from 'react';
import {
  TIPOS_ASISTENCIA,
  SENTIDOS,
} from '../../constants/situacionTypes';
import VehiculoFormWeb from './VehiculoFormWeb';
import AutoridadSocorroWeb from './AutoridadSocorroWeb';
import ObstruccionSelectorWeb from './ObstruccionSelectorWeb';
import api from '../../services/api';

interface AsistenciaFormModalProps {
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

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'vehiculos', label: 'Vehículos' },
  { id: 'recursos', label: 'Recursos' },
  { id: 'otros', label: 'Otros' },
  { id: 'evidencia', label: 'Evidencia' },
];

export default function AsistenciaFormModal({
  isOpen,
  onClose,
  situacion,
  onSave,
}: AsistenciaFormModalProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tipoAsistencia: '',
    km: '',
    sentido: '',
    jurisdiccion: '',
    direccion_detallada: '',
    obstruccion: '',
    servicio_proporcionado: '',
    observaciones: '',
    autoridadesSeleccionadas: [] as string[],
    detallesAutoridades: {} as Record<string, any>,
    socorroSeleccionados: [] as string[],
    detallesSocorro: {} as Record<string, any>,
  });

  const [vehiculos, setVehiculos] = useState<Partial<Vehiculo>[]>([]);

  // Cargar datos iniciales
  useEffect(() => {
    if (isOpen) {
      if (situacion) {
        // Cargar datos de la situación existente
        setFormData({
          tipoAsistencia: situacion.subtipo_situacion || '',
          km: situacion.km?.toString() || '',
          sentido: situacion.sentido || '',
          jurisdiccion: situacion.jurisdiccion || '',
          direccion_detallada: situacion.direccion_detallada || '',
          obstruccion: situacion.obstruccion || '',
          servicio_proporcionado: situacion.descripcion || '',
          observaciones: situacion.observaciones || '',
          autoridadesSeleccionadas: situacion.autoridades || [],
          detallesAutoridades: situacion.detalles_autoridades || {},
          socorroSeleccionados: situacion.unidades_socorro || [],
          detallesSocorro: situacion.detalles_socorro || {},
        });
        setVehiculos(situacion.vehiculos || []);
      } else {
        resetForm();
      }
    }
  }, [isOpen, situacion]);

  const resetForm = () => {
    setFormData({
      tipoAsistencia: '',
      km: '',
      sentido: '',
      jurisdiccion: '',
      direccion_detallada: '',
      obstruccion: '',
      servicio_proporcionado: '',
      observaciones: '',
      autoridadesSeleccionadas: [],
      detallesAutoridades: {},
      socorroSeleccionados: [],
      detallesSocorro: {},
    });
    setVehiculos([]);
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

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.tipoAsistencia) {
      alert('Seleccione el tipo de asistencia');
      setActiveTab('general');
      return;
    }
    if (!formData.km) {
      alert('Ingrese el kilómetro');
      setActiveTab('general');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        km: parseFloat(formData.km),
        vehiculos,
        subtipo_situacion: formData.tipoAsistencia,
        descripcion: formData.servicio_proporcionado,
      };

      if (situacion?.id) {
        await api.patch(`/situaciones/${situacion.id}`, dataToSave);
      }

      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('Error guardando asistencia:', error);
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
        <div className="flex justify-between items-center p-4 border-b bg-teal-50">
          <h2 className="text-xl font-bold text-teal-800">
            {situacion ? 'Editar Asistencia Vehicular' : 'Nueva Asistencia Vehicular'}
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
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-teal-600 border-b-2 border-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.id === 'vehiculos' && vehiculos.length > 0 && (
                <span className="ml-1 bg-teal-100 text-teal-600 rounded-full px-2 py-0.5 text-xs">
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
                <div className="bg-teal-50 border-l-4 border-teal-500 p-3 rounded">
                  <div className="text-xs font-semibold text-teal-600">Ruta Actual</div>
                  <div className="text-lg font-bold text-gray-800">
                    {situacion.ruta_codigo || 'Sin ruta'}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Asistencia */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Asistencia *
                  </label>
                  <select
                    value={formData.tipoAsistencia}
                    onChange={(e) => handleChange('tipoAsistencia', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_ASISTENCIA.map((tipo) => (
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
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sentido
                    </label>
                    <select
                      value={formData.sentido}
                      onChange={(e) => handleChange('sentido', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="">Seleccionar...</option>
                      {SENTIDOS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Jurisdicción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jurisdicción (Municipio/Departamento)
                </label>
                <input
                  type="text"
                  value={formData.jurisdiccion}
                  onChange={(e) => handleChange('jurisdiccion', e.target.value)}
                  placeholder="Ej: San Lucas Sacatepéquez, Sacatepéquez"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
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
                  placeholder="Ej: A la altura de la entrada a..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
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
                  Vehículos Asistidos ({vehiculos.length})
                </h3>
                <button
                  type="button"
                  onClick={addVehiculo}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
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
                    className="text-teal-500 hover:text-teal-600 font-medium"
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
          )}

          {/* Tab: Otros */}
          {activeTab === 'otros' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-700">Servicio y Observaciones</h3>

              {/* Servicio Proporcionado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Servicio Proporcionado
                </label>
                <textarea
                  value={formData.servicio_proporcionado}
                  onChange={(e) => handleChange('servicio_proporcionado', e.target.value)}
                  rows={3}
                  placeholder="Describa el servicio que se proporcionó al usuario..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
                />
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500"
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
                    Primero guarde la asistencia para poder agregar evidencia.
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
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
