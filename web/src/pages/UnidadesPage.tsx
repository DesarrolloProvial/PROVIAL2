import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Search, Plus, Edit2, Power, Repeat, Trash2, X, Users, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthStore } from '../store/authStore';
import ConfiguracionColumnas, { useConfiguracionColumnas } from '../components/ConfiguracionColumnas';

interface Unidad {
  id: number;
  codigo: string;
  tipo_unidad: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  placa?: string;
  sede_id: number;
  sede_nombre: string;
  activa: boolean;
}

interface Sede {
  id: number;
  nombre: string;
}

const unidadesAPI = {
  listar: async (params?: { sede_id?: number; activa?: boolean; tipo_unidad?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.sede_id) queryParams.append('sede_id', params.sede_id.toString());
    if (params?.activa !== undefined) queryParams.append('activa', params.activa.toString());
    if (params?.tipo_unidad) queryParams.append('tipo_unidad', params.tipo_unidad);
    if (params?.search) queryParams.append('search', params.search);
    const { data } = await api.get(`/unidades?${queryParams}`);
    return data;
  },
  tipos: async () => {
    const { data } = await api.get('/unidades/tipos');
    return data;
  },
  crear: async (unidad: any) => {
    const { data } = await api.post('/unidades', unidad);
    return data;
  },
  actualizar: async (id: number, unidad: any) => {
    const { data } = await api.put(`/unidades/${id}`, unidad);
    return data;
  },
  desactivar: async (id: number) => {
    const { data } = await api.put(`/unidades/${id}/desactivar`);
    return data;
  },
  activar: async (id: number) => {
    const { data } = await api.put(`/unidades/${id}/activar`);
    return data;
  },
  transferir: async (id: number, nueva_sede_id: number, motivo?: string) => {
    const { data } = await api.put(`/unidades/${id}/transferir`, { nueva_sede_id, motivo });
    return data;
  },
  eliminar: async (id: number) => {
    const { data } = await api.delete(`/unidades/${id}`);
    return data;
  },
  getTripulacion: async (id: number) => {
    const { data } = await api.get(`/unidades/${id}/tripulacion`);
    return data;
  },
};

const sedesAPI = {
  listar: async () => {
    const { data } = await api.get('/sedes');
    return data;
  },
};

const TIPOS_UNIDAD = [
  'MOTORIZADA',
  'PICKUP',
  'PATRULLA',
  'AMBULANCIA',
  'GRUA',
  'CAMION',
  'OTRO'
];

