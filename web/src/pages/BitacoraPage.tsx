import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { situacionesAPI, api } from '../services/api';
import { ArrowLeft, RefreshCw, MapPin, Users, Truck, Clock, Plus, Activity, LogIn, LogOut } from 'lucide-react';
import Inspeccion360Historial from '../components/Inspeccion360Historial';
import CrearSituacionModal from '../components/forms/CrearSituacionModal';
import CrearActividadModal from '../components/forms/CrearActividadModal';
import SalidaCOPModal from '../components/forms/SalidaCOPModal';
import ThemeToggle from '../components/ThemeToggle';

// Tipos de situación para colores
const TIPOS_SITUACION = [
    { value: 'PATRULLAJE', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
    { value: 'INCIDENTE', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    { value: 'ASISTENCIA_VEHICULAR', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
    { value: 'EMERGENCIA', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
    { value: 'PARADA_COMIDA', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
    { value: 'OTROS', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
];

// Colores por tipo de registro
const TIPO_REGISTRO_STYLE: Record<string, { dot: string; border: string; bg: string; badge: string }> = {
    SITUACION: { dot: 'bg-red-500', border: 'border-red-200 dark:border-red-800', bg: 'bg-red-50 dark:bg-red-900/20', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    ACTIVIDAD: { dot: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50 dark:bg-blue-900/20', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
    SALIDA: { dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-900/20', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
};

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
                console.log('Info de unidad no disponible, se usará datos de bitácora');
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

    // Unidades for modals (minimal array with just this unit)
    const unidadesForModal = unidadInfo ? [{
        unidad_id: Number(unidadId),
        unidad_codigo: unidadInfo.codigo || unidadId,
        sede_nombre: unidadInfo.sede_nombre || '',
    }] : [];



    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('es-GT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('es-GT', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTipoColor = (tipo: string) => {
        const found = TIPOS_SITUACION.find(t => t.value === tipo);
        return found?.color || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    };

    const getRegistroStyle = (item: any) => {
        return TIPO_REGISTRO_STYLE[item.tipo_registro] || TIPO_REGISTRO_STYLE.SITUACION;
    };

    if (!unidadId) return <div>Error: No se especificó unidad</div>;

    // Salida activa: usa query independiente como fuente primaria, bitácora como fallback
    const salidaActual: any =
        salidaActivaData ||
        bitacora.find((item: any) => item.tipo_registro === 'SALIDA' && item.estado === 'EN_SALIDA') ||
        null;

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
                                        {/* Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                                                    item.color
                                                        ? ''
                                                        : isSalida
                                                            ? style.badge
                                                            : getTipoColor(item.tipo_situacion)
                                                }`} style={item.color ? { backgroundColor: `${item.color}20`, color: item.color } : undefined}>
                                                    {item.subtipo_nombre || item.tipo_situacion?.replace(/_/g, ' ') || 'Sin tipo'}
                                                </span>
                                                {isActividad && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
                                                        ACT
                                                    </span>
                                                )}
                                                {isSalida && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-medium">
                                                        JORNADA
                                                    </span>
                                                )}
                                                {!isSalida && (
                                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        #{item.id}
                                                    </span>
                                                )}
                                                {(item.estado === 'ACTIVA' || item.estado === 'EN_SALIDA') && (
                                                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                                                        {item.estado === 'EN_SALIDA' ? 'EN CURSO' : 'ACTIVA'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                <Clock className="w-4 h-4" />
                                                {formatDate(item.created_at)}
                                            </div>
                                        </div>

                                        {/* Contenido */}
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                {(() => {
                                                    const trip = typeof item.tripulacion === 'string'
                                                        ? JSON.parse(item.tripulacion || '[]')
                                                        : (item.tripulacion || []);
                                                    return trip.length > 0 ? (
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
                                                    ) : null;
                                                })()}
                                                <p className="font-medium text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                                    {item.descripcion || extractObservaciones(item.observaciones) || (isSalida ? 'Salida de unidad' : 'Sin descripción')}
                                                </p>
                                                {item.descripcion && item.observaciones && (item.descripcion.trim() !== String(extractObservaciones(item.observaciones) || '').trim()) && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 italic whitespace-pre-wrap">
                                                        &quot;{extractObservaciones(item.observaciones)}&quot;
                                                    </p>
                                                )}
                                                {/* Datos JSONB para actividades */}
                                                {isActividad && item.datos && (() => {
                                                    const d = typeof item.datos === 'string' ? JSON.parse(item.datos || '{}') : (item.datos || {});
                                                    const keys = Object.keys(d).filter(k => d[k] !== null && d[k] !== '' && d[k] !== undefined);
                                                    return keys.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {keys.map(k => (
                                                                <span key={k} className="text-xs bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                                                                    {k.replace(/_/g, ' ')}: {typeof d[k] === 'object' ? JSON.stringify(d[k]) : String(d[k])}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>

                                            <div className="space-y-1 text-sm">
                                                {item.ruta_codigo && (
                                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                                        <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                                        <span>{item.ruta_codigo} Km {item.km} {item.sentido && `(${item.sentido})`}</span>
                                                    </div>
                                                )}
                                                {item.creado_por_nombre && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                                        Registrado por: {item.creado_por_nombre}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
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
                salidaId={salidaActual?.salida_id}
            />
        </div>
    );
}
