import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/PageHeader';
import { useAuthStore } from '../store/authStore';
import {
  administracionAPI,
  DepartamentoSistema,
  SedeCompleta,
  EstadoGrupo,
  EncargadoActual,
  UsuarioAdmin,
  ConfiguracionSistema,
  EstadisticasAdmin,
  Rol,
  getNombreGrupo,
  getColorGrupo,
} from '../services/administracion.service';
import {
  Users,
  Shield,
  Building2,
  RefreshCw,
  Search,
  Settings,
  History,
  AlertTriangle,
  X,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Crown,
  Edit2,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Save,
  KeyRound,
  MapPin,
  Star,
} from 'lucide-react';

type TabType = 'dashboard' | 'usuarios' | 'grupos' | 'encargados' | 'configuracion' | 'auditoria';

export default function SuperAdminPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Verificar acceso (SUPER_ADMIN, ADMIN, o COP con ADMIN_COP)
  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';
  const isAdmin = user?.rol === 'ADMIN';
  const canAccess = isSuperAdmin || isAdmin;

  // =====================================================
  // QUERIES
  // =====================================================

  const { data: estadisticas, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['admin-estadisticas'],
    queryFn: () => administracionAPI.getEstadisticas(),
    enabled: canAccess,
    select: (res) => res.data,
  });

  const { data: departamentos } = useQuery({
    queryKey: ['admin-departamentos'],
    queryFn: () => administracionAPI.getDepartamentos(),
    enabled: canAccess,
    select: (res) => res.data,
  });

  const { data: sedes } = useQuery({
    queryKey: ['admin-sedes-completas'],
    queryFn: () => administracionAPI.getSedes(),
    enabled: canAccess,
    select: (res) => res.data,
  });

  const { data: roles } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => administracionAPI.getRoles(),
    enabled: canAccess,
    select: (res) => res.data,
  });

  // Query para sub-roles COP (para uso futuro)
  useQuery({
    queryKey: ['admin-sub-roles-cop'],
    queryFn: () => administracionAPI.getSubRolesCop(),
    enabled: canAccess,
    select: (res) => res.data,
  });

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600">Solo administradores pueden acceder a este panel.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'usuarios', label: 'Usuarios', icon: <Users className="w-4 h-4" /> },
    { id: 'grupos', label: 'Grupos', icon: <Shield className="w-4 h-4" /> },
    { id: 'encargados', label: 'Encargados', icon: <Crown className="w-4 h-4" /> },
    { id: 'configuracion', label: 'Configuracion', icon: <Settings className="w-4 h-4" /> },
    { id: 'auditoria', label: 'Auditoria', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader
        title="Super Administrador"
        subtitle={`Panel de control del sistema - ${isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN'}`}
        backTo="/operaciones"
      >
        <button
          onClick={() => {
            refetchStats();
            queryClient.invalidateQueries({ queryKey: ['admin'] });
          }}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualizar"
        >
          <RefreshCw className={`w-5 h-5 ${loadingStats ? 'animate-spin' : ''}`} />
        </button>
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <DashboardTab
            estadisticas={estadisticas}
            departamentos={departamentos || []}
            sedes={sedes || []}
            isSuperAdmin={isSuperAdmin}
          />
        )}
        {activeTab === 'usuarios' && (
          <UsuariosTab
            roles={roles || []}
            sedes={sedes || []}
            isSuperAdmin={isSuperAdmin}
          />
        )}
        {activeTab === 'grupos' && (
          <GruposTab
            departamentos={departamentos || []}
            sedes={sedes || []}
          />
        )}
        {activeTab === 'encargados' && (
          <EncargadosTab sedes={sedes || []} />
        )}
        {activeTab === 'configuracion' && (
          <ConfiguracionTab isSuperAdmin={isSuperAdmin} />
        )}
        {activeTab === 'auditoria' && (
          <AuditoriaTab isSuperAdmin={isSuperAdmin} />
        )}
      </main>
    </div>
  );
}

// =====================================================
// DASHBOARD TAB
// =====================================================

