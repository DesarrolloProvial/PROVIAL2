import React, { useState, useEffect } from 'react';
import api from '../services/api';

interface Alerta {
  id: number;
  tipo: string;
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  estado: string;
  titulo: string;
  mensaje: string;
  datos: any;
  sede_nombre?: string;
  unidad_codigo?: string;
  brigada_nombre?: string;
  minutos_activa?: number;
  created_at: string;
}

interface ConteoAlertas {
  total: number;
  criticas: number;
  altas: number;
}

interface AlertasPanelProps {
  onAlertaClick?: (alerta: Alerta) => void;
  mostrarContador?: boolean;
  maxAlertas?: number;
}

const SEVERIDAD_COLORS: Record<string, string> = {
  CRITICA: 'bg-red-100 border-red-500 text-red-800',
  ALTA: 'bg-orange-100 border-orange-500 text-orange-800',
  MEDIA: 'bg-yellow-100 border-yellow-500 text-yellow-800',
  BAJA: 'bg-blue-100 border-blue-500 text-blue-800',
};

const SEVERIDAD_BADGES: Record<string, string> = {
  CRITICA: 'bg-red-600',
  ALTA: 'bg-orange-500',
  MEDIA: 'bg-yellow-500',
  BAJA: 'bg-blue-500',
};

const TIPO_ICONS: Record<string, string> = {
  EMERGENCIA: '🚨',
  UNIDAD_SIN_ACTIVIDAD: '🚗',
  INSPECCION_PENDIENTE: '📋',
  BRIGADA_FUERA_ZONA: '📍',
  COMBUSTIBLE_BAJO: '⛽',
  MANTENIMIENTO_REQUERIDO: '🔧',
  APROBACION_REQUERIDA: '✅',
  SISTEMA: '⚙️',
  PERSONALIZADA: '📢',
};

export default function AlertasPanel({
  onAlertaClick,
  mostrarContador = true,
  maxAlertas = 10,
}: AlertasPanelProps) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [conteo, setConteo] = useState<ConteoAlertas>({ total: 0, criticas: 0, altas: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    cargarAlertas();
    const interval = setInterval(cargarAlertas, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const cargarAlertas = async () => {
    try {
      const [alertasRes, conteoRes] = await Promise.all([
        api.get(`/alertas/mis-alertas`),
        api.get('/alertas/contador'),
      ]);
      setAlertas(alertasRes.data.slice(0, maxAlertas));
      setConteo(conteoRes.data);
      setError(null);
    } catch (err: any) {
      setError('Error cargando alertas');
      console.error('Error cargando alertas:', err);
    } finally {
      setLoading(false);
    }
  };

  const marcarComoLeida = async (alertaId: number) => {
    try {
      await api.post(`/alertas/${alertaId}/leer`);
      setAlertas((prev) => prev.filter((a) => a.id !== alertaId));
      setConteo((prev) => ({ ...prev, total: prev.total - 1 }));
    } catch (err) {
      console.error('Error marcando como leída:', err);
    }
  };

  const atenderAlerta = async (alertaId: number) => {
    try {
      await api.put(`/alertas/${alertaId}/atender`);
      cargarAlertas();
    } catch (err) {
      console.error('Error atendiendo alerta:', err);
    }
  };

  const formatearTiempo = (minutos?: number) => {
    if (!minutos) return '';
    if (minutos < 60) return `hace ${Math.round(minutos)} min`;
    if (minutos < 1440) return `hace ${Math.round(minutos / 60)}h`;
    return `hace ${Math.round(minutos / 1440)}d`;
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div
        className="p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-xl">🔔</span>
            {conteo.total > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 ${
                conteo.criticas > 0 ? 'bg-red-600' : conteo.altas > 0 ? 'bg-orange-500' : 'bg-blue-600'
              } text-white text-xs font-bold rounded-full flex items-center justify-center`}>
                {conteo.total > 9 ? '9+' : conteo.total}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Alertas</h3>
            <p className="text-xs text-gray-500">
              {conteo.total === 0
                ? 'Sin alertas pendientes'
                : `${conteo.total} alerta${conteo.total > 1 ? 's' : ''} activa${conteo.total > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Lista de alertas */}
      {expanded && (
        <div className="max-h-96 overflow-y-auto">
          {alertas.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <span className="text-3xl mb-2 block">✨</span>
              <p>No hay alertas pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {alertas.map((alerta) => (
                <div
                  key={alerta.id}
                  className={`p-4 hover:bg-gray-50 transition border-l-4 ${
                    SEVERIDAD_COLORS[alerta.severidad] || SEVERIDAD_COLORS.MEDIA
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">
                      {TIPO_ICONS[alerta.tipo] || '📢'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 truncate">
                          {alerta.titulo}
                        </h4>
                        <span className={`px-1.5 py-0.5 text-xs font-medium text-white rounded ${
                          SEVERIDAD_BADGES[alerta.severidad] || SEVERIDAD_BADGES.MEDIA
                        }`}>
                          {alerta.severidad}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                        {alerta.mensaje}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400">
                          {formatearTiempo(alerta.minutos_activa)}
                        </span>
                        {alerta.unidad_codigo && (
                          <span className="text-xs text-gray-500">
                            Unidad: {alerta.unidad_codigo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            atenderAlerta(alerta.id);
                          }}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Atender
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            marcarComoLeida(alerta.id);
                          }}
                          className="text-xs px-2 py-1 text-gray-600 hover:text-gray-800"
                        >
                          Descartar
                        </button>
                        {onAlertaClick && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAlertaClick(alerta);
                            }}
                            className="text-xs px-2 py-1 text-blue-600 hover:text-blue-800"
                          >
                            Ver detalle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {alertas.length > 0 && (
            <div className="p-3 border-t border-gray-100 text-center">
              <a
                href="/alertas"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Ver todas las alertas →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Indicadores rápidos cuando está colapsado */}
      {!expanded && conteo.total > 0 && (
        <div className="px-4 py-2 flex items-center gap-2 text-xs">
          {conteo.criticas > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
              {conteo.criticas} crítica{conteo.criticas > 1 ? 's' : ''}
            </span>
          )}
          {conteo.altas > 0 && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">
              {conteo.altas} alta{conteo.altas > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
