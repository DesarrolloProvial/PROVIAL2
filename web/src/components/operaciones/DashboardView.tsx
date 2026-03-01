import { useMutation, useQueryClient } from '@tanstack/react-query';
import { turnosService } from '../../services/turnos.service';
import { useNavigate } from 'react-router-dom';
import {
  Users, Truck, AlertTriangle, Fuel, Calendar,
  CheckCircle, MapPin, Clock, Edit2, Trash2,
} from 'lucide-react';

interface DashboardViewProps {
  data: any;
  turnoHoy?: any;
}

export default function DashboardView({ data, turnoHoy }: DashboardViewProps) {
  const resumen = data.resumen;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deleteMutation = useMutation({
    mutationFn: ({ asignacionId, forzar }: { asignacionId: number; forzar: boolean }) =>
      turnosService.deleteAsignacion(asignacionId, forzar),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['turno-hoy'] });
      alert(data.salida_cerrada
        ? 'Asignación eliminada y salida cerrada correctamente'
        : 'Asignación eliminada correctamente');
    },
    onError: (error: any, variables) => {
      const errorData = error.response?.data;
      if (errorData?.salida_id && !variables.forzar) {
        if (confirm(`${errorData.message}\n\n¿Desea cerrar la salida y eliminar la asignación de todas formas?`)) {
          deleteMutation.mutate({ asignacionId: variables.asignacionId, forzar: true });
        }
      } else {
        alert(errorData?.error || errorData?.message || 'Error al eliminar asignación');
      }
    },
  });

  const handleDelete = (asignacion: any) => {
    if (asignacion.en_ruta) {
      alert('No se puede eliminar una asignacion que está en ruta');
      return;
    }
    const asignacionId = asignacion.asignacion_id || asignacion.id;
    if (!asignacionId) {
      alert('Error: No se pudo obtener el ID de la asignacion');
      return;
    }
    if (confirm(`¿Eliminar asignacion de unidad ${asignacion.unidad_codigo}?`)) {
      deleteMutation.mutate({ asignacionId, forzar: false });
    }
  };

  const handleEdit = (asignacion: any) => {
    if (asignacion.en_ruta) {
      alert('No se puede editar una asignacion que está en ruta');
      return;
    }
    const asignacionConId = { ...asignacion, id: asignacion.asignacion_id || asignacion.id };
    navigate('/operaciones/crear-asignacion', {
      state: { editMode: true, asignacion: asignacionConId, turnoId: turnoHoy?.turno?.id }
    });
  };

  return (
    <div className="space-y-6">
      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Brigadas Activas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{resumen.total_brigadas_activas}</p>
              <p className="text-sm text-gray-500 mt-1">{resumen.brigadas_en_turno_hoy} en turno hoy</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Brigadas Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{resumen.brigadas_disponibles_hoy}</p>
              <p className="text-sm text-gray-500 mt-1">Para asignar hoy</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unidades Activas</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{resumen.total_unidades_activas}</p>
              <p className="text-sm text-gray-500 mt-1">{resumen.unidades_en_turno_hoy} en turno hoy</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Truck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unidades Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{resumen.unidades_disponibles_hoy}</p>
              <p className="text-sm text-gray-500 mt-1">Listas para salir</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.brigadas_necesitan_descanso > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Brigadas Necesitan Descanso</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {data.brigadas_necesitan_descanso} brigadas salieron recientemente
                </p>
                {data.alertas.brigadasDescanso.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {data.alertas.brigadasDescanso.map((b: any) => (
                      <li key={b.usuario_id} className="text-sm">
                        <span className="font-medium">{b.nombre_completo}</span>
                        <span className="text-gray-600"> ({b.chapa})</span>
                        <span className="text-yellow-600"> - Último turno hace {b.dias_desde_ultimo_turno} días</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {data.unidades_bajo_combustible > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Fuel className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Unidades con Bajo Combustible</h3>
                <p className="text-sm text-red-700 mt-1">
                  {data.unidades_bajo_combustible} unidades tienen menos de 20L
                </p>
                {data.alertas.unidadesCombustible.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {data.alertas.unidadesCombustible.map((u: any) => (
                      <li key={u.unidad_id} className="text-sm">
                        <span className="font-medium">{u.unidad_codigo}</span>
                        <span className="text-red-600">
                          {' '}- {u.combustible_actual != null ? Number(u.combustible_actual).toFixed(1) : '0.0'}L
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Asignaciones del Día */}
      {turnoHoy?.asignaciones?.length > 0 ? (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Asignaciones Activas</h2>
              </div>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                {turnoHoy.asignaciones.length} {turnoHoy.asignaciones.length === 1 ? 'unidad' : 'unidades'}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {turnoHoy.asignaciones.map((asignacion: any) => (
                <div key={asignacion.asignacion_id || asignacion.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900">{asignacion.unidad_codigo}</span>
                      {asignacion.en_ruta && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                          EN RUTA
                        </span>
                      )}
                      {asignacion.salida_estado === 'FINALIZADA' && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                          FINALIZADO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {asignacion.hora_salida && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          {asignacion.hora_salida}
                        </div>
                      )}
                      {!asignacion.hora_salida_real && (
                        <>
                          <button
                            onClick={() => handleEdit(asignacion)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Editar asignación"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(asignacion)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Eliminar asignación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {asignacion.hora_salida_real && (
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                          En ruta
                        </span>
                      )}
                    </div>
                  </div>

                  {asignacion.ruta_nombre && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{asignacion.ruta_nombre}</span>
                      {asignacion.sentido && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{asignacion.sentido}</span>
                      )}
                    </div>
                  )}

                  {asignacion.tripulacion?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-2">TRIPULACIÓN:</p>
                      <div className="space-y-1">
                        {asignacion.tripulacion.map((t: any) => (
                          <div key={t.usuario_id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3 text-gray-400" />
                              <span className="text-gray-900">{t.nombre_completo}</span>
                              <span className="text-gray-500">({t.chapa})</span>
                            </div>
                            <span className="text-xs text-gray-500 font-medium">{t.rol_tripulacion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {asignacion.acciones && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600">{asignacion.acciones}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-gray-400" />
            <div>
              <h3 className="font-semibold text-gray-700">Sin Asignaciones</h3>
              <p className="text-sm text-gray-500 mt-1">
                No hay asignaciones para el día de hoy. Crea una asignación para comenzar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Todo en orden */}
      {data.brigadas_necesitan_descanso === 0 && data.unidades_bajo_combustible === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Todo en Orden</h3>
              <p className="text-sm text-green-700 mt-1">
                No hay alertas actualmente. Todos los recursos están disponibles.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
