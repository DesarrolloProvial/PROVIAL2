import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { situacionesAPI, api } from '../services/api';
import { ArrowLeft, RefreshCw, MapPin, Users, Truck, Clock, Fuel } from 'lucide-react';
import Inspeccion360Historial from '../components/Inspeccion360Historial';

// Tipos de situación para colores
const TIPOS_SITUACION = [
    { value: 'PATRULLAJE', color: 'bg-blue-100 text-blue-700' },
    { value: 'INCIDENTE', color: 'bg-red-100 text-red-700' },
    { value: 'ASISTENCIA_VEHICULAR', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'EMERGENCIA', color: 'bg-orange-100 text-orange-700' },
    { value: 'PARADA_COMIDA', color: 'bg-purple-100 text-purple-700' },
    { value: 'OTROS', color: 'bg-gray-100 text-gray-700' },
];

// Colores por tipo de registro
const TIPO_REGISTRO_STYLE: Record<string, { dot: string; border: string; bg: string; badge: string }> = {
    SITUACION: { dot: 'bg-red-500', border: 'border-red-200', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700' },
    ACTIVIDAD: { dot: 'bg-blue-500', border: 'border-blue-200', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700' },
    SALIDA: { dot: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700' },
};

interface Tripulante {
    usuario_id: number;
    nombre_completo: string;
    rol_tripulacion: string;
}

export default function BitacoraPage() {
    const { unidadId } = useParams<{ unidadId: string }>();
    const navigate = useNavigate();
    const [limit, setLimit] = useState(50);

    // Estado para info de unidad
    const [unidadInfo, setUnidadInfo] = useState<any>(null);



    // Query de bitácora (debe ir antes de los useEffects que lo usan)
    const { data: bitacora = [], isLoading, refetch, isRefetching, error, isError } = useQuery({
        queryKey: ['bitacora-unidad', unidadId, limit],
        queryFn: () => situacionesAPI.getBitacora(Number(unidadId), { limit }),
        enabled: !!unidadId,
    });

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

    // Navegar a página de edición (solo para situaciones)
    const handleEditClick = (item: any) => {
        if (item.tipo_registro === 'SITUACION') {
            navigate(`/editar-situacion/${item.id}`);
        }
    };



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
        return found?.color || 'bg-gray-100 text-gray-700';
    };

    const getRegistroStyle = (item: any) => {
        return TIPO_REGISTRO_STYLE[item.tipo_registro] || TIPO_REGISTRO_STYLE.SITUACION;
    };

    if (!unidadId) return <div>Error: No se especificó unidad</div>;

    // Buscar la salida activa en los registros de la bitácora
    const salidaActual = bitacora.find((item: any) => item.tipo_registro === 'SALIDA' && item.estado === 'EN_SALIDA') || null;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">
                                    Bitácora - Unidad {unidadInfo?.codigo || unidadId}
                                </h1>
                                <p className="text-gray-600 text-sm mt-1">
                                    {unidadInfo?.tipo_unidad} | {unidadInfo?.placa}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value={20}>Últimos 20</option>
                                <option value={50}>Últimos 50</option>
                                <option value={100}>Últimos 100</option>
                            </select>

                            <button
                                onClick={() => refetch()}
                                disabled={isRefetching}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Info de Salida Activa */}
                    {salidaActual?.salida_id && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Truck className="w-5 h-5 text-blue-600" />
                                <span className="font-semibold text-blue-900">Salida Activa</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600">Hora salida:</span>
                                    <p className="font-medium">{formatTime(salidaActual.fecha_hora_salida)}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600">Ruta inicial:</span>
                                    <p className="font-medium">{salidaActual.salida_ruta_codigo || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600">Km inicial:</span>
                                    <p className="font-medium">{salidaActual.salida_km_inicial || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-blue-600">Combustible inicial:</span>
                                    <p className="font-medium">{salidaActual.salida_combustible_inicial ? `${salidaActual.salida_combustible_inicial}%` : '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tripulación */}
                    {salidaActual?.tripulacion && salidaActual.tripulacion.length > 0 && (
                        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-900">Tripulación</span>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {salidaActual.tripulacion.map((t: Tripulante, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-green-200">
                                        <span className="text-xs font-semibold text-green-700 uppercase">{t.rol_tripulacion}:</span>
                                        <span className="text-sm text-gray-800">{t.nombre_completo}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Inspecciones 360 */}
                    <Inspeccion360Historial unidadId={Number(unidadId)} dias={30} />
                </div>

                {/* Timeline de Situaciones */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Historial de Actividad</h2>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-500">
                            Cargando historial...
                        </div>
                    ) : isError ? (
                        <div className="text-center py-12 text-red-500">
                            Error al cargar bitácora: {(error as any)?.message || 'Error desconocido'}
                        </div>
                    ) : bitacora.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No hay registros en la bitácora para esta unidad.
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-gray-200 ml-4 space-y-6">
                            {bitacora.map((item: any) => {
                                const style = getRegistroStyle(item);
                                const isSalida = item.tipo_registro === 'SALIDA';
                                const isActividad = item.tipo_registro === 'ACTIVIDAD';

                                return (
                                <div key={`${item.tipo_registro}-${item.id}`} className="relative pl-8">
                                    {/* Dot */}
                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${
                                        item.estado === 'ACTIVA' || item.estado === 'EN_SALIDA' ? style.dot : 'bg-gray-400'
                                    }`}></div>

                                    {/* Content Card */}
                                    <div
                                        className={`rounded-lg p-4 border ${!isSalida ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow ${
                                            item.estado === 'ACTIVA' || item.estado === 'EN_SALIDA'
                                                ? `${style.bg} ${style.border}`
                                                : 'bg-gray-50 border-gray-200'
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
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-blue-50 text-blue-600 font-medium">
                                                        ACT
                                                    </span>
                                                )}
                                                {isSalida && (
                                                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-emerald-50 text-emerald-600 font-medium">
                                                        JORNADA
                                                    </span>
                                                )}
                                                {!isSalida && (
                                                    <span className="text-sm font-medium text-gray-500">
                                                        #{item.id}
                                                    </span>
                                                )}
                                                {(item.estado === 'ACTIVA' || item.estado === 'EN_SALIDA') && (
                                                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                                                        {item.estado === 'EN_SALIDA' ? 'EN CURSO' : 'ACTIVA'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Clock className="w-4 h-4" />
                                                {formatDate(item.created_at)}
                                            </div>
                                        </div>

                                        {/* Contenido */}
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div>
                                                {isSalida && item.tripulacion && item.tripulacion.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {item.tripulacion.map((t: Tripulante, idx: number) => (
                                                            <span key={idx} className="inline-flex items-center gap-1 text-xs bg-white px-2 py-1 rounded border border-emerald-200">
                                                                <span className="font-semibold text-emerald-700">{t.rol_tripulacion}:</span>
                                                                <span>{t.nombre_completo}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="font-medium text-gray-900">
                                                    {item.descripcion || item.observaciones || (isSalida ? 'Salida de unidad' : 'Sin descripción')}
                                                </p>
                                                {item.descripcion && item.observaciones && (
                                                    <p className="text-sm text-gray-600 mt-1 italic">
                                                        &quot;{item.observaciones}&quot;
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-1 text-sm">
                                                {item.ruta_codigo && (
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <MapPin className="w-4 h-4 text-gray-400" />
                                                        <span>{item.ruta_codigo} Km {item.km} {item.sentido && `(${item.sentido})`}</span>
                                                    </div>
                                                )}
                                                {item.combustible && (
                                                    <div className="flex items-center gap-2 text-gray-600">
                                                        <Fuel className="w-4 h-4 text-gray-400" />
                                                        <span>Combustible: {item.combustible}%</span>
                                                    </div>
                                                )}
                                                {item.creado_por_nombre && (
                                                    <div className="text-xs text-gray-500 mt-2">
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

        </div>
    );
}
