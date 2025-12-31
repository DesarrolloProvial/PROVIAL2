import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { X, Save, RefreshCw, Plus, Trash2, MapPin, Car, Truck, FileText, Camera } from 'lucide-react';

// Constantes
const SENTIDOS = [
    { value: 'NORTE', label: 'Norte' },
    { value: 'SUR', label: 'Sur' },
    { value: 'ESTE', label: 'Este' },
    { value: 'OESTE', label: 'Oeste' },
    { value: 'AMBOS', label: 'Ambos sentidos' },
];

const TIPOS_VEHICULO = [
    'Automóvil', 'Pickup', 'Camión', 'Bus', 'Motocicleta',
    'Trailer', 'Microbús', 'Panel', 'Otro'
];

const ESTADOS_PILOTO = [
    { value: 'ILESO', label: 'Ileso' },
    { value: 'LESIONADO', label: 'Lesionado' },
    { value: 'FALLECIDO', label: 'Fallecido' },
    { value: 'SE_DIO_A_LA_FUGA', label: 'Se dio a la fuga' },
];

const OBSTRUCCIONES = [
    { value: 'NO', label: 'No obstruye' },
    { value: 'PARCIAL', label: 'Parcial' },
    { value: 'TOTAL', label: 'Total' },
];

interface Vehiculo {
    tipo_vehiculo: string;
    color: string;
    marca: string;
    placa: string;
    estado_piloto: string;
    personas_asistidas: number;
}

interface Props {
    situacion: any;
    onClose: () => void;
    onSave: (id: number, data: any) => void;
    isSaving: boolean;
}

