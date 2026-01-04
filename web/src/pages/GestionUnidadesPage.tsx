import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Truck,
  Search,
  RefreshCw,
  Edit2,
  Plus,
  Building2,
  Save,
  X,
  Filter,
  ArrowLeft,
} from 'lucide-react';

interface Unidad {
  id: number;
  codigo: string;
  tipo_unidad: string;
  marca: string;
  modelo: string;
  anio: number;
  placa: string;
  activa: boolean;
  sede_id: number;
  sede_nombre: string;
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

export default function GestionUnidadesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Filtros
  const [sedeFilter, setSedeFilter] = useState<number | ''>('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [activaFilter, setActivaFilter] = useState<boolean | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado
  const [showModal, setShowModal] = useState(false);
  const [editingUnidad, setEditingUnidad] = useState<Unidad | null>(null);

  // Custom fields state
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [newFieldData, setNewFieldData] = useState<Partial<CampoPersonalizado>>({ tipo: 'text' });

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    tipo_unidad: 'PICK-UP',
    marca: '',
    modelo: '',
    anio: new Date().getFullYear(),
    placa: '',
    sede_id: 1,
    custom_fields: {} as Record<string, any>
  });

  // Queries
  const { data: unidadesData, isLoading, refetch } = useQuery({
    queryKey: ['unidades', sedeFilter, tipoFilter, activaFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (sedeFilter) params.append('sede_id', sedeFilter.toString());
      if (tipoFilter) params.append('tipo_unidad', tipoFilter);
      if (activaFilter !== '') params.append('activa', activaFilter.toString());
      if (searchTerm) params.append('search', searchTerm);
      const res = await api.get(`/unidades?${params.toString()}`);
      return res.data;
    }
  });

  const { data: tiposData } = useQuery({
    queryKey: ['tipos-unidad'],
    queryFn: async () => {
      const res = await api.get('/unidades/tipos');
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
    queryKey: ['customFields', 'UNIDAD'],
    queryFn: async () => {
      const res = await api.get('/admin/campos-personalizados/UNIDAD');
      return res.data;
    }
  });

  // Mutaciones
  const crearUnidadMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.post('/unidades', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      setShowModal(false);
      setFormData({ codigo: '', tipo_unidad: 'PICK-UP', marca: '', modelo: '', anio: new Date().getFullYear(), placa: '', sede_id: 1 });
    }
  });

  const createFieldMutation = useMutation({
    mutationFn: async (data: Partial<CampoPersonalizado>) => {
      return api.post('/admin/campos-personalizados', {
        ...data,
        tabla_destino: 'UNIDAD'
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      queryClient.invalidateQueries({ queryKey: ['unidades'] }); // To update cards if needed
    }
  });

  const actualizarUnidadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Unidad> }) => {
      const res = await api.put(`/unidades/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] });
      setEditingUnidad(null);
    }
  });

  const toggleActivaMutation = useMutation({
    mutationFn: async ({ id, activa }: { id: number; activa: boolean }) => {
      if (activa) {
        return api.put(`/unidades/${id}/activar`);
      } else {
        return api.put(`/unidades/${id}/desactivar`);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unidades'] })
  });

  const unidades: Unidad[] = unidadesData?.unidades || [];
  const tipos: string[] = tiposData?.tipos || [];

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
            <Truck className="w-8 h-8 text-orange-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Gestion de Unidades</h1>
              <p className="text-sm text-gray-500">{unidades.length} unidades encontradas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowColumnConfig(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Configurar Campos"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Unidad
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
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por codigo o placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <select
              value={sedeFilter}
              onChange={(e) => setSedeFilter(e.target.value ? parseInt(e.target.value) : '')}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede: Sede) => (
                <option key={sede.id} value={sede.id}>{sede.nombre}</option>
              ))}
            </select>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Todos los tipos</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
            <select
              value={activaFilter === '' ? '' : activaFilter.toString()}
              onChange={(e) => setActivaFilter(e.target.value === '' ? '' : e.target.value === 'true')}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">Todas</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </div>
        </div>

        {/* Grid de unidades */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full p-8 text-center text-gray-500">Cargando unidades...</div>
          ) : unidades.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-500">No se encontraron unidades</div>
          ) : (
            unidades.map((unidad) => (
              <div key={unidad.id} className={`bg-white rounded-lg shadow overflow-hidden ${!unidad.activa ? 'opacity-60' : ''}`}>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{unidad.codigo}</h3>
                      <p className="text-sm text-gray-500">{unidad.placa}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${unidad.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {unidad.activa ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Truck className="w-4 h-4" />
                      <span>
                        {unidad.tipo_unidad}
                        {(unidad.marca || unidad.modelo) && ` - ${unidad.marca || ''} ${unidad.modelo || ''}`.trim()}
                        {unidad.anio && unidad.anio > 0 && ` (${unidad.anio})`}
                      </span>
                    </div>
                    {/* Custom Fields in Card */}
                    {customFields.filter((f: CampoPersonalizado) => f.activo).map((field: CampoPersonalizado) => {
                      const value = unidad.custom_fields?.[field.clave];
                      if (!value) return null;
                      return (
                        <div key={field.id} className="flex items-center gap-2 text-gray-600">
                          <span className="text-xs font-semibold uppercase text-gray-400">{field.etiqueta}:</span>
                          <span className="text-sm">{value}</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span>{unidad.sede_nombre}</span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t">
                    <button
                      onClick={() => toggleActivaMutation.mutate({ id: unidad.id, activa: !unidad.activa })}
                      className={`p-1.5 rounded ${unidad.activa ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                      title={unidad.activa ? 'Desactivar' : 'Activar'}
                    >
                      {unidad.activa ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setEditingUnidad(unidad)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal crear/editar unidad */}
      {(showModal || editingUnidad) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{editingUnidad ? 'Editar Unidad' : 'Nueva Unidad'}</h3>
              <button onClick={() => { setShowModal(false); setEditingUnidad(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Codigo *</label>
                  <input
                    type="text"
                    value={editingUnidad?.codigo || formData.codigo}
                    onChange={(e) => editingUnidad
                      ? setEditingUnidad({ ...editingUnidad, codigo: e.target.value })
                      : setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!!editingUnidad}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
                  <input
                    type="text"
                    value={editingUnidad?.placa || formData.placa}
                    onChange={(e) => editingUnidad
                      ? setEditingUnidad({ ...editingUnidad, placa: e.target.value })
                      : setFormData({ ...formData, placa: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={editingUnidad?.tipo_unidad || formData.tipo_unidad}
                  onChange={(e) => editingUnidad
                    ? setEditingUnidad({ ...editingUnidad, tipo_unidad: e.target.value })
                    : setFormData({ ...formData, tipo_unidad: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
                  {!tipos.includes(editingUnidad?.tipo_unidad || formData.tipo_unidad) && (
                    <option value={editingUnidad?.tipo_unidad || formData.tipo_unidad}>
                      {editingUnidad?.tipo_unidad || formData.tipo_unidad}
                    </option>
                  )}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={editingUnidad?.marca || formData.marca}
                    onChange={(e) => editingUnidad
                      ? setEditingUnidad({ ...editingUnidad, marca: e.target.value })
                      : setFormData({ ...formData, marca: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={editingUnidad?.modelo || formData.modelo}
                    onChange={(e) => editingUnidad
                      ? setEditingUnidad({ ...editingUnidad, modelo: e.target.value })
                      : setFormData({ ...formData, modelo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
                  <input
                    type="number"
                    value={editingUnidad?.anio || formData.anio}
                    onChange={(e) => editingUnidad
                      ? setEditingUnidad({ ...editingUnidad, anio: parseInt(e.target.value) })
                      : setFormData({ ...formData, anio: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sede *</label>
                <select
                  value={editingUnidad?.sede_id || formData.sede_id}
                  onChange={(e) => editingUnidad
                    ? setEditingUnidad({ ...editingUnidad, sede_id: parseInt(e.target.value) })
                    : setFormData({ ...formData, sede_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  {sedes.map((s: Sede) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              {/* Custom Fields Inputs */}
              {customFields.filter((f: CampoPersonalizado) => f.activo).length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Información Adicional</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {customFields.filter((f: CampoPersonalizado) => f.activo).map((field: CampoPersonalizado) => (
                      <div key={field.id} className={field.tipo === 'text' ? 'col-span-2' : ''}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{field.etiqueta}</label>
                        {field.tipo === 'select' ? (
                          <select
                            value={(editingUnidad ? editingUnidad.custom_fields : formData.custom_fields)?.[field.clave] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (editingUnidad) {
                                setEditingUnidad({
                                  ...editingUnidad,
                                  custom_fields: { ...editingUnidad.custom_fields, [field.clave]: value }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  custom_fields: { ...formData.custom_fields, [field.clave]: value }
                                });
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
                          >
                            <option value="">Seleccionar...</option>
                          </select>
                        ) : (
                          <input
                            type={field.tipo === 'number' ? 'number' : field.tipo === 'date' ? 'date' : 'text'}
                            value={(editingUnidad ? editingUnidad.custom_fields : formData.custom_fields)?.[field.clave] || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (editingUnidad) {
                                setEditingUnidad({
                                  ...editingUnidad,
                                  custom_fields: { ...editingUnidad.custom_fields, [field.clave]: value }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  custom_fields: { ...formData.custom_fields, [field.clave]: value }
                                });
                              }
                            }}
                            className="w-full px-3 py-2 border rounded-lg"
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
                onClick={() => { setShowModal(false); setEditingUnidad(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (editingUnidad) {
                    actualizarUnidadMutation.mutate({ id: editingUnidad.id, data: editingUnidad });
                  } else {
                    crearUnidadMutation.mutate(formData);
                  }
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingUnidad ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configuracion Columnas */}
      {showColumnConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Configurar Campos</h3>
              <button onClick={() => setShowColumnConfig(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Campos Personalizados</h4>
                {customFields.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hay campos personalizados.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customFields.map((field: CampoPersonalizado) => (
                      <div key={field.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{field.etiqueta}</p>
                          <p className="text-xs text-gray-500">Clave: {field.clave}</p>
                        </div>
                        <button
                          onClick={() => toggleFieldMutation.mutate({ id: field.id, activo: !field.activo })}
                          className={`px-2 py-1 text-xs font-medium rounded ${field.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}
                        >
                          {field.activo ? 'Visible' : 'Oculto'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Agregar Nuevo Campo
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Etiqueta"
                      value={newFieldData.etiqueta || ''}
                      onChange={(e) => setNewFieldData({ ...newFieldData, etiqueta: e.target.value })}
                      className="w-full px-3 py-2 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Clave"
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
                  Agregar Campo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
