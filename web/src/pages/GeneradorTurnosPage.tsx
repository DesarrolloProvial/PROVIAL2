import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { generadorService } from '../services/generador.service';
import type { SugerenciaAsignacion, ParametrosGenerador } from '../services/generador.service';
import { ArrowLeft, Sparkles, Users, Truck, CheckCircle, AlertCircle, Info, Settings, Shield, Home } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

export default function GeneradorTurnosPage() {
  const navigate = useNavigate();

  // Estado del formulario de parámetros
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [numUnidades, setNumUnidades] = useState(5);
  const [tripulantesPorUnidad, setTripulantesPorUnidad] = useState(3);
  const [incluirGarita, setIncluirGarita] = useState(true);
  const [incluirEncargadoRuta, setIncluirEncargadoRuta] = useState(true);
  const [priorizarDescanso, setPriorizarDescanso] = useState(true);
  const [priorizarEquidad, setPriorizarEquidad] = useState(true);
  const [minDiasDescanso, setMinDiasDescanso] = useState(1);
  const [considerarPatronTrabajo, setConsiderarPatronTrabajo] = useState(true);

  // Estado de sugerencias
  const [sugerencias, setSugerencias] = useState<SugerenciaAsignacion[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  // Mutation para generar sugerencias
  const generarMutation = useMutation({
    mutationFn: (params: ParametrosGenerador) =>
      generadorService.generarSugerencias(params),
    onSuccess: (response) => {
      setSugerencias(response.data);
    },
    onError: (error: any) => {
      alert(`Error al generar sugerencias: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleGenerar = () => {
    const params: ParametrosGenerador = {
      fecha,
      num_unidades: numUnidades,
      tripulantes_por_unidad: tripulantesPorUnidad,
      incluir_garita: incluirGarita,
      incluir_encargado_ruta: incluirEncargadoRuta,
      priorizar_descanso: priorizarDescanso,
      priorizar_equidad: priorizarEquidad,
      min_dias_descanso: minDiasDescanso,
      considerar_patron_trabajo: considerarPatronTrabajo,
    };

    generarMutation.mutate(params);
  };

  const getPrioridadColor = (prioridad: 'ALTA' | 'MEDIA' | 'BAJA') => {
    switch (prioridad) {
      case 'ALTA':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400 border-green-300 dark:border-green-700';
      case 'MEDIA':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700';
      case 'BAJA':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/operaciones')}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 dark:text-gray-300" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Generador Automático de Turnos
                </h1>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sistema inteligente para sugerir asignaciones óptimas
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Configuración */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Parámetros</h2>
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Settings className="h-5 w-5 dark:text-gray-300" />
                </button>
              </div>

              <div className={`space-y-4 ${showConfig ? 'block' : 'hidden lg:block'}`}>
                {/* Fecha */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fecha del turno
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                {/* Número de unidades */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Número de unidades a asignar
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={numUnidades}
                    onChange={(e) => setNumUnidades(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                </div>

                {/* Tripulantes por unidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Brigadas por tripulación
                  </label>
                  <select
                    value={tripulantesPorUnidad}
                    onChange={(e) => setTripulantesPorUnidad(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value={2}>2 brigadas (Piloto + Copiloto)</option>
                    <option value={3}>3 brigadas (Piloto + Copiloto + Acompañante)</option>
                    <option value={4}>4 brigadas</option>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Cantidad de brigadas que conformarán cada tripulación
                  </p>
                </div>

                {/* Días mínimos de descanso */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Días mínimos de descanso
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    value={minDiasDescanso}
                    onChange={(e) => setMinDiasDescanso(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Mínimo de días que debe haber pasado desde el último turno
                  </p>
                </div>

                {/* Incluir garita */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="incluir-garita"
                    checked={incluirGarita}
                    onChange={(e) => setIncluirGarita(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="incluir-garita" className="text-sm text-gray-700 dark:text-gray-300">
                    Incluir asignación de GARITA (2 brigadas)
                  </label>
                </div>

                {/* Incluir encargado ruta */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="incluir-encargado-ruta"
                    checked={incluirEncargadoRuta}
                    onChange={(e) => setIncluirEncargadoRuta(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="incluir-encargado-ruta" className="text-sm text-gray-700 dark:text-gray-300">
                    Incluir ENCARGADO DE RUTA
                  </label>
                </div>

                {/* Considerar patrón de trabajo */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="considerar-patron"
                    checked={considerarPatronTrabajo}
                    onChange={(e) => setConsiderarPatronTrabajo(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="considerar-patron" className="text-sm text-gray-700 dark:text-gray-300">
                    Considerar patrones de trabajo (pilotos/agentes)
                  </label>
                </div>

                {/* Priorizar descanso */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="priorizar-descanso"
                    checked={priorizarDescanso}
                    onChange={(e) => setPriorizarDescanso(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="priorizar-descanso" className="text-sm text-gray-700 dark:text-gray-300">
                    Priorizar brigadas con más descanso
                  </label>
                </div>

                {/* Priorizar equidad */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="priorizar-equidad"
                    checked={priorizarEquidad}
                    onChange={(e) => setPriorizarEquidad(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="priorizar-equidad" className="text-sm text-gray-700 dark:text-gray-300">
                    Priorizar distribución equitativa
                  </label>
                </div>

                {/* Botón Generar */}
                <button
                  onClick={handleGenerar}
                  disabled={generarMutation.isPending}
                  className="w-full mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  {generarMutation.isPending ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generar Sugerencias
                    </>
                  )}
                </button>

                {/* Info */}
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-medium mb-1">¿Cómo funciona?</p>
                      <p className="text-xs mb-2">
                        El algoritmo considera días de descanso, equidad en turnos, combustible disponible y roles frecuentes para generar asignaciones óptimas.
                      </p>
                      <p className="text-xs">
                        <strong>Patrones de trabajo:</strong> Los pilotos trabajan casi todos los días, mientras que los agentes normalmente trabajan 1 día sí y 1 día no. GARITA es menos demandante (casi como descanso).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel de Sugerencias */}
          <div className="lg:col-span-2">
            {sugerencias.length === 0 && !generarMutation.isPending ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <Sparkles className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sin sugerencias generadas
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Configura los parámetros y genera sugerencias automáticas de asignación
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header con resultados */}
                {sugerencias.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {sugerencias.length} sugerencia{sugerencias.length !== 1 ? 's' : ''} generada{sugerencias.length !== 1 ? 's' : ''}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Fecha: {new Date(fecha).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 text-sm font-medium rounded-full">
                          {sugerencias.filter(s => s.prioridad === 'ALTA').length} alta
                        </span>
                        <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 text-sm font-medium rounded-full">
                          {sugerencias.filter(s => s.prioridad === 'MEDIA').length} media
                        </span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 text-sm font-medium rounded-full">
                          {sugerencias.filter(s => s.prioridad === 'BAJA').length} baja
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de sugerencias */}
                {sugerencias.map((sugerencia, index) => {
                  // Determinar estilo según el tipo
                  const getHeaderStyle = () => {
                    switch (sugerencia.tipo) {
                      case 'GARITA':
                        return {
                          bgColor: 'bg-green-100 dark:bg-green-900/30',
                          iconColor: 'text-green-600',
                          icon: Home,
                          title: 'GARITA',
                        };
                      case 'ENCARGADO_RUTA':
                        return {
                          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
                          iconColor: 'text-purple-600',
                          icon: Shield,
                          title: 'ENCARGADO DE RUTA',
                        };
                      default:
                        return {
                          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
                          iconColor: 'text-blue-600',
                          icon: Truck,
                          title: sugerencia.unidad_codigo || 'Unidad',
                        };
                    }
                  };

                  const headerStyle = getHeaderStyle();
                  const Icon = headerStyle.icon;

                  return (
                    <div
                      key={`${sugerencia.tipo}-${sugerencia.unidad_id || index}`}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
                    >
                      {/* Header de la sugerencia */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 ${headerStyle.bgColor} rounded-lg`}>
                            <Icon className={`h-6 w-6 ${headerStyle.iconColor}`} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {headerStyle.title}
                            </h3>
                            {sugerencia.tipo === 'UNIDAD' && sugerencia.combustible_actual != null && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Combustible: {typeof sugerencia.combustible_actual === 'number' ? sugerencia.combustible_actual.toFixed(1) : '0.0'}L
                              </p>
                            )}
                            {sugerencia.tipo === 'GARITA' && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Asignación menos demandante
                              </p>
                            )}
                            {sugerencia.tipo === 'ENCARGADO_RUTA' && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Supervisor con permisos especiales
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`px-3 py-1 text-sm font-medium rounded-full border ${getPrioridadColor(
                              sugerencia.prioridad
                            )}`}
                          >
                            {sugerencia.prioridad}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Score: {sugerencia.score.toFixed(0)}
                          </span>
                        </div>
                      </div>

                    {/* Tripulación sugerida */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Tripulación sugerida:
                        </p>
                      </div>
                      <div className="space-y-2">
                        {sugerencia.tripulacion.map((tripulante) => (
                          <div
                            key={tripulante.usuario_id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {tripulante.nombre_completo}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  ({tripulante.chapa})
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {tripulante.dias_descanso} días descanso
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {tripulante.turnos_mes} turnos/mes
                              </span>
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 text-xs font-medium rounded">
                                {tripulante.rol_sugerido}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Razones */}
                    <div className="border-t dark:border-gray-700 pt-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Razones:</p>
                      <div className="flex flex-wrap gap-2">
                        {sugerencia.razones.map((razon, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full flex items-center gap-1"
                          >
                            {razon.includes('óptimo') || razon.includes('completa') ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : razon.includes('bajo') || razon.includes('Solo') ? (
                              <AlertCircle className="h-3 w-3 text-yellow-600" />
                            ) : (
                              <Info className="h-3 w-3 text-blue-600" />
                            )}
                            {razon}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Botón para aplicar */}
                    <div className="mt-4 pt-4 border-t dark:border-gray-700">
                      <button
                        onClick={() =>
                          navigate('/operaciones/crear-asignacion', {
                            state: { sugerencia, fecha },
                          })
                        }
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Usar esta asignación
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
