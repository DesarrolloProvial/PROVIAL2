/**
 * Página de Gestión de Situaciones Fijas
 * Para crear y gestionar situaciones recurrentes (ampliación carril, regulaciones, etc)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  asignacionesAvanzadasAPI,
  SituacionFija
} from '../services/asignacionesAvanzadas.service';
import { geografiaAPI } from '../services/api';
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Clock,
  Calendar,
  AlertTriangle,
  X,
  Save
} from 'lucide-react';

const TIPOS_SITUACION = [
  { value: 'AMPLIACION_CARRIL', label: 'Ampliacion de Carril' },
  { value: 'OBRA', label: 'Obra en Via' },
  { value: 'EVENTO', label: 'Evento Especial' },
  { value: 'REGULACION', label: 'Regulacion de Trafico' },
  { value: 'OTRO', label: 'Otro' }
];

const DIAS_SEMANA = [
  'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'
];

export default function SituacionesFijasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filtroSede] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState<SituacionFija | null>(null);
  const [form, setForm] = useState<Partial<SituacionFija>>({
    titulo: '',
    descripcion: '',
    tipo: 'REGULACION',
    fecha_inicio: new Date().toISOString().split('T')[0],
    dias_semana: [],
    activa: true
  });

  // Queries
  const { data: situaciones, isLoading } = useQuery({
    queryKey: ['situaciones-fijas', filtroSede],
    queryFn: () => asignacionesAvanzadasAPI.getSituacionesFijas(filtroSede || undefined, true)
  });

  const { data: rutas } = useQuery({
    queryKey: ['rutas'],
    queryFn: () => geografiaAPI.getRutas()
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<SituacionFija>) => asignacionesAvanzadasAPI.createSituacionFija(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-fijas'] });
      cerrarModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SituacionFija> }) =>
      asignacionesAvanzadasAPI.updateSituacionFija(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-fijas'] });
      cerrarModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => asignacionesAvanzadasAPI.deleteSituacionFija(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['situaciones-fijas'] });
    }
  });

  const abrirModal = (situacion?: SituacionFija) => {
    if (situacion) {
      setEditando(situacion);
      setForm({
        titulo: situacion.titulo,
        descripcion: situacion.descripcion || '',
        tipo: situacion.tipo,
        ruta_id: situacion.ruta_id || undefined,
        km_inicio: situacion.km_inicio || undefined,
        km_fin: situacion.km_fin || undefined,
        punto_referencia: situacion.punto_referencia || '',
        hora_inicio: situacion.hora_inicio || '',
        hora_fin: situacion.hora_fin || '',
        dias_semana: situacion.dias_semana || [],
        fecha_inicio: situacion.fecha_inicio?.split('T')[0] || '',
        fecha_fin: situacion.fecha_fin?.split('T')[0] || '',
        observaciones: situacion.observaciones || '',
        puntos_destacar: situacion.puntos_destacar || '',
        requiere_unidad_especifica: situacion.requiere_unidad_especifica,
        unidad_tipo_requerido: situacion.unidad_tipo_requerido || ''
      });
    } else {
      setEditando(null);
      setForm({
        titulo: '',
        descripcion: '',
        tipo: 'REGULACION',
        fecha_inicio: new Date().toISOString().split('T')[0],
        dias_semana: [],
        activa: true
      });
    }
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setEditando(null);
    setForm({});
  };

  const guardar = () => {
    if (editando) {
      updateMutation.mutate({ id: editando.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleDia = (dia: string) => {
    const dias = form.dias_semana || [];
    if (dias.includes(dia)) {
      setForm({ ...form, dias_semana: dias.filter(d => d !== dia) });
    } else {
      setForm({ ...form, dias_semana: [...dias, dia] });
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
                  Situaciones Fijas
                </h1>
                <p className="text-sm text-gray-500">
                  Gestiona situaciones recurrentes (ampliaciones, obras, regulaciones)
                </p>
              </div>
            </div>

            <button
              onClick={() => abrirModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nueva Situacion
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Cargando...</div>
        ) : !situaciones || situaciones.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay situaciones fijas registradas</p>
            <button
              onClick={() => abrirModal()}
              className="mt-4 text-blue-600 hover:underline"
            >
              Crear la primera
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {situaciones.map((situacion) => (
              <div
                key={situacion.id}
                className={`bg-white rounded-lg shadow p-4 border-l-4 ${situacion.activa ? 'border-green-500' : 'border-gray-300'
                  }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{situacion.titulo}</h3>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                      {TIPOS_SITUACION.find(t => t.value === situacion.tipo)?.label || situacion.tipo}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirModal(situacion)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Desactivar esta situacion?')) {
                          deleteMutation.mutate(situacion.id);
                        }
                      }}
                      className="p-1 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {situacion.descripcion && (
                  <p className="text-sm text-gray-600 mb-2">{situacion.descripcion}</p>
                )}

                <div className="space-y-1 text-sm text-gray-500">
                  {situacion.ruta_nombre && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{situacion.ruta_nombre}</span>
                      {situacion.km_inicio && (
                        <span>km {situacion.km_inicio} - {situacion.km_fin}</span>
                      )}
                    </div>
                  )}

                  {(situacion.hora_inicio || situacion.hora_fin) && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{situacion.hora_inicio} - {situacion.hora_fin}</span>
                    </div>
                  )}

                  {situacion.dias_semana && situacion.dias_semana.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {situacion.dias_semana.map(dia => (
                        <span key={dia} className="text-xs px-1 bg-blue-50 text-blue-700 rounded">
                          {dia.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-2">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(situacion.fecha_inicio).toLocaleDateString()}
                      {situacion.fecha_fin && ` - ${new Date(situacion.fecha_fin).toLocaleDateString()}`}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t text-xs text-gray-400">
                  {situacion.sede_nombre} • Por: {situacion.creador_nombre}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {editando ? 'Editar Situacion Fija' : 'Nueva Situacion Fija'}
              </h2>
              <button onClick={cerrarModal}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Titulo y Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titulo *
                  </label>
                  <input
                    type="text"
                    value={form.titulo || ''}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: Regulacion Aeropuerto La Aurora"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={form.tipo || 'REGULACION'}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {TIPOS_SITUACION.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ruta
                  </label>
                  <select
                    value={form.ruta_id || ''}
                    onChange={(e) => setForm({ ...form, ruta_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Sin ruta especifica</option>
                    {rutas?.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.codigo} - {r.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripcion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripcion
                </label>
                <textarea
                  value={form.descripcion || ''}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Descripcion breve de la situacion..."
                />
              </div>

              {/* Ubicacion */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Km Inicio
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.km_inicio || ''}
                    onChange={(e) => setForm({ ...form, km_inicio: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Km Fin
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.km_fin || ''}
                    onChange={(e) => setForm({ ...form, km_fin: e.target.value ? parseFloat(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Punto Referencia
                  </label>
                  <input
                    type="text"
                    value={form.punto_referencia || ''}
                    onChange={(e) => setForm({ ...form, punto_referencia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Ej: Frente a gasolinera"
                  />
                </div>
              </div>

              {/* Horarios */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Inicio
                  </label>
                  <input
                    type="time"
                    value={form.hora_inicio || ''}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora Fin
                  </label>
                  <input
                    type="time"
                    value={form.hora_fin || ''}
                    onChange={(e) => setForm({ ...form, hora_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Dias de la semana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dias de la Semana
                </label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map(dia => (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => toggleDia(dia)}
                      className={`px-3 py-1 rounded text-sm ${(form.dias_semana || []).includes(dia)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      {dia.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vigencia */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    value={form.fecha_inicio || ''}
                    onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin (opcional)
                  </label>
                  <input
                    type="date"
                    value={form.fecha_fin || ''}
                    onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Observaciones y Puntos a destacar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  value={form.observaciones || ''}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Notas adicionales..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puntos a Destacar (HTML permitido)
                </label>
                <textarea
                  value={form.puntos_destacar || ''}
                  onChange={(e) => setForm({ ...form, puntos_destacar: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder="<b>Importante:</b> Usar chaleco reflectivo..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={cerrarModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={!form.titulo || !form.fecha_inicio || createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {editando ? 'Guardar Cambios' : 'Crear Situacion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
