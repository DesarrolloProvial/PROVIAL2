import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import Inspeccion360Historial from '../Inspeccion360Historial';

interface UnidadesViewProps {
  unidades: any[];
  isLoading: boolean;
}

export default function UnidadesView({ unidades, isLoading }: UnidadesViewProps) {
  const [modalInspeccion, setModalInspeccion] = useState<{ id: number; codigo: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canViewBitacora = user?.rol === 'ADMIN' || user?.rol === 'SUPER_ADMIN';

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Cargando unidades...</div>;
  }

  const filteredUnidades = unidades.filter(u =>
    u.unidad_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.marca && u.marca.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <input
            type="text"
            placeholder="Buscar unidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Combustible</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odómetro</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turnos (30d)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Uso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUnidades.map((unidad) => (
                  <tr key={unidad.unidad_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{unidad.unidad_codigo}</div>
                      <div className="text-sm text-gray-500">{unidad.marca} {unidad.modelo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {unidad.tipo_unidad}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {unidad.combustible_actual != null ? Number(unidad.combustible_actual).toFixed(1) : '0.0'}L
                      </div>
                      {unidad.capacidad_combustible && (
                        <div className="text-xs text-gray-500">de {unidad.capacidad_combustible}L</div>
                      )}
                      {unidad.combustible_actual < 20 && (
                        <span className="text-xs text-red-600">⚠️ Bajo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {unidad.odometro_actual != null ? unidad.odometro_actual.toLocaleString() : '0'} km
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{unidad.turnos_ultimo_mes}</div>
                      <div className="text-xs text-gray-500">
                        {unidad.km_ultimo_mes ? `${unidad.km_ultimo_mes.toFixed(0)} km` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {unidad.ultimo_turno_fecha ? (
                        <>
                          <div className="text-gray-900">
                            {new Date(unidad.ultimo_turno_fecha).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">Hace {unidad.dias_desde_ultimo_uso} días</div>
                        </>
                      ) : (
                        <span className="text-gray-400">Sin uso</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        unidad.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {unidad.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModalInspeccion({ id: unidad.unidad_id, codigo: unidad.unidad_codigo })}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Ver Inspecciones 360"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {canViewBitacora && (
                          <button
                            onClick={() => navigate(`/bitacora/${unidad.unidad_id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Ver Bitacora"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Inspecciones 360 */}
      {modalInspeccion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Inspecciones 360 - {modalInspeccion.codigo}
                </h2>
              </div>
              <button
                onClick={() => setModalInspeccion(null)}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <Inspeccion360Historial unidadId={modalInspeccion.id} dias={30} limite={20} autoOpen />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
