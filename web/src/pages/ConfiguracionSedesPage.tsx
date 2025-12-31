/**
 * Página de Configuración Visual de Sedes
 * Permite personalizar colores y tipografía por sede
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  asignacionesAvanzadasAPI,
  ConfiguracionVisualSede
} from '../services/asignacionesAvanzadas.service';
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Palette,
  Type,
  Bell
} from 'lucide-react';

export default function ConfiguracionSedesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sedeEditando, setSedeEditando] = useState<number | null>(null);
  const [configTemp, setConfigTemp] = useState<Partial<ConfiguracionVisualSede>>({});

  // Obtener configuraciones
  const { data: configuraciones, isLoading } = useQuery({
    queryKey: ['configuraciones-sedes'],
    queryFn: asignacionesAvanzadasAPI.getAllConfiguracionesSede
  });

  // Mutation para guardar
  const saveMutation = useMutation({
    mutationFn: ({ sedeId, config }: { sedeId: number; config: Partial<ConfiguracionVisualSede> }) =>
      asignacionesAvanzadasAPI.updateConfiguracionSede(sedeId, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuraciones-sedes'] });
      setSedeEditando(null);
      setConfigTemp({});
    }
  });

  const iniciarEdicion = (config: ConfiguracionVisualSede) => {
    setSedeEditando(config.sede_id);
    setConfigTemp({
      color_fondo: config.color_fondo,
      color_fondo_header: config.color_fondo_header,
      color_texto: config.color_texto,
      color_acento: config.color_acento,
      fuente: config.fuente,
      tamano_fuente: config.tamano_fuente,
      alerta_rotacion_rutas_activa: config.alerta_rotacion_rutas_activa,
      umbral_rotacion_rutas: config.umbral_rotacion_rutas
    });
  };

  const guardarCambios = () => {
    if (sedeEditando) {
      saveMutation.mutate({ sedeId: sedeEditando, config: configTemp });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configuracion Visual de Sedes
                </h1>
                <p className="text-sm text-gray-500">
                  Personaliza colores, tipografia y alertas para cada sede
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {configuraciones?.map((config: any) => (
              <div
                key={config.sede_id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                {/* Preview */}
                <div
                  className="p-4"
                  style={{
                    backgroundColor: sedeEditando === config.sede_id
                      ? configTemp.color_fondo
                      : config.color_fondo,
                    color: sedeEditando === config.sede_id
                      ? configTemp.color_texto
                      : config.color_texto
                  }}
                >
                  <div
                    className="p-3 rounded mb-3"
                    style={{
                      backgroundColor: sedeEditando === config.sede_id
                        ? configTemp.color_fondo_header
                        : config.color_fondo_header
                    }}
                  >
                    <h3
                      className="font-bold"
                      style={{
                        fontFamily: sedeEditando === config.sede_id
                          ? configTemp.fuente
                          : config.fuente
                      }}
                    >
                      {config.sede_nombre || `Sede ${config.sede_id}`}
                    </h3>
                  </div>
                  <div className="text-sm">
                    Vista previa del estilo
                    <span
                      className="ml-2 px-2 py-0.5 rounded text-white text-xs"
                      style={{
                        backgroundColor: sedeEditando === config.sede_id
                          ? configTemp.color_acento
                          : config.color_acento
                      }}
                    >
                      Acento
                    </span>
                  </div>
                </div>

                {/* Formulario */}
                {sedeEditando === config.sede_id ? (
                  <div className="p-4 space-y-4 border-t">
                    {/* Colores */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Palette className="w-4 h-4" />
                        Colores
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Fondo</label>
                          <input
                            type="color"
                            value={configTemp.color_fondo || '#ffffff'}
                            onChange={(e) => setConfigTemp({ ...configTemp, color_fondo: e.target.value })}
                            className="w-full h-8 cursor-pointer rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Header</label>
                          <input
                            type="color"
                            value={configTemp.color_fondo_header || '#f3f4f6'}
                            onChange={(e) => setConfigTemp({ ...configTemp, color_fondo_header: e.target.value })}
                            className="w-full h-8 cursor-pointer rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Texto</label>
                          <input
                            type="color"
                            value={configTemp.color_texto || '#1f2937'}
                            onChange={(e) => setConfigTemp({ ...configTemp, color_texto: e.target.value })}
                            className="w-full h-8 cursor-pointer rounded"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Acento</label>
                          <input
                            type="color"
                            value={configTemp.color_acento || '#3b82f6'}
                            onChange={(e) => setConfigTemp({ ...configTemp, color_acento: e.target.value })}
                            className="w-full h-8 cursor-pointer rounded"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tipografía */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Type className="w-4 h-4" />
                        Tipografia
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Fuente</label>
                          <select
                            value={configTemp.fuente || 'Inter'}
                            onChange={(e) => setConfigTemp({ ...configTemp, fuente: e.target.value })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="Inter">Inter</option>
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Tamano</label>
                          <select
                            value={configTemp.tamano_fuente || 'normal'}
                            onChange={(e) => setConfigTemp({ ...configTemp, tamano_fuente: e.target.value as any })}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            <option value="small">Pequeno</option>
                            <option value="normal">Normal</option>
                            <option value="large">Grande</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Alertas */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Bell className="w-4 h-4" />
                        Alertas de Rotacion
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={configTemp.alerta_rotacion_rutas_activa ?? true}
                            onChange={(e) => setConfigTemp({
                              ...configTemp,
                              alerta_rotacion_rutas_activa: e.target.checked
                            })}
                            className="rounded"
                          />
                          <span className="text-sm">Alertar rotacion de rutas</span>
                        </label>
                        {configTemp.alerta_rotacion_rutas_activa && (
                          <div>
                            <label className="text-xs text-gray-500">
                              Umbral (veces en misma ruta)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={configTemp.umbral_rotacion_rutas || 3}
                              onChange={(e) => setConfigTemp({
                                ...configTemp,
                                umbral_rotacion_rutas: parseInt(e.target.value)
                              })}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => {
                          setSedeEditando(null);
                          setConfigTemp({});
                        }}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={guardarCambios}
                        disabled={saveMutation.isPending}
                        className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t">
                    <button
                      onClick={() => iniciarEdicion(config)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <Palette className="w-4 h-4" />
                      Editar configuracion
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
