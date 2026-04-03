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
        {causas.map(causa => (
          <label
            key={causa.id}
            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm ${
              selected.includes(causa.id)
                ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(causa.id)}
              onChange={() => toggle(causa.id)}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-gray-700 dark:text-gray-300">{causa.nombre}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
