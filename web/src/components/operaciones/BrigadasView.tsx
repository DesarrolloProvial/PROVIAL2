import { useState } from 'react';

interface BrigadasViewProps {
  brigadas: any[];
  isLoading: boolean;
}

export default function BrigadasView({ brigadas, isLoading }: BrigadasViewProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Cargando brigadas...</div>;
  }

  const filteredBrigadas = brigadas.filter(b =>
    b.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.chapa.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <input
          type="text"
          placeholder="Buscar brigada..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Brigada</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Turnos (30d)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Último Turno</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rol Frecuente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBrigadas.map((brigada) => (
                <tr key={brigada.usuario_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{brigada.nombre_completo}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{brigada.chapa} • {brigada.sede_nombre}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {brigada.telefono || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{brigada.turnos_ultimo_mes}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{brigada.turnos_ultimo_trimestre} en 90d</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {brigada.ultimo_turno_fecha ? (
                      <>
                        <div className="text-gray-900 dark:text-gray-100">
                          {new Date(brigada.ultimo_turno_fecha).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Hace {brigada.dias_desde_ultimo_turno} días</div>
                      </>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">Sin turnos</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {brigada.rol_tripulacion_frecuente || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      brigada.activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400'
                    }`}>
                      {brigada.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
