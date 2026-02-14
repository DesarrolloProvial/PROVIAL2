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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Importar Datos Excel</h1>
            <p className="text-sm text-gray-500">Estadisticas historicas de accidentologia</p>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Archivo Excel</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
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
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click para seleccionar archivo Excel</p>
                  <p className="text-xs text-gray-400 mt-1">.xlsx o .xls</p>
                </div>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mes (opcional)</label>
              <select
                value={mesFilter}
                onChange={(e) => setMesFilter(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {meses.map((m) => (
                  <option key={m} value={m}>{m || 'Todos los meses'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Origen datos</label>
              <input
                type="text"
                value={origenDatos}
                onChange={(e) => setOrigenDatos(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
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
                <span className="text-sm font-medium text-gray-700">Solo simulacion (dry run)</span>
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
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Results */}
        {r && (
          <div className="mt-6 space-y-4">
            {/* Summary */}
            <div className={`rounded-xl border p-6 ${response?.dryRun ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-4">
                {response?.dryRun ? (
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <h2 className="font-bold text-lg">
                  {response?.dryRun ? 'Resultado de simulacion' : 'Importacion completada'}
                </h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Stat label="Total filas" value={r.totalRows} />
                <Stat label="Insertados" value={r.inserted} color="text-green-700" />
                <Stat label="Duplicados" value={r.skipped} color="text-yellow-700" />
                <Stat label="Errores" value={r.errors} color="text-red-700" />
                <Stat label="Vehiculos" value={r.vehiclesCreated} color="text-blue-700" />
              </div>
            </div>

            {/* Catalog stats */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold mb-3">Catalogos cargados</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                <div><span className="text-gray-500">Deptos:</span> {r.catalogStats.departamentos}</div>
                <div><span className="text-gray-500">Munis:</span> {r.catalogStats.municipios}</div>
                <div><span className="text-gray-500">Rutas:</span> {r.catalogStats.rutas}</div>
                <div><span className="text-gray-500">Tipos veh:</span> {r.catalogStats.tiposVehiculo}</div>
                <div><span className="text-gray-500">Marcas:</span> {r.catalogStats.marcas}</div>
                <div><span className="text-gray-500">Tipos sit:</span> {r.catalogStats.tiposSituacion}</div>
              </div>
            </div>

            {/* Missing catalogs */}
            {(r.missingDepartamentos.length > 0 || r.missingMunicipios.length > 0 ||
              r.missingRutas.length > 0 || r.missingTiposSituacion.length > 0) && (
              <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                <h3 className="font-semibold text-yellow-800 mb-3">Valores no encontrados en catalogos</h3>
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
              </div>
            )}

            {/* Skipped rows */}
            {r.skippedRows && r.skippedRows.length > 0 && (
              <div className="bg-orange-50 rounded-xl border border-orange-200 p-6">
                <h3 className="font-semibold text-orange-800 mb-3">
                  Filas saltadas - sin sede/boleta ({r.skippedRows.length})
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {r.skippedRows.map((e, i) => (
                    <p key={i} className="text-xs text-orange-700 font-mono">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Errors detail */}
            {r.errorDetails.length > 0 && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-6">
                <h3 className="font-semibold text-red-800 mb-3">
                  Detalle de errores ({r.errorDetails.length})
                </h3>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {r.errorDetails.map((e, i) => (
                    <p key={i} className="text-xs text-red-700 font-mono">{e}</p>
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
      <p className={`text-2xl font-bold ${color || 'text-gray-900'}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function MissingList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-yellow-700">{label}:</p>
      <p className="text-xs text-yellow-600">{items.join(', ')}</p>
    </div>
  );
}
