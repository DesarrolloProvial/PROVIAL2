import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Search, Plus, Edit2, Power, Repeat, Trash2, X, RefreshCw, Shield } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthStore } from '../store/authStore';

interface Brigada {
  id: number;
  chapa: string;
  nombre: string;
  sede_id: number;
  sede_nombre: string;
  telefono?: string;
  email?: string;
  grupo?: number;
  rol_brigada?: string;
  activa: boolean;
}

interface Sede {
  id: number;
  nombre: string;
}

interface MotivoInactividad {
  codigo: string;
  nombre: string;
  descripcion: string;
  requiere_fecha_fin: boolean;
}

interface RolDisponible {
  id: number;
  nombre: string;
  descripcion: string;
}

const ROLES_BRIGADA = ['PILOTO', 'COPILOTO', 'ACOMPAÑANTE'];

const brigadasAPI = {
  listar: async (params?: { sede_id?: number; activa?: boolean; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.sede_id) queryParams.append('sede_id', params.sede_id.toString());
    if (params?.activa !== undefined) queryParams.append('activa', params.activa.toString());
    if (params?.search) queryParams.append('search', params.search);
    const { data } = await api.get(`/brigadas?${queryParams}`);
    return data;
  },
  crear: async (brigada: any) => {
    const { data } = await api.post('/brigadas', brigada);
    return data;
  },
  actualizar: async (id: number, brigada: any) => {
    const { data } = await api.put(`/brigadas/${id}`, brigada);
    return data;
  },
  desactivar: async (id: number, motivo_codigo: string, fecha_fin_estimada?: string, observaciones?: string) => {
    const { data } = await api.put(`/brigadas/${id}/desactivar`, { motivo_codigo, fecha_fin_estimada, observaciones });
    return data;
  },
  activar: async (id: number) => {
    const { data } = await api.put(`/brigadas/${id}/activar`);
    return data;
  },
  getMotivos: async () => {
    const { data } = await api.get('/brigadas/catalogo/motivos-inactividad');
    return data;
  },
  getRolesDisponibles: async () => {
    const { data } = await api.get('/brigadas/catalogo/roles');
    return data;
  },
  asignarRol: async (usuarioId: number, rol_id: number, sede_id?: number, es_rol_principal?: boolean) => {
    const { data } = await api.post(`/brigadas/${usuarioId}/roles`, { rol_id, sede_id, es_rol_principal });
    return data;
  },
  transferir: async (id: number, nueva_sede_id: number, motivo?: string) => {
    const { data } = await api.put(`/brigadas/${id}/transferir`, { nueva_sede_id, motivo });
    return data;
  },
  eliminar: async (id: number) => {
    const { data } = await api.delete(`/brigadas/${id}`);
    return data;
  },
};

const sedesAPI = {
  listar: async () => {
    const { data } = await api.get('/sedes');
    return data;
  },
};

