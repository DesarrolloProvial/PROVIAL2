interface Props {
  causas: { id: number; nombre: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function CausasSelectorWeb({ causas, selected, onChange }: Props) {
  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  if (!causas || causas.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-4 mb-2">
        Causas del Hecho ({selected.length} seleccionadas)
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {causas.map(causa => {
          const isSelected = selected.includes(causa.id);
          return (
            <button
              key={causa.id}
              type="button"
              onClick={() => toggle(causa.id)}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm text-left w-full transition-colors ${
                isSelected
                  ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200'
                  : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                isSelected
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700'
              }`}>
                {isSelected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                    <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M1.5 5L4 7.5L8.5 2.5" />
                  </svg>
                )}
              </span>
              <span>{causa.nombre}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
