import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  situacionesPersistentesAPI,
  SituacionPersistente,
  ActualizacionSituacion,
  TipoEmergenciaVial,
} from '../services/movimientos.service';
import { geografiaAPI, situacionesAPI } from '../services/api';
import {
  ArrowLeft,
  Plus,
  MapPin,
  Truck,
  Clock,
  X,
  Check,
  Pause,
  Play,
  Square,
  Users,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  AlertTriangle,
  Shield,
  Heart,
} from 'lucide-react';
import ObstruccionForm, { ObstruccionData } from '../components/situaciones/ObstruccionForm';
import AutoridadesSocorroForm, { DetalleAutoridadSocorro } from '../components/situaciones/AutoridadesSocorroForm';

type TabType = 'activas' | 'pausadas' | 'finalizadas';
type FormTabType = 'general' | 'obstruccion' | 'autoridades' | 'socorro';

const initialObstruccion: ObstruccionData = {
  hay_vehiculo_fuera_via: false,
  tipo_obstruccion: 'ninguna',
  sentido_principal: null,
  sentido_contrario: null,
  descripcion_manual: '',
};

export default function SituacionesPersistentesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('activas');
  const [formTab, setFormTab] = useState<FormTabType>('general');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSituacion, setSelectedSituacion] = useState<SituacionPersistente | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  // Form state for create - General
  const [formData, setFormData] = useState({
    titulo: '',
    tipo_emergencia_id: '',
    importancia: 'ALTA',
    ruta_id: '',
    km_inicio: '',
    km_fin: '',
    sentido: 'NORTE_SUR',
    descripcion: '',
    jurisdiccion: ''
  });

  // Form state - Obstruccion
  const [obstruccionData, setObstruccionData] = useState<ObstruccionData>(initialObstruccion);

  // Form state - Autoridades
  const [autoridadesData, setAutoridadesData] = useState<DetalleAutoridadSocorro[]>([]);

  // Form state - Socorro
  const [socorroData, setSocorroData] = useState<DetalleAutoridadSocorro[]>([]);

  const [assignData, setAssignData] = useState({
    unidad_id: '',
    observaciones: ''
  });

  // Queries
  const { data: _tipos = [] } = useQuery({
    queryKey: ['tipos-situacion-persistente'],
    queryFn: situacionesPersistentesAPI.getTipos
  });
  void _tipos; // Variable reservada para uso futuro

  const { data: tiposEmergencia = [] } = useQuery({
    queryKey: ['tipos-emergencia-vial'],
    queryFn: situacionesPersistentesAPI.getTiposEmergencia
  });

  const { data: situacionesActivas = [], isLoading: loadingActivas } = useQuery({
    queryKey: ['situaciones-persistentes', 'activas'],
    queryFn: () => situacionesPersistentesAPI.getAll({ estado: 'ACTIVA' })
  });

  const { data: situacionesPausadas = [] } = useQuery({
    queryKey: ['situaciones-persistentes', 'pausadas'],
    queryFn: () => situacionesPersistentesAPI.getAll({ estado: 'EN_PAUSA' })
  });

  const { data: situacionesFinalizadas = [] } = useQuery({
    queryKey: ['situaciones-persistentes', 'finalizadas'],
    queryFn: () => situacionesPersistentesAPI.getAll({ estado: 'FINALIZADA' })
  });

  const { data: rutas = [] } = useQuery({
    queryKey: ['rutas'],
    queryFn: geografiaAPI.getRutas
  });

  const { data: resumenUnidades = [] } = useQuery({
    queryKey: ['resumen-unidades'],
    queryFn: situacionesAPI.getResumenUnidades,
    enabled: isAssignModalOpen
  });

  const { data: actualizaciones = [] } = useQuery({
    queryKey: ['actualizaciones-situacion', selectedSituacion?.id],
    queryFn: () => situacionesPersistentesAPI.getActualizaciones(selectedSituacion!.id),
    enabled: !!selectedSituacion && isDetailModalOpen
  });

  const { data: asignacionesHistorial = [] } = useQuery({
    queryKey: ['historial-asignaciones', selectedSituacion?.id],
    queryFn: () => situacionesPersistentesAPI.getHistorialAsignaciones(selectedSituacion!.id),
    enabled: !!selectedSituacion && isDetailModalOpen
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: situacionesPersistentesAPI.crearCompleta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-persistentes'] });
      setIsCreateModalOpen(false);
      resetForm();
      alert('Situacion persistente creada');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al crear situacion');
    }
  });

  const asignarMutation = useMutation({
    mutationFn: (data: { situacionId: number; unidadId: number; observaciones?: string }) =>
      situacionesPersistentesAPI.asignarUnidad(data.situacionId, {
        unidad_id: data.unidadId,
        observaciones_asignacion: data.observaciones
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-persistentes'] });
      queryClient.invalidateQueries({ queryKey: ['historial-asignaciones'] });
      setIsAssignModalOpen(false);
      setAssignData({ unidad_id: '', observaciones: '' });
      alert('Unidad asignada correctamente');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al asignar unidad');
    }
  });

  const desasignarMutation = useMutation({
    mutationFn: (data: { situacionId: number; unidadId: number }) =>
      situacionesPersistentesAPI.desasignarUnidad(data.situacionId, data.unidadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-persistentes'] });
      queryClient.invalidateQueries({ queryKey: ['historial-asignaciones'] });
      alert('Unidad desasignada');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al desasignar');
    }
  });

  const pausarMutation = useMutation({
    mutationFn: situacionesPersistentesAPI.pausar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-persistentes'] });
      alert('Situacion pausada');
    }
  });

  const reactivarMutation = useMutation({
    mutationFn: situacionesPersistentesAPI.reactivar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-persistentes'] });
      alert('Situacion reactivada');
    }
  });

  const finalizarMutation = useMutation({
    mutationFn: situacionesPersistentesAPI.finalizar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-persistentes'] });
      alert('Situacion finalizada');
    }
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      tipo_emergencia_id: '',
      importancia: 'ALTA',
      ruta_id: '',
      km_inicio: '',
      km_fin: '',
      sentido: 'NORTE_SUR',
      descripcion: '',
      jurisdiccion: ''
    });
    setObstruccionData(initialObstruccion);
    setAutoridadesData([]);
    setSocorroData([]);
    setFormTab('general');
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    // Convertir autoridades y socorro al formato esperado por el backend
    const autoridades = autoridadesData.filter(a => a.tipo_autoridad !== 'Ninguna');
    const socorro = socorroData.filter(s => s.tipo_autoridad !== 'Ninguna');

    createMutation.mutate({
      titulo: formData.titulo,
      tipo_emergencia_id: Number(formData.tipo_emergencia_id),
      importancia: formData.importancia as any,
      ruta_id: formData.ruta_id ? Number(formData.ruta_id) : undefined,
      km_inicio: formData.km_inicio ? Number(formData.km_inicio) : undefined,
      km_fin: formData.km_fin ? Number(formData.km_fin) : undefined,
      sentido: formData.sentido,
      descripcion: formData.descripcion || undefined,
      jurisdiccion: formData.jurisdiccion || undefined,
      obstruccion: obstruccionData.tipo_obstruccion !== 'ninguna' ? {
        obstruye_via: true,
        tipo_obstruccion: obstruccionData.tipo_obstruccion === 'total_ambos' ? 'total' : obstruccionData.tipo_obstruccion === 'total_sentido' ? 'parcial' : obstruccionData.tipo_obstruccion,
        porcentaje_obstruccion: obstruccionData.tipo_obstruccion === 'total_ambos' ? 100 : obstruccionData.tipo_obstruccion === 'total_sentido' ? 50 : 25,
        descripcion_manual: obstruccionData.descripcion_manual || undefined,
      } : undefined,
      autoridades: autoridades.length > 0 ? autoridades : undefined,
      socorro: socorro.length > 0 ? socorro : undefined,
    });
  };

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSituacion && assignData.unidad_id) {
      asignarMutation.mutate({
        situacionId: selectedSituacion.id,
        unidadId: Number(assignData.unidad_id),
        observaciones: assignData.observaciones
      });
    }
  };

  const openAssignModal = (situacion: SituacionPersistente) => {
    setSelectedSituacion(situacion);
    setIsAssignModalOpen(true);
  };

  const openDetailModal = (situacion: SituacionPersistente) => {
    setSelectedSituacion(situacion);
    setIsDetailModalOpen(true);
  };

  const toggleExpand = (id: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getImportanciaBadge = (importancia: string) => {
    switch (importancia) {
      case 'CRITICA':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'ALTA':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'BAJA':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSituaciones = () => {
    switch (activeTab) {
      case 'activas':
        return situacionesActivas;
      case 'pausadas':
        return situacionesPausadas;
      case 'finalizadas':
        return situacionesFinalizadas;
      default:
        return [];
    }
  };

  const renderSituacionCard = (situacion: SituacionPersistente) => {
    const isExpanded = expandedCards.has(situacion.id);

    return (
      <div
        key={situacion.id}
        className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden ${
          situacion.importancia === 'CRITICA'
            ? 'border-red-500'
            : situacion.importancia === 'ALTA'
            ? 'border-orange-500'
            : 'border-blue-500'
        }`}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-semibold border ${getImportanciaBadge(situacion.importancia)}`}>
                {situacion.importancia}
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                {situacion.tipo}
              </span>
            </div>
            <span className="text-gray-400 text-xs font-mono">{situacion.numero}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">{situacion.titulo}</h3>

          {/* Location */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <MapPin className="w-4 h-4" />
            <span>
              {situacion.ruta_codigo || 'Sin ruta'}{' '}
              {situacion.km_inicio && `Km ${situacion.km_inicio}`}
              {situacion.km_fin && ` - ${situacion.km_fin}`}
            </span>
          </div>

          {/* Description */}
          {situacion.descripcion && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{situacion.descripcion}</p>
          )}

          {/* Units assigned */}
          <div className="flex items-center gap-2 text-sm mb-3">
            <Truck className="w-4 h-4 text-gray-500" />
            <span className="font-medium">
              {situacion.unidades_asignadas_count} unidad(es) asignada(s)
            </span>
          </div>

          {/* Assigned units list */}
          {situacion.unidades_asignadas && situacion.unidades_asignadas.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {situacion.unidades_asignadas.map((u) => (
                <span
                  key={u.unidad_id}
                  className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                >
                  {u.unidad_codigo}
                </span>
              ))}
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Inicio: {new Date(situacion.fecha_inicio).toLocaleDateString('es-GT')}
            </div>
            {situacion.fecha_fin_real && (
              <div>
                Fin: {new Date(situacion.fecha_fin_real).toLocaleDateString('es-GT')}
              </div>
            )}
          </div>

          {/* Expand/collapse */}
          <button
            onClick={() => toggleExpand(situacion.id)}
            className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 py-2 border-t border-gray-100"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Menos opciones
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Mas opciones
              </>
            )}
          </button>

          {/* Expanded actions */}
          {isExpanded && (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openDetailModal(situacion)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalle
                </button>
                {situacion.estado === 'ACTIVA' && (
                  <button
                    onClick={() => openAssignModal(situacion)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Asignar Unidad
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {situacion.estado === 'ACTIVA' && (
                  <>
                    <button
                      onClick={() => pausarMutation.mutate(situacion.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg text-sm"
                    >
                      <Pause className="w-4 h-4" />
                      Pausar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Finalizar esta situacion?')) {
                          finalizarMutation.mutate(situacion.id);
                        }
                      }}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm col-span-2"
                    >
                      <Square className="w-4 h-4" />
                      Finalizar
                    </button>
                  </>
                )}
                {situacion.estado === 'EN_PAUSA' && (
                  <button
                    onClick={() => reactivarMutation.mutate(situacion.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm col-span-3"
                  >
                    <Play className="w-4 h-4" />
                    Reactivar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Situaciones Persistentes</h1>
              <p className="text-gray-600">Derrumbes, obras viales y situaciones de larga duracion</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nueva Situacion
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('activas')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'activas'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Play className="w-4 h-4 inline mr-2" />
                Activas ({situacionesActivas.length})
              </button>
              <button
                onClick={() => setActiveTab('pausadas')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'pausadas'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Pause className="w-4 h-4 inline mr-2" />
                Pausadas ({situacionesPausadas.length})
              </button>
              <button
                onClick={() => setActiveTab('finalizadas')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'finalizadas'
                    ? 'border-gray-500 text-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Square className="w-4 h-4 inline mr-2" />
                Finalizadas ({situacionesFinalizadas.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingActivas ? (
            <div className="col-span-full text-center py-8 text-gray-500">Cargando...</div>
          ) : getSituaciones().length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No hay situaciones {activeTab}
            </div>
          ) : (
            getSituaciones().map(renderSituacionCard)
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Nueva Situacion Extraordinaria</h2>
                  <p className="text-sm text-gray-500">Formulario completo de emergencia vial</p>
                </div>
                <button
                  onClick={() => { setIsCreateModalOpen(false); resetForm(); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form Tabs */}
              <div className="flex gap-1 mt-4 border-b border-gray-200">
                <button
                  type="button"
                  onClick={() => setFormTab('general')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 ${
                    formTab === 'general'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  General
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('obstruccion')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 ${
                    formTab === 'obstruccion'
                      ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  Obstruccion
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('autoridades')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 ${
                    formTab === 'autoridades'
                      ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Autoridades
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab('socorro')}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 ${
                    formTab === 'socorro'
                      ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Socorro
                </button>
              </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {/* Tab: General */}
                {formTab === 'general' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titulo *</label>
                      <input
                        type="text"
                        value={formData.titulo}
                        onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Ej: Derrumbe Km 45 CA-1"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Emergencia *</label>
                        <select
                          value={formData.tipo_emergencia_id}
                          onChange={(e) => setFormData({ ...formData, tipo_emergencia_id: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          required
                        >
                          <option value="">-- Seleccionar --</option>
                          {tiposEmergencia.map((t: TipoEmergenciaVial) => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Importancia</label>
                        <select
                          value={formData.importancia}
                          onChange={(e) => setFormData({ ...formData, importancia: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="BAJA">Baja</option>
                          <option value="NORMAL">Normal</option>
                          <option value="ALTA">Alta</option>
                          <option value="CRITICA">Critica</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
                      <select
                        value={formData.ruta_id}
                        onChange={(e) => setFormData({ ...formData, ruta_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="">-- Seleccionar ruta --</option>
                        {rutas.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.codigo} - {r.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Km Inicio</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.km_inicio}
                          onChange={(e) => setFormData({ ...formData, km_inicio: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Km Fin</label>
                        <input
                          type="number"
                          step="0.1"
                          value={formData.km_fin}
                          onChange={(e) => setFormData({ ...formData, km_fin: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sentido</label>
                        <select
                          value={formData.sentido}
                          onChange={(e) => setFormData({ ...formData, sentido: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value="NORTE_SUR">Norte-Sur</option>
                          <option value="SUR_NORTE">Sur-Norte</option>
                          <option value="AMBOS">Ambos</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiccion</label>
                      <input
                        type="text"
                        value={formData.jurisdiccion}
                        onChange={(e) => setFormData({ ...formData, jurisdiccion: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="Ej: Escuintla, Guatemala"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
                      <textarea
                        value={formData.descripcion}
                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        rows={3}
                        placeholder="Describe la situacion..."
                      />
                    </div>
                  </>
                )}

                {/* Tab: Obstruccion */}
                {formTab === 'obstruccion' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Detalles de Obstruccion</h3>
                    <ObstruccionForm
                      value={obstruccionData}
                      onChange={setObstruccionData}
                    />
                  </div>
                )}

                {/* Tab: Autoridades */}
                {formTab === 'autoridades' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Autoridades Presentes</h3>
                    <AutoridadesSocorroForm
                      tipo="autoridad"
                      value={autoridadesData}
                      onChange={setAutoridadesData}
                    />
                  </div>
                )}

                {/* Tab: Socorro */}
                {formTab === 'socorro' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Unidades de Socorro</h3>
                    <AutoridadesSocorroForm
                      tipo="socorro"
                      value={socorroData}
                      onChange={setSocorroData}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsCreateModalOpen(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !formData.titulo || !formData.tipo_emergencia_id}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <span>Creando...</span>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5" />
                      Crear Situacion Extraordinaria
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && selectedSituacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Asignar Unidad</h2>
                <button
                  onClick={() => { setIsAssignModalOpen(false); setAssignData({ unidad_id: '', observaciones: '' }); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="font-medium">{selectedSituacion.titulo}</div>
                <div className="text-sm text-gray-500">{selectedSituacion.numero}</div>
              </div>

              <form onSubmit={handleAssign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Unidad</label>
                  <select
                    value={assignData.unidad_id}
                    onChange={(e) => setAssignData({ ...assignData, unidad_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {resumenUnidades
                      .filter((u: any) =>
                        !selectedSituacion.unidades_asignadas?.some(
                          (ua) => ua.unidad_id === u.unidad_id
                        )
                      )
                      .map((u: any) => (
                        <option key={u.unidad_id} value={u.unidad_id}>
                          {u.unidad_codigo} - {u.tipo_unidad}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    value={assignData.observaciones}
                    onChange={(e) => setAssignData({ ...assignData, observaciones: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={2}
                    placeholder="Observaciones de la asignacion..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => { setIsAssignModalOpen(false); setAssignData({ unidad_id: '', observaciones: '' }); }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={asignarMutation.isPending}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                    Asignar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedSituacion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedSituacion.titulo}</h2>
                  <p className="text-sm text-gray-500">{selectedSituacion.numero}</p>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Info basica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Tipo</span>
                  <p className="font-medium">{selectedSituacion.tipo}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Importancia</span>
                  <p className="font-medium">{selectedSituacion.importancia}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Ubicacion</span>
                  <p className="font-medium">
                    {selectedSituacion.ruta_codigo} Km {selectedSituacion.km_inicio}
                    {selectedSituacion.km_fin && ` - ${selectedSituacion.km_fin}`}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Creado por</span>
                  <p className="font-medium">{selectedSituacion.creado_por_nombre}</p>
                </div>
              </div>

              {selectedSituacion.descripcion && (
                <div>
                  <span className="text-sm text-gray-500">Descripcion</span>
                  <p className="mt-1">{selectedSituacion.descripcion}</p>
                </div>
              )}

              {/* Unidades asignadas */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Unidades Asignadas ({selectedSituacion.unidades_asignadas_count})
                </h3>
                {selectedSituacion.unidades_asignadas && selectedSituacion.unidades_asignadas.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSituacion.unidades_asignadas.map((u) => (
                      <div key={u.unidad_id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <span className="font-medium">{u.unidad_codigo}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            desde {new Date(u.fecha_asignacion).toLocaleString('es-GT')}
                          </span>
                        </div>
                        {selectedSituacion.estado === 'ACTIVA' && (
                          <button
                            onClick={() => {
                              if (confirm('Desasignar esta unidad?')) {
                                desasignarMutation.mutate({
                                  situacionId: selectedSituacion.id,
                                  unidadId: u.unidad_id
                                });
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Desasignar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Sin unidades asignadas</p>
                )}
              </div>

              {/* Historial de asignaciones */}
              {asignacionesHistorial.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Historial de Asignaciones</h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {asignacionesHistorial.map((a) => (
                      <div key={a.id} className="p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium">{a.unidad_codigo}</span>
                        <span className="text-gray-500 ml-2">
                          {new Date(a.fecha_hora_asignacion).toLocaleString('es-GT')}
                          {a.fecha_hora_desasignacion && (
                            <> - {new Date(a.fecha_hora_desasignacion).toLocaleString('es-GT')}</>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actualizaciones */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Actualizaciones ({actualizaciones.length})
                </h3>
                {actualizaciones.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {actualizaciones.map((a: ActualizacionSituacion) => (
                      <div key={a.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{a.usuario_nombre}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(a.fecha_hora).toLocaleString('es-GT')}
                          </span>
                        </div>
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                          {a.tipo_actualizacion}
                        </span>
                        {a.contenido && (
                          <p className="mt-2 text-sm text-gray-700">{a.contenido}</p>
                        )}
                        <span className="text-xs text-gray-400">Unidad: {a.unidad_codigo}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Sin actualizaciones</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
