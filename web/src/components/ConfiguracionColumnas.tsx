import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { administracionAPI } from '../services/administracion.service';
import { Settings, GripVertical, Eye, EyeOff, Save, X, RotateCcw } from 'lucide-react';

interface ConfiguracionColumnasProps {
  tabla: 'brigadas' | 'unidades';
  sedeId?: number;
  onColumnasChange?: (columnas: string[]) => void;
  modo?: 'boton' | 'inline';
}

export default function ConfiguracionColumnas({
  tabla,
  sedeId,
  onColumnasChange,
  modo = 'boton'
}: ConfiguracionColumnasProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Obtener columnas disponibles
  const { data: disponibles } = useQuery({
    queryKey: ['columnas-disponibles', tabla],
    queryFn: () => administracionAPI.getColumnasDisponibles(tabla).then(r => r.data),
    staleTime: 1000 * 60 * 30, // 30 minutos
  });

  // Obtener configuracion actual
  const { data: config, isLoading } = useQuery({
    queryKey: ['configuracion-columnas', tabla, sedeId],
    queryFn: () => administracionAPI.getConfiguracionColumnas(tabla, sedeId).then(r => r.data),
  });

  // Sincronizar estado local con datos del servidor
  useEffect(() => {
    if (config) {
      setColumnasSeleccionadas(config.columnas_visibles);
      setHasChanges(false);
    }
  }, [config]);

  // Notificar cambios al padre
  useEffect(() => {
    if (onColumnasChange && columnasSeleccionadas.length > 0) {
      onColumnasChange(columnasSeleccionadas);
    }
  }, [columnasSeleccionadas, onColumnasChange]);

  // Mutacion para guardar
  const guardarMutation = useMutation({
    mutationFn: (columnas: string[]) =>
      administracionAPI.setConfiguracionColumnas(tabla, {
        sede_id: sedeId ?? null,
        columnas_visibles: columnas,
        orden_columnas: columnas,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['configuracion-columnas', tabla] });
      setHasChanges(false);
      setIsOpen(false);
    },
  });

  const toggleColumna = (key: string) => {
    setColumnasSeleccionadas(prev => {
      const newCols = prev.includes(key)
        ? prev.filter(c => c !== key)
        : [...prev, key];
      setHasChanges(true);
      return newCols;
    });
  };

  const resetearDefault = () => {
    if (disponibles) {
      const defaultCols = disponibles.columnas.map(c => c.key);
      setColumnasSeleccionadas(defaultCols);
      setHasChanges(true);
    }
  };

  const handleGuardar = () => {
    if (columnasSeleccionadas.length === 0) {
      alert('Debe seleccionar al menos una columna');
      return;
    }
    guardarMutation.mutate(columnasSeleccionadas);
  };

  if (isLoading) return null;

  // Modo inline - solo retorna las columnas
  if (modo === 'inline') {
    return null;
  }

  return (
    <>
      {/* Boton para abrir configuracion */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Configurar columnas"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Modal de configuracion */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configurar Columnas
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-white/80 mt-1">
                {tabla === 'brigadas' ? 'Tabla de Brigadas' : 'Tabla de Unidades'}
              </p>
            </div>

            {/* Contenido */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {disponibles?.columnas.map((col) => {
                  const isSelected = columnasSeleccionadas.includes(col.key);
                  return (
                    <div
                      key={col.key}
                      onClick={() => toggleColumna(col.key)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border-2 border-indigo-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <Eye className="w-5 h-5 text-indigo-600" />
                        ) : (
                          <EyeOff className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium text-gray-900">{col.label}</div>
                        <div className="text-xs text-gray-500">{col.descripcion}</div>
                      </div>
                      <div className="flex-shrink-0 text-gray-300">
                        <GripVertical className="w-5 h-5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <button
                onClick={resetearDefault}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={!hasChanges || guardarMutation.isPending || columnasSeleccionadas.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {guardarMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook para usar la configuracion de columnas
export function useConfiguracionColumnas(tabla: 'brigadas' | 'unidades', sedeId?: number) {
  const { data, isLoading } = useQuery({
    queryKey: ['configuracion-columnas', tabla, sedeId],
    queryFn: () => administracionAPI.getConfiguracionColumnas(tabla, sedeId).then(r => r.data),
  });

  return {
    columnasVisibles: data?.columnas_visibles ?? [],
    ordenColumnas: data?.orden_columnas ?? [],
    esDefault: data?.es_default ?? true,
    isLoading,
  };
}
