import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { useAuthStore } from '../store/authStore';
import {
  Users,
  Shield,
  Building2,
  RefreshCw,
  Search,
  UserCog,
  Key,
  AlertTriangle,
  CheckCircle,
  X,
  UserPlus
} from 'lucide-react';

interface UsuarioAdmin {
  id: number;
  username: string;
  nombre_completo: string;
  rol_id: number;
  rol_nombre: string;
  sede_id: number;
  sede_nombre: string;
  activo: boolean;
  puede_ver_todas_sedes: boolean;
}

interface BrigadaBusqueda {
  id: number;
  chapa: string;
  nombre: string;
  sede_id: number;
  sede_nombre: string;
  activa: boolean;
}

interface RolDisponible {
  id: number;
  nombre: string;
  descripcion: string;
}

interface Sede {
  id: number;
  nombre: string;
}

const adminAPI = {
  getUsuariosSistema: async () => {
    const { data } = await api.get('/brigadas/usuarios-sistema');
    return data;
  },
  buscarBrigadas: async (search: string) => {
    const { data } = await api.get(`/brigadas?search=${encodeURIComponent(search)}`);
    return data;
  },
  getRoles: async () => {
    const { data } = await api.get('/brigadas/catalogo/roles');
    return data;
  },
  getSedes: async () => {
    const { data } = await api.get('/sedes');
    return data;
  },
  cambiarRolUsuario: async (usuarioId: number, rolId: number) => {
    const { data } = await api.post(`/brigadas/${usuarioId}/roles`, {
      rol_id: rolId,
      es_rol_principal: true
    });
    return data;
  },
  togglePuedeVerTodasSedes: async (usuarioId: number, valor: boolean) => {
    const { data } = await api.put(`/brigadas/${usuarioId}`, { puede_ver_todas_sedes: valor });
    return data;
  },
};

