import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import {
  TIPOS_VEHICULO,
  MARCAS_VEHICULO,
  ESTADOS_PILOTO,
  NIVELES_DANO,
} from '../../constants/situacionTypes';

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
  // Campos adicionales (Tarjeta Circulación)
  tarjeta_circulacion: string;
  nit: string;
  nombre_propietario: string;
  direccion_propietario: string;
  modelo: string;
  // Campos adicionales (Licencia)
  licencia_tipo: string;
  licencia_numero: string;
  licencia_vencimiento: string;
  licencia_antiguedad: number;
  fecha_nacimiento_piloto: string;
  etnia_piloto: string;
  // Campos adicionales (Carga)
  carga_tipo: string;
  carga_descripcion: string;
  // Campos adicionales (Contenedor)
  contenedor_numero: string;
  contenedor_empresa: string;
  // Campos adicionales (Bus)
  bus_empresa: string;
  bus_ruta: string;
  // Campos adicionales (Sanción)
  sancion_articulo: string;
  sancion_descripcion: string;
  sancion_monto: number;
  // Campos de documentos consignados
  doc_consignado_licencia: boolean;
  doc_consignado_tarjeta: boolean;
  doc_consignado_tarjeta_circulacion: boolean;
  doc_consignado_licencia_transporte: boolean;
  doc_consignado_tarjeta_operaciones: boolean;
  doc_consignado_poliza: boolean;
  doc_consignado_por: string;
}

interface VehiculoFormWebProps {
  index: number;
  vehiculo: Partial<Vehiculo>;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}

const COLORES_VEHICULO = [
  'Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde',
  'Amarillo', 'Naranja', 'Café', 'Beige', 'Dorado', 'Morado', 'Otro'
].sort();

const TIPOS_LICENCIA = ['A', 'B', 'C', 'M', 'E'];

