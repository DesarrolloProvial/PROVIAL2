import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import {
  TIPOS_VEHICULO,
  MARCAS_VEHICULO,
  ESTADOS_PILOTO,
  NIVELES_DANO,
  SEXOS,
  LUGARES_FALLECIMIENTO,
  TIPOS_PERSONA,
  ESTADOS_DISPOSITIVO,
  CUSTODIAS,
} from '../../constants/situacionTypes';

interface Persona {
  nombre: string;
  dpi: string;
  edad: number | '';
  genero: string;
  tipo_persona: string;
  estado: string;
  hospital_traslado: string;
  descripcion_lesiones: string;
  causa_fallecimiento: string;
  lugar_fallecimiento: string;
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
  ebriedad: boolean;
  sexo_piloto: string;
  hospital_traslado_piloto: string;
  descripcion_lesiones_piloto: string;
  causa_fallecimiento: string;
  lugar_fallecimiento: string;
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
  // Custodia
  custodia_estado: string;
  custodia_autoridad: string;
  custodia_motivo: string;
  custodia_destino: string;
  // Personas
  personas: Persona[];
  // Dispositivos
  dispositivos: { id: number; estado: string }[];
}

interface VehiculoFormWebProps {
  index: number;
  vehiculo: Partial<Vehiculo>;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
  auxiliares?: any;
  dispositivosCatalogo?: { id: number; nombre: string }[];
}

const COLORES_VEHICULO = [
  'Blanco', 'Negro', 'Gris', 'Plata', 'Rojo', 'Azul', 'Verde',
  'Amarillo', 'Naranja', 'Café', 'Beige', 'Dorado', 'Morado', 'Otro'
].sort();

const TIPOS_LICENCIA = ['A', 'B', 'C', 'M', 'E'];

const emptyPersona = (): Persona => ({
  nombre: '', dpi: '', edad: '', genero: '', tipo_persona: '',
  estado: 'ILESO', hospital_traslado: '', descripcion_lesiones: '',
  causa_fallecimiento: '', lugar_fallecimiento: '',
});

