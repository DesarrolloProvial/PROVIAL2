import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface Ajustador {
  empresa: string;
  nombre: string;
  telefono: string;
  vehiculo_placa: string;
  vehiculo_marca: string;
  vehiculo_color: string;
}

interface AjustadorFormWebProps {
  index: number;
  ajustador: Partial<Ajustador>;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}

const ASEGURADORAS = [
  'El Roble',
  'Seguros G&T',
  'Seguros Universales',
  'Pan-American Life',
  'MAPFRE',
  'Seguros Columna',
  'Seguros Azteca',
  'Seguros Banrural',
  'Asesuisa',
  'Otra',
];

export default function AjustadorFormWeb({ index, ajustador, onChange, onRemove }: AjustadorFormWebProps) {
  const [expandedSections, setExpandedSections] = useState({
    datosAjustador: true,
    vehiculo: false,
  });

  const handleChange = (field: string, value: any) => {
    onChange(index, field, value);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="bg-white border border-green-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-green-800">Ajustador #{index + 1}</h4>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>

      {/* Sección: Datos del Ajustador */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => toggleSection('datosAjustador')}
          className="w-full flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg text-left"
        >
          <span className="font-medium text-green-700">Datos del Ajustador</span>
          {expandedSections.datosAjustador ? (
            <ChevronUp className="w-5 h-5 text-green-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-green-600" />
          )}
        </button>

        {expandedSections.datosAjustador && (
          <div className="mt-3 space-y-3 px-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Aseguradora
              </label>
              <select
                value={ajustador.empresa || ''}
                onChange={(e) => handleChange('empresa', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Seleccionar aseguradora...</option>
                {ASEGURADORAS.map((aseg) => (
                  <option key={aseg} value={aseg}>{aseg}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Ajustador
                </label>
                <input
                  type="text"
                  value={ajustador.nombre || ''}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={ajustador.telefono || ''}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  placeholder="5555-5555"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sección: Vehículo del Ajustador */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => toggleSection('vehiculo')}
          className="w-full flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg text-left"
        >
          <span className="font-medium text-green-700">Vehículo del Ajustador</span>
          {expandedSections.vehiculo ? (
            <ChevronUp className="w-5 h-5 text-green-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-green-600" />
          )}
        </button>

        {expandedSections.vehiculo && (
          <div className="mt-3 space-y-3 px-1">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placa
                </label>
                <input
                  type="text"
                  value={ajustador.vehiculo_placa || ''}
                  onChange={(e) => handleChange('vehiculo_placa', e.target.value.toUpperCase())}
                  placeholder="P512KJF"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  value={ajustador.vehiculo_marca || ''}
                  onChange={(e) => handleChange('vehiculo_marca', e.target.value)}
                  placeholder="Ej: Toyota, Honda"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={ajustador.vehiculo_color || ''}
                  onChange={(e) => handleChange('vehiculo_color', e.target.value)}
                  placeholder="Ej: Blanco, Negro"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
