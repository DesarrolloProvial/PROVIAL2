import React from 'react';
import { IncidenteFormModal, AsistenciaFormModal } from './forms';
import { api } from '../services/api';

interface SituacionFormSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  situacion: any;
  onSave?: () => void;
}

/**
 * Componente que selecciona y muestra el formulario apropiado
 * según el tipo de situación (idéntico al móvil)
 */
export default function SituacionFormSelector({
  isOpen,
  onClose,
  situacion,
  onSave,
}: SituacionFormSelectorProps) {
  if (!isOpen || !situacion) return null;

  const tipoSituacion = situacion.tipo_situacion?.toUpperCase();

  // Formularios especiales para INCIDENTE y ASISTENCIA_VEHICULAR
  // (idénticos a las pantallas del móvil)
  switch (tipoSituacion) {
    case 'INCIDENTE':
      return (
        <IncidenteFormModal
          isOpen={isOpen}
          onClose={onClose}
          situacion={situacion}
          onSave={onSave}
        />
      );

    case 'ASISTENCIA_VEHICULAR':
      return (
        <AsistenciaFormModal
          isOpen={isOpen}
          onClose={onClose}
          situacion={situacion}
          onSave={onSave}
        />
      );

    // Para otros tipos de situación (PATRULLAJE, PARADA_ESTRATEGICA, etc.)
    // mostramos un formulario genérico simple
    default:
      return (
        <GenericSituacionModal
          isOpen={isOpen}
          onClose={onClose}
          situacion={situacion}
          onSave={onSave}
        />
      );
  }
}

/**
 * Formulario genérico para situaciones simples
 * (PATRULLAJE, PARADA_ESTRATEGICA, CAMBIO_RUTA, COMIDA, DESCANSO, etc.)
 */
function GenericSituacionModal({
  isOpen,
  onClose,
  situacion,
  onSave,
}: SituacionFormSelectorProps) {
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    km: situacion?.km?.toString() || '',
    sentido: situacion?.sentido || '',
    descripcion: situacion?.descripcion || '',
    observaciones: situacion?.observaciones || '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.patch(`/situaciones/${situacion.id}`, {
        ...formData,
        km: formData.km ? parseFloat(formData.km) : null,
      });
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error('Error guardando:', error);
      alert(error.response?.data?.error || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Obtener color según tipo
  const getTypeColor = () => {
    const tipo = situacion?.tipo_situacion?.toUpperCase();
    switch (tipo) {
      case 'PATRULLAJE': return 'green';
      case 'PARADA_ESTRATEGICA': return 'purple';
      case 'CAMBIO_RUTA': return 'yellow';
      case 'COMIDA':
      case 'DESCANSO': return 'cyan';
      case 'REGULACION_TRAFICO': return 'orange';
      default: return 'gray';
    }
  };

  const color = getTypeColor();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className={`flex justify-between items-center p-4 border-b bg-${color}-50`}>
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Editar Situación
            </h2>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-${color}-100 text-${color}-700`}>
              {situacion?.tipo_situacion?.replace(/_/g, ' ')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info de ruta */}
          <div className="bg-gray-50 border-l-4 border-gray-400 p-3 rounded">
            <div className="text-xs font-semibold text-gray-500">Ruta</div>
            <div className="font-bold text-gray-800">{situacion?.ruta_codigo || 'Sin ruta'}</div>
          </div>

          {/* Km y Sentido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kilómetro
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
                <option value="NORTE">Norte</option>
                <option value="SUR">Sur</option>
                <option value="ORIENTE">Oriente</option>
                <option value="OCCIDENTE">Occidente</option>
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}
