import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Upload,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

interface ImportResult {
  totalRows: number;
  inserted: number;
  skipped: number;
  errors: number;
  vehiclesCreated: number;
  skippedRows: string[];
  errorDetails: string[];
  missingDepartamentos: string[];
  missingMunicipios: string[];
  missingRutas: string[];
  missingTiposSituacion: string[];
  missingUnidades: string[];
  debug?: {
    catalogKeys: {
      departamentos: string[];
      municipios: string[];
      rutas: string[];
      tiposSituacion: string[];
    };
    detectedColumns?: Record<string, Record<string, number>>;
  };
  catalogStats: {
    departamentos: number;
    municipios: number;
    rutas: number;
    tiposVehiculo: number;
    marcas: number;
    tiposSituacion: number;
  };
}

interface ApiResponse {
  success: boolean;
  dryRun: boolean;
  result: ImportResult;
}

export default function ImportExcelPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [mesFilter, setMesFilter] = useState('');
  const [origenDatos, setOrigenDatos] = useState('EXCEL_2025');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meses = ['', 'ENE', 'FEB', 'MAR', 'ABRIL', 'MAY', 'JUNIO', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('dryRun', String(dryRun));
    if (mesFilter) formData.append('mesFilter', mesFilter);
    formData.append('origenDatos', origenDatos);

    try {
      const { data } = await api.post<ApiResponse>('/admin/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 min para archivos grandes
      });
      setResponse(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const r = response?.result;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importar Datos Excel</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Estadisticas historicas de accidentologia</p>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6 space-y-6">
          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Archivo Excel</label>
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-green-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">Click para seleccionar archivo Excel</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">.xlsx o .xls</p>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mes (opcional)</label>
              <select
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100"
              >
                {meses.map((m) => (
                  <option key={m} value={m}>{m || 'Todos los meses'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Origen datos</label>
              <input
                type="text"
                value={origenDatos}
                onChange={(e) => setOrigenDatos(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                placeholder="EXCEL_2025"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Solo simulacion (dry run)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!file || loading}
            className={`w-full py-3 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
              !file || loading
                ? 'bg-gray-300 cursor-not-allowed'
                : dryRun
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : dryRun ? (
              <>
                <FileSpreadsheet className="w-5 h-5" />
                Simular importacion
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Importar datos
              </>
            )}
          </button>

          {!dryRun && !loading && (
            <p className="text-sm text-orange-600 text-center">
              Los datos se insertaran en la base de datos. Los duplicados (por codigo_boleta) se omitiran.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Results */}
        {r && (
          <div className="mt-6 space-y-4">
            {/* Summary */}
            <div className={`rounded-xl border p-6 ${response?.dryRun ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'}`}>
              <div className="flex items-center gap-2 mb-4">
                {response?.dryRun ? (
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <h2 className="font-bold text-lg dark:text-gray-100">
                  {response?.dryRun ? 'Resultado de simulacion' : 'Importacion completada'}
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Stat label="Total filas" value={r.totalRows} />
                <Stat label="Insertados" value={r.inserted} color="text-green-700 dark:text-green-400" />
                <Stat label="Duplicados" value={r.skipped} color="text-yellow-700 dark:text-yellow-400" />
                <Stat label="Errores" value={r.errors} color="text-red-700 dark:text-red-400" />
                <Stat label="Vehiculos" value={r.vehiclesCreated} color="text-blue-700 dark:text-blue-400" />
              </div>
            </div>

            {/* Catalog stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
              <h3 className="font-semibold mb-3 dark:text-gray-100">Catalogos cargados</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm dark:text-gray-300">
                <div><span className="text-gray-500 dark:text-gray-400">Deptos:</span> {r.catalogStats.departamentos}</div>
                <div><span className="text-gray-500 dark:text-gray-400">Munis:</span> {r.catalogStats.municipios}</div>
                <div><span className="text-gray-500 dark:text-gray-400">Rutas:</span> {r.catalogStats.rutas}</div>
                <div><span className="text-gray-500 dark:text-gray-400">Tipos veh:</span> {r.catalogStats.tiposVehiculo}</div>
                <div><span className="text-gray-500 dark:text-gray-400">Marcas:</span> {r.catalogStats.marcas}</div>
                <div><span className="text-gray-500 dark:text-gray-400">Tipos sit:</span> {r.catalogStats.tiposSituacion}</div>
              </div>
            </div>

            {/* Debug: catalog keys loaded from DB */}
            {r.debug?.catalogKeys && (
              <details className="bg-gray-50 dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
                <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-300 text-sm">
                  Debug: claves normalizadas cargadas de la BD (click para expandir)
                </summary>
                <div className="mt-3 space-y-2 text-xs font-mono max-h-60 overflow-y-auto dark:text-gray-300">
                  <div><span className="font-semibold">Departamentos:</span> {r.debug.catalogKeys.departamentos.join(', ')}</div>
                  <div><span className="font-semibold">Rutas:</span> {r.debug.catalogKeys.rutas.join(', ')}</div>
                  <div><span className="font-semibold">Tipos situacion:</span> {r.debug.catalogKeys.tiposSituacion.join(', ')}</div>
                  <div><span className="font-semibold">Municipios (primeros 50):</span> {r.debug.catalogKeys.municipios.join(', ')}</div>
                  {r.debug.detectedColumns && (
                    <div className="mt-2 border-t dark:border-gray-700 pt-2">
                      <span className="font-semibold">Columnas detectadas por hoja:</span>
                      {Object.entries(r.debug.detectedColumns).map(([mes, cols]) => (
                        <div key={mes}><span className="text-blue-600">{mes}:</span> {Object.entries(cols).map(([k, v]) => `${k}=${v}`).join(', ')}</div>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Missing catalogs */}
            {(r.missingDepartamentos.length > 0 || r.missingMunicipios.length > 0 ||
              r.missingRutas.length > 0 || r.missingTiposSituacion.length > 0 ||
              (r.missingUnidades && r.missingUnidades.length > 0)) && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-700 p-6">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-3">Valores no encontrados en catalogos</h3>
                {r.missingDepartamentos.length > 0 && (
                  <MissingList label="Departamentos" items={r.missingDepartamentos} />
                )}
                {r.missingMunicipios.length > 0 && (
                  <MissingList label="Municipios" items={r.missingMunicipios} />
                )}
                {r.missingRutas.length > 0 && (
                  <MissingList label="Rutas" items={r.missingRutas} />
                )}
                {r.missingTiposSituacion.length > 0 && (
                  <MissingList label="Tipos situacion" items={r.missingTiposSituacion} />
                )}
                {r.missingUnidades && r.missingUnidades.length > 0 && (
                  <MissingList label="Unidades no encontradas" items={r.missingUnidades} />
                )}
              </div>
            )}

            {/* Skipped rows */}
            {r.skippedRows && r.skippedRows.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-700 p-6">
                <h3 className="font-semibold text-orange-800 dark:text-orange-400 mb-3">
                  Filas saltadas - sin sede/boleta ({r.skippedRows.length})
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {r.skippedRows.map((e, i) => (
                    <p key={i} className="text-xs text-orange-700 dark:text-orange-400 font-mono">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Errors detail */}
            {r.errorDetails.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700 p-6">
                <h3 className="font-semibold text-red-800 dark:text-red-400 mb-3">
                  Detalle de errores ({r.errorDetails.length})
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {r.errorDetails.map((e, i) => (
                    <p key={i} className="text-xs text-red-700 dark:text-red-400 font-mono">{e}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color || 'text-gray-900 dark:text-gray-100'}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

function MissingList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">{label}:</p>
      <p className="text-xs text-yellow-600 dark:text-yellow-500">{items.join(', ')}</p>
    </div>
  );
}