export default function SituacionEditModal({ situacion, onClose, onSave, isSaving }: Props) {
    const [activeTab, setActiveTab] = useState('general');

    // Form state
    const [formData, setFormData] = useState({
        tipoIncidente: '',
        km: '',
        sentido: '',
        departamento_id: null as number | null,
        municipio_id: null as number | null,
        direccion_detallada: '',
        obstruye: '',
        danios_materiales: false,
        danios_infraestructura: false,
        descripcion_danios: '',
        descripcion: '',
        observaciones: '',
        combustible: '',
        kilometraje_unidad: '',
    });

    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [municipios, setMunicipios] = useState<any[]>([]);

    // Cargar departamentos
    const { data: departamentos = [] } = useQuery({
        queryKey: ['departamentos'],
        queryFn: async () => {
            const { data } = await api.get('/geografia/departamentos');
            return data.departamentos || data || [];
        },
    });

    // Cargar municipios cuando cambia el departamento
    useEffect(() => {
        if (formData.departamento_id) {
            api.get(`/geografia/departamentos/${formData.departamento_id}/municipios`)
                .then(res => setMunicipios(res.data.municipios || res.data || []))
                .catch(() => setMunicipios([]));
        } else {
            setMunicipios([]);
        }
    }, [formData.departamento_id]);

    // Inicializar form con datos de situación
    useEffect(() => {
        if (situacion) {
            setFormData({
                tipoIncidente: situacion.tipo_situacion || '',
                km: situacion.km?.toString() || '',
                sentido: situacion.sentido || '',
                departamento_id: situacion.departamento_id || null,
                municipio_id: situacion.municipio_id || null,
                direccion_detallada: situacion.direccion_detallada || '',
                obstruye: situacion.obstruye || '',
                danios_materiales: situacion.danios_materiales || false,
                danios_infraestructura: situacion.danios_infraestructura || false,
                descripcion_danios: situacion.descripcion_danios || '',
                descripcion: situacion.descripcion || '',
                observaciones: situacion.observaciones || '',
                combustible: situacion.combustible?.toString() || '',
                kilometraje_unidad: situacion.kilometraje_unidad?.toString() || '',
            });

            // Si es incidente, cargar vehículos
            if (situacion.incidente_id) {
                api.get(`/incidentes/${situacion.incidente_id}`)
                    .then(res => {
                        const inc = res.data.incidente;
                        if (inc?.vehiculos) {
                            setVehiculos(inc.vehiculos);
                        }
                    })
                    .catch(console.error);
            }
        }
    }, [situacion]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const addVehiculo = () => {
        setVehiculos([...vehiculos, {
            tipo_vehiculo: '',
            color: '',
            marca: '',
            placa: '',
            estado_piloto: 'ILESO',
            personas_asistidas: 0,
        }]);
    };

    const updateVehiculo = (index: number, field: string, value: any) => {
        const updated = [...vehiculos];
        updated[index] = { ...updated[index], [field]: value };
        setVehiculos(updated);
    };

    const removeVehiculo = (index: number) => {
        setVehiculos(vehiculos.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        const data = {
            ...formData,
            km: formData.km ? parseFloat(formData.km) : null,
            combustible: formData.combustible ? parseFloat(formData.combustible) : null,
            kilometraje_unidad: formData.kilometraje_unidad ? parseFloat(formData.kilometraje_unidad) : null,
            vehiculos: situacion.tipo_situacion === 'INCIDENTE' ? vehiculos : undefined,
        };
        onSave(situacion.id, data);
    };

    const tabs = [
        { id: 'general', label: 'General', icon: MapPin },
        { id: 'vehiculos', label: 'Vehículos', icon: Car, show: situacion.tipo_situacion === 'INCIDENTE' },
        { id: 'recursos', label: 'Recursos', icon: Truck, show: situacion.tipo_situacion === 'INCIDENTE' },
        { id: 'otros', label: 'Otros', icon: FileText },
        { id: 'evidencia', label: 'Evidencia', icon: Camera },
    ].filter(t => t.show !== false);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Editar {situacion.tipo_situacion.replace(/_/g, ' ')}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {situacion.numero_situacion} - {situacion.ruta_codigo}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b bg-white px-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Tab: General */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            {/* Info de solo lectura */}
                            <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                                <div>
                                    <span className="text-xs text-blue-600 uppercase font-semibold">Ruta</span>
                                    <p className="font-medium">{situacion.ruta_codigo || '-'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-blue-600 uppercase font-semibold">Unidad</span>
                                    <p className="font-medium">{situacion.unidad_codigo}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-blue-600 uppercase font-semibold">Creado por</span>
                                    <p className="font-medium">{situacion.creado_por_nombre || '-'}</p>
                                </div>
                            </div>

                            {/* Ubicación */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Ubicación</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kilómetro *</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={formData.km}
                                            onChange={(e) => handleChange('km', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sentido</label>
                                        <select
                                            value={formData.sentido}
                                            onChange={(e) => handleChange('sentido', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {SENTIDOS.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Departamento y Municipio */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Ubicación Geográfica</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                                        <select
                                            value={formData.departamento_id || ''}
                                            onChange={(e) => handleChange('departamento_id', e.target.value ? Number(e.target.value) : null)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Seleccionar...</option>
                                            {departamentos.map((d: any) => (
                                                <option key={d.id} value={d.id}>{d.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                                        <select
                                            value={formData.municipio_id || ''}
                                            onChange={(e) => handleChange('municipio_id', e.target.value ? Number(e.target.value) : null)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            disabled={!formData.departamento_id}
                                        >
                                            <option value="">{formData.departamento_id ? 'Seleccionar...' : 'Seleccione departamento primero'}</option>
                                            {municipios.map((m: any) => (
                                                <option key={m.id} value={m.id}>{m.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección o Referencia</label>
                                    <input
                                        type="text"
                                        value={formData.direccion_detallada}
                                        onChange={(e) => handleChange('direccion_detallada', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Km 45.5, frente a gasolinera..."
                                    />
                                </div>
                            </div>

                            {/* Obstrucción */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Obstrucción de Vía</h3>
                                <div className="flex gap-3">
                                    {OBSTRUCCIONES.map(o => (
                                        <button
                                            key={o.value}
                                            type="button"
                                            onClick={() => handleChange('obstruye', o.value)}
                                            className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                                                formData.obstruye === o.value
                                                    ? o.value === 'TOTAL' ? 'border-red-500 bg-red-50 text-red-700'
                                                    : o.value === 'PARCIAL' ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                                    : 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            {o.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => handleChange('descripcion', e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab: Vehículos */}
                    {activeTab === 'vehiculos' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800">Vehículos Involucrados ({vehiculos.length})</h3>
                                <button
                                    onClick={addVehiculo}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Vehículo
                                </button>
                            </div>

                            {vehiculos.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                                    No hay vehículos registrados. Agrega al menos uno.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {vehiculos.map((v, idx) => (
                                        <div key={idx} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-medium text-gray-800">Vehículo #{idx + 1}</h4>
                                                <button
                                                    onClick={() => removeVehiculo(idx)}
                                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                                                    <select
                                                        value={v.tipo_vehiculo}
                                                        onChange={(e) => updateVehiculo(idx, 'tipo_vehiculo', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        <option value="">Seleccionar...</option>
                                                        {TIPOS_VEHICULO.map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Placa</label>
                                                    <input
                                                        type="text"
                                                        value={v.placa}
                                                        onChange={(e) => updateVehiculo(idx, 'placa', e.target.value.toUpperCase())}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded uppercase"
                                                        placeholder="P-123ABC"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                                                    <input
                                                        type="text"
                                                        value={v.color}
                                                        onChange={(e) => updateVehiculo(idx, 'color', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Marca</label>
                                                    <input
                                                        type="text"
                                                        value={v.marca}
                                                        onChange={(e) => updateVehiculo(idx, 'marca', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Estado Piloto</label>
                                                    <select
                                                        value={v.estado_piloto}
                                                        onChange={(e) => updateVehiculo(idx, 'estado_piloto', e.target.value)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    >
                                                        {ESTADOS_PILOTO.map(e => (
                                                            <option key={e.value} value={e.value}>{e.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">Personas Asistidas</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={v.personas_asistidas}
                                                        onChange={(e) => updateVehiculo(idx, 'personas_asistidas', parseInt(e.target.value) || 0)}
                                                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Recursos */}
                    {activeTab === 'recursos' && (
                        <div className="space-y-6">
                            <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500">
                                <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p>Módulo de Grúas, Ajustadores y Autoridades</p>
                                <p className="text-sm">Próximamente disponible en esta versión</p>
                            </div>
                        </div>
                    )}

                    {/* Tab: Otros */}
                    {activeTab === 'otros' && (
                        <div className="space-y-6">
                            {/* Daños */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Daños</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={formData.danios_materiales}
                                            onChange={(e) => handleChange('danios_materiales', e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300"
                                        />
                                        <span>Daños Materiales</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={formData.danios_infraestructura}
                                            onChange={(e) => handleChange('danios_infraestructura', e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300"
                                        />
                                        <span>Daños a Infraestructura</span>
                                    </label>
                                    {formData.danios_infraestructura && (
                                        <textarea
                                            value={formData.descripcion_danios}
                                            onChange={(e) => handleChange('descripcion_danios', e.target.value)}
                                            placeholder="Describa los daños a la infraestructura..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Datos del vehículo */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Datos del Vehículo (Unidad)</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Combustible (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.combustible}
                                            onChange={(e) => handleChange('combustible', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder="0-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kilometraje</label>
                                        <input
                                            type="number"
                                            value={formData.kilometraje_unidad}
                                            onChange={(e) => handleChange('kilometraje_unidad', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder="Km del odómetro"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div>
                                <h3 className="font-semibold text-gray-800 mb-3">Observaciones</h3>
                                <textarea
                                    value={formData.observaciones}
                                    onChange={(e) => handleChange('observaciones', e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="Observaciones adicionales..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Tab: Evidencia */}
                    {activeTab === 'evidencia' && (
                        <div className="space-y-6">
                            <div className="p-6 bg-gray-50 rounded-lg text-center text-gray-500">
                                <Camera className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                                <p>Galería de Evidencias</p>
                                <p className="text-sm">Fotos y videos adjuntos a esta situación</p>
                                <p className="text-xs mt-2 text-gray-400">
                                    Las fotos se suben desde la app móvil
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
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
    );
}