export default function AdminPanelPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Estados para usuarios del sistema
  const [searchSistema, setSearchSistema] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroSede, setFiltroSede] = useState('');

  // Estados para buscar brigadas
  const [searchBrigada, setSearchBrigada] = useState('');
  const [brigadasEncontradas, setBrigadasEncontradas] = useState<BrigadaBusqueda[]>([]);
  const [buscandoBrigadas, setBuscandoBrigadas] = useState(false);

  // Modales - siempre usamos formato UsuarioAdmin (brigadas se convierten)
  const [modalCambiarRol, setModalCambiarRol] = useState<UsuarioAdmin | null>(null);
  const [nuevoRolId, setNuevoRolId] = useState('');
  const [modalPermisos, setModalPermisos] = useState<UsuarioAdmin | null>(null);

  // Solo accesible para ENCARGADO_NOMINAS Central o ADMIN
  const esAdminCentral = user?.rol === 'ENCARGADO_NOMINAS' && user?.puede_ver_todas_sedes;
  const esAdmin = user?.rol === 'ADMIN';

  // Queries
  const { data: usuariosData, isLoading: loadingUsuarios, isError: errorUsuarios, refetch } = useQuery({
    queryKey: ['admin-usuarios-sistema'],
    queryFn: adminAPI.getUsuariosSistema,
    enabled: esAdminCentral || esAdmin,
    retry: 2,
  });

  const { data: rolesData, isError: errorRoles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: adminAPI.getRoles,
    enabled: esAdminCentral || esAdmin,
    retry: 2,
  });

  const { data: sedesData, isError: errorSedes } = useQuery({
    queryKey: ['admin-sedes'],
    queryFn: adminAPI.getSedes,
    enabled: esAdminCentral || esAdmin,
    retry: 2,
  });

  const hasError = errorUsuarios || errorRoles || errorSedes;

  const usuarios: UsuarioAdmin[] = usuariosData?.usuarios || [];
  const roles: RolDisponible[] = rolesData?.roles || [];
  const sedes: Sede[] = sedesData?.sedes || [];

  // Filtrar usuarios del sistema
  const usuariosFiltrados = usuarios.filter(u => {
    const matchSearch = !searchSistema ||
      u.nombre_completo?.toLowerCase().includes(searchSistema.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchSistema.toLowerCase());
    const matchRol = !filtroRol || u.rol_nombre === filtroRol;
    const matchSede = !filtroSede || u.sede_id?.toString() === filtroSede;
    return matchSearch && matchRol && matchSede;
  });

  // Buscar brigadas
  const handleBuscarBrigada = async () => {
    if (!searchBrigada.trim()) return;
    setBuscandoBrigadas(true);
    try {
      const data = await adminAPI.buscarBrigadas(searchBrigada);
      setBrigadasEncontradas(data.brigadas || []);
    } catch (error) {
      console.error('Error buscando brigadas:', error);
      setBrigadasEncontradas([]);
    } finally {
      setBuscandoBrigadas(false);
    }
  };

  // Mutations
  const cambiarRolMutation = useMutation({
    mutationFn: ({ usuarioId, rolId }: { usuarioId: number; rolId: number }) =>
      adminAPI.cambiarRolUsuario(usuarioId, rolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios-sistema'] });
      setModalCambiarRol(null);
      setNuevoRolId('');
      setBrigadasEncontradas([]);
      setSearchBrigada('');
      alert('Rol actualizado correctamente');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al cambiar rol');
    },
  });

  const togglePermisosMutation = useMutation({
    mutationFn: ({ usuarioId, valor }: { usuarioId: number; valor: boolean }) =>
      adminAPI.togglePuedeVerTodasSedes(usuarioId, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios-sistema'] });
      setModalPermisos(null);
      alert('Permisos actualizados');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al actualizar permisos');
    },
  });

  if (!esAdminCentral && !esAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">
            Solo el Encargado de Nominas Central puede acceder a este panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader
        title="Panel de Administracion"
        subtitle="Gestion de roles y permisos del sistema"
        backTo="/operaciones"
      >
        <button
          onClick={() => refetch()}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-5 h-5 ${loadingUsuarios ? 'animate-spin' : ''}`} />
        </button>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Banner */}
        {hasError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Error al cargar datos</h3>
                <p className="text-sm text-red-600 mt-1">
                  No se pudieron obtener algunos datos del servidor. Verifica tu conexión.
                </p>
                <button
                  onClick={() => refetch()}
                  className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resumen de Roles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios.filter(u => u.rol_nombre === 'COP').length}
                </p>
                <p className="text-sm text-gray-500">Operadores COP</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserCog className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios.filter(u => u.rol_nombre === 'OPERACIONES').length}
                </p>
                <p className="text-sm text-gray-500">Operaciones</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {usuarios.filter(u => u.rol_nombre === 'ENCARGADO_NOMINAS').length}
                </p>
                <p className="text-sm text-gray-500">Enc. Nominas</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{sedes.length}</p>
                <p className="text-sm text-gray-500">Sedes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Buscar Brigada para asignar rol */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              Asignar Rol a Brigada
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Busca una brigada por chapa o nombre para asignarle un rol del sistema
            </p>
          </div>
          <div className="p-6">
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por chapa o nombre (ej: 15056)..."
                  value={searchBrigada}
                  onChange={(e) => setSearchBrigada(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarBrigada()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <button
                onClick={handleBuscarBrigada}
                disabled={buscandoBrigadas || !searchBrigada.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {buscandoBrigadas ? 'Buscando...' : 'Buscar'}
              </button>
            </div>

            {brigadasEncontradas.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-green-600 text-white">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Chapa</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Nombre</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Sede</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Estado</th>
                      <th className="px-4 py-2 text-center text-sm font-semibold">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {brigadasEncontradas.map(brigada => (
                      <tr key={brigada.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-sm">{brigada.chapa}</td>
                        <td className="px-4 py-2 font-medium text-gray-900">{brigada.nombre}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{brigada.sede_nombre}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            brigada.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {brigada.activa ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => {
                              setModalCambiarRol({
                                id: brigada.id,
                                username: brigada.chapa,
                                nombre_completo: brigada.nombre,
                                rol_id: 3, // BRIGADA por defecto
                                rol_nombre: 'BRIGADA',
                                sede_id: brigada.sede_id,
                                sede_nombre: brigada.sede_nombre,
                                activo: brigada.activa,
                                puede_ver_todas_sedes: false
                              });
                              setNuevoRolId('');
                            }}
                            className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                          >
                            Asignar Rol
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {searchBrigada && brigadasEncontradas.length === 0 && !buscandoBrigadas && (
              <p className="text-center text-gray-500 py-4">No se encontraron brigadas</p>
            )}
          </div>
        </div>

        {/* Usuarios con Roles del Sistema */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Usuarios con Roles del Sistema
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Usuarios que tienen acceso al panel web
            </p>
          </div>
          <div className="p-6">
            {/* Filtros */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o chapa..."
                    value={searchSistema}
                    onChange={(e) => setSearchSistema(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todos los roles</option>
                {roles.filter(r => r.nombre !== 'BRIGADA').map(rol => (
                  <option key={rol.id} value={rol.nombre}>{rol.nombre}</option>
                ))}
              </select>
              <select
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Todas las sedes</option>
                {sedes.map(sede => (
                  <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                ))}
              </select>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Usuario</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Chapa</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Rol</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Sede</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Permisos</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {usuariosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No se encontraron usuarios con roles del sistema
                      </td>
                    </tr>
                  ) : (
                    usuariosFiltrados.map(usuario => (
                      <tr key={usuario.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {usuario.nombre_completo}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-700">
                          {usuario.username}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            usuario.rol_nombre === 'ADMIN' ? 'bg-red-600 text-white' :
                            usuario.rol_nombre === 'ENCARGADO_NOMINAS' ? 'bg-indigo-600 text-white' :
                            usuario.rol_nombre === 'COP' ? 'bg-blue-600 text-white' :
                            usuario.rol_nombre === 'OPERACIONES' ? 'bg-purple-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {usuario.rol_nombre}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {usuario.sede_nombre}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {usuario.puede_ver_todas_sedes ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                              CENTRAL
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                              Regional
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => {
                                setModalCambiarRol(usuario);
                                setNuevoRolId(usuario.rol_id?.toString() || '');
                              }}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
                              title="Cambiar rol"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            {usuario.rol_nombre === 'ENCARGADO_NOMINAS' && (
                              <button
                                onClick={() => setModalPermisos(usuario)}
                                className="p-1.5 text-amber-600 hover:bg-amber-100 rounded"
                                title="Cambiar permisos"
                              >
                                <Key className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Permisos del Panel</h3>
              <ul className="mt-2 text-sm text-blue-800 space-y-1">
                <li><strong>CENTRAL:</strong> Puede ver y gestionar todas las sedes, asignar roles</li>
                <li><strong>Regional:</strong> Solo puede ver y gestionar su propia sede</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Cambiar Rol */}
      {modalCambiarRol && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                {modalCambiarRol.rol_nombre === 'BRIGADA' ? 'Asignar Rol' : 'Cambiar Rol'}
              </h2>
              <button onClick={() => setModalCambiarRol(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">Usuario:</span> {modalCambiarRol.nombre_completo}
              </p>
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">Chapa:</span> {modalCambiarRol.username}
              </p>
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">Rol actual:</span> {modalCambiarRol.rol_nombre}
              </p>
              <p className="text-sm text-indigo-800">
                <span className="font-semibold">Sede:</span> {modalCambiarRol.sede_nombre}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nuevo Rol *</label>
                <select
                  value={nuevoRolId}
                  onChange={(e) => setNuevoRolId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar rol</option>
                  {roles.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre} {rol.descripcion ? `- ${rol.descripcion}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalCambiarRol(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => cambiarRolMutation.mutate({
                  usuarioId: modalCambiarRol.id,
                  rolId: parseInt(nuevoRolId)
                })}
                disabled={!nuevoRolId || cambiarRolMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
              >
                {cambiarRolMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Permisos */}
      {modalPermisos && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Permisos de Acceso</h2>
              <button onClick={() => setModalPermisos(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Usuario:</span> {modalPermisos.nombre_completo}
              </p>
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Estado actual:</span>{' '}
                {modalPermisos.puede_ver_todas_sedes ? 'CENTRAL' : 'Regional'}
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Tipo de Acceso</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white">
                    <input
                      type="radio"
                      name="tipoAcceso"
                      checked={!modalPermisos.puede_ver_todas_sedes}
                      onChange={() => setModalPermisos({ ...modalPermisos, puede_ver_todas_sedes: false })}
                      className="w-4 h-4 text-amber-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Regional</p>
                      <p className="text-sm text-gray-500">Solo puede gestionar su sede</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-white">
                    <input
                      type="radio"
                      name="tipoAcceso"
                      checked={modalPermisos.puede_ver_todas_sedes}
                      onChange={() => setModalPermisos({ ...modalPermisos, puede_ver_todas_sedes: true })}
                      className="w-4 h-4 text-amber-600"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Central</p>
                      <p className="text-sm text-gray-500">Puede gestionar todas las sedes y asignar roles</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalPermisos(null)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => togglePermisosMutation.mutate({
                  usuarioId: modalPermisos.id,
                  valor: modalPermisos.puede_ver_todas_sedes
                })}
                disabled={togglePermisosMutation.isPending}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
              >
                {togglePermisosMutation.isPending ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
