import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { turnosService, geografiaService } from '../services/turnos.service';
import { asignacionesService } from '../services/asignaciones.service';
import { operacionesService } from '../services/operaciones.service';
import { administracionAPI } from '../services/administracion.service';
import type { TripulacionMiembro, CreateAsignacionDTO } from '../services/turnos.service';
import type { CreateAsignacionProgramadaDTO } from '../services/asignaciones.service';
import type { BrigadaDisponible } from '../services/operaciones.service';
import { AlertCircle, CheckCircle, Users, Truck, ArrowLeft, Plus, X, Search, Crown } from 'lucide-react';

export default function CrearAsignacionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Modo edicion - leer state de navegacion
  const editState = location.state as { editMode?: boolean; asignacion?: any; turnoId?: number } | null;
  const isEditMode = editState?.editMode || false;
  const asignacionEdit = editState?.asignacion;
  // turnoIdEdit disponible si se necesita: editState?.turnoId

  // Estado del formulario
  const [fecha, setFecha] = useState(() => {
    if (asignacionEdit?.fecha) {
      return asignacionEdit.fecha.split('T')[0];
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [esComisionLarga, setEsComisionLarga] = useState(false);
  const [fechaFin, setFechaFin] = useState('');
  const [unidadId, setUnidadId] = useState<number | null>(asignacionEdit?.unidad_id || null);
  const [rutaId, setRutaId] = useState<number | null>(asignacionEdit?.ruta_id || null);
  const [kmInicio, setKmInicio] = useState(asignacionEdit?.km_inicio?.toString() || '');
  const [kmFinal, setKmFinal] = useState(asignacionEdit?.km_final?.toString() || '');
  const [sentido, setSentido] = useState<string>(asignacionEdit?.sentido || '');
  const [acciones, setAcciones] = useState(asignacionEdit?.acciones || '');
  const [horaSalida, setHoraSalida] = useState(asignacionEdit?.hora_salida || '04:30');
  const [horaEntrada, setHoraEntrada] = useState(asignacionEdit?.hora_entrada_estimada || '21:00');
  const [observaciones, setObservaciones] = useState('');
  const [esReaccion, setEsReaccion] = useState(asignacionEdit?.es_reaccion || false);
  const [tipoAsignacion, setTipoAsignacion] = useState<'PATRULLA' | 'GARITA' | 'PUESTO_CONTROL'>(
    asignacionEdit?.tipo_asignacion || 'PATRULLA'
  );

  // Tripulacion - inicializar con tripulacion existente si es modo edicion
  const [tripulacion, setTripulacion] = useState<TripulacionMiembro[]>(() => {
    if (isEditMode && asignacionEdit?.tripulacion) {
      return asignacionEdit.tripulacion.map((t: any) => ({
        usuario_id: t.usuario_id,
        rol_tripulacion: t.rol_tripulacion,
        presente: true,
      }));
    }
    return [];
  });
  const [showBrigadaModal, setShowBrigadaModal] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE' | null>(null);
  const [busquedaBrigada, setBusquedaBrigada] = useState('');

  // Queries
  const { data: brigadas = [], isLoading: loadingBrigadas } = useQuery({
    queryKey: ['brigadas-disponibles', fecha],
    queryFn: () => operacionesService.getBrigadasDisponibles(fecha),
    enabled: !!fecha,
  });

  const { data: unidades = [], isLoading: loadingUnidades } = useQuery({
    queryKey: ['unidades-disponibles', fecha],
    queryFn: () => operacionesService.getUnidadesDisponibles(fecha),
    enabled: !!fecha,
  });

  const { data: rutas = [] } = useQuery({
    queryKey: ['rutas'],
    queryFn: () => geografiaService.getRutas(),
  });

  // Configuración de Sede
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const sedeId = user?.sede_id || user?.sede;

  const { data: sedeConfig } = useQuery({
    queryKey: ['sede-config', sedeId],
    queryFn: () => administracionAPI.getSedeConfig(sedeId),
    enabled: !!sedeId,
  });

  // Efecto para Memoria de Ruta y Continuidad de Kilometraje + Tripulación
  useEffect(() => {
    async function checkLastAssignment() {
      if (!unidadId || isEditMode || tipoAsignacion !== 'PATRULLA') return;

      try {
        const result = await turnosService.getUltimaAsignacion(unidadId);
        if (result && result.asignacion) {
          const { asignacion, tripulacion: lastTripulacion } = result;

          // Memoria de Ruta
          if (asignacion.ruta_id && !rutaId) {
            setRutaId(asignacion.ruta_id);
          }

          // Continuidad de Kilometraje
          if (asignacion.km_final) {
            setKmInicio(asignacion.km_final.toString());
          }

          // Memoria de Tripulación (Si la config lo permite o por defecto)
          // Solo si la tripulación actual está vacía
          if (lastTripulacion && lastTripulacion.length > 0 && tripulacion.length === 0) {
            const newTripulacion = lastTripulacion.map(m => ({
              usuario_id: m.usuario_id,
              rol_tripulacion: m.rol_tripulacion,
              presente: true // Default to present
            }));
            setTripulacion(newTripulacion);
          }
        }
      } catch (error) {
        console.warn("Could not fetch last assignment for auto-fill", error);
      }
    }

    checkLastAssignment();
  }, [unidadId, isEditMode, tipoAsignacion]);


  // Mutation para crear asignacion programada
  const crearAsignacionMutation = useMutation({
    mutationFn: async (asignacion: CreateAsignacionProgramadaDTO) => {
      return asignacionesService.crearAsignacionProgramada(asignacion);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turno-hoy'] });
      queryClient.invalidateQueries({ queryKey: ['brigadas-disponibles'] });
      queryClient.invalidateQueries({ queryKey: ['unidades-disponibles'] });
      alert('Asignacion creada exitosamente');
      navigate('/operaciones');
    },
    onError: (error: any) => {
      alert(`Error al crear asignacion: ${error.response?.data?.error || error.message}`);
    },
  });

  // Mutation para actualizar asignacion
  const actualizarAsignacionMutation = useMutation({
    mutationFn: async (data: { asignacionId: number; asignacion: any }) => {
      return turnosService.updateAsignacion(data.asignacionId, data.asignacion);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['turno-hoy'] });
      queryClient.invalidateQueries({ queryKey: ['brigadas-disponibles'] });
      queryClient.invalidateQueries({ queryKey: ['unidades-disponibles'] });
      alert('Asignacion actualizada exitosamente');
      navigate('/operaciones');
    },
    onError: (error: any) => {
      alert(`Error al actualizar asignacion: ${error.response?.data?.error || error.message}`);
    },
  });

  // Handlers
  // Filtrar brigadas por búsqueda
  const brigadasFiltradas = brigadas.filter((brigada) => {
    if (!busquedaBrigada.trim()) return true;
    const termino = busquedaBrigada.toLowerCase().trim();
    return (
      brigada.nombre_completo.toLowerCase().includes(termino) ||
      brigada.chapa.toLowerCase().includes(termino) ||
      (brigada.telefono && brigada.telefono.includes(termino))
    );
  });

  const agregarTripulante = (brigada: BrigadaDisponible, rol: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE') => {
    if (tripulacion.some(t => t.usuario_id === brigada.id)) {
      alert('Esta brigada ya esta asignada a este turno');
      return;
    }

    if (rol !== 'ACOMPAÑANTE' && tripulacion.some(t => t.rol_tripulacion === rol)) {
      alert(`Ya hay un ${rol} asignado`);
      return;
    }

    setTripulacion([
      ...tripulacion,
      {
        usuario_id: brigada.id,
        rol_tripulacion: rol,
        telefono_contacto: brigada.telefono || undefined,
        presente: true,
      },
    ]);
    setShowBrigadaModal(false);
    setRolSeleccionado(null);
    setBusquedaBrigada('');
  };

  const cerrarModalBrigada = () => {
    setShowBrigadaModal(false);
    setRolSeleccionado(null);
    setBusquedaBrigada('');
  };

  const removerTripulante = (usuarioId: number) => {
    setTripulacion(tripulacion.filter(t => t.usuario_id !== usuarioId));
  };

  const toggleComandante = (usuarioId: number) => {
    setTripulacion(tripulacion.map(t => ({
      ...t,
      es_comandante: t.usuario_id === usuarioId ? !t.es_comandante : false
    })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (tipoAsignacion === 'PATRULLA' && !unidadId) {
      alert('Debe seleccionar una unidad');
      return;
    }

    // Validacion de ruta solo si no es reaccion y es patrulla
    if (tipoAsignacion === 'PATRULLA' && !esReaccion && !rutaId) {
      alert('Debe seleccionar una ruta');
      return;
    }

    const requiresTripulacion = sedeConfig?.requiere_tripulacion !== false;

    if (requiresTripulacion && tripulacion.length === 0) {
      alert('Debe asignar al menos un tripulante. (Configurado por Sede)');
      return;
    }

    if (requiresTripulacion && !tripulacion.some(t => t.es_comandante)) {
      alert('Debe designar un comandante para la unidad. El comandante es responsable de aprobar la inspeccion 360 del vehiculo.');
      return;
    }

    // Encontrar el comandante
    const comandante = tripulacion.find(t => t.es_comandante);
    if (!comandante) {
      alert('Debe designar un comandante para la unidad.');
      return;
    }

    if (isEditMode && asignacionEdit?.id) {
      // Modo edicion - usar sistema de turnos (mantener compatibilidad)
      const asignacionData: CreateAsignacionDTO = {
        tipo_asignacion: tipoAsignacion,
        unidad_id: tipoAsignacion === 'PATRULLA' ? unidadId : null,
        ruta_id: (tipoAsignacion === 'PATRULLA' && !esReaccion) ? rutaId : null,
        km_inicio: (tipoAsignacion === 'PATRULLA' && kmInicio) ? parseFloat(kmInicio) : undefined,
        km_final: (tipoAsignacion === 'PATRULLA' && kmFinal) ? parseFloat(kmFinal) : undefined,
        sentido: (sentido as any) || undefined,
        acciones: acciones || undefined,
        hora_salida: horaSalida || undefined,
        hora_entrada_estimada: horaEntrada || undefined,
        tripulacion,
        es_reaccion: esReaccion
      };

      actualizarAsignacionMutation.mutate({
        asignacionId: asignacionEdit.id,
        asignacion: asignacionData,
      });
    } else {
      // Modo creacion - usar sistema de asignaciones programadas
      const asignacionData: CreateAsignacionProgramadaDTO = {
        unidad_id: unidadId!,
        fecha_programada: fecha,
        ruta_id: (tipoAsignacion === 'PATRULLA' && !esReaccion) ? rutaId : null,
        recorrido_inicio_km: (tipoAsignacion === 'PATRULLA' && kmInicio) ? parseFloat(kmInicio) : undefined,
        recorrido_fin_km: (tipoAsignacion === 'PATRULLA' && kmFinal) ? parseFloat(kmFinal) : undefined,
        actividades_especificas: acciones || undefined,
        comandante_usuario_id: comandante.usuario_id,
        tripulacion: tripulacion.map(t => ({
          usuario_id: t.usuario_id,
          rol_tripulacion: t.rol_tripulacion,
          telefono_contacto: t.telefono_contacto,
          presente: t.presente,
          observaciones: t.observaciones,
        })),
      };

      crearAsignacionMutation.mutate(asignacionData);
    }
  };

  const getBrigadaNombre = (usuarioId: number) => {
    return brigadas.find(b => b.id === usuarioId)?.nombre_completo || 'Desconocido';
  };

  const getBrigadaChapa = (usuarioId: number) => {
    return brigadas.find(b => b.id === usuarioId)?.chapa || '';
  };

  const formatRutaNombre = (ruta: { codigo: string; nombre: string }) => {
    if (ruta.codigo === ruta.nombre) return ruta.nombre;
    if (ruta.nombre.includes(ruta.codigo)) return ruta.nombre;
    return `${ruta.codigo} - ${ruta.nombre}`;
  };

  // getUnidadSeleccionada disponible si se necesita: unidades.find(u => u.id === unidadId)

  return (
    <div className="page-container">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="page-header flex items-center gap-4">
          <button
            onClick={() => navigate('/operaciones')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <div>
            <h1 className="page-title">{isEditMode ? 'Editar Asignacion' : 'Nueva Asignacion'}</h1>
            <p className="page-subtitle">
              {isEditMode
                ? `Editando asignacion de unidad ${asignacionEdit?.unidad_codigo || ''}`
                : 'Asignar unidad y tripulacion para un turno'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fecha */}
          <div className="card">
            <div className="card-body">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Fecha del Turno</h2>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="label">Fecha de Salida *</label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={esComisionLarga}
                    onChange={(e) => {
                      setEsComisionLarga(e.target.checked);
                      if (!e.target.checked) setFechaFin('');
                    }}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700 font-medium">Comision larga (varios dias)</span>
                </label>

                {esComisionLarga && (
                  <div>
                    <label className="label">Fecha de Regreso</label>
                    <input
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                      min={fecha}
                      className="input-field"
                    />
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                La asignacion se crea hoy y la unidad sale en la fecha indicada.
              </p>
            </div>
          </div>

          {/* Tipo de Asignacion - Solo mostrar si no se esta editando (aunque podria permitirse cambiar) */}
          <div className="card">
            <div className="card-body">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Tipo de Asignación</h2>
              <div className="flex flex-wrap gap-4">
                {['PATRULLA', 'GARITA', 'PUESTO_CONTROL'].map((tipo) => (
                  <label key={tipo} className={`cursor-pointer flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${tipoAsignacion === tipo
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input
                      type="radio"
                      name="tipoAsignacion"
                      value={tipo}
                      checked={tipoAsignacion === tipo}
                      onChange={() => setTipoAsignacion(tipo as any)}
                      className="text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="font-medium text-gray-900">
                      {tipo === 'PATRULLA' && 'Patrulla (Unidad Móvil)'}
                      {tipo === 'GARITA' && 'Garita (Sin Unidad)'}
                      {tipo === 'PUESTO_CONTROL' && 'Puesto de Control'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Seleccion de Unidad (Solo si es Patrulla) */}
          {tipoAsignacion === 'PATRULLA' && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-2 mb-4">
                  <Truck className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">Unidad *</h2>
                </div>

                {loadingUnidades ? (
                  <p className="text-gray-600">Cargando unidades...</p>
                ) : unidades.length === 0 ? (
                  <p className="text-gray-600">No hay unidades disponibles para esta fecha</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {unidades.map((unidad) => (
                      <label
                        key={unidad.id}
                        className={`selection-card flex items-start gap-3 ${unidadId === unidad.id
                          ? 'selection-card-selected'
                          : 'selection-card-default'
                          }`}
                      >
                        <input
                          type="radio"
                          name="unidad"
                          value={unidad.id}
                          checked={unidadId === unidad.id}
                          onChange={() => setUnidadId(unidad.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{unidad.codigo}</span>
                            <span className="text-gray-700 text-sm">
                              {unidad.marca} {unidad.modelo}
                            </span>
                            {unidad.disponible ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{unidad.mensaje}</p>
                          <div className="flex gap-4 mt-2 text-xs text-gray-500">
                            <span>Odometro: {unidad.odometro_actual?.toLocaleString()} km</span>
                            <span>Turnos mes: {unidad.turnos_ultimo_mes}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detalles de Ruta / Ubicacion */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  {tipoAsignacion === 'PATRULLA' ? 'Detalles de Ruta' : 'Detalles de Ubicación'}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Checkbox de Reaccion (Solo Patrulla) */}
                {tipoAsignacion === 'PATRULLA' && (
                  <div className="md:col-span-2 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={esReaccion}
                        onChange={(e) => setEsReaccion(e.target.checked)}
                        className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="font-bold text-gray-900 border-b-2 border-red-500 pb-0.5">
                        ¿Es Unidad de Reacción?
                      </span>
                    </label>
                    <p className="text-sm text-gray-500 mt-1 ml-7">
                      Si se marca, la unidad no tendrá ruta asignada y deberá seleccionarla al momento de salir.
                      Reemplazará a cualquier otra unidad de reacción activa del turno.
                    </p>
                  </div>
                )}

                {/* Ruta y Sentido (Solo Patrulla && !Reaccion) */}
                {tipoAsignacion === 'PATRULLA' && !esReaccion && (
                  <>
                    <div>
                      <label className="label">Ruta *</label>
                      <select
                        value={rutaId || ''}
                        onChange={(e) => setRutaId(e.target.value ? parseInt(e.target.value) : null)}
                        className="select-field"
                        required={!esReaccion}
                      >
                        <option value="">Seleccionar ruta</option>
                        {rutas.map((ruta) => (
                          <option key={ruta.id} value={ruta.id}>
                            {formatRutaNombre(ruta)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">Sentido</label>
                      <select
                        value={sentido}
                        onChange={(e) => setSentido(e.target.value)}
                        className="select-field"
                      >
                        <option value="">Seleccionar sentido</option>
                        <option value="NORTE">Norte</option>
                        <option value="SUR">Sur</option>
                        <option value="ORIENTE">Oriente</option>
                        <option value="OCCIDENTE">Occidente</option>
                      </select>
                    </div>

                    <div>
                      <label className="label">KM Inicio</label>
                      <input
                        type="number"
                        step="0.1"
                        value={kmInicio}
                        onChange={(e) => setKmInicio(e.target.value)}
                        placeholder="0.0"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="label">KM Final</label>
                      <input
                        type="number"
                        step="0.1"
                        value={kmFinal}
                        onChange={(e) => setKmFinal(e.target.value)}
                        placeholder="0.0"
                        className="input-field"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <label className="label">
                    {tipoAsignacion === 'PATRULLA' ? 'Acciones a realizar' : 'Ubicación / Novedades Iniciales'}
                  </label>
                  <textarea
                    value={acciones}
                    onChange={(e) => setAcciones(e.target.value)}
                    placeholder={tipoAsignacion === 'PATRULLA' ? "Descripcion de las acciones..." : "Ubicación detallada o instrucciones..."}
                    rows={3}
                    className="textarea-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Horarios */}
          <div className="card">
            <div className="card-body">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Horarios</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Hora de Salida</label>
                  <input
                    type="time"
                    value={horaSalida}
                    onChange={(e) => setHoraSalida(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="label">Hora de Entrada Estimada</label>
                  <input
                    type="time"
                    value={horaEntrada}
                    onChange={(e) => setHoraEntrada(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tripulacion */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-gray-900">
                    Tripulacion {sedeConfig?.requiere_tripulacion !== false ? '*' : <span className="text-sm font-normal text-gray-500 ml-2">(Opcional)</span>}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRolSeleccionado('PILOTO');
                    setShowBrigadaModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                  disabled={
                    // Solo motos tienen restricción de 2 tripulantes (piloto + acompañante)
                    unidades.find(u => u.id === unidadId)?.tipo_unidad === 'MOTO' && tripulacion.length >= 2
                  }
                >
                  <Plus className="h-4 w-4" />
                  Agregar Tripulante
                </button>
              </div>

              {tripulacion.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No hay tripulantes asignados</p>
                  <p className="text-sm text-gray-500">Agregue al menos un piloto</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tripulacion.map((miembro) => (
                    <div
                      key={miembro.usuario_id}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${miembro.es_comandante
                        ? 'bg-amber-50 border-amber-400'
                        : 'bg-gray-50 border-gray-200'
                        }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`badge ${miembro.rol_tripulacion === 'PILOTO' ? 'badge-blue' :
                            miembro.rol_tripulacion === 'COPILOTO' ? 'badge-teal' : 'badge-yellow'
                            }`}>
                            {miembro.rol_tripulacion}
                          </span>
                          {miembro.es_comandante && (
                            <span className="badge bg-amber-500 text-white flex items-center gap-1">
                              <Crown className="h-3 w-3" />
                              COMANDANTE
                            </span>
                          )}
                          <span className="font-bold text-gray-900">
                            {getBrigadaNombre(miembro.usuario_id)}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({getBrigadaChapa(miembro.usuario_id)})
                          </span>
                        </div>
                        {miembro.telefono_contacto && (
                          <p className="text-sm text-gray-600 mt-1">
                            Tel: {miembro.telefono_contacto}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleComandante(miembro.usuario_id)}
                          className={`p-2 rounded-lg transition-colors ${miembro.es_comandante
                            ? 'text-amber-600 bg-amber-100 hover:bg-amber-200'
                            : 'text-gray-500 hover:bg-gray-200'
                            }`}
                          title={miembro.es_comandante ? 'Quitar comandante' : 'Designar como comandante'}
                        >
                          <Crown className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removerTripulante(miembro.usuario_id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div className="card">
            <div className="card-body">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Observaciones</h2>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones del turno..."
                rows={4}
                className="textarea-field"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={() => navigate('/operaciones')}
              className="btn-outline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={crearAsignacionMutation.isPending || actualizarAsignacionMutation.isPending}
              className="btn-primary"
            >
              {crearAsignacionMutation.isPending || actualizarAsignacionMutation.isPending
                ? (isEditMode ? 'Guardando...' : 'Creando...')
                : (isEditMode ? 'Guardar Cambios' : 'Crear Asignacion')}
            </button>
          </div>
        </form>
      </div>

      {/* Modal para seleccionar brigada */}
      {showBrigadaModal && (
        <div className="modal-overlay">
          <div className="modal-content flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3 className="text-lg font-bold text-gray-900">
                Seleccionar {rolSeleccionado}
              </h3>
              <button
                onClick={cerrarModalBrigada}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5 text-gray-700" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 space-y-3">
              {/* Buscador */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={busquedaBrigada}
                  onChange={(e) => setBusquedaBrigada(e.target.value)}
                  placeholder="Buscar por nombre, chapa o telefono..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                {busquedaBrigada && (
                  <button
                    onClick={() => setBusquedaBrigada('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Selector de rol */}
              <div className="flex gap-2">
                {(['PILOTO', 'COPILOTO', 'ACOMPAÑANTE'] as const).map((rol) => (
                  <button
                    key={rol}
                    onClick={() => setRolSeleccionado(rol)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${rolSeleccionado === rol
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    disabled={rol !== 'ACOMPAÑANTE' && tripulacion.some(t => t.rol_tripulacion === rol)}
                  >
                    {rol}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-body flex-1 overflow-y-auto">
              {loadingBrigadas ? (
                <p className="text-center text-gray-600 py-8">Cargando brigadas...</p>
              ) : brigadasFiltradas.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    {busquedaBrigada ? 'No se encontraron brigadas con ese criterio' : 'No hay brigadas disponibles'}
                  </p>
                  {busquedaBrigada && (
                    <button
                      onClick={() => setBusquedaBrigada('')}
                      className="mt-2 text-blue-600 hover:underline text-sm"
                    >
                      Limpiar busqueda
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {brigadasFiltradas.map((brigada) => {
                    const yaAsignado = tripulacion.some(t => t.usuario_id === brigada.id);
                    return (
                      <button
                        key={brigada.id}
                        type="button"
                        onClick={() => rolSeleccionado && agregarTripulante(brigada, rolSeleccionado)}
                        disabled={yaAsignado}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${yaAsignado
                          ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                          : brigada.disponible
                            ? 'hover:border-blue-500 hover:bg-blue-50 border-gray-200 bg-white'
                            : 'hover:border-amber-500 hover:bg-amber-50 border-gray-200 bg-white'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{brigada.nombre_completo}</span>
                          <span className="text-sm text-gray-500">({brigada.chapa})</span>
                          {brigada.disponible ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                          {yaAsignado && (
                            <span className="badge badge-gray ml-auto">Ya asignado</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{brigada.mensaje}</p>
                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                          {brigada.telefono && <span>Tel: {brigada.telefono}</span>}
                          <span>Turnos mes: {brigada.turnos_ultimo_mes}</span>
                          {brigada.rol_tripulacion_frecuente && (
                            <span>Rol frecuente: {brigada.rol_tripulacion_frecuente}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
