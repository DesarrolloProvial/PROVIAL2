// Componente de formulario para autoridades y socorro

// Tipos de autoridades
export const AUTORIDADES = [
  'PMT',
  'PNC',
  'DGT',
  'MP',
  'Ejercito',
  'PROVIAL',
  'Ninguna',
];

// Tipos de unidades de socorro
export const UNIDADES_SOCORRO = [
  'Bomberos Voluntarios',
  'Bomberos Municipales',
  'Cruz Roja',
  'CONRED',
  'Ambulancia Privada',
  'PROVIAL',
  'Ninguna',
];

export interface DetalleAutoridadSocorro {
  tipo_autoridad: string;
  hora_llegada: string;
  nip_chapa: string;
  nombre_comandante: string;
  cantidad_elementos: number | null;
  cantidad_unidades: number | null;
}

interface AutoridadesSocorroFormProps {
  tipo: 'autoridad' | 'socorro';
  value: DetalleAutoridadSocorro[];
  onChange: (data: DetalleAutoridadSocorro[]) => void;
  readonly?: boolean;
}

export default function AutoridadesSocorroForm({
  tipo,
  value,
  onChange,
  readonly = false,
}: AutoridadesSocorroFormProps) {
  const opciones = tipo === 'autoridad' ? AUTORIDADES : UNIDADES_SOCORRO;
  const titulo = tipo === 'autoridad' ? 'Autoridades Presentes' : 'Unidades de Socorro';
  const colorBase = tipo === 'autoridad' ? 'blue' : 'green';

  const seleccionados = value.map((v) => v.tipo_autoridad);

  const toggleSeleccion = (nombre: string) => {
    if (readonly) return;

    if (nombre === 'Ninguna') {
      onChange([{ tipo_autoridad: 'Ninguna', hora_llegada: '', nip_chapa: '', nombre_comandante: '', cantidad_elementos: null, cantidad_unidades: null }]);
      return;
    }

    if (seleccionados.includes(nombre)) {
      // Deseleccionar
      onChange(value.filter((v) => v.tipo_autoridad !== nombre));
    } else {
      // Seleccionar - quitar "Ninguna" si estaba
      const filtered = value.filter((v) => v.tipo_autoridad !== 'Ninguna');
      onChange([
        ...filtered,
        {
          tipo_autoridad: nombre,
          hora_llegada: '',
          nip_chapa: '',
          nombre_comandante: '',
          cantidad_elementos: null,
          cantidad_unidades: null,
        },
      ]);
    }
  };

  const actualizarDetalle = (nombre: string, campo: keyof DetalleAutoridadSocorro, valor: any) => {
    onChange(
      value.map((v) =>
        v.tipo_autoridad === nombre ? { ...v, [campo]: valor } : v
      )
    );
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-700">{titulo}</h4>

      {/* Grid de checkboxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {opciones.map((opcion) => {
          const isSelected = seleccionados.includes(opcion);
          return (
            <label
              key={opcion}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                isSelected
                  ? `bg-${colorBase}-50 border-${colorBase}-300`
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              } ${readonly ? 'cursor-default' : ''}`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSeleccion(opcion)}
                disabled={readonly}
                className={`rounded border-gray-300 text-${colorBase}-600 focus:ring-${colorBase}-500`}
              />
              <span className="text-sm text-gray-700">{opcion}</span>
            </label>
          );
        })}
      </div>

      {/* Formularios de detalles */}
      {value
        .filter((v) => v.tipo_autoridad !== 'Ninguna' && v.tipo_autoridad !== 'PROVIAL')
        .map((detalle) => (
          <div
            key={detalle.tipo_autoridad}
            className={`p-4 rounded-lg border-l-4 ${
              tipo === 'autoridad'
                ? 'bg-blue-50 border-blue-500'
                : 'bg-green-50 border-green-500'
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <h5 className="font-medium text-gray-800">
                Detalles de {detalle.tipo_autoridad}
              </h5>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => toggleSeleccion(detalle.tipo_autoridad)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Hora de llegada */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Hora de Llegada
                </label>
                <input
                  type="time"
                  value={detalle.hora_llegada || ''}
                  onChange={(e) =>
                    actualizarDetalle(detalle.tipo_autoridad, 'hora_llegada', e.target.value)
                  }
                  disabled={readonly}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* NIP/Chapa */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  NIP/Chapa
                </label>
                <input
                  type="text"
                  value={detalle.nip_chapa || ''}
                  onChange={(e) =>
                    actualizarDetalle(detalle.tipo_autoridad, 'nip_chapa', e.target.value)
                  }
                  placeholder="Ingrese NIP o Chapa"
                  disabled={readonly}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Nombre comandante */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Nombre del Comandante
                </label>
                <input
                  type="text"
                  value={detalle.nombre_comandante || ''}
                  onChange={(e) =>
                    actualizarDetalle(detalle.tipo_autoridad, 'nombre_comandante', e.target.value)
                  }
                  placeholder="Nombre completo"
                  disabled={readonly}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Cantidad elementos */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cantidad de Elementos
                </label>
                <input
                  type="number"
                  min="0"
                  value={detalle.cantidad_elementos ?? ''}
                  onChange={(e) =>
                    actualizarDetalle(
                      detalle.tipo_autoridad,
                      'cantidad_elementos',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="Ej: 5"
                  disabled={readonly}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Cantidad unidades */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cantidad de Unidades
                </label>
                <input
                  type="number"
                  min="0"
                  value={detalle.cantidad_unidades ?? ''}
                  onChange={(e) =>
                    actualizarDetalle(
                      detalle.tipo_autoridad,
                      'cantidad_unidades',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  placeholder="Ej: 2"
                  disabled={readonly}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        ))}

      {/* Mensaje si no hay seleccionados */}
      {value.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          No se han seleccionado {tipo === 'autoridad' ? 'autoridades' : 'unidades de socorro'}
        </p>
      )}
    </div>
  );
}
