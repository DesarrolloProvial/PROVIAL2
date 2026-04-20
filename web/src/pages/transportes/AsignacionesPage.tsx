import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { ArrowLeft, Truck, Users, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

interface Tripulante {
  usuario_id: number;
  rol: string;
  nombre: string;
  chapa: string;
}

interface Borrador {
  id: number;
  turno_id: number;
  fecha_turno: string;
  estado_turno: string;
  sede_codigo: string;
  sede_nombre: string;
  ruta_codigo: string | null;
  ruta_nombre: string | null;
  km_inicio: number | null;
  km_final: number | null;
  sentido: string | null;
  tripulacion: Tripulante[] | null;
}

interface Unidad {
  id: number;
  codigo: string;
  tipo_unidad: string;
  placa: string;
  sede_nombre: string;
}

export default function AsignacionesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedBorrador, setSelectedBorrador] = useState<Borrador | null>(null);
  const [selectedUnidad, setSelectedUnidad] = useState<number | null>(null);

  const { data: borradores = [], isLoading: loadingBorradores, refetch } = useQuery<Borrador[]>({
    queryKey: ['borradores-pendientes'],
    queryFn: async () => {
      const res = await api.get('/transportes/asignaciones/pendientes');
      return res.data;
    },
  });

  const { data: unidades = [], isLoading: loadingUnidades } = useQuery<Unidad[]>({
    queryKey: ['unidades-disponibles-transportes'],
    queryFn: async () => {
      const res = await api.get('/transportes/asignaciones/unidades-disponibles');
      return res.data;
    },
    enabled: !!selectedBorrador,
  });

  const asignarMutation = useMutation({
    mutationFn: async ({ asignacionId, unidadId }: { asignacionId: number; unidadId: number }) => {
      const res = await api.put(`/transportes/asignaciones/${asignacionId}/unidad`, { unidadId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['borradores-pendientes'] });
      setSelectedBorrador(null);
      setSelectedUnidad(null);
      alert('Unidad asignada exitosamente');
    },
    onError: (error: any) => {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleAsignar = () => {
    if (!selectedBorrador || !selectedUnidad) return;
    asignarMutation.mutate({ asignacionId: selectedBorrador.id, unidadId: selectedUnidad });
  };

  const formatFecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/transportes')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <Truck className="w-7 h-7 text-orange-500" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Asignación de Unidades</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {borradores.length} borrador{borradores.length !== 1 ? 'es' : ''} pendiente{borradores.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title="Actualizar"
            >
              <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {loadingBorradores ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">Cargando borradores...</p>
        ) : borradores.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Sin pendientes</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Todos los turnos tienen unidad asignada</p>
          </div>
        ) : (
          borradores.map((borrador) => (
            <div
              key={borrador.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-all cursor-pointer ${
                selectedBorrador?.id === borrador.id
                  ? 'border-orange-500'
                  : 'border-transparent hover:border-orange-300 dark:hover:border-orange-700'
              }`}
              onClick={() => {
                setSelectedBorrador(selectedBorrador?.id === borrador.id ? null : borrador);
                setSelectedUnidad(null);
              }}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400">
                        SIN UNIDAD
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {borrador.sede_nombre}
                      </span>
                      {borrador.ruta_nombre && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          · Ruta {borrador.ruta_codigo}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 capitalize">
                      {formatFecha(borrador.fecha_turno)}
                    </p>
                  </div>
                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                </div>

                {borrador.tripulacion && borrador.tripulacion.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    {borrador.tripulacion.map((t) => (
                      <span
                        key={t.usuario_id}
                        className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                      >
                        {t.nombre} <span className="text-gray-400">({t.rol})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Panel de asignación de unidad */}
              {selectedBorrador?.id === borrador.id && (
                <div
                  className="border-t dark:border-gray-700 p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Seleccionar unidad disponible
                  </h3>
                  {loadingUnidades ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cargando unidades...</p>
                  ) : unidades.length === 0 ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      No hay unidades disponibles en este momento
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                      {unidades.map((u) => (
                        <label
                          key={u.id}
                          className={`cursor-pointer flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            selectedUnidad === u.id
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`unidad-${borrador.id}`}
                            checked={selectedUnidad === u.id}
                            onChange={() => setSelectedUnidad(u.id)}
                            className="text-orange-500"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{u.codigo}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.tipo_unidad} · {u.placa}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setSelectedBorrador(null); setSelectedUnidad(null); }}
                      className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleAsignar}
                      disabled={!selectedUnidad || asignarMutation.isPending}
                      className="px-4 py-2 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {asignarMutation.isPending ? 'Asignando...' : 'Confirmar asignación'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
