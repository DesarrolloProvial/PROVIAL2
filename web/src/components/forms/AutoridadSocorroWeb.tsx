import { AUTORIDADES, UNIDADES_SOCORRO } from '../../constants/situacionTypes';

export interface DetalleAutoridad {
  hora_llegada?: string;
  nip_chapa?: string;
  numero_unidad?: string;
  nombre_comandante?: string;
  cantidad_elementos?: string;
  subestacion?: string;
  cantidad_unidades?: string;
}

interface AutoridadSocorroWebProps {
  tipo: 'autoridad' | 'socorro';
  seleccionados: string[];
  detalles: Record<string, DetalleAutoridad>;
  onSelectionChange: (seleccionados: string[]) => void;
  onDetallesChange: (detalles: Record<string, DetalleAutoridad>) => void;
}

const inputCls = 'w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100';
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
  const accentColor = tipo === 'autoridad' ? 'bg-blue-500' : 'bg-green-500';
  const cardBorderColor = tipo === 'autoridad'
    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';

  const toggleSeleccion = (item: string) => {
    if (seleccionados.includes(item)) {
      onSelectionChange(seleccionados.filter((s) => s !== item));
      const nuevosDetalles = { ...detalles };
      delete nuevosDetalles[item];
      onDetallesChange(nuevosDetalles);
    } else {
      onSelectionChange([...seleccionados, item]);
      // Inicializar detalles vacíos
      onDetallesChange({
        ...detalles,
        [item]: {
          hora_llegada: '',
          nip_chapa: '',
          numero_unidad: '',
          nombre_comandante: '',
          cantidad_elementos: '',
          subestacion: '',
          cantidad_unidades: '',
        },
      });
    }
  };

  const actualizarDetalle = (item: string, campo: keyof DetalleAutoridad, valor: string) => {
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
                  ? `${accentColor} text-white`
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {opcion}
            </button>
          );
        })}
      </div>

      {/* Detalles de los seleccionados */}
      {seleccionados.filter(s => s !== 'Ninguna' && s !== 'PROVIAL').length > 0 && (
        <div className="space-y-4">
          {seleccionados
            .filter(s => s !== 'Ninguna' && s !== 'PROVIAL')
            .map((item) => (
              <div
                key={item}
                className={`p-3 rounded-lg border ${cardBorderColor}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-sm text-gray-800 dark:text-gray-200">{item}</span>
                  <button
                    type="button"
                    onClick={() => toggleSeleccion(item)}
                    className="text-gray-400 hover:text-red-500"
                    title="Quitar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Fila 1: Hora de llegada + NIP/Chapa */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Hora de llegada</label>
                    <input
                      type="time"
                      value={detalles[item]?.hora_llegada || ''}
                      onChange={(e) => actualizarDetalle(item, 'hora_llegada', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>NIP / Chapa</label>
                    <input
                      type="text"
                      value={detalles[item]?.nip_chapa || ''}
                      onChange={(e) => actualizarDetalle(item, 'nip_chapa', e.target.value)}
                      placeholder="Ingrese NIP o Chapa"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Fila 2: No. Unidad + Nombre Comandante */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className={labelCls}>Número de unidad</label>
                    <input
                      type="text"
                      value={detalles[item]?.numero_unidad || ''}
                      onChange={(e) => actualizarDetalle(item, 'numero_unidad', e.target.value)}
                      placeholder="Ej: 001"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Nombre del comandante</label>
                    <input
                      type="text"
                      value={detalles[item]?.nombre_comandante || ''}
                      onChange={(e) => actualizarDetalle(item, 'nombre_comandante', e.target.value)}
                      placeholder="Nombre completo"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Fila 3: Cant. Elementos + Subestación + Cant. Unidades */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Cant. de elementos</label>
                    <input
                      type="text"
                      value={detalles[item]?.cantidad_elementos || ''}
                      onChange={(e) => actualizarDetalle(item, 'cantidad_elementos', e.target.value)}
                      placeholder="Ej: 5"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Subestación</label>
                    <input
                      type="text"
                      value={detalles[item]?.subestacion || ''}
                      onChange={(e) => actualizarDetalle(item, 'subestacion', e.target.value)}
                      placeholder="Nombre de subestación"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Cant. de unidades</label>
                    <input
                      type="text"
                      value={detalles[item]?.cantidad_unidades || ''}
                      onChange={(e) => actualizarDetalle(item, 'cantidad_unidades', e.target.value)}
                      placeholder="Ej: 2"
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
