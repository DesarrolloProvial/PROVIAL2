import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transportesService, Inspeccion360, Plantilla360, SeccionPlantilla, ItemPlantilla } from '../../services/transportes.service';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../../components/ThemeToggle';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  FileText,
  ArrowLeft,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Layers,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────────────────────────

type TabId = 'pendientes' | 'plantillas';

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function EstadoBadge({ estado }: { estado: Inspeccion360['estado'] }) {
  const classes: Record<Inspeccion360['estado'], string> = {
    PENDIENTE:
      'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300',
    APROBADA:
      'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300',
    RECHAZADA:
      'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${classes[estado]}`}
    >
      {estado}
    </span>
  );
}

function ActivaBadge({ activa }: { activa: boolean }) {
  return activa ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
      Activa
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
      Inactiva
    </span>
  );
}

// ── Rechazo modal ──────────────────────────────────────────────────────────────

interface RechazarModalProps {
  inspeccionId: number;
  onClose: () => void;
  onConfirm: (id: number, observaciones: string) => void;
  isLoading: boolean;
}

function RechazarModal({ inspeccionId, onClose, onConfirm, isLoading }: RechazarModalProps) {
  const [observaciones, setObservaciones] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!observaciones.trim()) return;
    onConfirm(inspeccionId, observaciones.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Rechazar Inspección
          </h2>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ingrese las observaciones del comandante que justifiquen el rechazo de esta inspección.
          </p>
          <div>
            <label
              htmlFor="observaciones"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Observaciones <span className="text-red-500">*</span>
            </label>
            <textarea
              id="observaciones"
              rows={4}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Indique el motivo del rechazo..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 resize-none"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !observaciones.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading && (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
              Rechazar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Tree item (plantilla) ──────────────────────────────────────────────────────

function SeccionTree({ seccion }: { seccion: SeccionPlantilla }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {seccion.nombre}
          </span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
          {seccion.items.length} {seccion.items.length === 1 ? 'ítem' : 'ítems'}
        </span>
      </button>

      {expanded && (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
          {seccion.items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
          {seccion.items.length === 0 && (
            <li className="px-5 py-3 text-sm text-gray-400 dark:text-gray-500 italic">
              Sin ítems
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function ItemRow({ item }: { item: ItemPlantilla }) {
  const tipoBadge: Record<ItemPlantilla['tipo'], string> = {
    CHECK: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    TEXTO: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    NUMERO: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
  };

  return (
    <li className="flex items-center justify-between px-5 py-2.5 bg-white dark:bg-gray-800">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
          {item.descripcion}
        </span>
        {item.requerido && (
          <span className="text-red-500 dark:text-red-400 text-xs flex-shrink-0" title="Requerido">
            *
          </span>
        )}
      </div>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-3 ${tipoBadge[item.tipo]}`}
      >
        {item.tipo}
      </span>
    </li>
  );
}

// ── Template detail modal ──────────────────────────────────────────────────────

interface PlantillaModalProps {
  plantilla: Plantilla360;
  onClose: () => void;
  onUpdated: () => void;
}

function PlantillaModal({ plantilla, onClose, onUpdated }: PlantillaModalProps) {
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [activaEdit, setActivaEdit] = useState(plantilla.activa);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      transportesService.actualizarPlantilla(plantilla.id, { activa: activaEdit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plantillas-360'] });
      setSaveSuccess(true);
      setSaveError(null);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditMode(false);
        onUpdated();
      }, 1200);
    },
    onError: (err: any) => {
      setSaveError(
        err?.response?.data?.mensaje || err?.message || 'Error al guardar cambios'
      );
    },
  });

  const totalItems = plantilla.secciones.reduce(
    (acc, s) => acc + s.items.length,
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!updateMutation.isPending ? onClose : undefined}
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {plantilla.nombre}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {plantilla.tipo_unidad} · v{plantilla.version} · {plantilla.secciones.length}{' '}
                {plantilla.secciones.length === 1 ? 'sección' : 'secciones'} · {totalItems}{' '}
                {totalItems === 1 ? 'ítem' : 'ítems'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <ActivaBadge activa={plantilla.activa} />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Cerrar"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {plantilla.secciones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <Layers className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm">Esta plantilla no tiene secciones definidas.</p>
            </div>
          ) : (
            plantilla.secciones
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((seccion) => (
                <SeccionTree key={seccion.id} seccion={seccion} />
              ))
          )}

          {/* Edit mode panel */}
          {editMode && (
            <div className="border border-blue-200 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20 space-y-3">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                Editar plantilla
              </h3>

              {/* Activa toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Estado de la plantilla
                </span>
                <button
                  type="button"
                  onClick={() => setActivaEdit((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    activaEdit
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={activaEdit}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      activaEdit ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Actualmente:{' '}
                <strong>{activaEdit ? 'Activa' : 'Inactiva'}</strong>. Solo se
                puede tener una plantilla activa por tipo de unidad.
              </p>

              {/* Error / success feedback */}
              {saveError && (
                <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}
              {saveSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>Cambios guardados correctamente.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>

          <div className="flex gap-2">
            {editMode ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setActivaEdit(plantilla.activa);
                    setSaveError(null);
                  }}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updateMutation.isPending && (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  )}
                  Guardar cambios
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Editar plantilla
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Confirm dialog (aprobación) ────────────────────────────────────────────────

interface ConfirmAprobarProps {
  inspeccionId: number;
  unidadCodigo?: string;
  onClose: () => void;
  onConfirm: (id: number) => void;
  isLoading: boolean;
}

function ConfirmAprobar({ inspeccionId, unidadCodigo, onClose, onConfirm, isLoading }: ConfirmAprobarProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Aprobar inspección
          </h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ¿Confirma que desea aprobar la inspección
          {unidadCodigo ? (
            <strong> de la unidad {unidadCodigo}</strong>
          ) : (
            ` #${inspeccionId}`
          )}
          ?
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(inspeccionId)}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pendientes tab ─────────────────────────────────────────────────────────────

interface PendientesTabProps {
  inspecciones: Inspeccion360[];
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
}

function PendientesTab({ inspecciones, isLoading, isError, onRefetch }: PendientesTabProps) {
  const queryClient = useQueryClient();
  const [rechazarTarget, setRechazarTarget] = useState<Inspeccion360 | null>(null);
  const [aprobarTarget, setAprobarTarget] = useState<Inspeccion360 | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const aprobarMutation = useMutation({
    mutationFn: (id: number) => transportesService.aprobarInspeccion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspecciones-pendientes'] });
      setAprobarTarget(null);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(
        err?.response?.data?.mensaje || err?.message || 'Error al aprobar inspección'
      );
    },
  });

  const rechazarMutation = useMutation({
    mutationFn: ({ id, observaciones }: { id: number; observaciones: string }) =>
      transportesService.rechazarInspeccion(id, observaciones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspecciones-pendientes'] });
      setRechazarTarget(null);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(
        err?.response?.data?.mensaje || err?.message || 'Error al rechazar inspección'
      );
    },
  });

  const apiBase = import.meta.env.VITE_API_URL || '';

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500 dark:text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin opacity-60" />
        <p className="text-sm">Cargando inspecciones pendientes...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400 dark:text-red-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No se pudieron cargar las inspecciones.
        </p>
        <button
          onClick={onRefetch}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Global action error banner */}
      {actionError && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{actionError}</span>
          <button
            className="ml-auto text-red-400 hover:text-red-600 dark:hover:text-red-300"
            onClick={() => setActionError(null)}
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {inspecciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500 dark:text-gray-400">
          <ClipboardCheck className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">No hay inspecciones pendientes</p>
          <p className="text-xs">Todas las inspecciones han sido revisadas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/60">
              <tr>
                {['Unidad', 'Tipo', 'Sede', 'Inspector', 'Fecha', 'Estado', 'Acciones'].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
              {inspecciones.map((inspeccion) => (
                <tr
                  key={inspeccion.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {inspeccion.unidad_codigo || `#${inspeccion.unidad_id}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {inspeccion.tipo_unidad || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {inspeccion.sede_nombre || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {inspeccion.inspector_nombre || `ID ${inspeccion.inspector_id}`}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {formatFecha(inspeccion.fecha_inspeccion)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <EstadoBadge estado={inspeccion.estado} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {/* Ver PDF */}
                      {inspeccion.tiene_pdf && (
                        <a
                          href={`${apiBase}/api/inspeccion360/${inspeccion.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          title="Ver PDF de inspección"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Ver PDF
                        </a>
                      )}

                      {/* Aprobar — solo si sigue PENDIENTE */}
                      {inspeccion.estado === 'PENDIENTE' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAprobarTarget(inspeccion)}
                            disabled={aprobarMutation.isPending || rechazarMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => setRechazarTarget(inspeccion)}
                            disabled={aprobarMutation.isPending || rechazarMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rechazar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Aprobar confirm */}
      {aprobarTarget && (
        <ConfirmAprobar
          inspeccionId={aprobarTarget.id}
          unidadCodigo={aprobarTarget.unidad_codigo}
          onClose={() => setAprobarTarget(null)}
          onConfirm={(id) => aprobarMutation.mutate(id)}
          isLoading={aprobarMutation.isPending}
        />
      )}

      {/* Rechazar modal */}
      {rechazarTarget && (
        <RechazarModal
          inspeccionId={rechazarTarget.id}
          onClose={() => setRechazarTarget(null)}
          onConfirm={(id, observaciones) =>
            rechazarMutation.mutate({ id, observaciones })
          }
          isLoading={rechazarMutation.isPending}
        />
      )}
    </>
  );
}

// ── Plantillas tab ─────────────────────────────────────────────────────────────

interface PlantillasTabProps {
  plantillas: Plantilla360[];
  isLoading: boolean;
  isError: boolean;
  onRefetch: () => void;
}

function PlantillasTab({ plantillas, isLoading, isError, onRefetch }: PlantillasTabProps) {
  const [selected, setSelected] = useState<Plantilla360 | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500 dark:text-gray-400">
        <RefreshCw className="w-8 h-8 animate-spin opacity-60" />
        <p className="text-sm">Cargando plantillas...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400 dark:text-red-500" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No se pudieron cargar las plantillas.
        </p>
        <button
          onClick={onRefetch}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (plantillas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500 dark:text-gray-400">
        <Layers className="w-12 h-12 opacity-30" />
        <p className="text-sm font-medium">No hay plantillas configuradas</p>
        <p className="text-xs">No se encontraron plantillas de inspección.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plantillas.map((plantilla) => {
          const totalItems = plantilla.secciones.reduce(
            (acc, s) => acc + s.items.length,
            0
          );
          return (
            <div
              key={plantilla.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col gap-3 hover:shadow-md dark:hover:shadow-gray-900/40 transition-shadow"
            >
              {/* Card header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                    {plantilla.tipo_unidad}
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {plantilla.nombre}
                  </h3>
                </div>
                <ActivaBadge activa={plantilla.activa} />
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    v{plantilla.version}
                  </span>
                  <span>versión</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {plantilla.secciones.length}
                  </span>
                  <span>
                    {plantilla.secciones.length === 1 ? 'sección' : 'secciones'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {totalItems}
                  </span>
                  <span>{totalItems === 1 ? 'ítem' : 'ítems'}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100 dark:border-gray-700" />

              {/* Action */}
              <button
                type="button"
                onClick={() => setSelected(plantilla)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Ver / Editar
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <PlantillaModal
          plantilla={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => setSelected(null)}
        />
      )}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Inspecciones360Page() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('pendientes');

  // Queries
  const {
    data: pendientes = [],
    isLoading: loadingPendientes,
    isError: errorPendientes,
    refetch: refetchPendientes,
  } = useQuery({
    queryKey: ['inspecciones-pendientes'],
    queryFn: () => transportesService.getInspeccionesPendientes(),
    refetchInterval: 60_000,
    retry: 2,
  });

  const {
    data: plantillas = [],
    isLoading: loadingPlantillas,
    isError: errorPlantillas,
    refetch: refetchPlantillas,
  } = useQuery({
    queryKey: ['plantillas-360'],
    queryFn: () => transportesService.getPlantillas(),
    retry: 2,
    enabled: activeTab === 'plantillas',
  });

  const isLoading =
    activeTab === 'pendientes' ? loadingPendientes : loadingPlantillas;

  const handleRefresh = () => {
    if (activeTab === 'pendientes') refetchPendientes();
    else refetchPlantillas();
  };

  const TABS: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'pendientes',
      label: 'Pendientes',
      icon: <ClipboardCheck className="w-4 h-4" />,
      count: pendientes.length,
    },
    {
      id: 'plantillas',
      label: 'Plantillas',
      icon: <Layers className="w-4 h-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-3">
            {/* Left: back + title */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/transportes')}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
                title="Volver a Transportes"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
                    Inspecciones 360°
                  </h1>
                </div>
                {user && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.nombre || user.username}
                    {user.sede_nombre ? ` · ${user.sede_nombre}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isLoading}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                title="Actualizar"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <ThemeToggle />
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 pb-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                      activeTab === tab.id
                        ? 'bg-white/25 text-white'
                        : 'bg-yellow-400 dark:bg-yellow-500 text-yellow-900 dark:text-yellow-900'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'pendientes' && (
          <PendientesTab
            inspecciones={pendientes}
            isLoading={loadingPendientes}
            isError={errorPendientes}
            onRefetch={refetchPendientes}
          />
        )}
        {activeTab === 'plantillas' && (
          <PlantillasTab
            plantillas={plantillas}
            isLoading={loadingPlantillas}
            isError={errorPlantillas}
            onRefetch={refetchPlantillas}
          />
        )}
      </div>
    </div>
  );
}
