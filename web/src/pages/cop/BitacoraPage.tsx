import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { situacionesAPI, api } from '../../services/api';
import { ArrowLeft, RefreshCw, MapPin, Users, Truck, Clock, Plus, Activity, LogIn, LogOut } from 'lucide-react';
import Inspeccion360Historial from '../../components/transportes/Inspeccion360Historial';
import CrearSituacionModal from '../../components/cop/forms/CrearSituacionModal';
import CrearActividadModal from '../../components/cop/forms/CrearActividadModal';
import SalidaCOPModal from '../../components/cop/forms/SalidaCOPModal';
import ThemeToggle from '../../components/common/ThemeToggle';

// Colores por tipo de registro / tipo de situación
const TIPO_REGISTRO_STYLE: Record<string, { dot: string; border: string; bg: string; badge: string }> = {
    INCIDENTE:   { dot: 'bg-red-500',    border: 'border-red-200 dark:border-red-800',       bg: 'bg-red-50 dark:bg-red-900/20',       badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    ASISTENCIA:  { dot: 'bg-amber-500',  border: 'border-amber-200 dark:border-amber-800',   bg: 'bg-amber-50 dark:bg-amber-900/20',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
    EMERGENCIA:  { dot: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800', bg: 'bg-orange-50 dark:bg-orange-900/20', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
    ACTIVIDAD:   { dot: 'bg-blue-500',   border: 'border-blue-200 dark:border-blue-800',     bg: 'bg-blue-50 dark:bg-blue-900/20',     badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
    SALIDA:      { dot: 'bg-emerald-500',border: 'border-emerald-200 dark:border-emerald-800',bg: 'bg-emerald-50 dark:bg-emerald-900/20',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
    OTROS:       { dot: 'bg-gray-400',   border: 'border-gray-200 dark:border-gray-600',     bg: 'bg-gray-50 dark:bg-gray-700/50',     badge: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
};

// Etiquetas legibles por tipo_situacion — INCIDENTE → 'Hecho de tránsito'
const TIPO_LABEL: Record<string, string> = {
    HECHO_TRANSITO:       'Hecho de tránsito',
    INCIDENTE:            'Hecho de tránsito',
    ASISTENCIA_VEHICULAR: 'Asistencia vial',
    ASISTENCIA:           'Asistencia vial',
    EMERGENCIA:           'Emergencia vial',
    PATRULLAJE:           'Patrullaje',
    REGULACION_TRAFICO:   'Regulación de tráfico',
    PARADA_ESTRATEGICA:   'Parada estratégica',
    COMIDA:               'Descanso / Comida',
    DESCANSO:             'Descanso / Comida',
    SALIDA_SEDE:          'Salida de sede',
    CAMBIO_RUTA:          'Cambio de ruta',
    OTROS:                'Otros',
};

// Campos del resumen de tarjeta según tipo (fuente de verdad: docs/vault/MATRIZ_CAMPOS.md)
interface CamposCardConfig {
    showUbicacion: boolean;       // área, municipio/depto
    showCondBasicas: boolean;     // clima, carga_vehicular, tipo_pavimento
    showCondDetalle: boolean;     // iluminacion, visibilidad
    showCausas: boolean;          // causa_probable
    showVictimas: boolean;        // resumen heridos/fallecidos
}

function getCamposCard(tipoSituacion: string, tipoRegistro: string): CamposCardConfig {
    if (tipoRegistro === 'ACTIVIDAD') {
        return { showUbicacion: false, showCondBasicas: true, showCondDetalle: false, showCausas: false, showVictimas: false };
    }
    switch (tipoSituacion) {
        case 'INCIDENTE':
        case 'HECHO_TRANSITO':
            return { showUbicacion: true, showCondBasicas: true, showCondDetalle: true, showCausas: true, showVictimas: true };
        case 'ASISTENCIA_VEHICULAR':
        case 'ASISTENCIA':
            return { showUbicacion: true, showCondBasicas: true, showCondDetalle: false, showCausas: false, showVictimas: false };
        case 'EMERGENCIA':
            return { showUbicacion: true, showCondBasicas: true, showCondDetalle: false, showCausas: false, showVictimas: false };
        default:
            // PATRULLAJE, REGULACION_TRAFICO, COMIDA, DESCANSO, OTROS, etc.
            return { showUbicacion: false, showCondBasicas: true, showCondDetalle: false, showCausas: false, showVictimas: false };
    }
}

interface Tripulante {
    brigada_id?: number;
    usuario_id?: number;
    // BD usa: nombre + rol (función iniciar_salida_unidad)
    nombre?: string;
    rol?: string;
    chapa?: string;
    // Compat con formato antiguo
    nombre_completo?: string;
    rol_tripulacion?: string;
}

// observaciones puede ser string (legacy) o JSONB array [{hora,mensaje,usuario}]
const extractObservaciones = (obs: any): string | null => {
    if (!obs) return null;
    if (typeof obs === 'string') return obs;
    if (Array.isArray(obs) && obs.length > 0) return obs[obs.length - 1]?.mensaje ?? null;
    return null;
};

export default function BitacoraPage() {
    const { unidadId } = useParams<{ unidadId: string }>();
    const navigate = useNavigate();
    const [limit, setLimit] = useState(50);

    // Estado para info de unidad
    const [unidadInfo, setUnidadInfo] = useState<any>(null);

    // Modal states
    const [showCrearSituacionModal, setShowCrearSituacionModal] = useState(false);
    const [showCrearActividadModal, setShowCrearActividadModal] = useState(false);
    const [editSituacionId, setEditSituacionId] = useState<number | undefined>(undefined);
    const [editActividadId, setEditActividadId] = useState<number | undefined>(undefined);
    const [showSalidaModal, setShowSalidaModal] = useState(false);
    const [salidaMode, setSalidaMode] = useState<'iniciar' | 'finalizar'>('iniciar');



    // Query independiente: salida activa de la unidad (no depende de bitácora)
    const { data: salidaActivaData, refetch: refetchSalidaActiva } = useQuery({
        queryKey: ['salida-activa-unidad', unidadId],
        queryFn: () => api.get(`/salidas/historial/${unidadId}?limit=1`).then(r => {
            const items = r.data?.historial || [];
            return items.find((s: any) => s.estado === 'EN_SALIDA') || null;
        }),
        enabled: !!unidadId,
        staleTime: 10000,
    });

    // Query de bitácora (debe ir antes de los useEffects que lo usan)
    const { data: bitacora = [], isLoading, refetch: refetchBitacora, isRefetching, error, isError } = useQuery({
        queryKey: ['bitacora-unidad', unidadId, limit],
        queryFn: () => situacionesAPI.getBitacora(Number(unidadId), { limit }),
        enabled: !!unidadId,
    });

    const refetch = () => { refetchBitacora(); refetchSalidaActiva(); };

    // Obtener info de la unidad (puede fallar para COP, usa fallback de bitácora)
    useEffect(() => {
        if (unidadId) {
            api.get(`/unidades/${unidadId}`).then(res => {
                setUnidadInfo(res.data.unidad || res.data);
            }).catch(() => {
                // Si falla (403 para COP), usar datos de la bitácora como fallback
            });
        }
    }, [unidadId]);

    // Fallback: obtener info de unidad desde la bitácora si no se cargó
    useEffect(() => {
        if (!unidadInfo && bitacora.length > 0) {
            const primera = bitacora[0];
            if (primera.unidad_codigo) {
                setUnidadInfo({
                    codigo: primera.unidad_codigo,
                    tipo_unidad: primera.tipo_unidad,
                    placa: '', // No disponible en bitácora
                });
            }
        }
    }, [bitacora, unidadInfo]);

    // Open modal to edit/view entry
    const handleEditClick = (item: any) => {
        if (item.tipo_registro === 'SITUACION') {
            setEditSituacionId(item.id);
            setEditActividadId(undefined);
            setShowCrearSituacionModal(true);
        } else if (item.tipo_registro === 'ACTIVIDAD') {
            setEditActividadId(item.id);
            setEditSituacionId(undefined);
            setShowCrearActividadModal(true);
        }
    };

    // unidadesForModal defined below, after salidaActual



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-GT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatDateShort = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-GT', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Si draft_created_at difiere del created_at en más de 5 minutos, muestra ambos
    const renderTimestamp = (item: any) => {
        if (!item.draft_created_at) return formatDate(item.created_at);
        const draft = new Date(item.draft_created_at).getTime();
        const created = new Date(item.created_at).getTime();
        if (Math.abs(draft - created) < 5 * 60 * 1000) return formatDate(item.created_at);
        return (
            <span className="flex flex-col items-end text-xs leading-tight">
                <span className="font-medium">Reportado: {formatDateShort(item.draft_created_at)}</span>
                <span className="text-gray-400 dark:text-gray-500">Subido: {formatDateShort(item.created_at)}</span>
            </span>
        );
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('es-GT', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRegistroStyle = (item: any) => {
        if (item.tipo_registro === 'ACTIVIDAD') return TIPO_REGISTRO_STYLE.ACTIVIDAD;
        if (item.tipo_registro === 'SALIDA') return TIPO_REGISTRO_STYLE.SALIDA;
        const tipo = item.tipo_situacion;
        if (tipo === 'ASISTENCIA_VEHICULAR') return TIPO_REGISTRO_STYLE.ASISTENCIA;
        if (tipo === 'EMERGENCIA') return TIPO_REGISTRO_STYLE.EMERGENCIA;
        if (tipo === 'INCIDENTE' || tipo === 'HECHO_TRANSITO') return TIPO_REGISTRO_STYLE.INCIDENTE;
        return TIPO_REGISTRO_STYLE.OTROS;
    };

    if (!unidadId) return <div>Error: No se especificó unidad</div>;

    // Salida activa: usa query independiente como fuente primaria, bitácora como fallback
    const salidaActual: any =
        salidaActivaData ||
        bitacora.find((item: any) => item.tipo_registro === 'SALIDA' && item.estado === 'EN_SALIDA') ||
        null;

    // Unidades for modals — defined here so salidaActual is available
    // salidaActual.ruta_codigo viene del JOIN en historial; salida_ruta_codigo viene de la bitácora
    const unidadesForModal = unidadInfo ? [{
        unidad_id: Number(unidadId),
        unidad_codigo: unidadInfo.codigo || unidadId,
        sede_nombre: unidadInfo.sede_nombre || '',
        ruta_activa_codigo: salidaActual?.ruta_codigo || salidaActual?.salida_ruta_codigo || null,
    }] : [];

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition text-gray-600 dark:text-gray-400"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                                    Bitácora - Unidad {unidadInfo?.codigo || unidadId}
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                    {unidadInfo?.tipo_unidad} | {unidadInfo?.placa}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!salidaActual ? (
                                <button
                                    onClick={() => { setSalidaMode('iniciar'); setShowSalidaModal(true); }}
                                    className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5 text-sm font-medium"
                                >
                                    <LogIn className="w-4 h-4" />
                                    Iniciar Jornada
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setSalidaMode('finalizar'); setShowSalidaModal(true); }}
                                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-1.5 text-sm font-medium"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Finalizar Jornada
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setEditSituacionId(undefined);
                                    setShowCrearSituacionModal(true);
                                }}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-1.5 text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Situación
                            </button>
                            <button
                                onClick={() => {
                                    setEditActividadId(undefined);
                                    setShowCrearActividadModal(true);
                                }}
                                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-1.5 text-sm"
                            >
                                <Activity className="w-4 h-4" />
                                Actividad
                            </button>

                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                            >
                                <option value={20}>Últimos 20</option>
                                <option value={50}>Últimos 50</option>
                                <option value={100}>Últimos 100</option>
                            </select>

                            <ThemeToggle />

                            <button
                                onClick={() => refetch()}
                                disabled={isRefetching}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            >
                                <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Info de Salida Activa */}
                    {salidaActual?.salida_id && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-blue-900 dark:text-blue-300">Salida Activa</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600 dark:text-blue-400">Hora salida:</span>
                                    <p className="font-medium dark:text-gray-200">{formatTime(salidaActual.fecha_hora_salida)}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600 dark:text-blue-400">Ruta inicial:</span>
                                    <p className="font-medium dark:text-gray-200">{salidaActual.salida_ruta_codigo || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600 dark:text-blue-400">Km inicial:</span>
                                    <p className="font-medium dark:text-gray-200">{salidaActual.salida_km_inicial || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600 dark:text-blue-400">Combustible inicial:</span>
                                    <p className="font-medium dark:text-gray-200">{salidaActual.salida_combustible_inicial ? `${salidaActual.salida_combustible_inicial}%` : '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tripulación */}
                    {salidaActual?.tripulacion && salidaActual.tripulacion.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                                <span className="font-semibold text-green-900 dark:text-green-300">Tripulación</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {salidaActual.tripulacion.map((t: Tripulante, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-700">
                                        <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">
                                            {t.rol || t.rol_tripulacion || 'TRIPULANTE'}:
                                        </span>
                                        <span className="text-sm text-gray-800 dark:text-gray-200">
                                            {t.nombre || t.nombre_completo || 'Sin nombre'}
                                        </span>
                                        {(t.chapa) && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400">[{t.chapa}]</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inspecciones 360 */}
                    <Inspeccion360Historial unidadId={Number(unidadId)} dias={30} />
                </div>

                {/* Timeline de Situaciones */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Historial de Actividad</h2>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            Cargando historial...
                        </div>
                    ) : isError ? (
                        <div className="text-center py-12 text-red-500 dark:text-red-400">
                            Error al cargar bitácora: {(error as any)?.message || 'Error desconocido'}
                        </div>
                    ) : bitacora.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            No hay registros en la bitácora para esta unidad.
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-4 space-y-6">
                            {bitacora.map((item: any) => {
                                const style = getRegistroStyle(item);
                                const isSalida = item.tipo_registro === 'SALIDA';
                                const isActividad = item.tipo_registro === 'ACTIVIDAD';

                                return (
                                <div key={`${item.tipo_registro}-${item.id}`} className="relative pl-8">
                                    {/* Dot */}
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                                        item.estado === 'ACTIVA' || item.estado === 'EN_SALIDA' ? style.dot : 'bg-gray-400'
                                    }`}></div>

                                    {/* Content Card */}
                                    <div
                                        className={`rounded-lg p-4 border ${!isSalida ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow ${
                                            item.estado === 'ACTIVA' || item.estado === 'EN_SALIDA'
                                                ? `${style.bg} ${style.border}`
                                                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                        }`}
                                        onClick={() => !isSalida && handleEditClick(item)}
                                    >
                                        {/* Header: título macro + subtipo + estado + timestamp */}
                                        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                                                        item.color ? '' : style.badge
                                                    }`} style={item.color ? { backgroundColor: `${item.color}20`, color: item.color } : undefined}>
                                                        {isSalida
                                                            ? 'Jornada'
                                                            : isActividad
                                                            ? 'Actividad'
                                                            : TIPO_LABEL[item.tipo_situacion] || item.tipo_situacion?.replace(/_/g, ' ') || 'Sin tipo'}
                                                    </span>
                                                    {(item.estado === 'ACTIVA' || item.estado === 'EN_SALIDA') && (
                                                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full font-medium">
                                                            {item.estado === 'EN_SALIDA' ? 'EN CURSO' : 'ACTIVA'}
                                                        </span>
                                                    )}
                                                    {!isSalida && (
                                                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                                                            #{item.id}
                                                        </span>
                                                    )}
                                                </div>
                                                {/* Subtipo en pequeño bajo el badge */}
                                                {(item.subtipo_nombre || item.tipo_nombre) && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                                        {item.subtipo_nombre || item.tipo_nombre}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                {renderTimestamp(item)}
                                            </div>
                                        </div>

                                        {/* Contenido */}
                                        {(() => {
                                            const campos = getCamposCard(item.tipo_situacion || '', item.tipo_registro);
                                            const trip = typeof item.tripulacion === 'string'
                                                ? JSON.parse(item.tripulacion || '[]')
                                                : (item.tripulacion || []);
                                            const ultimaObs = extractObservaciones(item.observaciones);
                                            const tipoPavimento = item.tipo_pavimento ?? item.material_via;
                                            const victimasSummary = campos.showVictimas
                                                ? [
                                                    item.heridos_leves > 0 ? `${item.heridos_leves} h. leve${item.heridos_leves !== 1 ? 's' : ''}` : null,
                                                    item.heridos_graves > 0 ? `${item.heridos_graves} h. grave${item.heridos_graves !== 1 ? 's' : ''}` : null,
                                                    item.fallecidos > 0 ? `${item.fallecidos} fallecido${item.fallecidos !== 1 ? 's' : ''}` : null,
                                                  ].filter(Boolean).join(' · ')
                                                : null;

                                            return (
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    {/* Columna izquierda: tripulación + descripción/última observación */}
                                                    <div>
                                                        {trip.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {trip.map((t: Tripulante, idx: number) => (
                                                                    <span key={idx} className="inline-flex items-center gap-1 text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-700">
                                                                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                                                                            {t.rol || t.rol_tripulacion || 'T'}:
                                                                        </span>
                                                                        <span className="dark:text-gray-300">
                                                                            {t.nombre || t.nombre_completo || '-'}
                                                                        </span>
                                                                        {t.chapa && <span className="text-gray-400 dark:text-gray-500">[{t.chapa}]</span>}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Última observación como texto principal */}
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                            {ultimaObs || item.descripcion || (isSalida ? 'Salida de unidad' : 'Sin observaciones')}
                                                        </p>

                                                        {/* Resumen de víctimas — solo INCIDENTE */}
                                                        {victimasSummary && (
                                                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
                                                                {victimasSummary}
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* Columna derecha: ubicación + campos por tipo */}
                                                    <div className="space-y-1 text-sm">
                                                        {/* Ruta + km + sentido — siempre */}
                                                        {(item.ruta_codigo || item.km) && (
                                                            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                                                                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                                                                <span>
                                                                    {item.ruta_codigo && `${item.ruta_codigo} `}
                                                                    {item.km != null && `Km ${item.km}`}
                                                                    {item.sentido && ` (${item.sentido})`}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Tags de campos por tipo */}
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {campos.showUbicacion && item.area && (
                                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                                    {item.area}
                                                                </span>
                                                            )}
                                                            {campos.showCondBasicas && item.clima && (
                                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                                    {item.clima}
                                                                </span>
                                                            )}
                                                            {campos.showCondBasicas && item.carga_vehicular && (
                                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                                    {item.carga_vehicular}
                                                                </span>
                                                            )}
                                                            {campos.showCondBasicas && tipoPavimento && (
                                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                                    {tipoPavimento}
                                                                </span>
                                                            )}
                                                            {campos.showCondDetalle && item.iluminacion && (
                                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                                    {item.iluminacion}
                                                                </span>
                                                            )}
                                                            {campos.showCondDetalle && item.visibilidad && (
                                                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                                                                    {item.visibilidad}
                                                                </span>
                                                            )}
                                                            {campos.showCausas && item.causa_probable && (
                                                                <span className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded">
                                                                    {item.causa_probable}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {item.creado_por_nombre && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                                Por: {item.creado_por_nombre}
                                                            </div>
                                                        )}

                                                        {/* Fotos */}
                                                        {item.fotos && item.fotos.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                                                                    {item.fotos.length} foto(s)
                                                                </p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {item.fotos.map((foto: any) => (
                                                                        <a key={foto.id} href={foto.url} target="_blank" rel="noopener noreferrer">
                                                                            <img
                                                                                src={foto.thumbnail || foto.url}
                                                                                alt={`Foto ${foto.orden}`}
                                                                                className="w-16 h-12 object-cover rounded border border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 transition"
                                                                            />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal crear/editar situación */}
            <CrearSituacionModal
                isOpen={showCrearSituacionModal}
                onClose={() => { setShowCrearSituacionModal(false); setEditSituacionId(undefined); }}
                onCreated={() => { refetch(); }}
                unidades={unidadesForModal}
                preselectedUnidadId={Number(unidadId)}
                editSituacionId={editSituacionId}
            />

            {/* Modal crear/editar actividad */}
            <CrearActividadModal
                isOpen={showCrearActividadModal}
                onClose={() => { setShowCrearActividadModal(false); setEditActividadId(undefined); }}
                onCreated={() => { refetch(); }}
                unidades={unidadesForModal}
                preselectedUnidadId={Number(unidadId)}
                editActividadId={editActividadId}
            />

            {/* Modal iniciar/finalizar jornada desde COP */}
            <SalidaCOPModal
                isOpen={showSalidaModal}
                onClose={() => setShowSalidaModal(false)}
                onDone={() => refetch()}
                mode={salidaMode}
                unidadId={Number(unidadId)}
                unidadCodigo={unidadInfo?.codigo}
                salidaId={salidaActual?.salida_id ?? salidaActual?.id}
            />
        </div>
    );
}
