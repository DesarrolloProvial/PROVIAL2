import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ubicacionBrigadasAPI,
  UbicacionBrigada,
  BrigadaParaPrestamo
} from '../services/movimientos.service';
import { geografiaAPI, situacionesAPI } from '../services/api';
import {
  ArrowLeft,
  Users,
  ArrowRightLeft,
  Split,
  UserPlus,
  MapPin,
  RefreshCw,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';

type TabType = 'ubicaciones' | 'prestamos' | 'divisiones';

export default function MovimientosBrigadasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('ubicaciones');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'prestamo' | 'retorno' | 'division' | 'reunion' | 'cambio'>('prestamo');
  const [selectedUnidad, setSelectedUnidad] = useState<number | null>(null);
  const [selectedBrigada, setSelectedBrigada] = useState<UbicacionBrigada | BrigadaParaPrestamo | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    usuario_id: 0,
    unidad_destino_id: 0,
    asignacion_destino_id: 0,
    km: '',
    sentido: 'NORTE_SUR',
    ruta_id: 0,
    motivo: '',
    descripcion: ''
  });

  // Queries
  const { data: ubicaciones = [], isLoading: loadingUbicaciones } = useQuery({
    queryKey: ['ubicaciones-brigadas'],
    queryFn: ubicacionBrigadasAPI.getAll
  });

  const { data: brigadasPrestados = [] } = useQuery({
    queryKey: ['brigadas-prestados'],
    queryFn: ubicacionBrigadasAPI.getBrigadasPrestados
  });

  const { data: brigadasPuntoFijo = [] } = useQuery({
    queryKey: ['brigadas-punto-fijo'],
    queryFn: ubicacionBrigadasAPI.getBrigadasEnPuntoFijo
  });

  const { data: rutas = [] } = useQuery({
    queryKey: ['rutas'],
    queryFn: geografiaAPI.getRutas
  });

  const { data: resumenUnidades = [] } = useQuery({
    queryKey: ['resumen-unidades'],
    queryFn: situacionesAPI.getResumenUnidades
  });

  const { data: brigadasParaPrestamo = [] } = useQuery({
    queryKey: ['brigadas-para-prestamo', selectedUnidad],
    queryFn: () => ubicacionBrigadasAPI.getBrigadasParaPrestamo(selectedUnidad!),
    enabled: !!selectedUnidad && isModalOpen && modalType === 'prestamo'
  });

  // Mutations
  const prestamoMutation = useMutation({
    mutationFn: ubicacionBrigadasAPI.prestarBrigada,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones-brigadas'] });
      queryClient.invalidateQueries({ queryKey: ['brigadas-prestados'] });
      closeModal();
      alert('Brigada prestado exitosamente');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al prestar brigada');
    }
  });

  const retornoMutation = useMutation({
    mutationFn: ubicacionBrigadasAPI.retornarDePrestamo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones-brigadas'] });
      queryClient.invalidateQueries({ queryKey: ['brigadas-prestados'] });
      closeModal();
      alert('Brigada retornado exitosamente');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al retornar brigada');
    }
  });

  const divisionMutation = useMutation({
    mutationFn: ubicacionBrigadasAPI.dividirFuerza,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones-brigadas'] });
      queryClient.invalidateQueries({ queryKey: ['brigadas-punto-fijo'] });
      closeModal();
      alert('Division registrada exitosamente');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al dividir fuerza');
    }
  });

  const reunionMutation = useMutation({
    mutationFn: ubicacionBrigadasAPI.reunirConUnidad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ubicaciones-brigadas'] });
      queryClient.invalidateQueries({ queryKey: ['brigadas-punto-fijo'] });
      closeModal();
      alert('Brigada reunido con unidad');
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || 'Error al reunir brigada');
    }
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBrigada(null);
    setSelectedUnidad(null);
    setFormData({
      usuario_id: 0,
      unidad_destino_id: 0,
      asignacion_destino_id: 0,
      km: '',
      sentido: 'NORTE_SUR',
      ruta_id: 0,
      motivo: '',
      descripcion: ''
    });
  };

  const openPrestamoModal = () => {
    setModalType('prestamo');
    setIsModalOpen(true);
  };

  const openRetornoModal = (brigada: UbicacionBrigada) => {
    setSelectedBrigada(brigada);
    setModalType('retorno');
    setFormData(prev => ({ ...prev, usuario_id: brigada.usuario_id }));
    setIsModalOpen(true);
  };

  const openDivisionModal = () => {
    setModalType('division');
    setIsModalOpen(true);
  };

  const openReunionModal = (brigada: UbicacionBrigada) => {
    setSelectedBrigada(brigada);
    setModalType('reunion');
    setFormData(prev => ({ ...prev, usuario_id: brigada.usuario_id }));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (modalType === 'prestamo') {
      if (!selectedBrigada || !formData.unidad_destino_id || !formData.ruta_id || !formData.km) {
        alert('Complete todos los campos requeridos');
        return;
      }
      // Encontrar la asignacion de la unidad destino
      const unidadDestino = resumenUnidades.find((u: any) => u.unidad_id === formData.unidad_destino_id);
      prestamoMutation.mutate({
        usuario_id: (selectedBrigada as BrigadaParaPrestamo).usuario_id,
        unidad_destino_id: formData.unidad_destino_id,
        asignacion_destino_id: unidadDestino?.asignacion_id || formData.unidad_destino_id,
        km: Number(formData.km),
        ruta_id: formData.ruta_id,
        motivo: formData.motivo
      });
    } else if (modalType === 'retorno') {
      if (!formData.ruta_id || !formData.km) {
        alert('Complete todos los campos requeridos');
        return;
      }
      retornoMutation.mutate({
        usuario_id: formData.usuario_id,
        km: Number(formData.km),
        ruta_id: formData.ruta_id,
        motivo: formData.motivo
      });
    } else if (modalType === 'division') {
      if (!selectedBrigada || !formData.ruta_id || !formData.km || !formData.motivo) {
        alert('Complete todos los campos requeridos');
        return;
      }
      divisionMutation.mutate({
        usuario_id: (selectedBrigada as BrigadaParaPrestamo).usuario_id,
        km: Number(formData.km),
        sentido: formData.sentido,
        ruta_id: formData.ruta_id,
        descripcion: formData.descripcion,
        motivo: formData.motivo
      });
    } else if (modalType === 'reunion') {
      if (!formData.unidad_destino_id || !formData.ruta_id || !formData.km) {
        alert('Complete todos los campos requeridos');
        return;
      }
      const unidadDestino = resumenUnidades.find((u: any) => u.unidad_id === formData.unidad_destino_id);
      reunionMutation.mutate({
        usuario_id: formData.usuario_id,
        unidad_id: formData.unidad_destino_id,
        asignacion_id: unidadDestino?.asignacion_id || formData.unidad_destino_id,
        km: Number(formData.km),
        ruta_id: formData.ruta_id,
        motivo: formData.motivo
      });
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'CON_UNIDAD':
        return 'bg-green-100 text-green-800';
      case 'PRESTADO':
        return 'bg-blue-100 text-blue-800';
      case 'EN_PUNTO_FIJO':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'CON_UNIDAD':
        return 'Con Unidad';
      case 'PRESTADO':
        return 'Prestado';
      case 'EN_PUNTO_FIJO':
        return 'Punto Fijo';
      default:
        return estado;
    }
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
              <h1 className="text-2xl font-bold text-gray-800">Movimientos de Brigadas</h1>
              <p className="text-gray-600">Prestamos, divisiones y cambios de unidad</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openPrestamoModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <ArrowRightLeft className="w-5 h-5" />
              Prestar Brigada
            </button>
            <button
              onClick={openDivisionModal}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Split className="w-5 h-5" />
              Division de Fuerza
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('ubicaciones')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'ubicaciones'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Ubicaciones Activas ({ubicaciones.length})
              </button>
              <button
                onClick={() => setActiveTab('prestamos')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'prestamos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4 inline mr-2" />
                Brigadas Prestados ({brigadasPrestados.length})
              </button>
              <button
                onClick={() => setActiveTab('divisiones')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'divisiones'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <MapPin className="w-4 h-4 inline mr-2" />
                En Punto Fijo ({brigadasPuntoFijo.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'ubicaciones' && (
              <div className="overflow-x-auto">
                {loadingUbicaciones ? (
                  <div className="text-center py-8 text-gray-500">Cargando...</div>
                ) : ubicaciones.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay brigadas con ubicacion activa
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brigada</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad Actual</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unidad Origen</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ubicacion</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Desde</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {ubicaciones.map((u) => (
                        <tr key={u.usuario_id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="font-medium text-gray-900">{u.nombre_completo}</div>
                            <div className="text-sm text-gray-500">@{u.username}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoBadge(u.estado)}`}>
                              {getEstadoLabel(u.estado)}
                            </span>
                          </td>
                          <td className="px-4 py-4 font-medium">
                            {u.unidad_actual_codigo || '-'}
                          </td>
                          <td className="px-4 py-4 text-gray-600">
                            {u.unidad_origen_codigo}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {u.estado === 'EN_PUNTO_FIJO' ? (
                              <div>
                                <div>{u.punto_fijo_ruta_codigo} Km {u.punto_fijo_km}</div>
                                <div className="text-xs">{u.punto_fijo_descripcion}</div>
                              </div>
                            ) : u.situacion_persistente_titulo ? (
                              <div className="text-orange-600">{u.situacion_persistente_titulo}</div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(u.inicio_ubicacion).toLocaleString('es-GT')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {activeTab === 'prestamos' && (
              <div className="space-y-4">
                {brigadasPrestados.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay brigadas prestados actualmente
                  </div>
                ) : (
                  brigadasPrestados.map((b) => (
                    <div key={b.usuario_id} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{b.nombre_completo}</h3>
                          <p className="text-sm text-gray-600">@{b.username}</p>
                          <div className="mt-2 text-sm">
                            <span className="text-gray-500">Origen:</span>{' '}
                            <span className="font-medium">{b.unidad_origen_codigo}</span>
                            <span className="mx-2">→</span>
                            <span className="text-gray-500">Actual:</span>{' '}
                            <span className="font-medium text-blue-600">{b.unidad_actual_codigo}</span>
                          </div>
                          {b.motivo && (
                            <p className="mt-1 text-sm text-gray-500">Motivo: {b.motivo}</p>
                          )}
                        </div>
                        <button
                          onClick={() => openRetornoModal(b)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retornar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'divisiones' && (
              <div className="space-y-4">
                {brigadasPuntoFijo.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No hay brigadas en punto fijo actualmente
                  </div>
                ) : (
                  brigadasPuntoFijo.map((b) => (
                    <div key={b.usuario_id} className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{b.nombre_completo}</h3>
                          <p className="text-sm text-gray-600">@{b.username}</p>
                          <div className="mt-2 text-sm space-y-1">
                            <div>
                              <MapPin className="w-4 h-4 inline mr-1 text-orange-600" />
                              {b.punto_fijo_ruta_codigo} Km {b.punto_fijo_km} - {b.punto_fijo_sentido}
                            </div>
                            {b.punto_fijo_descripcion && (
                              <p className="text-gray-600">{b.punto_fijo_descripcion}</p>
                            )}
                            {b.situacion_persistente_titulo && (
                              <p className="text-orange-700 font-medium">
                                Situacion: {b.situacion_persistente_titulo}
                              </p>
                            )}
                            <p className="text-gray-500">
                              Unidad origen: {b.unidad_origen_codigo}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => openReunionModal(b)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
                        >
                          <UserPlus className="w-4 h-4" />
                          Reunir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {modalType === 'prestamo' && 'Prestar Brigada'}
                  {modalType === 'retorno' && 'Retornar Brigada'}
                  {modalType === 'division' && 'Division de Fuerza'}
                  {modalType === 'reunion' && 'Reunir con Unidad'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Seleccionar unidad origen (para prestamo y division) */}
              {(modalType === 'prestamo' || modalType === 'division') && !selectedBrigada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seleccionar Unidad Origen
                  </label>
                  <select
                    value={selectedUnidad || ''}
                    onChange={(e) => setSelectedUnidad(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">-- Seleccionar unidad --</option>
                    {resumenUnidades
                      .filter((u: any) => u.tripulacion && u.tripulacion.length > 0)
                      .map((u: any) => (
                        <option key={u.unidad_id} value={u.unidad_id}>
                          {u.unidad_codigo} - {u.tipo_unidad}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Seleccionar brigada (para prestamo y division) */}
              {(modalType === 'prestamo' || modalType === 'division') && selectedUnidad && !selectedBrigada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seleccionar Brigada
                  </label>
                  {brigadasParaPrestamo.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay brigadas disponibles en esta unidad</p>
                  ) : (
                    <div className="space-y-2">
                      {brigadasParaPrestamo.map((b) => (
                        <button
                          key={b.usuario_id}
                          type="button"
                          onClick={() => setSelectedBrigada(b)}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50"
                        >
                          <div className="font-medium">{b.nombre_completo}</div>
                          <div className="text-sm text-gray-500">@{b.username}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Info del brigada seleccionado */}
              {selectedBrigada && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <div>
                      <div className="font-medium">{selectedBrigada.nombre_completo}</div>
                      <div className="text-sm text-gray-500">@{selectedBrigada.username}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Unidad destino (para prestamo y reunion) */}
              {(modalType === 'prestamo' || modalType === 'reunion') && selectedBrigada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad Destino
                  </label>
                  <select
                    value={formData.unidad_destino_id}
                    onChange={(e) => setFormData({ ...formData, unidad_destino_id: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">-- Seleccionar unidad --</option>
                    {resumenUnidades
                      .filter((u: any) =>
                        modalType === 'prestamo'
                          ? u.unidad_id !== selectedUnidad
                          : true
                      )
                      .map((u: any) => (
                        <option key={u.unidad_id} value={u.unidad_id}>
                          {u.unidad_codigo} - {u.tipo_unidad}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Ruta */}
              {selectedBrigada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruta
                  </label>
                  <select
                    value={formData.ruta_id}
                    onChange={(e) => setFormData({ ...formData, ruta_id: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">-- Seleccionar ruta --</option>
                    {rutas.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.codigo} - {r.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Kilometro */}
              {selectedBrigada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kilometro
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.km}
                    onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              )}

              {/* Sentido (solo para division) */}
              {modalType === 'division' && selectedBrigada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sentido
                  </label>
                  <select
                    value={formData.sentido}
                    onChange={(e) => setFormData({ ...formData, sentido: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="NORTE_SUR">Norte - Sur</option>
                    <option value="SUR_NORTE">Sur - Norte</option>
                    <option value="ESTE_OESTE">Este - Oeste</option>
                    <option value="OESTE_ESTE">Oeste - Este</option>
                  </select>
                </div>
              )}

              {/* Descripcion (solo para division) */}
              {modalType === 'division' && selectedBrigada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripcion del Punto
                  </label>
                  <input
                    type="text"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Ej: Frente a gasolinera..."
                  />
                </div>
              )}

              {/* Motivo */}
              {selectedBrigada && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo
                  </label>
                  <textarea
                    value={formData.motivo}
                    onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    rows={2}
                    required={modalType === 'prestamo' || modalType === 'division'}
                    placeholder="Ingrese el motivo..."
                  />
                </div>
              )}

              {/* Warning para division */}
              {modalType === 'division' && selectedBrigada && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    El brigada se quedara en este punto fijo y no podra crear situaciones normales.
                    Solo podra agregar informacion a situaciones persistentes.
                  </div>
                </div>
              )}

              {/* Buttons */}
              {selectedBrigada && (
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={prestamoMutation.isPending || retornoMutation.isPending || divisionMutation.isPending || reunionMutation.isPending}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Check className="w-5 h-5" />
                    Confirmar
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
