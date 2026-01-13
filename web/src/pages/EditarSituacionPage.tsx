import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { situacionesAPI, api } from '../services/api';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

export default function EditarSituacionPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [guardando, setGuardando] = useState(false);

    // Cargar situación
    const { data: situacion, isLoading, error } = useQuery({
        queryKey: ['situacion', id],
        queryFn: async () => {
            const response = await situacionesAPI.getById(Number(id));
            return response.situacion;
        },
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="mt-4 text-gray-600">Cargando situación...</p>
                </div>
            </div>
        );
    }

    if (error || !situacion) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
                    <h2 className="text-xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-600 mb-4">
                        No se pudo cargar la situación. {(error as any)?.message || ''}
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    const getTipoFormulario = () => {
        const tipo = situacion.tipo_situacion?.toUpperCase();

        if (tipo?.includes('INCIDENTE') || tipo?.includes('HECHO')) {
            return 'HECHO_TRANSITO';
        }
        if (tipo?.includes('ASISTENCIA')) {
            return 'ASISTENCIA_VIAL';
        }
        if (tipo?.includes('EMERGENCIA') || tipo?.includes('OBSTACULO')) {
            return 'EMERGENCIA';
        }
        if (tipo?.includes('PATRULLAJE')) {
            return 'PATRULLAJE';
        }

        return 'OTROS';
    };

    const tipoFormulario = getTipoFormulario();

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <ArrowLeft className="w-6 h-6 text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-800">
                                    Editar Situación #{situacion.numero_situacion || situacion.id}
                                </h1>
                                <p className="text-sm text-gray-600">
                                    {situacion.tipo_situacion?.replace(/_/g, ' ')} - {situacion.unidad_codigo}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 py-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                    {/* Información General */}
                    <div className="mb-6 pb-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Información General</h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-600">Unidad:</span>
                                <span className="ml-2 text-gray-900">{situacion.unidad_codigo}</span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-600">Estado:</span>
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${situacion.estado === 'ACTIVA'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {situacion.estado}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-600">Fecha:</span>
                                <span className="ml-2 text-gray-900">
                                    {new Date(situacion.created_at).toLocaleString('es-GT')}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium text-gray-600">Creado por:</span>
                                <span className="ml-2 text-gray-900">{situacion.creado_por_nombre}</span>
                            </div>
                        </div>
                    </div>

                    {/* Formulario según tipo */}
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">
                            Detalles de {situacion.tipo_situacion?.replace(/_/g, ' ')}
                        </h2>

                        {/* TODO: Renderizar formulario según tipoFormulario */}
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>Tipo de formulario detectado:</strong> {tipoFormulario}
                            </p>
                            <p className="text-sm text-yellow-700 mt-2">
                                Los formularios específicos se están desarrollando. Por ahora puedes ver los datos cargados.
                            </p>

                            {/* Mostrar datos crudos temporalmente */}
                            <div className="mt-4 p-3 bg-white rounded border border-yellow-300">
                                <pre className="text-xs overflow-auto max-h-96">
                                    {JSON.stringify(situacion, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="mt-6 pt-6 border-t border-gray-200 flex justify-end gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            disabled={guardando}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {guardando ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
