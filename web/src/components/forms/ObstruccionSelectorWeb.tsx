import { OBSTRUCCIONES } from '../../constants/situacionTypes';

interface ObstruccionSelectorWebProps {
  value: string;
  onChange: (value: string) => void;
}

export default function ObstruccionSelectorWeb({ value, onChange }: ObstruccionSelectorWebProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Obstrucción de Vía
      </label>
      <div className="flex gap-2">
        {OBSTRUCCIONES.map((opcion) => {
          const isSelected = value === opcion.value;
          let colorClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200';

          if (isSelected) {
            switch (opcion.value) {
              case 'NO':
                colorClass = 'bg-green-500 text-white border-green-500';
                break;
              case 'PARCIAL':
                colorClass = 'bg-yellow-500 text-white border-yellow-500';
                break;
              case 'TOTAL':
                colorClass = 'bg-red-500 text-white border-red-500';
                break;
            }
          }

          return (
            <button
              key={opcion.value}
              type="button"
              onClick={() => onChange(opcion.value)}
              className={`flex-1 px-4 py-2 rounded-lg border font-medium text-sm transition-colors ${colorClass}`}
            >
              {opcion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
