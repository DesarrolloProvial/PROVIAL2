import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

interface Grua {
  empresa: string;
  placa: string;
  tipo: string;
  piloto: string;
  traslado: boolean;
  traslado_a: string;
  costo_traslado: number | null;
}

interface GruaFormWebProps {
  index: number;
  grua: Partial<Grua>;
  onChange: (index: number, field: string, value: any) => void;
  onRemove: (index: number) => void;
}

export default function GruaFormWeb({ index, grua, onChange, onRemove }: GruaFormWebProps) {
  const [expandedSections, setExpandedSections] = useState({
    datosGrua: true,
    traslado: false,
  });

  const handleChange = (field: string, value: any) => {
    onChange(index, field, value);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-semibold text-amber-800">Grua #{index + 1}</h4>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Eliminar
        </button>
      </div>

      {/* Sección: Datos de Grúa */}
      <div className="mb-3">
        <button
          type="button"
          onClick={() => toggleSection('datosGrua')}
          className="w-full flex justify-between items-center bg-amber-50 px-3 py-2 rounded-lg text-left"
        >
          <span className="font-medium text-amber-700">Datos de Grúa</span>
          {expandedSections.datosGrua ? (
            <ChevronUp className="w-5 h-5 text-amber-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-amber-600" />
          )}
        </button>

        {expandedSections.datosGrua && (
          <div className="mt-3 space-y-3 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <input
                  type="text"
                  value={grua.empresa || ''}
                  onChange={(e) => handleChange('empresa', e.target.value)}
                  placeholder="Nombre de la empresa de grúas"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Placa Grúa
                </label>
                <input
                  type="text"
                  value={grua.placa || ''}
                  onChange={(e) => handleChange('placa', e.target.value.toUpperCase())}
                  placeholder="P123ABC"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500 uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Grúa
                </label>
                <select
                  value={grua.tipo || ''}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="PLATAFORMA">Plataforma</option>
                  <option value="GANCHO">Gancho</option>
                  <option value="CANASTA">Canasta</option>
                  <option value="PESADA">Pesada (Camiones)</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Operador
                </label>
                <input
                  type="text"
                  value={grua.piloto || ''}
                  onChange={(e) => handleChange('piloto', e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Switch: Realizó traslado */}
      <div className="flex items-center justify-between bg-gray-50 px-3 py-3 rounded-lg mb-3">
        <span className="text-sm font-medium text-gray-700">¿Realizó traslado?</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={grua.traslado || false}
            onChange={(e) => handleChange('traslado', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
      </div>

      {/* Sección: Datos de Traslado (condicional) */}
      {grua.traslado && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => toggleSection('traslado')}
            className="w-full flex justify-between items-center bg-amber-50 px-3 py-2 rounded-lg text-left"
          >
            <span className="font-medium text-amber-700">Datos de Traslado</span>
            {expandedSections.traslado ? (
              <ChevronUp className="w-5 h-5 text-amber-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-amber-600" />
            )}
          </button>

          {expandedSections.traslado && (
            <div className="mt-3 space-y-3 px-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lugar de Traslado
                </label>
                <textarea
                  value={grua.traslado_a || ''}
                  onChange={(e) => handleChange('traslado_a', e.target.value)}
                  placeholder="Ej: Parqueo municipal, Taller XYZ, etc."
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo de Traslado (Q)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={grua.costo_traslado || ''}
                  onChange={(e) => handleChange('costo_traslado', parseFloat(e.target.value) || null)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
