import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Smartphone, RefreshCw, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';

type EstadoDispositivo = 'PENDIENTE' | 'APROBADO' | 'BLOQUEADO';

const ESTADO_CONFIG: Record<EstadoDispositivo, { label: string; color: string; icon: React.ReactNode }> = {
  PENDIENTE: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  APROBADO: {
    label: 'Aprobado',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
  },
  BLOQUEADO: {
    label: 'Bloqueado',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

export default function DispositivosPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState<EstadoDispositivo | 'TODOS'>('TODOS');
  const [notasModal, setNotasModal] = useState<{ id: number; accion: EstadoDispositivo } | null>(null);
  const [notas, setNotas] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dispositivos'],
    queryFn: async () => {
      const { data } = await api.get('/admin/dispositivos');
      return data.dispositivos as any[];
    },
  });

  const mutation = useMutation({
    mutationFn: ({ id, estado, notas }: { id: number; estado: EstadoDispositivo; notas?: string }) =>
      api.patch(`/admin/dispositivos/${id}`, { estado, notas }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositivos'] });
      setNotasModal(null);
      setNotas('');
    },
  });

  const dispositivos = (data || []).filter(
    (d: any) => filtro === 'TODOS' || d.estado === filtro
  );

  const contadores = {
    TODOS:     data?.length || 0,
    PENDIENTE: data?.filter((d: any) => d.estado === 'PENDIENTE').length || 0,
    APROBADO:  data?.filter((d: any) => d.estado === 'APROBADO').length || 0,
    BLOQUEADO: data?.filter((d: any) => d.estado === 'BLOQUEADO').length || 0,
  };

  const confirmarAccion = (id: number, estado: EstadoDispositivo) => {
    setNotasModal({ id, accion: estado });
    setNotas('');
  };

  const ejecutarAccion = () => {
    if (!notasModal) return;
    mutation.mutate({ id: notasModal.id, estado: notasModal.accion, notas });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/super-admin')}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              title="Volver"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Smartphone className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dispositivos Móviles</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Control de acceso por dispositivo — activar con{' '}
                <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">DEVICE_AUTH_ENABLED=true</code>
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            title="Actualizar"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filtros / contadores */}
        <div className="flex gap-2 flex-wrap">
          {(['TODOS', 'PENDIENTE', 'APROBADO', 'BLOQUEADO'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition border ${
                filtro === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f === 'TODOS' ? 'Todos' : ESTADO_CONFIG[f].label}{' '}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                filtro === f ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}>
                {contadores[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Tabla */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {isLoading ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">Cargando dispositivos...</div>
          ) : dispositivos.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Ningún dispositivo registrado aún</p>
              <p className="text-sm mt-1">Aparecerán aquí cuando las brigadas hagan login desde la app</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Dispositivo</th>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Sistema</th>
                    <th className="px-4 py-3 text-left">Versión App</th>
                    <th className="px-4 py-3 text-left">Último acceso</th>
                    <th className="px-4 py-3 text-left">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {dispositivos.map((d: any) => {
                    const estado: EstadoDispositivo = d.estado;
                    const cfg = ESTADO_CONFIG[estado];
                    return (
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{d.device_model || '—'}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5 truncate max-w-[180px]" title={d.device_id}>
                            {d.device_id}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 dark:text-gray-100">{d.usuario_nombre || '—'}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{d.usuario_username}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {d.device_os} {d.device_os_version}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {d.app_version || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                          {d.ultimo_acceso_at
                            ? new Date(d.ultimo_acceso_at).toLocaleString('es-GT', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          {d.notas && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">{d.notas}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {estado !== 'APROBADO' && (
                              <button
                                onClick={() => confirmarAccion(d.id, 'APROBADO')}
                                className="px-2.5 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded border border-green-200 transition"
                              >
                                Aprobar
                              </button>
                            )}
                            {estado !== 'BLOQUEADO' && (
                              <button
                                onClick={() => confirmarAccion(d.id, 'BLOQUEADO')}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded border border-red-200 transition"
                              >
                                Bloquear
                              </button>
                            )}
                            {estado !== 'PENDIENTE' && (
                              <button
                                onClick={() => confirmarAccion(d.id, 'PENDIENTE')}
                                className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded border border-gray-200 transition"
                              >
                                Resetear
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación con notas opcionales */}
      {notasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              {notasModal.accion === 'APROBADO' && '✅ Aprobar dispositivo'}
              {notasModal.accion === 'BLOQUEADO' && '🚫 Bloquear dispositivo'}
              {notasModal.accion === 'PENDIENTE' && '🔄 Resetear a pendiente'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {notasModal.accion === 'APROBADO' && 'El dispositivo podrá acceder cuando el control esté activo.'}
              {notasModal.accion === 'BLOQUEADO' && 'El dispositivo será rechazado cuando el control esté activo.'}
              {notasModal.accion === 'PENDIENTE' && 'El dispositivo quedará sin decisión hasta que se apruebe o bloquee.'}
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Motivo, número de inventario, nombre del agente..."
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-20"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setNotasModal(null); setNotas(''); }}
                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarAccion}
                disabled={mutation.isPending}
                className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition disabled:opacity-50 ${
                  notasModal.accion === 'APROBADO'  ? 'bg-green-600 hover:bg-green-700' :
                  notasModal.accion === 'BLOQUEADO' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                {mutation.isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
