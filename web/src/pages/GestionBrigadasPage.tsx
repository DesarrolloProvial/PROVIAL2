import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  RefreshCw,
  Edit2,
  Building2,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Filter,
  ArrowLeft,
  Settings,
  Plus,
  Key
} from 'lucide-react';

interface Brigada {
  id: number;
  nombre: string;
  chapa: string;
  telefono: string | null;
  email: string | null;
  activa: boolean;
  grupo: 0 | 1 | 2 | null;
  sede_id: number;
  sede_nombre: string;
  rol_brigada?: string | null;
  custom_fields?: Record<string, any>;
}

interface CampoPersonalizado {
  id: number;
  clave: string;
  etiqueta: string;
  tipo: 'text' | 'number' | 'date' | 'select';
  opciones?: any;
  orden: number;
  activo: boolean;
}

interface Sede {
  id: number;
  codigo: string;
  nombre: string;
}

export default function GestionBrigadasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filtros
  const [sedeFilter, setSedeFilter] = useState<number | ''>('');
  const [grupoFilter, setGrupoFilter] = useState<number | '' | 'null'>('');
  const [activoFilter, setActivoFilter] = useState<boolean | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado de edición
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editData, setEditData] = useState<Partial<Brigada>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Estado de campos personalizados
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [newFieldData, setNewFieldData] = useState<Partial<CampoPersonalizado>>({ tipo: 'text' });

  // Queries
  const { data: brigadasData, isLoading, refetch } = useQuery({
    queryKey: ['brigadas', sedeFilter, grupoFilter, activoFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sedeFilter) params.append('sede_id', sedeFilter.toString());
      if (grupoFilter !== '') {
        if (grupoFilter === 'null') params.append('grupo', 'null');
        else params.append('grupo', grupoFilter.toString());
      }
      if (activoFilter !== '') params.append('activo', activoFilter.toString());
      if (searchTerm) params.append('search', searchTerm);
      const res = await api.get(`/brigadas?${params.toString()}`);
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

  const { data: customFields = [], refetch: refetchFields } = useQuery({
    queryKey: ['customFields', 'BRIGADA'],
    queryFn: async () => {
      const res = await api.get('/admin/campos-personalizados/BRIGADA');
      return res.data;
    }
  });

  // Mutaciones
  const updateBrigadaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Brigada> }) => {
      const res = await api.put(`/brigadas/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
      setEditingId(null);
      setEditData({});
    }
  });

  const toggleActivoMutation = useMutation({
    mutationFn: async ({ id, activa }: { id: number; activa: boolean }) => {
      if (activa) {
        return api.put(`/brigadas/${id}/activar`);
      } else {
        return api.put(`/brigadas/${id}/desactivar`, { motivo_id: 1 });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brigadas'] })
  });

  const cambiarGrupoMutation = useMutation({
    mutationFn: async ({ id, grupo }: { id: number; grupo: number | null }) => {
      return api.put(`/admin/usuarios/${id}/grupo`, { grupo });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brigadas'] })
  });

  const cambiarSedeMutation = useMutation({
    mutationFn: async ({ id, sede_id }: { id: number; sede_id: number }) => {
      return api.put(`/brigadas/${id}/transferir`, { nueva_sede_id: sede_id });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brigadas'] })
  });

  const createFieldMutation = useMutation({
    mutationFn: async (data: Partial<CampoPersonalizado>) => {
      return api.post('/admin/campos-personalizados', {
        ...data,
        tabla_destino: 'BRIGADA'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      setNewFieldData({ tipo: 'text' });
    }
  });

  const toggleFieldMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      return api.put(`/admin/campos-personalizados/${id}/toggle`, { activo });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customFields'] })
  });

  const createBrigadaMutation = useMutation({
    mutationFn: async (data: Partial<Brigada>) => {
      // Create expects: chapa, nombre, sede_id. And optional: telefono, email, grupo, rol_brigada
      // Backend expects username/chapa to be same for brigadas usually.
      return api.post('/brigadas', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brigadas'] });
      setIsCreating(false);
      setEditData({});
    }
  });

  const enableResetPasswordMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.post(`/admin/usuarios/${id}/habilitar-reset-password`);
    },
    onSuccess: () => {
      alert('Reset de contraseña habilitado para el usuario.');
    },
    onError: (error: any) => {
      alert('Error al habilitar reset: ' + (error.response?.data?.error || 'Error desconocido'));
    }
  });

  const brigadas: Brigada[] = brigadasData?.brigadas || [];

  const getGrupoColor = (grupo: number | null) => {
    if (grupo === null) return 'bg-gray-100 text-gray-700';
    if (grupo === 0) return 'bg-purple-100 text-purple-700';
    if (grupo === 1) return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
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
            <Users className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion de Brigadas</h1>
              <p className="text-sm text-gray-500">{brigadas.length} brigadas encontradas</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowColumnConfig(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Configurar Columnas"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setEditData({});
                setIsCreating(true);
              }}
              className="p-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-1"
              title="Nueva Brigada"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Actualizar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filtros</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Busqueda */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o chapa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Sede */}
            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede: Sede) => (
                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
              ))}
            </select>

            {/* Grupo */}
            <select
              value={grupoFilter}
              onChange={(e) => setGrupoFilter(e.target.value === 'null' ? 'null' : e.target.value ? parseInt(e.target.value) : '')}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los grupos</option>
              <option value="0">Normal (L-V)</option>
              <option value="1">Grupo 1</option>
              <option value="2">Grupo 2</option>
              <option value="null">Sin grupo</option>
            </select>

            {/* Activo */}
            <select
              value={activoFilter === '' ? '' : activoFilter.toString()}
              onChange={(e) => setActivoFilter(e.target.value === '' ? '' : e.target.value === 'true')}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Cargando brigadas...</div>
          ) : brigadas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No se encontraron brigadas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brigada</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grupo</th>

                    {customFields.filter((f: CampoPersonalizado) => f.activo).map((field: CampoPersonalizado) => (
                      <th key={field.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {field.etiqueta}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {brigadas.map((brigada) => (
                    <>
                      <tr key={brigada.id} className={`hover:bg-gray-50 ${!brigada.activa ? 'bg-red-50' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {brigada.nombre?.charAt(0) || '?'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{brigada.nombre}</p>
                              <p className="text-sm text-gray-500">Chapa: {brigada.chapa}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{brigada.sede_nombre}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={brigada.grupo ?? 'null'}
                            onChange={(e) => {
                              const val = e.target.value;
                              const grupo = val === 'null' ? null : parseInt(val);
                              cambiarGrupoMutation.mutate({ id: brigada.id, grupo });
                            }}
                            className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${getGrupoColor(brigada.grupo)}`}
                          >
                            <option value="null">Sin grupo</option>
                            <option value="0">Normal</option>
                            <option value="1">Grupo 1</option>
                            <option value="2">Grupo 2</option>

                          </select>
                        </td>
                        {customFields.filter((f: CampoPersonalizado) => f.activo).map((field: CampoPersonalizado) => (
                          <td key={field.id} className="px-4 py-3 text-sm text-gray-700">
                            {brigada.custom_fields?.[field.clave] || '-'}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggleActivoMutation.mutate({ id: brigada.id, activa: !brigada.activa })}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${brigada.activa
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                          >
                            {brigada.activa ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setExpandedId(expandedId === brigada.id ? null : brigada.id)}
                              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                              title="Ver detalles"
                            >
                              {expandedId === brigada.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(brigada.id);
                                setEditData(brigada);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`¿Habilitar reset de contraseña para ${brigada.nombre}?`)) {
                                  enableResetPasswordMutation.mutate(brigada.id);
                                }
                              }}
                              className="p-1 text-orange-500 hover:bg-orange-50 rounded"
                              title="Reset Contraseña"
                            >
                              <Key className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* Fila expandida */}
                      {expandedId === brigada.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={5} className="px-4 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{brigada.telefono || 'Sin telefono'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="text-sm">{brigada.email || 'Sin email'}</span>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">Cambiar sede:</label>
                                <select
                                  value={brigada.sede_id}
                                  onChange={(e) => {
                                    cambiarSedeMutation.mutate({ id: brigada.id, sede_id: parseInt(e.target.value) });
                                  }}
                                  className="ml-2 px-2 py-1 text-sm border rounded"
                                >
                                  {sedes.map((sede: Sede) => (
                                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edicion/creacion */}
      {(editingId || isCreating) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{isCreating ? 'Nueva Brigada' : 'Editar Brigada'}</h3>
              <button onClick={() => { setEditingId(null); setIsCreating(false); setEditData({}); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={editData.nombre || ''}
                  onChange={(e) => setEditData({ ...editData, nombre: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
                <select
                  value={editData.sede_id || ''}
                  onChange={(e) => setEditData({ ...editData, sede_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar Sede</option>
                  {sedes.map((sede: Sede) => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chapa</label>
                  <input
                    type="text"
                    value={editData.chapa || ''}
                    onChange={(e) => setEditData({ ...editData, chapa: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol Brigada</label>
                  <select
                    value={editData.rol_brigada || ''}
                    onChange={(e) => setEditData({ ...editData, rol_brigada: e.target.value || null })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">(Ninguno)</option>
                    <option value="JEFE_BRIGADA">Jefe de Brigada</option>
                    <option value="PILOTO">Piloto</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                  <input
                    type="text"
                    value={editData.telefono || ''}
                    onChange={(e) => setEditData({ ...editData, telefono: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Campos Personalizados en Edicion */}
              {customFields.filter((f: CampoPersonalizado) => f.activo).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Información Adicional</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {customFields.filter((f: CampoPersonalizado) => f.activo).map((field: CampoPersonalizado) => (
                      <div key={field.id} className={field.tipo === 'text' ? 'col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{field.etiqueta}</label>
                        {field.tipo === 'select' ? (
                          <select
                            value={editData.custom_fields?.[field.clave] || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              custom_fields: {
                                ...editData.custom_fields,
                                [field.clave]: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Seleccionar...</option>
                            {/* Opciones deberian venir de field.opciones si existen */}
                          </select>
                        ) : (
                          <input
                            type={field.tipo === 'number' ? 'number' : field.tipo === 'date' ? 'date' : 'text'}
                            value={editData.custom_fields?.[field.clave] || ''}
                            onChange={(e) => setEditData({
                              ...editData,
                              custom_fields: {
                                ...editData.custom_fields,
                                [field.clave]: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => { setEditingId(null); setIsCreating(false); setEditData({}); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!editData.nombre || !editData.chapa || !editData.sede_id) {
                    alert('Faltan campos requeridos (Nombre, Chapa, Sede)');
                    return;
                  }
                  if (isCreating) {
                    createBrigadaMutation.mutate(editData);
                  } else if (editingId) {
                    updateBrigadaMutation.mutate({ id: editingId, data: editData });
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuracion de Columnas */}
      {showColumnConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Configurar Columnas</h3>
              <button onClick={() => setShowColumnConfig(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {/* Lista de Campos Existentes */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Columnas Personalizadas</h4>
                {customFields.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hay columnas personalizadas.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customFields.map((field: CampoPersonalizado) => (
                      <div key={field.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{field.etiqueta}</p>
                          <p className="text-xs text-gray-500">Clave: {field.clave} ({field.tipo})</p>
                        </div>
                        <button
                          onClick={() => toggleFieldMutation.mutate({ id: field.id, activo: !field.activo })}
                          className={`px-2 py-1 text-xs font-medium rounded ${field.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                            }`}
                        >
                          {field.activo ? 'Visible' : 'Oculto'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Agregar Nuevo Campo */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Agregar Nueva Columna
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Etiqueta (Nombre visible)"
                      value={newFieldData.etiqueta || ''}
                      onChange={(e) => setNewFieldData({ ...newFieldData, etiqueta: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Clave (sin espacios)"
                      value={newFieldData.clave || ''}
                      onChange={(e) => setNewFieldData({ ...newFieldData, clave: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <select
                      value={newFieldData.tipo || 'text'}
                      onChange={(e) => setNewFieldData({ ...newFieldData, tipo: e.target.value as any })}
                      className="w-full px-3 py-2 border rounded text-sm"
                    >
                      <option value="text">Texto</option>
                      <option value="number">Numero</option>
                      <option value="date">Fecha</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (newFieldData.clave && newFieldData.etiqueta) {
                      createFieldMutation.mutate(newFieldData);
                    }
                  }}
                  disabled={!newFieldData.clave || !newFieldData.etiqueta}
                  className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  Agregar Columna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
