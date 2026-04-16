import { useState, useEffect } from 'react';

interface Props {
    situacion: any;
    onDataChange: (data: any) => void;
}

export default function FormularioOtros({ situacion, onDataChange }: Props) {
    const [formData, setFormData] = useState({
        descripcion: situacion.descripcion || '',
        observaciones: situacion.observaciones || '',
        km: situacion.km || '',
        sentido: situacion.sentido || '',
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
            {/* Ubicación básica */}
            {situacion.tipo_situacion?.includes('PARADA') || situacion.tipo_situacion?.includes('COMIDA') ? (
                <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-4">Ubicación</h3>
                    <div className="grid grid-cols-2 gap-4">
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
            ) : null}

            {/* Descripción */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                </label>
                <textarea
                    value={formData.descripcion}
                    onChange={(e) => handleChange('descripcion', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción de la situación..."
                />
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