export default function BrigadasPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Solo ENCARGADO_NOMINAS con puede_ver_todas_sedes puede asignar roles
  const puedeAsignarRoles = user?.rol === 'ADMIN' || (user?.rol === 'ENCARGADO_NOMINAS' && user?.puede_ver_todas_sedes);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filtroSede, setFiltroSede] = useState<number | undefined>();
  const [filtroActiva, setFiltroActiva] = useState<boolean | undefined>();
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState<Brigada | null>(null);
  const [modalTransferir, setModalTransferir] = useState<Brigada | null>(null);
  const [modalDesactivar, setModalDesactivar] = useState<Brigada | null>(null);
  const [modalAsignarRol, setModalAsignarRol] = useState<Brigada | null>(null);

  // Desactivar form state
  const [motivoCodigo, setMotivoCodigo] = useState('');
  const [fechaFinEstimada, setFechaFinEstimada] = useState('');
  const [observacionesDesactivar, setObservacionesDesactivar] = useState('');

  // Asignar rol form state
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [sedeRol, setSedeRol] = useState('');
  const [esRolPrincipal, setEsRolPrincipal] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    chapa: '',
    nombre: '',
    sede_id: '',
    telefono: '',
    email: '',
    grupo: '',
    rol_brigada: '',
  });

  // Transfer form
  const [nuevaSedeId, setNuevaSedeId] = useState('');
  const [motivoTransferencia, setMotivoTransferencia] = useState('');

  // Queries
  const { data: brigadasData, isLoading, refetch } = useQuery({
    queryKey: ['brigadas', { search: debouncedSearch, sede_id: filtroSede, activa: filtroActiva }],
    queryFn: () => brigadasAPI.listar({ search: debouncedSearch, sede_id: filtroSede, activa: filtroActiva }),
  });

  const { data: sedesData } = useQuery({
    queryKey: ['sedes'],
    queryFn: sedesAPI.listar,
  });

  const { data: motivosData } = useQuery({
    queryKey: ['motivosInactividad'],
    queryFn: brigadasAPI.getMotivos,
  });

  const { data: rolesData } = useQuery({
    queryKey: ['rolesDisponibles'],
    queryFn: brigadasAPI.getRolesDisponibles,
    enabled: puedeAsignarRoles,
  });

  const brigadas: Brigada[] = brigadasData?.brigadas || [];
  const sedes: Sede[] = sedesData?.sedes || [];
  const motivos: MotivoInactividad[] = motivosData?.motivos || [];
  const rolesDisponibles: RolDisponible[] = rolesData?.roles || [];

  // Mutations
  const crearMutation = useMutation({
    mutationFn: brigadasAPI.crear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
      setModalCrear(false);
      resetForm();
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => brigadasAPI.actualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
      setModalEditar(null);
      resetForm();
    },
  });

  const desactivarMutation = useMutation({
    mutationFn: ({ id, motivo_codigo, fecha_fin_estimada, observaciones }: { id: number; motivo_codigo: string; fecha_fin_estimada?: string; observaciones?: string }) =>
      brigadasAPI.desactivar(id, motivo_codigo, fecha_fin_estimada, observaciones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
      setModalDesactivar(null);
      setMotivoCodigo('');
      setFechaFinEstimada('');
      setObservacionesDesactivar('');
    },
  });

  const activarMutation = useMutation({
    mutationFn: brigadasAPI.activar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
    },
  });

  const transferirMutation = useMutation({
    mutationFn: ({ id, nueva_sede_id, motivo }: { id: number; nueva_sede_id: number; motivo?: string }) =>
      brigadasAPI.transferir(id, nueva_sede_id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
      setModalTransferir(null);
      setNuevaSedeId('');
      setMotivoTransferencia('');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: brigadasAPI.eliminar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
    },
  });

  const asignarRolMutation = useMutation({
    mutationFn: ({ usuarioId, rol_id, sede_id, es_rol_principal }: { usuarioId: number; rol_id: number; sede_id?: number; es_rol_principal?: boolean }) =>
      brigadasAPI.asignarRol(usuarioId, rol_id, sede_id, es_rol_principal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
      setModalAsignarRol(null);
      setRolSeleccionado('');
      setSedeRol('');
      setEsRolPrincipal(true);
    },
  });

  const resetForm = () => {
    setFormData({
      chapa: '',
      nombre: '',
      sede_id: '',
      telefono: '',
      email: '',
      grupo: '',
      rol_brigada: '',
    });
  };

  const openEditModal = (brigada: Brigada) => {
    setFormData({
      chapa: brigada.chapa || '',
      nombre: brigada.nombre || '',
      sede_id: brigada.sede_id?.toString() || '',
      telefono: brigada.telefono || '',
      email: brigada.email || '',
      grupo: brigada.grupo?.toString() || '',
      rol_brigada: brigada.rol_brigada || '',
    });
    setModalEditar(brigada);
  };

  const getRolColor = (rol?: string) => {
    switch (rol) {
      case 'PILOTO':
        return 'bg-blue-600 text-white';
      case 'COPILOTO':
        return 'bg-teal-600 text-white';
      case 'ACOMPAÑANTE':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader
        title="Gestion de Brigadas"
        subtitle="Administra el personal de brigadas"
        backTo="/operaciones"
      >
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o chapa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <select
              value={filtroSede || ''}
              onChange={(e) => setFiltroSede(e.target.value ? parseInt(e.target.value) : undefined)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
              ))}
            </select>
            <select
              value={filtroActiva === undefined ? '' : filtroActiva.toString()}
              onChange={(e) => setFiltroActiva(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
            <button
              onClick={() => setModalCrear(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Nueva Brigada
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Chapa</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Nombre</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Rol</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Grupo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sede</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Telefono</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Estado</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Cargando brigadas...
                  </td>
                </tr>
              ) : brigadas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron brigadas
                  </td>
                </tr>
              ) : (
                brigadas.map((brigada) => (
                  <tr key={brigada.id} className={!brigada.activa ? 'bg-gray-100' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-mono text-sm font-bold text-gray-900">{brigada.chapa || '-'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{brigada.nombre || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {brigada.rol_brigada ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getRolColor(brigada.rol_brigada)}`}>
                          {brigada.rol_brigada}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {brigada.grupo ? (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          brigada.grupo === 1 ? 'bg-indigo-600 text-white' : 'bg-purple-600 text-white'
                        }`}>
                          Grupo {brigada.grupo}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{brigada.sede_nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{brigada.telefono || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        brigada.activa ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      }`}>
                        {brigada.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(brigada)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => brigada.activa ? setModalDesactivar(brigada) : activarMutation.mutate(brigada.id)}
                          className={`p-1.5 rounded ${
                            brigada.activa
                              ? 'text-orange-600 hover:bg-orange-100'
                              : 'text-green-600 hover:bg-green-100'
                          }`}
                          title={brigada.activa ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModalTransferir(brigada)}
                          className="p-1.5 text-purple-600 hover:bg-purple-100 rounded"
                          title="Transferir"
                        >
                          <Repeat className="w-4 h-4" />
                        </button>
                        {puedeAsignarRoles && (
                          <button
                            onClick={() => setModalAsignarRol(brigada)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
                            title="Asignar Rol"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('¿Esta seguro de eliminar esta brigada?')) {
                              eliminarMutation.mutate(brigada.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {brigadasData && (
            <div className="px-4 py-3 bg-gray-100 border-t text-sm text-gray-700 font-medium">
              Total: {brigadasData.total} brigadas
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nueva Brigada</h2>
              <button onClick={() => setModalCrear(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Chapa *</label>
                  <input
                    type="text"
                    value={formData.chapa}
                    onChange={(e) => setFormData({ ...formData, chapa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 19109"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sede *</label>
                  <select
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Nombre completo del brigadista"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
                  <select
                    value={formData.rol_brigada}
                    onChange={(e) => setFormData({ ...formData, rol_brigada: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    {ROLES_BRIGADA.map((rol) => (
                      <option key={rol} value={rol}>{rol}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Grupo</label>
                  <select
                    value={formData.grupo}
                    onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    <option value="1">Grupo 1</option>
                    <option value="2">Grupo 2</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: 5555-5555"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalCrear(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => crearMutation.mutate(formData)}
                disabled={crearMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {crearMutation.isPending ? 'Creando...' : 'Crear Brigada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Editar Brigada</h2>
              <button onClick={() => setModalEditar(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Chapa</label>
                  <input
                    type="text"
                    value={formData.chapa}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sede *</label>
                  <select
                    value={formData.sede_id}
                    onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar sede</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
                  <select
                    value={formData.rol_brigada}
                    onChange={(e) => setFormData({ ...formData, rol_brigada: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    {ROLES_BRIGADA.map((rol) => (
                      <option key={rol} value={rol}>{rol}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Grupo</label>
                  <select
                    value={formData.grupo}
                    onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Sin asignar</option>
                    <option value="1">Grupo 1</option>
                    <option value="2">Grupo 2</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalEditar(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => actualizarMutation.mutate({
                  id: modalEditar.id,
                  data: {
                    nombre: formData.nombre,
                    sede_id: formData.sede_id ? parseInt(formData.sede_id) : undefined,
                    telefono: formData.telefono,
                    email: formData.email,
                    grupo: formData.grupo ? parseInt(formData.grupo) : null,
                    rol_brigada: formData.rol_brigada || null,
                  }
                })}
                disabled={actualizarMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {actualizarMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transferir */}
      {modalTransferir && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Transferir Brigada</h2>
              <button onClick={() => setModalTransferir(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Brigada:</span> {modalTransferir.nombre}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Sede actual:</span> {modalTransferir.sede_nombre}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva Sede *</label>
                <select
                  value={nuevaSedeId}
                  onChange={(e) => setNuevaSedeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar sede destino</option>
                  {sedes.filter(s => s.id !== modalTransferir.sede_id).map((sede) => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo</label>
                <textarea
                  value={motivoTransferencia}
                  onChange={(e) => setMotivoTransferencia(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Motivo de la transferencia..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalTransferir(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => transferirMutation.mutate({
                  id: modalTransferir.id,
                  nueva_sede_id: parseInt(nuevaSedeId),
                  motivo: motivoTransferencia,
                })}
                disabled={!nuevaSedeId || transferirMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
              >
                {transferirMutation.isPending ? 'Transfiriendo...' : 'Transferir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Desactivar */}
      {modalDesactivar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Desactivar Brigada</h2>
              <button onClick={() => setModalDesactivar(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-800">
                <span className="font-semibold">Brigada:</span> {modalDesactivar.nombre}
              </p>
              <p className="text-sm text-orange-800">
                <span className="font-semibold">Chapa:</span> {modalDesactivar.chapa}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo de Inactividad *</label>
                <select
                  value={motivoCodigo}
                  onChange={(e) => setMotivoCodigo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Seleccionar motivo</option>
                  {motivos.map((motivo) => (
                    <option key={motivo.codigo} value={motivo.codigo}>{motivo.nombre}</option>
                  ))}
                </select>
              </div>
              {motivoCodigo && motivos.find(m => m.codigo === motivoCodigo)?.requiere_fecha_fin && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Estimada de Regreso *</label>
                  <input
                    type="date"
                    value={fechaFinEstimada}
                    onChange={(e) => setFechaFinEstimada(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones</label>
                <textarea
                  value={observacionesDesactivar}
                  onChange={(e) => setObservacionesDesactivar(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalDesactivar(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const motivoSeleccionado = motivos.find(m => m.codigo === motivoCodigo);
                  if (motivoSeleccionado?.requiere_fecha_fin && !fechaFinEstimada) {
                    alert('Este motivo requiere fecha estimada de regreso');
                    return;
                  }
                  desactivarMutation.mutate({
                    id: modalDesactivar.id,
                    motivo_codigo: motivoCodigo,
                    fecha_fin_estimada: fechaFinEstimada || undefined,
                    observaciones: observacionesDesactivar || undefined,
                  });
                }}
                disabled={!motivoCodigo || desactivarMutation.isPending}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
              >
                {desactivarMutation.isPending ? 'Desactivando...' : 'Desactivar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Asignar Rol */}
      {modalAsignarRol && puedeAsignarRoles && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Asignar Rol</h2>
              <button onClick={() => setModalAsignarRol(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">Usuario:</span> {modalAsignarRol.nombre}
              </p>
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">Chapa:</span> {modalAsignarRol.chapa}
              </p>
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">Sede actual:</span> {modalAsignarRol.sede_nombre}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rol a Asignar *</label>
                <select
                  value={rolSeleccionado}
                  onChange={(e) => setRolSeleccionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar rol</option>
                  {rolesDisponibles.map((rol) => (
                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Sede del Rol</label>
                <select
                  value={sedeRol}
                  onChange={(e) => setSedeRol(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Misma sede del usuario</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Ej: OPERACIONES de San Cristóbal
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="esRolPrincipal"
                  checked={esRolPrincipal}
                  onChange={(e) => setEsRolPrincipal(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <label htmlFor="esRolPrincipal" className="text-sm text-gray-700">
                  Establecer como rol principal (cambia el login del usuario)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalAsignarRol(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  asignarRolMutation.mutate({
                    usuarioId: modalAsignarRol.id,
                    rol_id: parseInt(rolSeleccionado),
                    sede_id: sedeRol ? parseInt(sedeRol) : undefined,
                    es_rol_principal: esRolPrincipal,
                  });
                }}
                disabled={!rolSeleccionado || asignarRolMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {asignarRolMutation.isPending ? 'Asignando...' : 'Asignar Rol'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