export default function UnidadesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [filtroSede, setFiltroSede] = useState<number | undefined>();
  const [filtroTipo, setFiltroTipo] = useState<string | undefined>();
  const [filtroActiva, setFiltroActiva] = useState<boolean | undefined>();
  const [modalCrear, setModalCrear] = useState(false);
  const [modalEditar, setModalEditar] = useState<Unidad | null>(null);
  const [modalTransferir, setModalTransferir] = useState<Unidad | null>(null);
  const [modalTripulacion, setModalTripulacion] = useState<Unidad | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    tipo_unidad: '',
    marca: '',
    modelo: '',
    anio: '',
    placa: '',
    sede_id: '',
  });

  // Transfer form
  const [nuevaSedeId, setNuevaSedeId] = useState('');
  const [motivoTransferencia, setMotivoTransferencia] = useState('');

  // Queries
  const { data: unidadesData, isLoading, refetch } = useQuery({
    queryKey: ['unidades', { search: debouncedSearch, sede_id: filtroSede, activa: filtroActiva, tipo_unidad: filtroTipo }],
    queryFn: () => unidadesAPI.listar({ search: debouncedSearch, sede_id: filtroSede, activa: filtroActiva, tipo_unidad: filtroTipo }),
  });

  const { data: sedesData } = useQuery({
    queryKey: ['sedes'],
    queryFn: sedesAPI.listar,
  });

  const { data: tiposData } = useQuery({
    queryKey: ['tipos-unidad'],
    queryFn: unidadesAPI.tipos,
  });

  const { data: tripulacionData } = useQuery({
    queryKey: ['tripulacion', modalTripulacion?.id],
    queryFn: () => modalTripulacion ? unidadesAPI.getTripulacion(modalTripulacion.id) : null,
    enabled: !!modalTripulacion,
  });

  const unidades: Unidad[] = unidadesData?.unidades || [];
  const sedes: Sede[] = sedesData?.sedes || [];
  const tipos: string[] = tiposData?.tipos || TIPOS_UNIDAD;

  // Configuracion de columnas dinamicas
  const { columnasVisibles } = useConfiguracionColumnas('unidades', user?.sede_id ?? undefined);
  const isColumnVisible = (col: string) => columnasVisibles.length === 0 || columnasVisibles.includes(col);

  // Mutations
  const crearMutation = useMutation({
    mutationFn: unidadesAPI.crear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      setModalCrear(false);
      resetForm();
    },
  });

  const actualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => unidadesAPI.actualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      setModalEditar(null);
      resetForm();
    },
  });

  const toggleActivaMutation = useMutation({
    mutationFn: ({ id, activa }: { id: number; activa: boolean }) =>
      activa ? unidadesAPI.desactivar(id) : unidadesAPI.activar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
    },
  });

  const transferirMutation = useMutation({
    mutationFn: ({ id, nueva_sede_id, motivo }: { id: number; nueva_sede_id: number; motivo?: string }) =>
      unidadesAPI.transferir(id, nueva_sede_id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      setModalTransferir(null);
      setNuevaSedeId('');
      setMotivoTransferencia('');
    },
  });

  const eliminarMutation = useMutation({
    mutationFn: unidadesAPI.eliminar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
    },
  });

  const resetForm = () => {
    setFormData({
      codigo: '',
      tipo_unidad: '',
      marca: '',
      modelo: '',
      anio: '',
      placa: '',
      sede_id: '',
    });
  };

  const handleCrear = () => {
    crearMutation.mutate({
      ...formData,
      sede_id: parseInt(formData.sede_id),
      anio: formData.anio ? parseInt(formData.anio) : undefined,
    });
  };

  const handleEditar = () => {
    if (!modalEditar) return;
    actualizarMutation.mutate({
      id: modalEditar.id,
      data: {
        ...formData,
        sede_id: formData.sede_id ? parseInt(formData.sede_id) : undefined,
        anio: formData.anio ? parseInt(formData.anio) : undefined,
      },
    });
  };

  const handleTransferir = () => {
    if (!modalTransferir || !nuevaSedeId) return;
    transferirMutation.mutate({
      id: modalTransferir.id,
      nueva_sede_id: parseInt(nuevaSedeId),
      motivo: motivoTransferencia,
    });
  };

  const openEditModal = (unidad: Unidad) => {
    setFormData({
      codigo: unidad.codigo,
      tipo_unidad: unidad.tipo_unidad,
      marca: unidad.marca || '',
      modelo: unidad.modelo || '',
      anio: unidad.anio?.toString() || '',
      placa: unidad.placa || '',
      sede_id: unidad.sede_id.toString(),
    });
    setModalEditar(unidad);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'MOTORIZADA': return 'bg-blue-100 text-blue-800';
      case 'PICKUP': return 'bg-green-100 text-green-800';
      case 'PATRULLA': return 'bg-purple-100 text-purple-800';
      case 'AMBULANCIA': return 'bg-red-100 text-red-800';
      case 'GRUA': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader
        title="Gestion de Unidades"
        subtitle="Administra los vehiculos del sistema"
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
                  placeholder="Buscar por codigo o placa..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <select
              value={filtroSede || ''}
              onChange={(e) => setFiltroSede(e.target.value ? parseInt(e.target.value) : undefined)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
              ))}
            </select>
            <select
              value={filtroTipo || ''}
              onChange={(e) => setFiltroTipo(e.target.value || undefined)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <select
              value={filtroActiva === undefined ? '' : filtroActiva.toString()}
              onChange={(e) => setFiltroActiva(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">Todos</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
            <ConfiguracionColumnas tabla="unidades" sedeId={user?.sede_id ?? undefined} />
            <button
              onClick={() => { resetForm(); setModalCrear(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Nueva Unidad
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {isColumnVisible('codigo') && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Codigo</th>}
                {isColumnVisible('tipo_unidad') && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tipo</th>}
                {isColumnVisible('marca') && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Marca</th>}
                {isColumnVisible('modelo') && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Modelo</th>}
                {isColumnVisible('anio') && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ano</th>}
                {isColumnVisible('placa') && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Placa</th>}
                {isColumnVisible('sede') && <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Sede</th>}
                {isColumnVisible('estado') && <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Estado</th>}
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Cargando unidades...
                  </td>
                </tr>
              ) : unidades.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron unidades
                  </td>
                </tr>
              ) : (
                unidades.map((unidad) => (
                  <tr key={unidad.id} className={!unidad.activa ? 'bg-gray-50' : ''}>
                    <td className="px-4 py-3 font-mono text-sm font-semibold">{unidad.codigo}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoColor(unidad.tipo_unidad)}`}>
                        {unidad.tipo_unidad}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {unidad.marca || unidad.modelo ? `${unidad.marca || ''} ${unidad.modelo || ''}`.trim() : '-'}
                      {unidad.anio && <span className="text-gray-500 ml-1">({unidad.anio})</span>}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{unidad.placa || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{unidad.sede_nombre}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        unidad.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {unidad.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setModalTripulacion(unidad)}
                          className="p-1.5 text-teal-600 hover:bg-teal-50 rounded"
                          title="Ver Tripulacion"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(unidad)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActivaMutation.mutate({ id: unidad.id, activa: unidad.activa })}
                          className={`p-1.5 rounded ${
                            unidad.activa
                              ? 'text-orange-600 hover:bg-orange-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={unidad.activa ? 'Desactivar' : 'Activar'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setModalTransferir(unidad)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded"
                          title="Transferir"
                        >
                          <Repeat className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Esta seguro de eliminar esta unidad?')) {
                              eliminarMutation.mutate(unidad.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
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
          {unidadesData && (
            <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
              Total: {unidadesData.total} unidades
            </div>
          )}
        </div>
      </main>

      {/* Modal Crear */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Nueva Unidad</h2>
              <button onClick={() => setModalCrear(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Codigo *</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: MP-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo *</label>
                  <select
                    value={formData.tipo_unidad}
                    onChange={(e) => setFormData({ ...formData, tipo_unidad: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Seleccionar...</option>
                    {TIPOS_UNIDAD.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: Toyota"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modelo</label>
                  <input
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: Hilux"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ano</label>
                  <input
                    type="number"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: 2020"
                    min="1990"
                    max="2030"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Placa</label>
                  <input
                    type="text"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Ej: P-123ABC"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sede *</label>
                <select
                  value={formData.sede_id}
                  onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar...</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalCrear(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                disabled={crearMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {crearMutation.isPending ? 'Creando...' : 'Crear Unidad'}
              </button>
            </div>
            {crearMutation.isError && (
              <p className="mt-2 text-sm text-red-600">
                {(crearMutation.error as any)?.response?.data?.error || 'Error al crear unidad'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Editar Unidad</h2>
              <button onClick={() => setModalEditar(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Codigo</label>
                  <input
                    type="text"
                    value={formData.codigo}
                    disabled
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Tipo</label>
                  <select
                    value={formData.tipo_unidad}
                    onChange={(e) => setFormData({ ...formData, tipo_unidad: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {TIPOS_UNIDAD.map((tipo) => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Marca</label>
                  <input
                    type="text"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Modelo</label>
                  <input
                    type="text"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Ano</label>
                  <input
                    type="number"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1990"
                    max="2030"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Placa</label>
                  <input
                    type="text"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sede</label>
                <select
                  value={formData.sede_id}
                  onChange={(e) => setFormData({ ...formData, sede_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalEditar(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditar}
                disabled={actualizarMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actualizarMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transferir */}
      {modalTransferir && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Transferir Unidad</h2>
              <button onClick={() => setModalTransferir(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Transferir <strong>{modalTransferir.codigo}</strong> ({modalTransferir.tipo_unidad})
              desde <strong>{modalTransferir.sede_nombre}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nueva Sede *</label>
                <select
                  value={nuevaSedeId}
                  onChange={(e) => setNuevaSedeId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar sede destino...</option>
                  {sedes.filter(s => s.id !== modalTransferir.sede_id).map((sede) => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Motivo (opcional)</label>
                <textarea
                  value={motivoTransferencia}
                  onChange={(e) => setMotivoTransferencia(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Razon de la transferencia..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalTransferir(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleTransferir}
                disabled={!nuevaSedeId || transferirMutation.isPending}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {transferirMutation.isPending ? 'Transfiriendo...' : 'Transferir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tripulacion */}
      {modalTripulacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Tripulacion de {modalTripulacion.codigo}</h2>
              <button onClick={() => setModalTripulacion(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            {tripulacionData?.tripulacion?.length > 0 ? (
              <div className="space-y-3">
                {tripulacionData.tripulacion.map((miembro: any) => (
                  <div key={miembro.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{miembro.brigada_nombre}</p>
                      <p className="text-sm text-gray-500">{miembro.brigada_codigo} - {miembro.rol}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Esta unidad no tiene tripulacion asignada
              </p>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setModalTripulacion(null)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
