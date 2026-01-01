import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Shield,
  RefreshCw,
  Check,
  X,
  Search,
  Filter,
  Lock,
  Unlock,
  ArrowLeft,
} from 'lucide-react';

interface Usuario {
  id: number;
  nombre_completo: string;
  chapa: string;
  activo: boolean;
  acceso_app_activo: boolean;
  grupo: 0 | 1 | 2 | null;
  sede_id: number;
  sede_nombre: string;
  rol_codigo: string;
}

interface Sede {
  id: number;
  codigo: string;
  nombre: string;
}

export default function ControlAccesoPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [sedeFilter, setSedeFilter] = useState<number | ''>('');
  const [grupoFilter, setGrupoFilter] = useState<number | '' | 'null'>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [soloSinAcceso, setSoloSinAcceso] = useState(false);

  // Queries
  const { data: usuarios = [], isLoading, refetch } = useQuery({
    queryKey: ['usuarios-acceso', sedeFilter, grupoFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sedeFilter) params.append('sede_id', sedeFilter.toString());
      if (grupoFilter !== '') {
        if (grupoFilter === 'null') params.append('grupo', 'null');
        else params.append('grupo', grupoFilter.toString());
      }
      if (searchTerm) params.append('busqueda', searchTerm);
      params.append('activo', 'true');
      const res = await api.get(`/admin/usuarios?${params.toString()}`);
      return res.data;
    }
  });

  const { data: sedes = [] } = useQuery({
    queryKey: ['sedes'],
    queryFn: async () => {
      const res = await api.get('/sedes');
      return res.data.sedes || res.data;
    }
  });

  // Mutaciones
  const toggleAccesoAppMutation = useMutation({
    mutationFn: async ({ id, acceso }: { id: number; acceso: boolean }) => {
      return api.post(`/admin/usuarios/${id}/toggle-app`, { acceso_app_activo: acceso });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios-acceso'] })
  });

  const toggleAccesoMasivoMutation = useMutation({
    mutationFn: async ({ ids, acceso }: { ids: number[]; acceso: boolean }) => {
      const promises = ids.map(id =>
        api.post(`/admin/usuarios/${id}/toggle-app`, { acceso_app_activo: acceso })
      );
      return Promise.all(promises);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios-acceso'] })
  });

  const usuariosFiltrados = soloSinAcceso
    ? usuarios.filter((u: Usuario) => !u.acceso_app_activo)
    : usuarios;

  const getGrupoColor = (grupo: number | null) => {
    if (grupo === null) return 'bg-gray-100 text-gray-700';
    if (grupo === 0) return 'bg-purple-100 text-purple-700';
    if (grupo === 1) return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  };

  const getGrupoLabel = (grupo: number | null) => {
    if (grupo === null) return 'Sin grupo';
    if (grupo === 0) return 'Normal';
    return `G${grupo}`;
  };

  // Estadisticas
  const stats = {
    total: usuarios.length,
    conAcceso: usuarios.filter((u: Usuario) => u.acceso_app_activo).length,
    sinAcceso: usuarios.filter((u: Usuario) => !u.acceso_app_activo).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/super-admin')}
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Volver al panel"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <Shield className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Control de Acceso</h1>
              <p className="text-sm text-gray-500">Gestiona el acceso a la aplicacion movil</p>
            </div>
          </div>
          <button onClick={() => refetch()} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Actualizar">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total usuarios</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-2xl font-bold text-green-600">{stats.conAcceso}</p>
                <p className="text-sm text-gray-500">Con acceso a app</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-2xl font-bold text-red-600">{stats.sinAcceso}</p>
                <p className="text-sm text-gray-500">Sin acceso a app</p>
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">Filtros</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  />
                </div>
                <select
                  value={sedeFilter}
                  onChange={(e) => setSedeFilter(e.target.value ? parseInt(e.target.value) : '')}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Todas las sedes</option>
                  {sedes.map((s: Sede) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
                <select
                  value={grupoFilter}
                  onChange={(e) => setGrupoFilter(e.target.value === 'null' ? 'null' : e.target.value ? parseInt(e.target.value) : '')}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="">Todos los grupos</option>
                  <option value="0">Normal</option>
                  <option value="1">Grupo 1</option>
                  <option value="2">Grupo 2</option>
                  <option value="null">Sin grupo</option>
                </select>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={soloSinAcceso}
                    onChange={(e) => setSoloSinAcceso(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Solo sin acceso</span>
                </label>
              </div>

              {/* Acciones masivas */}
              {usuariosFiltrados.length > 0 && (
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => {
                      const ids = usuariosFiltrados.filter((u: Usuario) => !u.acceso_app_activo).map((u: Usuario) => u.id);
                      if (ids.length > 0 && confirm(`Dar acceso a ${ids.length} usuarios?`)) {
                        toggleAccesoMasivoMutation.mutate({ ids, acceso: true });
                      }
                    }}
                    className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 flex items-center gap-1"
                  >
                    <Unlock className="w-4 h-4" />
                    Dar acceso a todos ({usuariosFiltrados.filter((u: Usuario) => !u.acceso_app_activo).length})
                  </button>
                  <button
                    onClick={() => {
                      const ids = usuariosFiltrados.filter((u: Usuario) => u.acceso_app_activo).map((u: Usuario) => u.id);
                      if (ids.length > 0 && confirm(`Quitar acceso a ${ids.length} usuarios?`)) {
                        toggleAccesoMasivoMutation.mutate({ ids, acceso: false });
                      }
                    }}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 flex items-center gap-1"
                  >
                    <Lock className="w-4 h-4" />
                    Quitar acceso a todos ({usuariosFiltrados.filter((u: Usuario) => u.acceso_app_activo).length})
                  </button>
                </div>
              )}
            </div>

            {/* Lista de usuarios */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Cargando...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Grupo</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rol</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acceso App</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {usuariosFiltrados.map((usuario: Usuario) => (
                        <tr key={usuario.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{usuario.nombre_completo}</p>
                            <p className="text-sm text-gray-500">Chapa: {usuario.chapa}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-700">{usuario.sede_nombre || 'Sin sede'}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGrupoColor(usuario.grupo)}`}>
                              {getGrupoLabel(usuario.grupo)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs text-gray-600">{usuario.rol_codigo}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => toggleAccesoAppMutation.mutate({ id: usuario.id, acceso: !usuario.acceso_app_activo })}
                              className={`p-2 rounded-lg transition-colors ${
                                usuario.acceso_app_activo
                                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}
                              title={usuario.acceso_app_activo ? 'Quitar acceso' : 'Dar acceso'}
                            >
                              {usuario.acceso_app_activo ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
      </div>
    </div>
  );
}