export default function VehiculoFormWeb({ index, vehiculo, onChange, onRemove }: VehiculoFormWebProps) {
  const [expandedSections, setExpandedSections] = useState({
    preliminares: true,
    tarjetaCirculacion: false,
    licencia: false,
    carga: false,
    contenedor: false,
    bus: false,
    sancion: false,
    documentos: false,
  });

  const handleChange = (field: string, value: any) => {
    onChange(index, field, value);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({
    section,
    title,
    color = 'blue'
  }: {
    section: keyof typeof expandedSections;
    title: string;
    color?: string;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className={`w-full flex justify-between items-center bg-${color}-50 px-3 py-2 rounded-lg text-left mb-2`}
    >
      <span className={`font-medium text-${color}-700`}>{title}</span>
      {expandedSections[section] ? (
        <ChevronUp className={`w-5 h-5 text-${color}-600`} />
      ) : (
        <ChevronDown className={`w-5 h-5 text-${color}-600`} />
      )}
    </button>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-800">Vehículo #{index + 1}</h4>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>

      {/* Sección 1: Preliminares */}
      <SectionHeader section="preliminares" title="Datos Preliminares" />
      {expandedSections.preliminares && (
        <div className="mb-4 px-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Vehículo *
              </label>
              <select
                value={vehiculo.tipo_vehiculo || ''}
                onChange={(e) => handleChange('tipo_vehiculo', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                {TIPOS_VEHICULO.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <select
                value={vehiculo.marca || ''}
                onChange={(e) => handleChange('marca', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                {MARCAS_VEHICULO.map((marca) => (
                  <option key={marca} value={marca}>{marca}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <select
                value={vehiculo.color || ''}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                {COLORES_VEHICULO.map((color) => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Placa
              </label>
              <input
                type="text"
                value={vehiculo.placa || ''}
                onChange={(e) => handleChange('placa', e.target.value.toUpperCase())}
                placeholder="P123ABC"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 uppercase"
              />
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id={`placa_extranjera_${index}`}
                checked={vehiculo.placa_extranjera || false}
                onChange={(e) => handleChange('placa_extranjera', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor={`placa_extranjera_${index}`} className="ml-2 text-sm text-gray-700">
                Placa Extranjera
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado del Piloto *
              </label>
              <select
                value={vehiculo.estado_piloto || 'ILESO'}
                onChange={(e) => handleChange('estado_piloto', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {ESTADOS_PILOTO.map((estado) => (
                  <option key={estado.value} value={estado.value}>{estado.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personas Asistidas
              </label>
              <input
                type="number"
                min="0"
                value={vehiculo.personas_asistidas || 0}
                onChange={(e) => handleChange('personas_asistidas', parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nivel de Daño
              </label>
              <select
                value={vehiculo.dano || ''}
                onChange={(e) => handleChange('dano', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                {NIVELES_DANO.map((nivel) => (
                  <option key={nivel} value={nivel}>{nivel}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Sección 2: Tarjeta de Circulación */}
      <SectionHeader section="tarjetaCirculacion" title="Tarjeta de Circulación" color="gray" />
      {expandedSections.tarjetaCirculacion && (
        <div className="mb-4 px-1 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Tarjeta Circulación
              </label>
              <input
                type="text"
                value={vehiculo.tarjeta_circulacion || ''}
                onChange={(e) => handleChange('tarjeta_circulacion', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NIT Propietario
              </label>
              <input
                type="text"
                value={vehiculo.nit || ''}
                onChange={(e) => handleChange('nit', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Propietario
            </label>
            <input
              type="text"
              value={vehiculo.nombre_propietario || ''}
              onChange={(e) => handleChange('nombre_propietario', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección Propietario
            </label>
            <textarea
              value={vehiculo.direccion_propietario || ''}
              onChange={(e) => handleChange('direccion_propietario', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo (Año)
            </label>
            <input
              type="text"
              value={vehiculo.modelo || ''}
              onChange={(e) => handleChange('modelo', e.target.value)}
              placeholder="2020"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {/* Sección 3: Licencia de Conducir */}
      <SectionHeader section="licencia" title="Licencia de Conducir" color="purple" />
      {expandedSections.licencia && (
        <div className="mb-4 px-1 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Completo del Piloto
            </label>
            <input
              type="text"
              value={vehiculo.piloto_nombre || ''}
              onChange={(e) => handleChange('piloto_nombre', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Licencia
              </label>
              <div className="flex gap-2">
                {TIPOS_LICENCIA.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleChange('licencia_tipo', tipo)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${vehiculo.licencia_tipo === tipo
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                A: Motos | B: Livianos | C: Pesados | M: Maquinaria | E: Especial
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                No. Licencia
              </label>
              <input
                type="text"
                value={vehiculo.licencia_numero || ''}
                onChange={(e) => handleChange('licencia_numero', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vencimiento Licencia
              </label>
              <input
                type="date"
                value={vehiculo.licencia_vencimiento || ''}
                onChange={(e) => handleChange('licencia_vencimiento', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DPI
              </label>
              <input
                type="text"
                value={vehiculo.piloto_dpi || ''}
                onChange={(e) => handleChange('piloto_dpi', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={vehiculo.piloto_telefono || ''}
                onChange={(e) => handleChange('piloto_telefono', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Nacimiento
              </label>
              <input
                type="date"
                value={vehiculo.fecha_nacimiento_piloto || ''}
                onChange={(e) => handleChange('fecha_nacimiento_piloto', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Switches para secciones condicionales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 px-1">
        <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <input
            type="checkbox"
            checked={vehiculo.cargado || false}
            onChange={(e) => handleChange('cargado', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">Cargado</span>
        </label>
        <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <input
            type="checkbox"
            checked={vehiculo.tiene_contenedor || false}
            onChange={(e) => handleChange('tiene_contenedor', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">Contenedor</span>
        </label>
        <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <input
            type="checkbox"
            checked={vehiculo.es_bus || false}
            onChange={(e) => handleChange('es_bus', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">Es Bus</span>
        </label>
        <label className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
          <input
            type="checkbox"
            checked={vehiculo.tiene_sancion || false}
            onChange={(e) => handleChange('tiene_sancion', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700">Sanción</span>
        </label>
      </div>

      {/* Sección 4: Carga (condicional) */}
      {vehiculo.cargado && (
        <>
          <SectionHeader section="carga" title="Datos de Carga" color="orange" />
          {expandedSections.carga && (
            <div className="mb-4 px-1 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Carga
                </label>
                <input
                  type="text"
                  value={vehiculo.carga_tipo || ''}
                  onChange={(e) => handleChange('carga_tipo', e.target.value)}
                  placeholder="Ej: Granos, Materiales, Mercadería"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción de Carga
                </label>
                <textarea
                  value={vehiculo.carga_descripcion || ''}
                  onChange={(e) => handleChange('carga_descripcion', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Sección 5: Contenedor (condicional) */}
      {vehiculo.tiene_contenedor && (
        <>
          <SectionHeader section="contenedor" title="Datos de Contenedor/Remolque" color="teal" />
          {expandedSections.contenedor && (
            <div className="mb-4 px-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. Contenedor/Remolque
                </label>
                <input
                  type="text"
                  value={vehiculo.contenedor_numero || ''}
                  onChange={(e) => handleChange('contenedor_numero', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa Contenedor
                </label>
                <input
                  type="text"
                  value={vehiculo.contenedor_empresa || ''}
                  onChange={(e) => handleChange('contenedor_empresa', e.target.value)}
                  placeholder="Ej: MAERSK, EVERGREEN"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Sección 6: Bus (condicional) */}
      {vehiculo.es_bus && (
        <>
          <SectionHeader section="bus" title="Datos de Bus Extraurbano" color="indigo" />
          {expandedSections.bus && (
            <div className="mb-4 px-1 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa de Transporte
                </label>
                <input
                  type="text"
                  value={vehiculo.bus_empresa || ''}
                  onChange={(e) => handleChange('bus_empresa', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ruta del Bus
                </label>
                <input
                  type="text"
                  value={vehiculo.bus_ruta || ''}
                  onChange={(e) => handleChange('bus_ruta', e.target.value)}
                  placeholder="Guatemala - Quetzaltenango"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad de Pasajeros
                </label>
                <input
                  type="number"
                  min="0"
                  value={vehiculo.pasajeros_bus || 0}
                  onChange={(e) => handleChange('pasajeros_bus', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Sección 7: Sanción (condicional) */}
      {vehiculo.tiene_sancion && (
        <>
          <SectionHeader section="sancion" title="Datos de Sanción" color="red" />
          {expandedSections.sancion && (
            <div className="mb-4 px-1 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Artículo
                  </label>
                  <input
                    type="text"
                    value={vehiculo.sancion_articulo || ''}
                    onChange={(e) => handleChange('sancion_articulo', e.target.value)}
                    placeholder="Ej: Art. 145, Art. 146"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto (Q)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={vehiculo.sancion_monto || ''}
                    onChange={(e) => handleChange('sancion_monto', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripción de Sanción
                </label>
                <textarea
                  value={vehiculo.sancion_descripcion || ''}
                  onChange={(e) => handleChange('sancion_descripcion', e.target.value)}
                  rows={2}
                  placeholder="Ej: Conducir sin licencia, Exceso de velocidad"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Sección 8: Documentos Consignados */}
      <SectionHeader section="documentos" title="Documentos Consignados" color="emerald" />
      {expandedSections.documentos && (
        <div className="mb-4 px-1">
          <p className="text-sm text-gray-500 italic mb-3">
            Marque los documentos que fueron consignados a la autoridad
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <label className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_licencia || false}
                onChange={(e) => handleChange('doc_consignado_licencia', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700">Licencia de conducir</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_tarjeta_circulacion || false}
                onChange={(e) => handleChange('doc_consignado_tarjeta_circulacion', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700">Tarjeta de circulación</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_tarjeta || false}
                onChange={(e) => handleChange('doc_consignado_tarjeta', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700">Tarjeta de propiedad</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_licencia_transporte || false}
                onChange={(e) => handleChange('doc_consignado_licencia_transporte', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700">Licencia de transporte</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_tarjeta_operaciones || false}
                onChange={(e) => handleChange('doc_consignado_tarjeta_operaciones', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700">Tarjeta de operaciones</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_poliza || false}
                onChange={(e) => handleChange('doc_consignado_poliza', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700">Póliza de seguro</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Consignado por (autoridad)
            </label>
            <div className="flex gap-2">
              {['PNC', 'PMT', 'MP'].map((autoridad) => (
                <button
                  key={autoridad}
                  type="button"
                  onClick={() => handleChange('doc_consignado_por', autoridad)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${vehiculo.doc_consignado_por === autoridad
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  {autoridad}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Observaciones */}
      <div className="px-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones del Vehículo
        </label>
        <textarea
          value={vehiculo.observaciones || ''}
          onChange={(e) => handleChange('observaciones', e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
