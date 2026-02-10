import { useState, useEffect } from 'react';
import { geografiaAPI } from '../services/api';
import { X, Plus } from 'lucide-react';

interface Props {
    situacion: any;
    incidente?: any;
    onDataChange: (data: any) => void;
}

const TIPOS_HECHO = [
    'Colisión',
    'Atropello',
    'Volcamiento',
    'Vehículo Avariado',
    'Obstáculo',
    'Regulación de Tránsito',
    'Trabajos en la Vía',
    'Manifestación',
    'Evento',
    'Otro'
];

const AREAS = [
    { value: 'URBANA', label: 'Urbana' },
    { value: 'RURAL', label: 'Rural' }
];

const MATERIALES_VIA = [
    { value: 'ASFALTO', label: 'Asfalto' },
    { value: 'CONCRETO', label: 'Concreto' },
    { value: 'TERRACERIA', label: 'Terracería' },
    { value: 'ADOQUIN', label: 'Adoquín' }
];

export default function FormularioHechoTransito({ situacion, incidente, onDataChange }: Props) {
    const [activeTab, setActiveTab] = useState('general');
    const [departamentos, setDepartamentos] = useState<any[]>([]);
    const [municipios, setMunicipios] = useState<any[]>([]);

    // Mapear vehiculos del backend al formato del form
    const mapVehiculos = () => {
        const vehs = incidente?.vehiculos || situacion.vehiculos_involucrados || [];
        return vehs.map((v: any) => ({
            tipo_vehiculo: v.tipo_vehiculo || v.tipo_vehiculo_nombre || '',
            color: v.color || '',
            marca: v.marca || v.marca_nombre || '',
            placa: v.placa || '',
            estado_piloto: v.estado_piloto || 'ILESO',
            personas_asistidas: v.personas_asistidas || 0,
            nombre_piloto: v.nombre_piloto || '',
            licencia_numero: v.licencia_numero || '',
            numero_poliza: v.numero_poliza || '',
            heridos_en_vehiculo: v.heridos_en_vehiculo || 0,
            fallecidos_en_vehiculo: v.fallecidos_en_vehiculo || 0,
            danos_estimados: v.danos_estimados || '',
            observaciones: v.observaciones || '',
            // Gruas/ajustadores anidados en cada vehiculo
            gruas: v.gruas || [],
            ajustadores: v.ajustadores || [],
        }));
    };

    // Extraer gruas de situacion (vienen anidadas en vehiculos o como array top-level)
    const mapGruas = () => {
        if (incidente?.gruas) return incidente.gruas;
        const topLevel = situacion.gruas || [];
        if (topLevel.length > 0) return topLevel.map((g: any) => ({
            nombre: g.nombre || g.grua_nombre || '',
            telefono: g.telefono || '',
            placa: g.placa || g.grua_placa || '',
            empresa: g.empresa || g.grua_empresa || '',
        }));
        return [];
    };

    // Extraer ajustadores
    const mapAjustadores = () => {
        if (incidente?.ajustadores) return incidente.ajustadores;
        const topLevel = situacion.ajustadores || [];
        if (topLevel.length > 0) return topLevel.map((a: any) => ({
            nombre: a.datos?.nombre || a.nombre || '',
            telefono: a.datos?.telefono || a.telefono || '',
            aseguradora: a.aseguradora_nombre || a.empresa || '',
        }));
        return [];
    };

    // Extraer autoridades (array de strings tipo 'PNC', 'PMT', etc.)
    const mapAutoridades = () => {
        if (incidente?.autoridades_seleccionadas) return incidente.autoridades_seleccionadas;
        const auths = situacion.autoridades || [];
        if (auths.length > 0) return auths.map((a: any) => a.tipo || a);
        return [];
    };

    // Mapear obstruccion
    const mapObstruccion = () => {
        if (incidente?.obstruye) return incidente.obstruye;
        const obs = situacion.obstruccion_data;
        if (obs) {
            if (typeof obs === 'string') return obs;
            return obs.obstruye || obs.tipo || '';
        }
        return '';
    };

    const [formData, setFormData] = useState({
        // General
        departamento_id: incidente?.departamento_id || situacion.departamento_id || '',
        municipio_id: incidente?.municipio_id || situacion.municipio_id || '',
        km: incidente?.km || situacion.km || '',
        sentido: incidente?.sentido || situacion.sentido || '',
        clima: incidente?.clima || situacion.clima || '',
        carga_vehicular: incidente?.carga_vehicular || situacion.carga_vehicular || '',
        tipo_hecho: incidente?.tipo_hecho || '',

        // Boleta
        area: incidente?.area || situacion.area || '',
        material_via: incidente?.material_via || situacion.tipo_pavimento || '',
        no_grupo_operativo: incidente?.no_grupo_operativo || situacion.grupo || '',
        obstruye: mapObstruccion(),

        // Vehículos
        vehiculos: mapVehiculos(),

        // Recursos
        gruas: mapGruas(),
        ajustadores: mapAjustadores(),
        autoridades: mapAutoridades(),
        socorro: incidente?.socorro_seleccionado || [],

        // Vía
        iluminacion: situacion.iluminacion || '',
        senalizacion: situacion.senalizacion || '',
        visibilidad: situacion.visibilidad || '',
        via_estado: situacion.via_estado || '',
        causa_probable: situacion.causa_probable || '',

        // Víctimas
        ilesos: situacion.ilesos ?? null,
        heridos_leves: situacion.heridos_leves ?? null,
        heridos_graves: situacion.heridos_graves ?? null,
        fallecidos: situacion.fallecidos ?? null,
        trasladados: situacion.trasladados ?? null,
        fugados: situacion.fugados ?? null,

        // Acuerdo
        acuerdo_involucrados: situacion.acuerdo_involucrados ?? false,
        acuerdo_detalle: situacion.acuerdo_detalle || '',

        // Otros
        danios_materiales: incidente?.danios_materiales ?? situacion.danios_materiales ?? false,
        danios_infraestructura: incidente?.danios_infraestructura ?? situacion.danios_infraestructura ?? false,
        descripcion_danios_infra: incidente?.descripcion_danios_infra || situacion.danios_descripcion || '',
        observaciones: incidente?.observaciones || situacion.observaciones || '',
    });

    // Cargar departamentos
    useEffect(() => {
        const loadDepartamentos = async () => {
            try {
                const data = await geografiaAPI.getDepartamentos();
                setDepartamentos(data);
            } catch (error) {
                console.error('Error cargando departamentos:', error);
            }
        };
        loadDepartamentos();
    }, []);

    // Cargar municipios
    useEffect(() => {
        const loadMunicipios = async () => {
            if (formData.departamento_id) {
                try {
                    const data = await geografiaAPI.getMunicipiosPorDepartamento(Number(formData.departamento_id));
                    setMunicipios(data);
                } catch (error) {
                    console.error('Error cargando municipios:', error);
                }
            } else {
                setMunicipios([]);
            }
        };
        loadMunicipios();
    }, [formData.departamento_id]);

    // Notificar cambios
    useEffect(() => {
        onDataChange(formData);
    }, [formData, onDataChange]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
            ...(field === 'departamento_id' ? { municipio_id: '' } : {})
        }));
    };

    const agregarVehiculo = () => {
        setFormData(prev => ({
            ...prev,
            vehiculos: [...prev.vehiculos, {
                tipo_vehiculo: '',
                color: '',
                marca: '',
                placa: '',
                estado_piloto: 'ILESO',
                personas_asistidas: 0
            }]
        }));
    };

    const eliminarVehiculo = (index: number) => {
        setFormData(prev => ({
            ...prev,
            vehiculos: prev.vehiculos.filter((_: any, i: number) => i !== index)
        }));
    };

    const actualizarVehiculo = (index: number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            vehiculos: prev.vehiculos.map((v: any, i: number) =>
                i === index ? { ...v, [field]: value } : v
            )
        }));
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-2 overflow-x-auto">
                    {['general', 'vehiculos', 'recursos', 'otros'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition ${activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {tab === 'general' && 'General'}
                            {tab === 'vehiculos' && `Vehículos (${formData.vehiculos.length})`}
                            {tab === 'recursos' && 'Recursos'}
                            {tab === 'otros' && 'Otros'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab General */}
            {activeTab === 'general' && (
                <div className="space-y-6">
                    {/* Ubicación */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-4">Ubicación</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Departamento *
                                </label>
                                <select
                                    value={formData.departamento_id}
                                    onChange={(e) => handleChange('departamento_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {departamentos.map(d => (
                                        <option key={d.id} value={d.id}>{d.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Municipio *
                                </label>
                                <select
                                    value={formData.municipio_id}
                                    onChange={(e) => handleChange('municipio_id', e.target.value)}
                                    disabled={!formData.departamento_id}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                >
                                    <option value="">Seleccione...</option>
                                    {municipios.map(m => (
                                        <option key={m.id} value={m.id}>{m.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kilómetro</label>
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
                                    <option value="">Seleccione...</option>
                                    <option value="NORTE">Norte</option>
                                    <option value="SUR">Sur</option>
                                    <option value="ORIENTE">Oriente</option>
                                    <option value="OCCIDENTE">Occidente</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Tipo y Condiciones */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-4">Tipo y Condiciones</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Hecho *</label>
                                <select
                                    value={formData.tipo_hecho}
                                    onChange={(e) => handleChange('tipo_hecho', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {TIPOS_HECHO.map(tipo => (
                                        <option key={tipo} value={tipo}>{tipo}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Clima</label>
                                <select
                                    value={formData.clima}
                                    onChange={(e) => handleChange('clima', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="DESPEJADO">Despejado</option>
                                    <option value="NUBLADO">Nublado</option>
                                    <option value="LLUVIA">Lluvia</option>
                                    <option value="NEBLINA">Neblina</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Carga Vehicular</label>
                                <select
                                    value={formData.carga_vehicular}
                                    onChange={(e) => handleChange('carga_vehicular', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="FLUIDO">Fluido</option>
                                    <option value="MODERADO">Moderado</option>
                                    <option value="DENSO">Denso</option>
                                    <option value="CONGESTIONADO">Congestionado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Condiciones de Vía */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-4">Condiciones de Vía</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Iluminación</label>
                                <select value={formData.iluminacion || ''} onChange={(e) => handleChange('iluminacion', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccione...</option>
                                    <option value="DIA">Día</option>
                                    <option value="NOCHE_CON_LUZ">Noche con luz</option>
                                    <option value="NOCHE_SIN_LUZ">Noche sin luz</option>
                                    <option value="AMANECER">Amanecer</option>
                                    <option value="ATARDECER">Atardecer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Señalización</label>
                                <select value={formData.senalizacion || ''} onChange={(e) => handleChange('senalizacion', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccione...</option>
                                    <option value="BUENA">Buena</option>
                                    <option value="REGULAR">Regular</option>
                                    <option value="DEFICIENTE">Deficiente</option>
                                    <option value="INEXISTENTE">Inexistente</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Visibilidad</label>
                                <select value={formData.visibilidad || ''} onChange={(e) => handleChange('visibilidad', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccione...</option>
                                    <option value="BUENA">Buena</option>
                                    <option value="REGULAR">Regular</option>
                                    <option value="MALA">Mala</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Estado de Vía</label>
                                <select value={formData.via_estado || ''} onChange={(e) => handleChange('via_estado', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    <option value="">Seleccione...</option>
                                    <option value="BUENO">Bueno</option>
                                    <option value="REGULAR">Regular</option>
                                    <option value="MALO">Malo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Causa Probable</label>
                                <input type="text" value={formData.causa_probable || ''} onChange={(e) => handleChange('causa_probable', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Causa probable del hecho" />
                            </div>
                        </div>
                    </div>

                    {/* Víctimas */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-4">Víctimas</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ilesos</label>
                                <input type="number" min="0" value={formData.ilesos ?? ''} onChange={(e) => handleChange('ilesos', e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Heridos Leves</label>
                                <input type="number" min="0" value={formData.heridos_leves ?? ''} onChange={(e) => handleChange('heridos_leves', e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Heridos Graves</label>
                                <input type="number" min="0" value={formData.heridos_graves ?? ''} onChange={(e) => handleChange('heridos_graves', e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fallecidos</label>
                                <input type="number" min="0" value={formData.fallecidos ?? ''} onChange={(e) => handleChange('fallecidos', e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Trasladados</label>
                                <input type="number" min="0" value={formData.trasladados ?? ''} onChange={(e) => handleChange('trasladados', e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fugados</label>
                                <input type="number" min="0" value={formData.fugados ?? ''} onChange={(e) => handleChange('fugados', e.target.value ? Number(e.target.value) : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Boleta */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-4">Datos de Boleta</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                                <select
                                    value={formData.area}
                                    onChange={(e) => handleChange('area', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {AREAS.map(a => (
                                        <option key={a.value} value={a.value}>{a.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Material de Vía</label>
                                <select
                                    value={formData.material_via}
                                    onChange={(e) => handleChange('material_via', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    {MATERIALES_VIA.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">No. Grupo Operativo</label>
                                <input
                                    type="text"
                                    value={formData.no_grupo_operativo}
                                    onChange={(e) => handleChange('no_grupo_operativo', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ej: G-1"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Obstrucción de Vía</label>
                                <select
                                    value={formData.obstruye}
                                    onChange={(e) => handleChange('obstruye', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="NO">No</option>
                                    <option value="PARCIAL">Parcial</option>
                                    <option value="TOTAL">Total</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Vehículos */}
            {activeTab === 'vehiculos' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-md font-semibold text-gray-800">Vehículos Involucrados</h3>
                        <button
                            onClick={agregarVehiculo}
                            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Agregar Vehículo
                        </button>
                    </div>

                    {formData.vehiculos.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No hay vehículos agregados. Haz clic en "Agregar Vehículo" para empezar.
                        </div>
                    ) : (
                        formData.vehiculos.map((vehiculo: any, index: number) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-medium text-gray-800">Vehículo {index + 1}</h4>
                                    <button
                                        onClick={() => eliminarVehiculo(index)}
                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                        <input
                                            type="text"
                                            value={vehiculo.tipo_vehiculo}
                                            onChange={(e) => actualizarVehiculo(index, 'tipo_vehiculo', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="Ej: Automóvil, Pickup..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                                        <input
                                            type="text"
                                            value={vehiculo.marca}
                                            onChange={(e) => actualizarVehiculo(index, 'marca', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                        <input
                                            type="text"
                                            value={vehiculo.color}
                                            onChange={(e) => actualizarVehiculo(index, 'color', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Placa</label>
                                        <input
                                            type="text"
                                            value={vehiculo.placa}
                                            onChange={(e) => actualizarVehiculo(index, 'placa', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado Piloto</label>
                                        <select
                                            value={vehiculo.estado_piloto}
                                            onChange={(e) => actualizarVehiculo(index, 'estado_piloto', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="ILESO">Ileso</option>
                                            <option value="HERIDO">Herido</option>
                                            <option value="FALLECIDO">Fallecido</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Personas Asistidas</label>
                                        <input
                                            type="number"
                                            value={vehiculo.personas_asistidas}
                                            onChange={(e) => actualizarVehiculo(index, 'personas_asistidas', Number(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Tab Recursos */}
            {activeTab === 'recursos' && (
                <div className="space-y-6">
                    {/* Grúas */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-md font-semibold text-gray-800">Grúas</h3>
                            <button
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    gruas: [...prev.gruas, { nombre: '', telefono: '' }]
                                }))}
                                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Agregar
                            </button>
                        </div>
                        {formData.gruas.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay grúas registradas</p>
                        ) : (
                            <div className="space-y-2">
                                {formData.gruas.map((grua: any, index: number) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={grua.nombre}
                                            onChange={(e) => {
                                                const newGruas = [...formData.gruas];
                                                newGruas[index].nombre = e.target.value;
                                                handleChange('gruas', newGruas);
                                            }}
                                            placeholder="Nombre de grúa"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="tel"
                                            value={grua.telefono}
                                            onChange={(e) => {
                                                const newGruas = [...formData.gruas];
                                                newGruas[index].telefono = e.target.value;
                                                handleChange('gruas', newGruas);
                                            }}
                                            placeholder="Teléfono"
                                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button
                                            onClick={() => handleChange('gruas', formData.gruas.filter((_: any, i: number) => i !== index))}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Ajustadores */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-md font-semibold text-gray-800">Ajustadores</h3>
                            <button
                                onClick={() => setFormData(prev => ({
                                    ...prev,
                                    ajustadores: [...prev.ajustadores, { nombre: '', telefono: '', aseguradora: '' }]
                                }))}
                                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Agregar
                            </button>
                        </div>
                        {formData.ajustadores.length === 0 ? (
                            <p className="text-sm text-gray-500">No hay ajustadores registrados</p>
                        ) : (
                            <div className="space-y-2">
                                {formData.ajustadores.map((ajustador: any, index: number) => (
                                    <div key={index} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={ajustador.nombre}
                                            onChange={(e) => {
                                                const newAjustadores = [...formData.ajustadores];
                                                newAjustadores[index].nombre = e.target.value;
                                                handleChange('ajustadores', newAjustadores);
                                            }}
                                            placeholder="Nombre"
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="text"
                                            value={ajustador.aseguradora}
                                            onChange={(e) => {
                                                const newAjustadores = [...formData.ajustadores];
                                                newAjustadores[index].aseguradora = e.target.value;
                                                handleChange('ajustadores', newAjustadores);
                                            }}
                                            placeholder="Aseguradora"
                                            className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                            type="tel"
                                            value={ajustador.telefono}
                                            onChange={(e) => {
                                                const newAjustadores = [...formData.ajustadores];
                                                newAjustadores[index].telefono = e.target.value;
                                                handleChange('ajustadores', newAjustadores);
                                            }}
                                            placeholder="Teléfono"
                                            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <button
                                            onClick={() => handleChange('ajustadores', formData.ajustadores.filter((_: any, i: number) => i !== index))}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Autoridades */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-3">Autoridades</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {['PNC', 'PMT', 'MP', 'Bomberos'].map(autoridad => (
                                <label key={autoridad} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.autoridades.includes(autoridad)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                handleChange('autoridades', [...formData.autoridades, autoridad]);
                                            } else {
                                                handleChange('autoridades', formData.autoridades.filter((a: string) => a !== autoridad));
                                            }
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">{autoridad}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Socorro */}
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-3">Servicios de Socorro</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {['Ambulancia', 'Cruz Roja', 'Bomberos Voluntarios', 'Bomberos Municipales'].map(socorro => (
                                <label key={socorro} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.socorro.includes(socorro)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                handleChange('socorro', [...formData.socorro, socorro]);
                                            } else {
                                                handleChange('socorro', formData.socorro.filter((s: string) => s !== socorro));
                                            }
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm">{socorro}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Otros */}
            {activeTab === 'otros' && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-md font-semibold text-gray-800 mb-4">Daños</h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.danios_materiales}
                                    onChange={(e) => handleChange('danios_materiales', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Daños Materiales</span>
                            </label>

                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={formData.danios_infraestructura}
                                    onChange={(e) => handleChange('danios_infraestructura', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Daños a Infraestructura</span>
                            </label>

                            {formData.danios_infraestructura && (
                                <div className="ml-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descripción de Daños a Infraestructura
                                    </label>
                                    <textarea
                                        value={formData.descripcion_danios_infra}
                                        onChange={(e) => handleChange('descripcion_danios_infra', e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Describa los daños..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                        <textarea
                            value={formData.observaciones}
                            onChange={(e) => handleChange('observaciones', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Observaciones adicionales..."
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
