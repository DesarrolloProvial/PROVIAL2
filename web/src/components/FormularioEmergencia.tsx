import { useState, useEffect } from 'react';

interface Props {
    situacion: any;
    onDataChange: (data: any) => void;
}

export default function FormularioEmergencia({ situacion, onDataChange }: Props) {
    const [formData, setFormData] = useState({
        descripcion: situacion.descripcion || '',
        km: situacion.km || '',
        sentido: situacion.sentido || '',
        tipo_emergencia: situacion.tipo_emergencia || '',
        nivel_gravedad: situacion.nivel_gravedad || 'MEDIA',
        recursos_necesarios: situacion.recursos_necesarios || '',
        personas_afectadas: situacion.personas_afectadas || 0,
        obstruccion_via: situacion.obstruccion_via || 'NO',
        observaciones: situacion.observaciones || '',
    });

    // Notificar cambios al padre
    useEffect(() => {
        onDataChange(formData);
    }, [formData, onDataChange]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="space-y-6">
            {/* Tipo de Emergencia */}
            <div>
                <h3 className="text-md font-semibold text-gray-800 mb-4">Tipo de Emergencia</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo *
                        </label>
                        <select
                            value={formData.tipo_emergencia}
                            onChange={(e) => handleChange('tipo_emergencia', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Seleccione...</option>
                            <option value="OBSTACULO">Obstáculo en Vía</option>
                            <option value="DERRUMBE">Derrumbe</option>
                            <option value="INUNDACION">Inundación</option>
                            <option value="INCENDIO">Incendio</option>
                            <option value="ARBOL_CAIDO">Árbol Caído</option>
                            <option value="EMERGENCIA_MEDICA">Emergencia Médica</option>
                            <option value="OTRO">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nivel de Gravedad
                        </label>
                        <select
                            value={formData.nivel_gravedad}
                            onChange={(e) => handleChange('nivel_gravedad', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="BAJA">Baja</option>
                            <option value="MEDIA">Media</option>
                            <option value="ALTA">Alta</option>
                            <option value="CRITICA">Crítica</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Ubicación */}
            <div>
                <h3 className="text-md font-semibold text-gray-800 mb-4">Ubicación</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kilómetro</label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.km}
                            onChange={(e) => handleChange('km', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Ej: 52.5"
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
                            <option value="AMBOS">Ambos Sentidos</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Obstrucción de Vía
                        </label>
                        <select
                            value={formData.obstruccion_via}
                            onChange={(e) => handleChange('obstruccion_via', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="NO">No</option>
                            <option value="PARCIAL">Parcial</option>
                            <option value="TOTAL">Total</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Personas Afectadas
                        </label>
                        <input
                            type="number"
                            value={formData.personas_afectadas}
                            onChange={(e) => handleChange('personas_afectadas', Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="0"
                        />
                    </div>
                </div>
            </div>

            {/* Descripción y Recursos */}
            <div>
                <h3 className="text-md font-semibold text-gray-800 mb-4">Detalles</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción de la Emergencia *
                        </label>
                        <textarea
                            value={formData.descripcion}
                            onChange={(e) => handleChange('descripcion', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Describa la emergencia en detalle..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Recursos Necesarios
                        </label>
                        <textarea
                            value={formData.recursos_necesarios}
                            onChange={(e) => handleChange('recursos_necesarios', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Ej: Ambulancia, bomba de maquinaria, grúa..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observaciones Adicionales
                        </label>
                        <textarea
                            value={formData.observaciones}
                            onChange={(e) => handleChange('observaciones', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Observaciones adicionales..."
                        />
                    </div>
                </div>
            </div>

            {/* Alertas según nivel de gravedad */}
            {(formData.nivel_gravedad === 'ALTA' || formData.nivel_gravedad === 'CRITICA') && (
                <div className={`p-4 rounded-lg border ${formData.nivel_gravedad === 'CRITICA'
                        ? 'bg-red-50 border-red-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                    <p className={`text-sm font-medium ${formData.nivel_gravedad === 'CRITICA' ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                        ⚠️ Emergencia de Nivel {formData.nivel_gravedad}
                    </p>
                    <p className={`text-sm mt-1 ${formData.nivel_gravedad === 'CRITICA' ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                        {formData.nivel_gravedad === 'CRITICA'
                            ? 'Se requiere atención inmediata y coordinación con múltiples instancias.'
                            : 'Se recomienda respuesta prioritaria y  coordinación con autoridades.'}
                    </p>
                </div>
            )}
        </div>
    );
}
