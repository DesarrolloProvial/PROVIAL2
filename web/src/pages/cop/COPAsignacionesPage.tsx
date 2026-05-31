import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Play, AlertTriangle, Users, MapPin, Clock } from 'lucide-react';
import COPSalidaEmergenciaModal from '../../components/cop/forms/COPSalidaEmergenciaModal';
import IniciarDesdAsignacionModal from '../../components/cop/forms/IniciarDesdeAsignacionModal';

interface Asignacion {
  asignacion_id: number;
  turno_id: number;
  fecha: string;
  unidad_id: number;
  unidad_codigo: string;
  tipo_unidad: string;
  ruta_codigo: string;
  ruta_nombre: string;
  km_inicio: number | null;
  km_final: number | null;
  hora_salida: string | null;
  en_ruta: boolean;
  salida_estado: string | null;
  salida_id: number | null;
  sede_nombre: string;
  tripulacion: Array<{ usuario_id: number; nombre_completo: string; chapa: string; rol_tripulacion: string }>;
}

interface SedeAsignaciones {
  sede_id: number;
  sede_nombre: string;
  asignaciones: Asignacion[];
}

function estadoBadge(en_ruta: boolean, salida_estado: string | null) {
  if (en_ruta)               return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">En ruta</span>;
  if (salida_estado === 'FINALIZADA') return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Finalizada</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pendiente salida</span>;
}

export default function COPAsignacionesPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [emergenciaOpen, setEmergenciaOpen] = useState(false);
  const [asignacionParaIniciar, setAsignacionParaIniciar] = useState<Asignacion | null>(null);

  const hoy = new Date().toISOString().split('T')[0];

  const { data, isLoading, error } = useQuery<SedeAsignaciones[]>({
    queryKey: ['cop-asignaciones', hoy],
    queryFn: async () => {
      const res = await api.get(`/asignaciones-avanzadas/por-sede?fecha=${hoy}`);
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const pendientes = data?.flatMap(sede =>
    sede.asignaciones
      .filter(a => !a.en_ruta && a.salida_estado !== 'FINALIZADA' && a.unidad_id)
      .map(a => ({ ...a, sede_nombre: sede.sede_nombre }))
  ) ?? [];

  const enRuta = data?.flatMap(sede =>
    sede.asignaciones
      .filter(a => a.en_ruta)
      .map(a => ({ ...a, sede_nombre: sede.sede_nombre }))
  ) ?? [];

  const onSalidaCreada = () => {
    qc.invalidateQueries({ queryKey: ['cop-asignaciones'] });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Salidas del día</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{hoy}</p>
          </div>
          <button
            onClick={() => setEmergenciaOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition"
          >
            <AlertTriangle className="w-4 h-4" />
            Salida de emergencia
          </button>
        </div>

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            Error al cargar asignaciones.
          </div>
        )}

        {/* Pendientes de salida */}
        {pendientes.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Listas para salir ({pendientes.length})
            </h2>
            <div className="space-y-3">
              {pendientes.map(a => (
                <div key={a.asignacion_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-white text-lg">{a.unidad_codigo}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{a.tipo_unidad}</span>
                        {estadoBadge(a.en_ruta, a.salida_estado)}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-3.5 h-3.5" />
                        {a.ruta_codigo} — {a.ruta_nombre}
                        {a.km_inicio && <span className="ml-1 text-gray-400">km {a.km_inicio}–{a.km_final}</span>}
                      </div>
                      {a.hora_salida && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          Hora programada: {a.hora_salida}
                        </div>
                      )}
                      {a.tripulacion?.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Users className="w-3.5 h-3.5" />
                          {a.tripulacion.map(t => `${t.nombre_completo} (${t.rol_tripulacion})`).join(' · ')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setAsignacionParaIniciar(a)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition whitespace-nowrap"
                    >
                      <Play className="w-4 h-4" />
                      Dar salida
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* En ruta */}
        {enRuta.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              En ruta ({enRuta.length})
            </h2>
            <div className="space-y-2">
              {enRuta.map(a => (
                <div key={a.asignacion_id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 opacity-75">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{a.unidad_codigo}</span>
                  {estadoBadge(a.en_ruta, a.salida_estado)}
                  <span className="text-sm text-gray-500">{a.ruta_codigo}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!isLoading && pendientes.length === 0 && enRuta.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-600">
            No hay asignaciones publicadas para hoy.
          </div>
        )}
      </div>

      <COPSalidaEmergenciaModal
        isOpen={emergenciaOpen}
        onClose={() => setEmergenciaOpen(false)}
        onCreated={onSalidaCreada}
      />

      {asignacionParaIniciar && (
        <IniciarDesdeAsignacionModal
          asignacion={asignacionParaIniciar}
          onClose={() => setAsignacionParaIniciar(null)}
          onCreated={() => { setAsignacionParaIniciar(null); onSalidaCreada(); }}
        />
      )}
    </div>
  );
}
