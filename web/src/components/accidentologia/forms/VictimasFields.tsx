interface Props {
  heridos: number;
  heridos_leves: number;
  heridos_graves: number;
  fallecidos: number;
  ilesos: number;
  trasladados: number;
  fugados: number;
  acuerdo_involucrados: boolean;
  acuerdo_detalle: string;
  onChange: (field: string, value: any) => void;
}

export default function VictimasFields({
  heridos, heridos_leves, heridos_graves, fallecidos,
  ilesos, trasladados, fugados,
  acuerdo_involucrados, acuerdo_detalle, onChange,
}: Props) {
  const counters = [
    { key: 'heridos', label: 'Heridos', value: heridos, color: 'text-amber-600 dark:text-amber-400' },
    { key: 'heridos_leves', label: 'H. Leves', value: heridos_leves, color: 'text-amber-500 dark:text-amber-400' },
    { key: 'heridos_graves', label: 'H. Graves', value: heridos_graves, color: 'text-orange-600 dark:text-orange-400' },
    { key: 'fallecidos', label: 'Fallecidos', value: fallecidos, color: 'text-red-600 dark:text-red-400' },
    { key: 'ilesos', label: 'Ilesos', value: ilesos, color: 'text-green-600 dark:text-green-400' },
    { key: 'trasladados', label: 'Trasladados', value: trasladados, color: 'text-blue-600 dark:text-blue-400' },
    { key: 'fugados', label: 'Fugados', value: fugados, color: 'text-gray-600 dark:text-gray-400' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {counters.map(c => (
          <div key={c.key} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center bg-white dark:bg-gray-700/50">
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">{c.label}</label>
            <input type="number" min={0} value={c.value}
              onChange={e => onChange(c.key, parseInt(e.target.value) || 0)}
              className={`w-full text-center text-lg font-bold border-0 focus:ring-0 bg-transparent ${c.color}`} />
          </div>
        ))}
      </div>

      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700/50">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={acuerdo_involucrados}
            onChange={e => onChange('acuerdo_involucrados', e.target.checked)}
            className="rounded" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Acuerdo entre involucrados</span>
        </label>
        {acuerdo_involucrados && (
          <textarea value={acuerdo_detalle} placeholder="Detalle del acuerdo..."
            onChange={e => onChange('acuerdo_detalle', e.target.value)}
            className="w-full mt-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" rows={2} />
        )}
      </div>
    </div>
  );
}
