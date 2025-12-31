import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { eventosAPI, geografiaAPI, situacionesAPI } from '../services/api';
import { Plus, MapPin, AlertTriangle, Truck, Save, X, ArrowLeft } from 'lucide-react';

export default function EventosPage() {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedEvento, setSelectedEvento] = useState<any>(null);
    const queryClient = useQueryClient();

    // Form states
    const [formData, setFormData] = useState({
        titulo: '',
        tipo: 'DERRUMBE',
        descripcion: '',
        ruta_id: '',
        km: '',
        importancia: 'MEDIA'
    });

    const [assignData, setAssignData] = useState({
        unidad_id: ''
    });

    const { data: eventos = [], isLoading } = useQuery({
        queryKey: ['eventos-activos'],
        queryFn: eventosAPI.getActivos
    });

    const { data: rutas = [] } = useQuery({
        queryKey: ['rutas'],
        queryFn: geografiaAPI.getRutas
    });

    const { data: unidadesActivas = [] } = useQuery({
        queryKey: ['unidades-activas'],
        queryFn: situacionesAPI.getResumenUnidades,
        enabled: isAssignModalOpen
    });

    const createMutation = useMutation({
        mutationFn: eventosAPI.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos-activos'] });
            setIsModalOpen(false);
            resetForm();
        }
    });

    const assignMutation = useMutation({
        mutationFn: (data: { eventoId: number, unidadId: number }) =>
            eventosAPI.asignarUnidad(data.eventoId, data.unidadId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventos-activos'] });
            setIsAssignModalOpen(false);
            alert('Unidad asignada correctamente');
        }
    });

    const resetForm = () => {
        setFormData({
            titulo: '',
            tipo: 'DERRUMBE',
            descripcion: '',
            ruta_id: '',
            km: '',
            importancia: 'MEDIA'
        });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createMutation.mutate({
            ...formData,
            ruta_id: formData.ruta_id ? Number(formData.ruta_id) : null,
            km: formData.km ? Number(formData.km) : null
        });
    };

    const handleAssign = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedEvento && assignData.unidad_id) {
            assignMutation.mutate({
                eventoId: selectedEvento.id,
                unidadId: Number(assignData.unidad_id)
            });
        }
    };

    const openAssignModal = (evento: any) => {
        setSelectedEvento(evento);
        setIsAssignModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Regresar"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Eventos de Larga Duracion</h1>
                            <p className="text-gray-600">Gestion de derrumbes, obras y situaciones persistentes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Nuevo Evento
                    </button>
                </div>

                {/* Lista de Eventos */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {eventos.map((evento: any) => (
                        <div key={evento.id} className="bg-white rounded-xl shadow-sm border-l-4 border-blue-500 overflow-hidden">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${evento.importancia === 'CRITICA' ? 'bg-red-100 text-red-800' :
                                            evento.importancia === 'ALTA' ? 'bg-orange-100 text-orange-800' :
                                                'bg-blue-100 text-blue-800'
                                        }`}>
                                        {evento.importancia}
                                    </span>
                                    <span className="text-gray-400 text-xs">#{evento.id}</span>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-2">{evento.titulo}</h3>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{evento.descripcion}</p>

                                <div className="space-y-2 text-sm text-gray-500 mb-4">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span>{evento.tipo}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4" />
                                        <span>{evento.ruta_nombre || 'Sin ruta'} Km {evento.km}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Truck className="w-4 h-4" />
                                        <span>{evento.total_unidades_asignadas || 0} Unidades asignadas</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100 flex gap-2">
                                    <button
                                        onClick={() => openAssignModal(evento)}
                                        className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2 rounded text-sm font-medium transition"
                                    >
                                        Asignar Unidad
                                    </button>
                                    {/* Más acciones futuras: Editar, Finalizar */}
                                </div>
                            </div>
                        </div>
                    ))}

                    {eventos.length === 0 && !isLoading && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl">
                            No hay eventos activos registrados.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Crear Evento */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Nuevo Evento</h2>
                            <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={formData.titulo}
                                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                                    placeholder="Ej: Derrumbe Km 20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.tipo}
                                        onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                    >
                                        <option value="DERRUMBE">Derrumbe</option>
                                        <option value="OBRA">Obra</option>
                                        <option value="MANIFESTACION">Manifestación</option>
                                        <option value="ACCIDENTE_GRAVE">Accidente Grave</option>
                                        <option value="EVENTO_NATURAL">Evento Natural</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Importancia</label>
                                    <select
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.importancia}
                                        onChange={e => setFormData({ ...formData, importancia: e.target.value })}
                                    >
                                        <option value="BAJA">Baja</option>
                                        <option value="MEDIA">Media</option>
                                        <option value="ALTA">Alta</option>
                                        <option value="CRITICA">Crítica</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ruta</label>
                                    <select
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.ruta_id}
                                        onChange={e => setFormData({ ...formData, ruta_id: e.target.value })}
                                    >
                                        <option value="">Seleccione ruta</option>
                                        {rutas.map((r: any) => (
                                            <option key={r.id} value={r.id}>{r.codigo}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kilómetro</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={formData.km}
                                        onChange={e => setFormData({ ...formData, km: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                                >
                                    {createMutation.isPending ? 'Guardando...' : <><Save className="w-4 h-4" /> Guardar Evento</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Asignar Unidad */}
            {isAssignModalOpen && selectedEvento && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">Asignar Unidad</h2>
                                <p className="text-sm text-gray-500">{selectedEvento.titulo}</p>
                            </div>
                            <button onClick={() => setIsAssignModalOpen(false)}><X className="w-6 h-6 text-gray-400" /></button>
                        </div>
                        <form onSubmit={handleAssign} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Unidad</label>
                                <select
                                    required
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={assignData.unidad_id}
                                    onChange={e => setAssignData({ unidad_id: e.target.value })}
                                >
                                    <option value="">-- Seleccione una unidad activa --</option>
                                    {unidadesActivas.map((u: any) => (
                                        <option key={u.unidad_id} value={u.unidad_id}>
                                            {u.unidad_codigo} ({u.tipo_unidad}) - {u.ruta_codigo || 'Sin ruta'}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    Solo se muestran unidades que actualmente están en salida (activas).
                                </p>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAssignModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignMutation.isPending}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                >
                                    {assignMutation.isPending ? 'Asignando...' : 'Confirmar Asignación'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