function DashboardTab({
  estadisticas,
  departamentos,
  sedes,
  isSuperAdmin,
}: {
  estadisticas?: EstadisticasAdmin;
  departamentos: DepartamentoSistema[];
  sedes: SedeCompleta[];
  isSuperAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [modalDepartamento, setModalDepartamento] = useState<DepartamentoSistema | 'new' | null>(null);
  const [modalSede, setModalSede] = useState<SedeCompleta | 'new' | null>(null);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Usuarios"
          value={estadisticas?.totalUsuarios || 0}
          icon={<Users className="w-5 h-5 text-blue-600" />}
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Usuarios Activos"
          value={estadisticas?.usuariosActivos || 0}
          icon={<UserCheck className="w-5 h-5 text-green-600" />}
          bgColor="bg-green-100"
        />
        <StatCard
          title="Grupo 1"
          value={estadisticas?.gruposActivos?.g1 || 0}
          icon={<Shield className="w-5 h-5 text-purple-600" />}
          bgColor="bg-purple-100"
        />
        <StatCard
          title="Grupo 2"
          value={estadisticas?.gruposActivos?.g2 || 0}
          icon={<Shield className="w-5 h-5 text-amber-600" />}
          bgColor="bg-amber-100"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Departamentos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Departamentos del Sistema
            </h3>
            {isSuperAdmin && (
              <button
                onClick={() => setModalDepartamento('new')}
                className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
                title="Agregar departamento"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {departamentos.map((depto) => (
              <div
                key={depto.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900">{depto.nombre}</p>
                  <p className="text-sm text-gray-500">{depto.codigo}</p>
                </div>
                <div className="flex items-center gap-2">
                  {depto.usa_sistema_grupos && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      Usa Grupos
                    </span>
                  )}
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      depto.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {depto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  {isSuperAdmin && (
                    <button
                      onClick={() => setModalDepartamento(depto)}
                      className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sedes */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              Sedes ({sedes.length})
            </h3>
            {isSuperAdmin && (
              <button
                onClick={() => setModalSede('new')}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                title="Agregar sede"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {sedes.map((sede) => (
              <div key={sede.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{sede.nombre}</p>
                    {sede.es_sede_central && (
                      <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{sede.codigo}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {sede.usuarios_count}
                    </span>
                    <span>{sede.departamento_nombre || '-'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      sede.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {sede.activa ? 'Activa' : 'Inactiva'}
                  </span>
                  {isSuperAdmin && (
                    <button
                      onClick={() => setModalSede(sede)}
                      className="p-1 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usuarios por Rol */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Usuarios por Rol
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {estadisticas?.usuariosPorRol?.map((item) => (
            <div key={item.rol} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-700">{item.cantidad}</p>
              <p className="text-sm text-gray-600">{item.rol}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Departamento */}
      {modalDepartamento && (
        <ModalDepartamento
          departamento={modalDepartamento === 'new' ? null : modalDepartamento}
          onClose={() => setModalDepartamento(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-departamentos'] });
            setModalDepartamento(null);
          }}
        />
      )}

      {/* Modal Sede */}
      {modalSede && (
        <ModalSede
          sede={modalSede === 'new' ? null : modalSede}
          onClose={() => setModalSede(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-sedes-completas'] });
            setModalSede(null);
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// MODAL DEPARTAMENTO
// =====================================================

function ModalDepartamento({
  departamento,
  onClose,
  onSuccess,
}: {
  departamento: DepartamentoSistema | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isNew = !departamento;
  const [formData, setFormData] = useState({
    codigo: departamento?.codigo || '',
    nombre: departamento?.nombre || '',
    descripcion: departamento?.descripcion || '',
    usa_sistema_grupos: departamento?.usa_sistema_grupos ?? true,
    activo: departamento?.activo ?? true,
  });

  const createMutation = useMutation({
    mutationFn: () => administracionAPI.createDepartamento(formData),
    onSuccess: () => {
      alert('Departamento creado correctamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al crear departamento');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => administracionAPI.updateDepartamento(departamento!.id, formData),
    onSuccess: () => {
      alert('Departamento actualizado correctamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al actualizar departamento');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      alert('Codigo y nombre son requeridos');
      return;
    }
    if (isNew) {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isNew ? 'Nuevo Departamento' : 'Editar Departamento'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Codigo</label>
            <input
              type="text"
              value={formData.codigo}
              onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: BRIGADA"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Ej: Brigadas de Campo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              rows={2}
              placeholder="Descripcion del departamento..."
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.usa_sistema_grupos}
                onChange={(e) => setFormData({ ...formData, usa_sistema_grupos: e.target.checked })}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Usa Sistema de Grupos</span>
            </label>

            {!isNew && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Activo</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : isNew ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =====================================================
// MODAL SEDE
// =====================================================

function ModalSede({
  sede,
  onClose,
  onSuccess,
}: {
  sede: SedeCompleta | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isNew = !sede;
  const [formData, setFormData] = useState({
    codigo: sede?.codigo || '',
    nombre: sede?.nombre || '',
    departamento_id: sede?.departamento_id || undefined as number | undefined,
    es_sede_central: sede?.es_sede_central ?? false,
    activa: sede?.activa ?? true,
  });

  const { data: departamentosGeo } = useQuery({
    queryKey: ['catalogo-departamentos-geo'],
    queryFn: () => administracionAPI.getDepartamentosGeograficos(),
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: () => administracionAPI.createSede(formData),
    onSuccess: () => {
      alert('Sede creada correctamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al crear sede');
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => administracionAPI.updateSede(sede!.id, formData),
    onSuccess: () => {
      alert('Sede actualizada correctamente');
      onSuccess();
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al actualizar sede');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      alert('Codigo y nombre son requeridos');
      return;
    }
    if (isNew) {
      createMutation.mutate();
    } else {
      updateMutation.mutate();
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isNew ? 'Nueva Sede' : 'Editar Sede'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Codigo</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: GUATE"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Guatemala"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <select
              value={formData.departamento_id || ''}
              onChange={(e) => setFormData({
                ...formData,
                departamento_id: e.target.value ? parseInt(e.target.value) : undefined,
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Seleccionar...</option>
              {departamentosGeo?.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.es_sede_central}
                onChange={(e) => setFormData({ ...formData, es_sede_central: e.target.checked })}
                className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
              />
              <span className="text-sm text-gray-700 flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500" />
                Sede Central
              </span>
            </label>

            {!isNew && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.activa}
                  onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Activa</span>
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : isNew ? 'Crear' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  bgColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgColor}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// USUARIOS TAB
// =====================================================

function UsuariosTab({
  roles,
  sedes,
  isSuperAdmin,
}: {
  roles: Rol[];
  sedes: SedeCompleta[];
  isSuperAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState({
    busqueda: '',
    sede_id: '',
    grupo: '',
    activo: '',
  });
  const [modalUsuario, setModalUsuario] = useState<UsuarioAdmin | null>(null);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['admin-usuarios', filtros],
    queryFn: () =>
      administracionAPI.getUsuarios({
        busqueda: filtros.busqueda || undefined,
        sede_id: filtros.sede_id ? parseInt(filtros.sede_id) : undefined,
        grupo:
          filtros.grupo === ''
            ? undefined
            : filtros.grupo === 'null'
            ? null
            : (parseInt(filtros.grupo) as 0 | 1 | 2),
        activo: filtros.activo === '' ? undefined : filtros.activo === 'true',
      }),
    select: (res) => res.data,
  });

  const toggleUsuarioMutation = useMutation({
    mutationFn: ({ userId, activo }: { userId: number; activo: boolean }) =>
      administracionAPI.toggleUsuario(userId, activo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['admin-estadisticas'] });
    },
  });

  const toggleAccesoAppMutation = useMutation({
    mutationFn: ({ userId, activo }: { userId: number; activo: boolean }) =>
      administracionAPI.toggleAccesoApp(userId, activo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['admin-estadisticas'] });
    },
  });

  const cambiarGrupoMutation = useMutation({
    mutationFn: ({ userId, grupo }: { userId: number; grupo: 0 | 1 | 2 | null }) =>
      administracionAPI.cambiarGrupoUsuario(userId, grupo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      setModalUsuario(null);
    },
  });

  const cambiarRolMutation = useMutation({
    mutationFn: ({ userId, rolId }: { userId: number; rolId: number }) =>
      administracionAPI.cambiarRolUsuario(userId, rolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
      setModalUsuario(null);
    },
  });

  const habilitarResetMutation = useMutation({
    mutationFn: (userId: number) => administracionAPI.habilitarResetPassword(userId),
    onSuccess: () => {
      alert('Reset de contraseña habilitado. El usuario podrá cambiar su contraseña desde la app móvil.');
      queryClient.invalidateQueries({ queryKey: ['admin-usuarios'] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al habilitar reset');
    },
  });

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o chapa..."
              value={filtros.busqueda}
              onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={filtros.sede_id}
            onChange={(e) => setFiltros({ ...filtros, sede_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
          <select
            value={filtros.grupo}
            onChange={(e) => setFiltros({ ...filtros, grupo: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los grupos</option>
            <option value="0">Normal (L-V)</option>
            <option value="1">Grupo 1</option>
            <option value="2">Grupo 2</option>
            <option value="null">Sin asignar</option>
          </select>
          <select
            value={filtros.activo}
            onChange={(e) => setFiltros({ ...filtros, activo: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700 text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Usuario</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Chapa</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Rol</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Grupo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Sede</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Estado</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">App</th>
                <th className="px-4 py-3 text-center text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuarios?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                usuarios?.map((usuario) => (
                  <tr key={usuario.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{usuario.nombre_completo}</p>
                        {usuario.es_encargado_grupo && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                            <Crown className="w-3 h-3" /> Encargado
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-700">{usuario.chapa}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          usuario.rol_codigo === 'SUPER_ADMIN'
                            ? 'bg-red-600 text-white'
                            : usuario.rol_codigo === 'ADMIN'
                            ? 'bg-orange-600 text-white'
                            : usuario.rol_codigo === 'COP'
                            ? 'bg-blue-600 text-white'
                            : usuario.rol_codigo === 'OPERACIONES'
                            ? 'bg-purple-600 text-white'
                            : usuario.rol_codigo === 'BRIGADA'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-600 text-white'
                        }`}
                      >
                        {usuario.rol_codigo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getColorGrupo(usuario.grupo)}`}>
                        {getNombreGrupo(usuario.grupo)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{usuario.sede_nombre || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          toggleUsuarioMutation.mutate({ userId: usuario.id, activo: !usuario.activo })
                        }
                        className="inline-flex items-center"
                        title={usuario.activo ? 'Desactivar' : 'Activar'}
                      >
                        {usuario.activo ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() =>
                          toggleAccesoAppMutation.mutate({
                            userId: usuario.id,
                            activo: !usuario.acceso_app_activo,
                          })
                        }
                        className="inline-flex items-center"
                        title={usuario.acceso_app_activo ? 'Quitar acceso app' : 'Dar acceso app'}
                      >
                        {usuario.acceso_app_activo ? (
                          <Eye className="w-5 h-5 text-green-600" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setModalUsuario(usuario)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
                          title="Editar usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`¿Habilitar reset de contraseña para ${usuario.nombre_completo}?\n\nEl usuario podrá cambiar su contraseña desde la app móvil.`)) {
                              habilitarResetMutation.mutate(usuario.id);
                            }
                          }}
                          disabled={habilitarResetMutation.isPending}
                          className="p-1.5 text-orange-600 hover:bg-orange-100 rounded disabled:opacity-50"
                          title="Habilitar reset de contraseña"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Editar Usuario */}
      {modalUsuario && (
        <ModalEditarUsuario
          usuario={modalUsuario}
          roles={roles}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setModalUsuario(null)}
          onCambiarGrupo={(grupo) => cambiarGrupoMutation.mutate({ userId: modalUsuario.id, grupo })}
          onCambiarRol={(rolId) => cambiarRolMutation.mutate({ userId: modalUsuario.id, rolId })}
          isLoading={cambiarGrupoMutation.isPending || cambiarRolMutation.isPending}
        />
      )}
    </div>
  );
}

function ModalEditarUsuario({
  usuario,
  roles,
  isSuperAdmin,
  onClose,
  onCambiarGrupo,
  onCambiarRol,
  isLoading,
}: {
  usuario: UsuarioAdmin;
  roles: Rol[];
  isSuperAdmin: boolean;
  onClose: () => void;
  onCambiarGrupo: (grupo: 0 | 1 | 2 | null) => void;
  onCambiarRol: (rolId: number) => void;
  isLoading: boolean;
}) {
  const [nuevoGrupo, setNuevoGrupo] = useState<string>(
    usuario.grupo === null ? 'null' : usuario.grupo.toString()
  );
  const [nuevoRolId, setNuevoRolId] = useState<string>(usuario.rol_id?.toString() || '');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Editar Usuario</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="font-semibold text-gray-900">{usuario.nombre_completo}</p>
          <p className="text-sm text-gray-600">Chapa: {usuario.chapa}</p>
          <p className="text-sm text-gray-600">Sede: {usuario.sede_nombre || 'Sin asignar'}</p>
          <p className="text-sm text-gray-600">Rol actual: {usuario.rol_codigo}</p>
        </div>

        <div className="space-y-4">
          {/* Cambiar Grupo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Grupo</label>
            <div className="flex gap-2">
              <select
                value={nuevoGrupo}
                onChange={(e) => setNuevoGrupo(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="null">Sin asignar</option>
                <option value="0">Normal (L-V)</option>
                <option value="1">Grupo 1</option>
                <option value="2">Grupo 2</option>
              </select>
              <button
                onClick={() =>
                  onCambiarGrupo(nuevoGrupo === 'null' ? null : (parseInt(nuevoGrupo) as 0 | 1 | 2))
                }
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cambiar Rol (solo SUPER_ADMIN) */}
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
              <div className="flex gap-2">
                <select
                  value={nuevoRolId}
                  onChange={(e) => setNuevoRolId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Seleccionar rol</option>
                  {roles.map((rol) => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onCambiarRol(parseInt(nuevoRolId))}
                  disabled={isLoading || !nuevoRolId}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// GRUPOS TAB
// =====================================================

function GruposTab({
  departamentos,
  sedes,
}: {
  departamentos: DepartamentoSistema[];
  sedes: SedeCompleta[];
}) {
  const queryClient = useQueryClient();
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('');

  const { data: estadosGrupos, isLoading } = useQuery({
    queryKey: ['admin-estados-grupos', sedeSeleccionada],
    queryFn: () =>
      administracionAPI.getEstadoGrupos(
        sedeSeleccionada ? parseInt(sedeSeleccionada) : undefined
      ),
    select: (res) => res.data,
  });

  const toggleGrupoMutation = useMutation({
    mutationFn: (data: { departamento_id: number; sede_id: number; grupo: 0 | 1 | 2; activo: boolean }) =>
      administracionAPI.toggleGrupo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-estados-grupos'] });
    },
  });

  // Agrupar por sede
  const gruposPorSede = estadosGrupos?.reduce((acc, estado) => {
    const key = estado.sede_id || 0;
    if (!acc[key]) {
      acc[key] = {
        sede_id: estado.sede_id,
        sede_nombre: estado.sede_nombre || 'Global',
        estados: [],
      };
    }
    acc[key].estados.push(estado);
    return acc;
  }, {} as Record<number, { sede_id: number | null; sede_nombre: string; estados: EstadoGrupo[] }>);

  return (
    <div className="space-y-6">
      {/* Filtro por sede */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="font-medium text-gray-700">Filtrar por sede:</label>
          <select
            value={sedeSeleccionada}
            onChange={(e) => setSedeSeleccionada(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Gestion de Grupos</h3>
            <p className="text-sm text-blue-800 mt-1">
              Activa o desactiva el acceso de cada grupo por departamento y sede.
              Los usuarios del grupo desactivado no podran iniciar sesion.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando estados de grupos...</div>
      ) : (
        Object.values(gruposPorSede || {}).map((sedeData) => (
          <div key={sedeData.sede_id || 0} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {sedeData.sede_nombre}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Departamento
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Normal (L-V)
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Grupo 1
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                      Grupo 2
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {departamentos
                    .filter((d) => d.usa_sistema_grupos)
                    .map((depto) => {
                      const estadosDepto = sedeData.estados.filter(
                        (e) => e.departamento_id === depto.id
                      );
                      return (
                        <tr key={depto.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{depto.nombre}</p>
                            <p className="text-xs text-gray-500">{depto.codigo}</p>
                          </td>
                          {[0, 1, 2].map((grupo) => {
                            const estado = estadosDepto.find((e) => e.grupo === grupo);
                            const activo = estado?.activo ?? true;
                            return (
                              <td key={grupo} className="px-4 py-3 text-center">
                                <button
                                  onClick={() =>
                                    sedeData.sede_id &&
                                    toggleGrupoMutation.mutate({
                                      departamento_id: depto.id,
                                      sede_id: sedeData.sede_id,
                                      grupo: grupo as 0 | 1 | 2,
                                      activo: !activo,
                                    })
                                  }
                                  disabled={!sedeData.sede_id}
                                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                    activo
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                >
                                  {activo ? 'Activo' : 'Inactivo'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// =====================================================
// ENCARGADOS TAB
// =====================================================

function EncargadosTab({ sedes }: { sedes: SedeCompleta[] }) {
  const queryClient = useQueryClient();
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string>('');
  const [modalAsignar, setModalAsignar] = useState<{
    sede_id: number;
    grupo: 0 | 1 | 2;
    sede_nombre: string;
  } | null>(null);
  const [historialSede, setHistorialSede] = useState<number | null>(null);

  const { data: encargados, isLoading } = useQuery({
    queryKey: ['admin-encargados', sedeSeleccionada],
    queryFn: () =>
      administracionAPI.getEncargados(sedeSeleccionada ? parseInt(sedeSeleccionada) : undefined),
    select: (res) => res.data,
  });

  const { data: historial, isLoading: loadingHistorial } = useQuery({
    queryKey: ['admin-historial-encargados', historialSede],
    queryFn: () => (historialSede ? administracionAPI.getHistorialEncargados(historialSede) : null),
    enabled: !!historialSede,
    select: (res) => res?.data,
  });

  const removerEncargadoMutation = useMutation({
    mutationFn: ({ sedeId, grupo }: { sedeId: number; grupo: 0 | 1 | 2 }) =>
      administracionAPI.removerEncargado(sedeId, grupo, 'Removido por administrador'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-encargados'] });
      queryClient.invalidateQueries({ queryKey: ['admin-estadisticas'] });
    },
  });

  // Agrupar encargados por sede
  const encargadosPorSede = encargados?.reduce((acc, enc) => {
    if (!acc[enc.sede_id]) {
      acc[enc.sede_id] = {
        sede_id: enc.sede_id,
        sede_nombre: enc.sede_nombre,
        encargados: [],
      };
    }
    acc[enc.sede_id].encargados.push(enc);
    return acc;
  }, {} as Record<number, { sede_id: number; sede_nombre: string; encargados: EncargadoActual[] }>);

  return (
    <div className="space-y-6">
      {/* Filtro por sede */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <label className="font-medium text-gray-700">Filtrar por sede:</label>
          <select
            value={sedeSeleccionada}
            onChange={(e) => setSedeSeleccionada(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las sedes</option>
            {sedes.map((sede) => (
              <option key={sede.id} value={sede.id}>
                {sede.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Crown className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">Gestion de Encargados</h3>
            <p className="text-sm text-amber-800 mt-1">
              Cada sede puede tener hasta 3 encargados: uno para cada grupo (Normal, G1, G2).
              El encargado aparece en la bitacora de cada unidad de su sede y grupo.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando encargados...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sedes
            .filter((sede) => !sedeSeleccionada || sede.id === parseInt(sedeSeleccionada))
            .map((sede) => {
            const sedeData = encargadosPorSede?.[sede.id];
            return (
              <div key={sede.id} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    {sede.nombre}
                  </h3>
                  <button
                    onClick={() => setHistorialSede(sede.id)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Ver historial
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {[0, 1, 2].map((grupo) => {
                    const encargado = sedeData?.encargados.find((e) => e.grupo === grupo);
                    return (
                      <div
                        key={grupo}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColorGrupo(grupo as 0 | 1 | 2)}`}>
                            {getNombreGrupo(grupo as 0 | 1 | 2)}
                          </span>
                          {encargado ? (
                            <div className="mt-1">
                              <p className="font-medium text-gray-900">{encargado.nombre_completo}</p>
                              <p className="text-xs text-gray-500">
                                Chapa: {encargado.chapa} | Desde:{' '}
                                {new Date(encargado.fecha_inicio).toLocaleDateString()}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-gray-500 italic">Sin encargado asignado</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {encargado ? (
                            <button
                              onClick={() =>
                                removerEncargadoMutation.mutate({
                                  sedeId: sede.id,
                                  grupo: grupo as 0 | 1 | 2,
                                })
                              }
                              className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                              title="Remover encargado"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() =>
                                setModalAsignar({
                                  sede_id: sede.id,
                                  grupo: grupo as 0 | 1 | 2,
                                  sede_nombre: sede.nombre,
                                })
                              }
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                              title="Asignar encargado"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Asignar Encargado */}
      {modalAsignar && (
        <ModalAsignarEncargado
          sedeId={modalAsignar.sede_id}
          grupo={modalAsignar.grupo}
          sedeNombre={modalAsignar.sede_nombre}
          onClose={() => setModalAsignar(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-encargados'] });
            setModalAsignar(null);
          }}
        />
      )}

      {/* Modal Historial */}
      {historialSede && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Historial de Encargados</h2>
              <button onClick={() => setHistorialSede(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            {loadingHistorial ? (
              <p className="text-center text-gray-500 py-4">Cargando historial...</p>
            ) : historial?.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No hay historial para esta sede</p>
            ) : (
              <div className="space-y-3">
                {historial?.map((h) => (
                  <div
                    key={h.asignacion_id}
                    className={`p-3 rounded-lg ${h.fecha_fin ? 'bg-gray-50' : 'bg-green-50 border border-green-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{h.nombre_completo}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getColorGrupo(h.grupo)}`}>
                          {h.grupo_nombre}
                        </span>
                      </div>
                      {!h.fecha_fin && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Desde: {new Date(h.fecha_inicio).toLocaleDateString()}
                      {h.fecha_fin && ` - Hasta: ${new Date(h.fecha_fin).toLocaleDateString()}`}
                    </p>
                    {h.motivo_remocion && (
                      <p className="text-xs text-gray-500 mt-1">Motivo: {h.motivo_remocion}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalAsignarEncargado({
  sedeId,
  grupo,
  sedeNombre,
  onClose,
  onSuccess,
}: {
  sedeId: number;
  grupo: 0 | 1 | 2;
  sedeNombre: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);

  const { data: brigadas, isLoading } = useQuery({
    queryKey: ['brigadas-sede-grupo', sedeId, grupo, busqueda],
    queryFn: () =>
      administracionAPI.getUsuarios({
        sede_id: sedeId,
        grupo: grupo,
        activo: true,
        busqueda: busqueda || undefined,
      }),
    select: (res) => res.data.filter((u) => u.rol_codigo === 'BRIGADA'),
  });

  const asignarMutation = useMutation({
    mutationFn: () =>
      administracionAPI.asignarEncargado({
        usuario_id: usuarioSeleccionado!,
        sede_id: sedeId,
        grupo,
      }),
    onSuccess: () => {
      onSuccess();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Asignar Encargado</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Sede:</strong> {sedeNombre}
          </p>
          <p className="text-sm text-amber-800">
            <strong>Grupo:</strong> {getNombreGrupo(grupo)}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Buscar brigada</label>
          <input
            type="text"
            placeholder="Nombre o chapa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="max-h-48 overflow-y-auto border rounded-lg">
          {isLoading ? (
            <p className="text-center text-gray-500 py-4">Buscando...</p>
          ) : brigadas?.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No hay brigadas disponibles</p>
          ) : (
            brigadas?.map((brigada) => (
              <button
                key={brigada.id}
                onClick={() => setUsuarioSeleccionado(brigada.id)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 ${
                  usuarioSeleccionado === brigada.id ? 'bg-amber-50 border-amber-200' : ''
                }`}
              >
                <p className="font-medium text-gray-900">{brigada.nombre_completo}</p>
                <p className="text-sm text-gray-500">Chapa: {brigada.chapa}</p>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => asignarMutation.mutate()}
            disabled={!usuarioSeleccionado || asignarMutation.isPending}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
          >
            {asignarMutation.isPending ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// CONFIGURACION TAB
// =====================================================

function ConfiguracionTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const queryClient = useQueryClient();

  const { data: configuracion, isLoading } = useQuery({
    queryKey: ['admin-configuracion'],
    queryFn: () => administracionAPI.getConfiguracion(),
    enabled: isSuperAdmin,
    select: (res) => res.data,
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: string }) =>
      administracionAPI.setConfiguracion(clave, valor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-configuracion'] });
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h3 className="font-semibold text-yellow-900">Acceso Restringido</h3>
        <p className="text-yellow-800">Solo SUPER_ADMIN puede ver la configuracion del sistema.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            Configuracion del Sistema
          </h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <p className="text-center text-gray-500">Cargando configuracion...</p>
          ) : configuracion?.length === 0 ? (
            <p className="text-center text-gray-500">No hay configuraciones</p>
          ) : (
            <div className="space-y-4">
              {configuracion?.map((config) => (
                <ConfiguracionItem
                  key={config.id}
                  config={config}
                  onUpdate={(valor) =>
                    updateConfigMutation.mutate({ clave: config.clave, valor })
                  }
                  isUpdating={updateConfigMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfiguracionItem({
  config,
  onUpdate,
  isUpdating,
}: {
  config: ConfiguracionSistema;
  onUpdate: (valor: string) => void;
  isUpdating: boolean;
}) {
  const [valor, setValor] = useState(config.valor || '');
  const [editando, setEditando] = useState(false);

  const handleSave = () => {
    onUpdate(valor);
    setEditando(false);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{config.clave}</p>
          <p className="text-sm text-gray-500">{config.descripcion}</p>
          <p className="text-xs text-gray-400 mt-1">
            Tipo: {config.tipo} | Modificado: {new Date(config.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {editando ? (
            <>
              {config.tipo === 'boolean' ? (
                <select
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="true">Activo</option>
                  <option value="false">Inactivo</option>
                </select>
              ) : (
                <input
                  type={config.tipo === 'number' ? 'number' : 'text'}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <button
                onClick={handleSave}
                disabled={isUpdating}
                className="p-1.5 text-green-600 hover:bg-green-100 rounded"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setValor(config.valor || '');
                  setEditando(false);
                }}
                className="p-1.5 text-gray-600 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <span
                className={`px-3 py-1 rounded text-sm font-medium ${
                  config.tipo === 'boolean'
                    ? config.valor === 'true'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {config.valor}
              </span>
              <button
                onClick={() => setEditando(true)}
                className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// AUDITORIA TAB
// =====================================================

function AuditoriaTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [filtros, setFiltros] = useState({
    accion: '',
    limite: '50',
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-log', filtros],
    queryFn: () =>
      administracionAPI.getLogAdministracion({
        accion: filtros.accion || undefined,
        limite: parseInt(filtros.limite),
      }),
    enabled: isSuperAdmin,
    select: (res) => res.data,
  });

  if (!isSuperAdmin) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
        <h3 className="font-semibold text-yellow-900">Acceso Restringido</h3>
        <p className="text-yellow-800">Solo SUPER_ADMIN puede ver el log de auditoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <select
            value={filtros.accion}
            onChange={(e) => setFiltros({ ...filtros, accion: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las acciones</option>
            <option value="TOGGLE_GRUPO">Toggle Grupo</option>
            <option value="ASIGNAR_ENCARGADO">Asignar Encargado</option>
            <option value="REMOVER_ENCARGADO">Remover Encargado</option>
            <option value="TOGGLE_USUARIO">Toggle Usuario</option>
            <option value="TOGGLE_ACCESO_APP">Toggle Acceso App</option>
            <option value="CAMBIAR_GRUPO">Cambiar Grupo</option>
            <option value="CAMBIAR_ROL">Cambiar Rol</option>
            <option value="CAMBIAR_CONFIG">Cambiar Config</option>
          </select>
          <select
            value={filtros.limite}
            onChange={(e) => setFiltros({ ...filtros, limite: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="25">Ultimos 25</option>
            <option value="50">Ultimos 50</option>
            <option value="100">Ultimos 100</option>
          </select>
        </div>
      </div>

      {/* Log */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            Log de Acciones Administrativas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Accion</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Realizado por
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Usuario afectado
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Cargando log...
                  </td>
                </tr>
              ) : logs?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay registros
                  </td>
                </tr>
              ) : (
                logs?.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                        {log.accion}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{log.realizado_por_nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.usuario_afectado_nombre || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {log.descripcion || log.tabla_afectada || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