export default function VehiculoFormWeb({ index, vehiculo, onChange, onRemove, auxiliares, dispositivosCatalogo }: VehiculoFormWebProps) {
  const [expandedSections, setExpandedSections] = useState({
    preliminares: true,
    tarjetaCirculacion: false,
    licencia: false,
    carga: false,
    contenedor: false,
    bus: false,
    sancion: false,
    documentos: false,
    personas: false,
    dispositivos: false,
    custodia: false,
  });
  const [expandedPersonas, setExpandedPersonas] = useState<Record<number, boolean>>({});

  const handleChange = (field: string, value: any) => {
    onChange(index, field, value);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SECTION_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
    blue:    { bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-700 dark:text-blue-300',    icon: 'text-blue-600 dark:text-blue-400'    },
    gray:    { bg: 'bg-gray-100 dark:bg-gray-700',          text: 'text-gray-700 dark:text-gray-200',    icon: 'text-gray-600 dark:text-gray-300'    },
    purple:  { bg: 'bg-purple-50 dark:bg-purple-900/20',    text: 'text-purple-700 dark:text-purple-300',icon: 'text-purple-600 dark:text-purple-400' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-900/20',    text: 'text-orange-700 dark:text-orange-300',icon: 'text-orange-600 dark:text-orange-400' },
    teal:    { bg: 'bg-teal-50 dark:bg-teal-900/20',        text: 'text-teal-700 dark:text-teal-300',    icon: 'text-teal-600 dark:text-teal-400'    },
    indigo:  { bg: 'bg-indigo-50 dark:bg-indigo-900/20',    text: 'text-indigo-700 dark:text-indigo-300',icon: 'text-indigo-600 dark:text-indigo-400' },
    red:     { bg: 'bg-red-50 dark:bg-red-900/20',          text: 'text-red-700 dark:text-red-300',      icon: 'text-red-600 dark:text-red-400'      },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20',  text: 'text-emerald-700 dark:text-emerald-300',icon: 'text-emerald-600 dark:text-emerald-400' },
    cyan:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',        text: 'text-cyan-700 dark:text-cyan-300',    icon: 'text-cyan-600 dark:text-cyan-400'    },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-900/20',      text: 'text-amber-700 dark:text-amber-300',  icon: 'text-amber-600 dark:text-amber-400'  },
    rose:    { bg: 'bg-rose-50 dark:bg-rose-900/20',        text: 'text-rose-700 dark:text-rose-300',    icon: 'text-rose-600 dark:text-rose-400'    },
  };
  const SectionHeader = ({
    section,
    title,
    color = 'blue'
  }: {
    section: keyof typeof expandedSections;
    title: string;
    color?: string;
  }) => {
    const c = SECTION_COLORS[color] ?? SECTION_COLORS['blue'];
    return (
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className={`w-full flex justify-between items-center ${c.bg} px-3 py-2 rounded-lg text-left mb-2 transition-colors`}
      >
        <span className={`font-medium ${c.text}`}>{title}</span>
        {expandedSections[section] ? (
          <ChevronUp className={`w-5 h-5 ${c.icon}`} />
        ) : (
          <ChevronDown className={`w-5 h-5 ${c.icon}`} />
        )}
      </button>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200">Vehículo #{index + 1}</h4>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tipo de Vehículo *
              </label>
              <select
                value={vehiculo.tipo_vehiculo || ''}
                onChange={(e) => handleChange('tipo_vehiculo', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                {TIPOS_VEHICULO.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Marca
              </label>
              <select
                value={vehiculo.marca || ''}
                onChange={(e) => handleChange('marca', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar...</option>
                {MARCAS_VEHICULO.map((marca) => (
                  <option key={marca} value={marca}>{marca}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              <select
                value={vehiculo.color || ''}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Placa
              </label>
              <input
                type="text"
                value={vehiculo.placa || ''}
                onChange={(e) => handleChange('placa', e.target.value.toUpperCase())}
                placeholder="P123ABC"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500 uppercase"
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
              <label htmlFor={`placa_extranjera_${index}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Placa Extranjera
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estado del Piloto *
              </label>
              <select
                value={vehiculo.estado_piloto || 'ILESO'}
                onChange={(e) => handleChange('estado_piloto', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              >
                {ESTADOS_PILOTO.map((estado) => (
                  <option key={estado.value} value={estado.value}>{estado.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Ebriedad + Sexo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id={`ebriedad_${index}`}
                checked={vehiculo.ebriedad || false}
                onChange={(e) => handleChange('ebriedad', e.target.checked)}
                className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor={`ebriedad_${index}`} className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Ebriedad / bajo efectos
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sexo Piloto</label>
              <div className="flex gap-2">
                {SEXOS.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => handleChange('sexo_piloto', s.value)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium ${
                      vehiculo.sexo_piloto === s.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Campos condicionales del piloto */}
          {(vehiculo.estado_piloto === 'HERIDO' || vehiculo.estado_piloto === 'TRASLADADO') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hospital de traslado</label>
                <input
                  type="text"
                  value={vehiculo.hospital_traslado_piloto || ''}
                  onChange={(e) => handleChange('hospital_traslado_piloto', e.target.value)}
                  placeholder="Nombre del hospital"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción de lesiones</label>
                <input
                  type="text"
                  value={vehiculo.descripcion_lesiones_piloto || ''}
                  onChange={(e) => handleChange('descripcion_lesiones_piloto', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {vehiculo.estado_piloto === 'FALLECIDO' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Causa de fallecimiento</label>
                <input
                  type="text"
                  value={vehiculo.causa_fallecimiento || ''}
                  onChange={(e) => handleChange('causa_fallecimiento', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lugar de fallecimiento</label>
                <select
                  value={vehiculo.lugar_fallecimiento || ''}
                  onChange={(e) => handleChange('lugar_fallecimiento', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Seleccionar...</option>
                  {LUGARES_FALLECIMIENTO.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hospital</label>
                <input
                  type="text"
                  value={vehiculo.hospital_traslado_piloto || ''}
                  onChange={(e) => handleChange('hospital_traslado_piloto', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Personas Asistidas
              </label>
              <input
                type="number"
                min="0"
                value={vehiculo.personas_asistidas ?? ""}
                onChange={(e) => handleChange('personas_asistidas', e.target.value === '' ? '' : parseInt(e.target.value))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nivel de Daño
              </label>
              <select
                value={vehiculo.dano || ''}
                onChange={(e) => handleChange('dano', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                No. Tarjeta Circulación
              </label>
              <input
                type="text"
                value={vehiculo.tarjeta_circulacion || ''}
                onChange={(e) => handleChange('tarjeta_circulacion', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                NIT Propietario
              </label>
              <input
                type="text"
                value={vehiculo.nit || ''}
                onChange={(e) => handleChange('nit', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre Propietario
            </label>
            <input
              type="text"
              value={vehiculo.nombre_propietario || ''}
              onChange={(e) => handleChange('nombre_propietario', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dirección Propietario
            </label>
            <textarea
              value={vehiculo.direccion_propietario || ''}
              onChange={(e) => handleChange('direccion_propietario', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="w-32">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Modelo (Año)
            </label>
            <input
              type="text"
              value={vehiculo.modelo || ''}
              onChange={(e) => handleChange('modelo', e.target.value)}
              placeholder="2020"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      )}

      {/* Sección 3: Licencia de Conducir */}
      <SectionHeader section="licencia" title="Licencia de Conducir" color="purple" />
      {expandedSections.licencia && (
        <div className="mb-4 px-1 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre Completo del Piloto
            </label>
            <input
              type="text"
              value={vehiculo.piloto_nombre || ''}
              onChange={(e) => handleChange('piloto_nombre', e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A: Motos | B: Livianos | C: Pesados | M: Maquinaria | E: Especial
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                No. Licencia
              </label>
              <input
                type="text"
                value={vehiculo.licencia_numero || ''}
                onChange={(e) => handleChange('licencia_numero', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vencimiento Licencia
              </label>
              <input
                type="date"
                value={vehiculo.licencia_vencimiento || ''}
                onChange={(e) => handleChange('licencia_vencimiento', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                DPI
              </label>
              <input
                type="text"
                value={vehiculo.piloto_dpi || ''}
                onChange={(e) => handleChange('piloto_dpi', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={vehiculo.piloto_telefono || ''}
                onChange={(e) => handleChange('piloto_telefono', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha Nacimiento
              </label>
              <input
                type="date"
                value={vehiculo.fecha_nacimiento_piloto || ''}
                onChange={(e) => handleChange('fecha_nacimiento_piloto', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Antigüedad licencia (años)
              </label>
              <input
                type="number"
                min="0"
                value={vehiculo.licencia_antiguedad || ''}
                onChange={(e) => handleChange('licencia_antiguedad', parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Etnia del Piloto
              </label>
              <select
                value={vehiculo.etnia_piloto || ''}
                onChange={(e) => handleChange('etnia_piloto', e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Seleccionar...</option>
                {(auxiliares?.etnias || []).map((e: any) => (
                  <option key={e.id || e.nombre} value={e.nombre}>{e.nombre}</option>
                ))}
                {(!auxiliares?.etnias || auxiliares.etnias.length === 0) && (
                  <>
                    <option value="Ladino">Ladino</option>
                    <option value="Maya">Maya</option>
                    <option value="Garífuna">Garífuna</option>
                    <option value="Xinca">Xinca</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Switches para secciones condicionales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 px-1">
        <label className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
          <input
            type="checkbox"
            checked={vehiculo.cargado || false}
            onChange={(e) => handleChange('cargado', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Cargado</span>
        </label>
        <label className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
          <input
            type="checkbox"
            checked={vehiculo.tiene_contenedor || false}
            onChange={(e) => handleChange('tiene_contenedor', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Contenedor</span>
        </label>
        <label className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
          <input
            type="checkbox"
            checked={vehiculo.es_bus || false}
            onChange={(e) => handleChange('es_bus', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Es Bus</span>
        </label>
        <label className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
          <input
            type="checkbox"
            checked={vehiculo.tiene_sancion || false}
            onChange={(e) => handleChange('tiene_sancion', e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Sanción</span>
        </label>
      </div>

      {/* Sección 4: Carga (condicional) */}
      {vehiculo.cargado && (
        <>
          <SectionHeader section="carga" title="Datos de Carga" color="orange" />
          {expandedSections.carga && (
            <div className="mb-4 px-1 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Carga
                </label>
                <input
                  type="text"
                  value={vehiculo.carga_tipo || ''}
                  onChange={(e) => handleChange('carga_tipo', e.target.value)}
                  placeholder="Ej: Granos, Materiales, Mercadería"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción de Carga
                </label>
                <textarea
                  value={vehiculo.carga_descripcion || ''}
                  onChange={(e) => handleChange('carga_descripcion', e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  No. Contenedor/Remolque
                </label>
                <input
                  type="text"
                  value={vehiculo.contenedor_numero || ''}
                  onChange={(e) => handleChange('contenedor_numero', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Empresa Contenedor
                </label>
                <input
                  type="text"
                  value={vehiculo.contenedor_empresa || ''}
                  onChange={(e) => handleChange('contenedor_empresa', e.target.value)}
                  placeholder="Ej: MAERSK, EVERGREEN"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Empresa de Transporte
                </label>
                <input
                  type="text"
                  value={vehiculo.bus_empresa || ''}
                  onChange={(e) => handleChange('bus_empresa', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ruta del Bus
                </label>
                <input
                  type="text"
                  value={vehiculo.bus_ruta || ''}
                  onChange={(e) => handleChange('bus_ruta', e.target.value)}
                  placeholder="Guatemala - Quetzaltenango"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cantidad de Pasajeros
                </label>
                <input
                  type="number"
                  min="0"
                  value={vehiculo.pasajeros_bus ?? ""}
                  onChange={(e) => handleChange('pasajeros_bus', e.target.value === '' ? '' : parseInt(e.target.value))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Artículo
                  </label>
                  <input
                    type="text"
                    value={vehiculo.sancion_articulo || ''}
                    onChange={(e) => handleChange('sancion_articulo', e.target.value)}
                    placeholder="Ej: Art. 145, Art. 146"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Monto (Q)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={vehiculo.sancion_monto || ''}
                    onChange={(e) => handleChange('sancion_monto', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripción de Sanción
                </label>
                <textarea
                  value={vehiculo.sancion_descripcion || ''}
                  onChange={(e) => handleChange('sancion_descripcion', e.target.value)}
                  rows={2}
                  placeholder="Ej: Conducir sin licencia, Exceso de velocidad"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
          <p className="text-sm text-gray-500 dark:text-gray-400 italic mb-3">
            Marque los documentos que fueron consignados a la autoridad
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_licencia || false}
                onChange={(e) => handleChange('doc_consignado_licencia', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Licencia de conducir</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_tarjeta_circulacion || false}
                onChange={(e) => handleChange('doc_consignado_tarjeta_circulacion', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tarjeta de circulación</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_tarjeta || false}
                onChange={(e) => handleChange('doc_consignado_tarjeta', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tarjeta de propiedad</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_licencia_transporte || false}
                onChange={(e) => handleChange('doc_consignado_licencia_transporte', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Licencia de transporte</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_tarjeta_operaciones || false}
                onChange={(e) => handleChange('doc_consignado_tarjeta_operaciones', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Tarjeta de operaciones</span>
            </label>
            <label className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg">
              <input
                type="checkbox"
                checked={vehiculo.doc_consignado_poliza || false}
                onChange={(e) => handleChange('doc_consignado_poliza', e.target.checked)}
                className="h-4 w-4 text-emerald-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Póliza de seguro</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                  {autoridad}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sección 9: Personas/Acompañantes */}
      <SectionHeader section="personas" title={`Personas / Acompañantes (${(vehiculo.personas || []).length})`} color="cyan" />
      {expandedSections.personas && (
        <div className="mb-4 px-1">
          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={() => {
                const personas = [...(vehiculo.personas || []), emptyPersona()];
                handleChange('personas', personas);
                setExpandedPersonas(prev => ({ ...prev, [personas.length - 1]: true }));
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-600 text-white rounded-md text-sm hover:bg-cyan-700"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar persona
            </button>
          </div>

          {(vehiculo.personas || []).length === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No hay personas registradas</p>
          )}

          {(vehiculo.personas || []).map((persona: Persona, pIdx: number) => (
            <div key={pIdx} className="border border-gray-200 dark:border-gray-600 rounded-lg mb-2 overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedPersonas(prev => ({ ...prev, [pIdx]: !prev[pIdx] }))}
                className="w-full flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 px-3 py-2 text-left"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Persona {pIdx + 1}{persona.nombre ? ` - ${persona.nombre}` : ''}
                  {persona.estado ? ` (${persona.estado})` : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const personas = (vehiculo.personas || []).filter((_: any, i: number) => i !== pIdx);
                      handleChange('personas', personas);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedPersonas[pIdx] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {expandedPersonas[pIdx] && (
                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={persona.nombre}
                        onChange={(e) => {
                          const personas = [...(vehiculo.personas || [])];
                          personas[pIdx] = { ...personas[pIdx], nombre: e.target.value };
                          handleChange('personas', personas);
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">DPI</label>
                      <input
                        type="text"
                        value={persona.dpi}
                        onChange={(e) => {
                          const personas = [...(vehiculo.personas || [])];
                          personas[pIdx] = { ...personas[pIdx], dpi: e.target.value };
                          handleChange('personas', personas);
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Edad</label>
                      <input
                        type="number"
                        min="0"
                        value={persona.edad}
                        onChange={(e) => {
                          const personas = [...(vehiculo.personas || [])];
                          personas[pIdx] = { ...personas[pIdx], edad: e.target.value === '' ? '' : parseInt(e.target.value) };
                          handleChange('personas', personas);
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Género</label>
                      <div className="flex gap-2">
                        {SEXOS.map(s => (
                          <button
                            key={s.value}
                            type="button"
                            onClick={() => {
                              const personas = [...(vehiculo.personas || [])];
                              personas[pIdx] = { ...personas[pIdx], genero: s.value };
                              handleChange('personas', personas);
                            }}
                            className={`px-3 py-1 rounded-md text-sm ${
                              persona.genero === s.value ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tipo de persona</label>
                      <select
                        value={persona.tipo_persona}
                        onChange={(e) => {
                          const personas = [...(vehiculo.personas || [])];
                          personas[pIdx] = { ...personas[pIdx], tipo_persona: e.target.value };
                          handleChange('personas', personas);
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <option value="">Seleccionar...</option>
                        {TIPOS_PERSONA.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Estado</label>
                      <select
                        value={persona.estado}
                        onChange={(e) => {
                          const personas = [...(vehiculo.personas || [])];
                          personas[pIdx] = { ...personas[pIdx], estado: e.target.value };
                          handleChange('personas', personas);
                        }}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        {ESTADOS_PILOTO.map(ep => (
                          <option key={ep.value} value={ep.value}>{ep.label}</option>
                        ))}
                        <option value="DESCONOCIDO">Desconocido</option>
                      </select>
                    </div>
                  </div>

                  {(persona.estado === 'HERIDO' || persona.estado === 'TRASLADADO') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hospital de traslado</label>
                        <input
                          type="text"
                          value={persona.hospital_traslado}
                          onChange={(e) => {
                            const personas = [...(vehiculo.personas || [])];
                            personas[pIdx] = { ...personas[pIdx], hospital_traslado: e.target.value };
                            handleChange('personas', personas);
                          }}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Descripción de lesiones</label>
                        <input
                          type="text"
                          value={persona.descripcion_lesiones}
                          onChange={(e) => {
                            const personas = [...(vehiculo.personas || [])];
                            personas[pIdx] = { ...personas[pIdx], descripcion_lesiones: e.target.value };
                            handleChange('personas', personas);
                          }}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  )}

                  {persona.estado === 'FALLECIDO' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Causa de fallecimiento</label>
                        <input
                          type="text"
                          value={persona.causa_fallecimiento}
                          onChange={(e) => {
                            const personas = [...(vehiculo.personas || [])];
                            personas[pIdx] = { ...personas[pIdx], causa_fallecimiento: e.target.value };
                            handleChange('personas', personas);
                          }}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Lugar de fallecimiento</label>
                        <select
                          value={persona.lugar_fallecimiento}
                          onChange={(e) => {
                            const personas = [...(vehiculo.personas || [])];
                            personas[pIdx] = { ...personas[pIdx], lugar_fallecimiento: e.target.value };
                            handleChange('personas', personas);
                          }}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Seleccionar...</option>
                          {LUGARES_FALLECIMIENTO.map(l => (
                            <option key={l.value} value={l.value}>{l.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sección 10: Dispositivos de Seguridad */}
      <SectionHeader section="dispositivos" title={`Dispositivos de Seguridad (${(vehiculo.dispositivos || []).length} marcados)`} color="amber" />
      {expandedSections.dispositivos && (
        <div className="mb-4 px-1">
          {dispositivosCatalogo && dispositivosCatalogo.length > 0 ? (
            <div className="space-y-2">
              {dispositivosCatalogo.map((disp) => {
                const current = (vehiculo.dispositivos || []).find((d: any) => d.id === disp.id);
                return (
                  <div key={disp.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{disp.nombre}</span>
                    <div className="flex gap-1">
                      {ESTADOS_DISPOSITIVO.map(ed => (
                        <button
                          key={ed.value}
                          type="button"
                          onClick={() => {
                            const dispositivos = [...(vehiculo.dispositivos || [])];
                            const idx = dispositivos.findIndex((d: any) => d.id === disp.id);
                            if (current?.estado === ed.value) {
                              // Deselect
                              if (idx >= 0) dispositivos.splice(idx, 1);
                            } else if (idx >= 0) {
                              dispositivos[idx] = { id: disp.id, estado: ed.value };
                            } else {
                              dispositivos.push({ id: disp.id, estado: ed.value });
                            }
                            handleChange('dispositivos', dispositivos);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-medium ${
                            current?.estado === ed.value
                              ? ed.value === 'FUNCIONANDO' ? 'bg-green-600 text-white'
                                : ed.value === 'DANADO' ? 'bg-red-600 text-white'
                                : 'bg-gray-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {ed.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No hay dispositivos de seguridad en el catálogo
            </p>
          )}
        </div>
      )}

      {/* Sección 11: Custodia del Vehículo */}
      <SectionHeader section="custodia" title="Custodia del Vehículo" color="rose" />
      {expandedSections.custodia && (
        <div className="mb-4 px-1 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado de Custodia</label>
            <div className="flex gap-2 flex-wrap">
              {CUSTODIAS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => handleChange('custodia_estado', c.value)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    vehiculo.custodia_estado === c.value
                      ? 'bg-rose-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {vehiculo.custodia_estado && vehiculo.custodia_estado !== 'LIBRE' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Autoridad</label>
                <input
                  type="text"
                  value={vehiculo.custodia_autoridad || ''}
                  onChange={(e) => handleChange('custodia_autoridad', e.target.value)}
                  placeholder="Ej: PNC, PMT"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
                <input
                  type="text"
                  value={vehiculo.custodia_motivo || ''}
                  onChange={(e) => handleChange('custodia_motivo', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destino</label>
                <input
                  type="text"
                  value={vehiculo.custodia_destino || ''}
                  onChange={(e) => handleChange('custodia_destino', e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Observaciones */}
      <div className="px-1">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Observaciones del Vehículo
        </label>
        <textarea
          value={vehiculo.observaciones || ''}
          onChange={(e) => handleChange('observaciones', e.target.value)}
          rows={2}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  );
}
