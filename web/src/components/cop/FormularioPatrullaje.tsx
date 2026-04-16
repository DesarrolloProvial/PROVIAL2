import { useState, useEffect } from 'react';
import { geografiaAPI } from '../services/api';

interface Props {
    situacion: any;
    onDataChange: (data: any) => void;
}

export default function FormularioPatrullaje({ situacion, onDataChange }: Props) {
    const [departamentos, setDepartamentos] = useState<any[]>([]);
    const [municipios, setMunicipios] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        departamento_id: situacion.departamento_id || '',
        municipio_id: situacion.municipio_id || '',
        km: situacion.km || '',
        sentido: situacion.sentido || '',
        clima: situacion.clima || '',
        carga_vehicular: situacion.carga_vehicular || '',
        observaciones: situacion.observaciones || '',
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

    // Cargar municipios cuando cambia departamento
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

    // Notificar cambios al padre
    useEffect(() => {
        onDataChange(formData);
    }, [formData, onDataChange]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
            // Si cambia departamento, limpiar municipio
            ...(field === 'departamento_id' ? { municipio_id: '' } : {})
        }));
    };

    return (
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">Seleccione...</option>
                            {municipios.map(m => (
                                <option key={m.id} value={m.id}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kilómetro
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.km}
                            onChange={(e) => handleChange('km', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ej: 52.5"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sentido
                        </label>
                        <select
                            value={formData.sentido}
                            onChange={(e) => handleChange('sentido', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Condiciones */}
            <div>
                <h3 className="text-md font-semibold text-gray-800 mb-4">Condiciones</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Clima
                        </label>
                        <select
                            value={formData.clima}
                            onChange={(e) => handleChange('clima', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Seleccione...</option>
                            <option value="DESPEJADO">Despejado</option>
                            <option value="NUBLADO">Nublado</option>
                            <option value="LLUVIA">Lluvia</option>
                            <option value="NEBLINA">Neblina</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Carga Vehicular
                        </label>
                        <select
                            value={formData.carga_vehicular}
                            onChange={(e) => handleChange('carga_vehicular', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* Observaciones */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                </label>
                <textarea
                    value={formData.observaciones}
                    onChange={(e) => handleChange('observaciones', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Observaciones adicionales..."
                />
            </div>
        </div>
    );
}
