import { AUTORIDADES, UNIDADES_SOCORRO } from '../../constants/situacionTypes';

interface DetalleAutoridad {
  cantidad?: number;
  hora_llegada?: string;
  observaciones?: string;
}

interface AutoridadSocorroWebProps {
  tipo: 'autoridad' | 'socorro';
  seleccionados: string[];
  detalles: Record<string, DetalleAutoridad>;
  onSelectionChange: (seleccionados: string[]) => void;
  onDetallesChange: (detalles: Record<string, DetalleAutoridad>) => void;
}

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

export default function AutoridadSocorroWeb({
  tipo,
  seleccionados,
  detalles,
  onSelectionChange,
  onDetallesChange,
}: AutoridadSocorroWebProps) {
  const opciones = tipo === 'autoridad' ? AUTORIDADES : UNIDADES_SOCORRO;
  const titulo = tipo === 'autoridad' ? 'Autoridades Presentes' : 'Unidades de Socorro';

  const toggleSeleccion = (item: string) => {
    if (seleccionados.includes(item)) {
      onSelectionChange(seleccionados.filter((s) => s !== item));
      const nuevosDetalles = { ...detalles };
      delete nuevosDetalles[item];
      onDetallesChange(nuevosDetalles);
    } else {
      onSelectionChange([...seleccionados, item]);
    }
  };

  const actualizarDetalle = (item: string, campo: string, valor: any) => {
    onDetallesChange({
      ...detalles,
      [item]: {
        ...detalles[item],
        [campo]: valor,
      },
    });
  };

  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{titulo}</h4>

      {/* Chips de selección */}
      <div className="flex flex-wrap gap-2 mb-4">
        {opciones.map((opcion) => {
          const isSelected = seleccionados.includes(opcion);
          return (
            <button
              key={opcion}
              type="button"
              onClick={() => toggleSeleccion(opcion)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isSelected
                  ? tipo === 'autoridad'
                    ? 'bg-blue-500 text-white'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {opcion}
            </button>
          );
        })}
      </div>

      {/* Detalles de los seleccionados */}
      {seleccionados.length > 0 && (
        <div className="space-y-3">
          {seleccionados.map((item) => (
            <div
              key={item}
              className={`p-3 rounded-lg border ${
                tipo === 'autoridad'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                  : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-800 dark:text-gray-200">{item}</span>
                <button
                  type="button"
                  onClick={() => toggleSeleccion(item)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Cantidad de Unidades</label>
                  <input
                    type="number"
                    min="0"
                    value={detalles[item]?.cantidad || ''}
                    onChange={(e) => actualizarDetalle(item, 'cantidad', parseInt(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Hora de Llegada</label>
                  <input
                    type="time"
                    value={detalles[item]?.hora_llegada || ''}
                    onChange={(e) => actualizarDetalle(item, 'hora_llegada', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Observaciones</label>
                  <input
                    type="text"
                    value={detalles[item]?.observaciones || ''}
                    onChange={(e) => actualizarDetalle(item, 'observaciones', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
