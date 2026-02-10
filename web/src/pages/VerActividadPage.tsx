import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ArrowLeft, Loader2, MapPin, Clock, User } from 'lucide-react';

export default function VerActividadPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: actividad, isLoading, error } = useQuery({
        queryKey: ['actividad', id],
        queryFn: async () => {
            const { data } = await api.get(`/actividades/${id}`);
            return data.actividad || data;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !actividad) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-600 mb-4">No se pudo cargar la actividad.</p>
                    <button onClick={() => navigate(-1)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    const formatDate = (d: string) => new Date(d).toLocaleString('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const datos = typeof actividad.datos === 'string' ? JSON.parse(actividad.datos || '{}') : (actividad.datos || {});
    const datosKeys = Object.keys(datos).filter(k => datos[k] !== null && datos[k] !== '' && datos[k] !== undefined);

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition">
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">
                                Actividad #{actividad.id}
                            </h1>
                            <p className="text-sm text-gray-600">
                                {actividad.tipo_actividad_nombre || 'Actividad'} - {actividad.unidad_codigo}
                            </p>
                        </div>
                        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${
                            actividad.estado === 'ACTIVA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                            {actividad.estado}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                {/* Info principal */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Informacion General</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <div>
                                <span className="text-gray-500">Inicio:</span>
                                <span className="ml-2 font-medium">{formatDate(actividad.created_at)}</span>
                            </div>
                        </div>
                        {actividad.closed_at && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <div>
                                    <span className="text-gray-500">Cierre:</span>
                                    <span className="ml-2 font-medium">{formatDate(actividad.closed_at)}</span>
                                </div>
                            </div>
                        )}
                        {actividad.ruta_codigo && (
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <div>
                                    <span className="text-gray-500">Ubicacion:</span>
                                    <span className="ml-2 font-medium">
                                        {actividad.ruta_codigo} Km {actividad.km || '-'} {actividad.sentido && `(${actividad.sentido})`}
                                    </span>
                                </div>
                            </div>
                        )}
                        {actividad.creado_por_nombre && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <div>
                                    <span className="text-gray-500">Registrado por:</span>
                                    <span className="ml-2 font-medium">{actividad.creado_por_nombre}</span>
                                </div>
                            </div>
                        )}
                        {actividad.tipo_actividad_categoria && (
                            <div>
                                <span className="text-gray-500">Categoria:</span>
                                <span className="ml-2 font-medium">{actividad.tipo_actividad_categoria}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Observaciones */}
                {actividad.observaciones && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">Observaciones</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{actividad.observaciones}</p>
                    </div>
                )}

                {/* Datos JSONB */}
                {datosKeys.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Datos Adicionales</h2>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {datosKeys.map(key => (
                                <div key={key} className="bg-gray-50 rounded-lg p-3">
                                    <span className="text-gray-500 text-xs uppercase">{key.replace(/_/g, ' ')}</span>
                                    <p className="font-medium text-gray-900 mt-1">
                                        {typeof datos[key] === 'object' ? JSON.stringify(datos[key]) : String(datos[key])}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Coordenadas */}
                {actividad.latitud && actividad.longitud && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-2">Coordenadas</h2>
                        <p className="text-sm text-gray-600">
                            {actividad.latitud}, {actividad.longitud}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
