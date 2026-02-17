import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ArrowLeft, RefreshCw, Filter, X, Loader2, MapPin, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#e11d48'];

const TIPO_COLORS: Record<string, string> = {
  INCIDENTE: '#ef4444',
  ASISTENCIA: '#3b82f6',
  ASISTENCIA_VEHICULAR: '#3b82f6',
  EMERGENCIA: '#f59e0b',
};

const SEDES = [
  'Escuintla', 'Chimaltenango', 'Guatemala', 'Sacatepequez',
  'Santa Rosa', 'Suchitepequez', 'Retalhuleu', 'Quetzaltenango', 'Solola',
];

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

interface Filters {
  fecha_inicio: string;
  fecha_fin: string;
  sede_id: string;
  departamento_id: string;
  ruta_id: string;
  tipo_situacion: string;
  origen_datos: string;
  clima: string;
  area: string;
}

interface DetalleModal {
  open: boolean;
  title: string;
  params: Record<string, string | number>;
}

export default function DashboardEstadisticasPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(true);

  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);

  const [filters, setFilters] = useState<Filters>({
    fecha_inicio: '',
    fecha_fin: '',
    sede_id: '',
    departamento_id: '',
    ruta_id: '',
    tipo_situacion: '',
    origen_datos: 'ALL',
    clima: '',
    area: '',
  });

  const [detalle, setDetalle] = useState<DetalleModal>({ open: false, title: '', params: {} });
  const [detalleData, setDetalleData] = useState<any[]>([]);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // Cargar catalogos
  useEffect(() => {
    const load = async () => {
      try {
        const [dRes, rRes, sRes] = await Promise.all([
          api.get('/geografia/departamentos'),
          api.get('/geografia/rutas'),
          api.get('/sedes').catch(() => ({ data: [] })),
        ]);
        setDepartamentos(Array.isArray(dRes.data) ? dRes.data : dRes.data?.departamentos || []);
        setRutas(Array.isArray(rRes.data) ? rRes.data : rRes.data?.rutas || []);
        setSedes(Array.isArray(sRes.data) ? sRes.data : sRes.data?.sedes || []);
      } catch { /* ignorar */ }
    };
    load();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') params[k] = v;
      });
      const { data: res } = await api.get('/estadisticas', { params });
      setData(res);
    } catch (err: any) {
      console.error('Error cargando estadisticas:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateFilter = (key: keyof Filters, val: string) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const clearFilters = () => {
    setFilters({
      fecha_inicio: '', fecha_fin: '', sede_id: '', departamento_id: '',
      ruta_id: '', tipo_situacion: '', origen_datos: 'ALL', clima: '', area: '',
    });
  };

  // Abrir modal de detalle
  const openDetalle = async (title: string, dimensionParams: Record<string, string | number>) => {
    setDetalle({ open: true, title, params: dimensionParams });
    setDetalleLoading(true);
    setDetalleData([]);
    try {
      // Combinar filtros globales + filtro de dimensión
      const params: Record<string, string | number> = { ...dimensionParams };
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') params[k] = v;
      });
      const { data: res } = await api.get('/estadisticas/detalle', { params });
      setDetalleData(res.situaciones || []);
    } catch (err: any) {
      console.error('Error cargando detalle:', err);
    } finally {
      setDetalleLoading(false);
    }
  };

  const closeDetalle = () => {
    setDetalle({ open: false, title: '', params: {} });
    setDetalleData([]);
  };

  const origenLabel = filters.origen_datos === 'EXCEL_2025' ? 'Datos historicos (Excel)'
    : filters.origen_datos === 'APP' ? 'Datos App movil' : 'Todos los datos';

  // Cursor pointer style para barras clickeables
  const clickStyle = { cursor: 'pointer' };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/hub')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Estadisticas de Accidentologia</h1>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{origenLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
              <Filter className="w-4 h-4" /> Filtros
            </button>
            <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg" disabled={loading}>
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Filtros */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">Filtros</h3>
              <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
                <X className="w-3 h-3" /> Limpiar
              </button>
            </div>

            {/* Origen datos - toggle prominente */}
            <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
              {[
                { val: 'ALL', label: 'Todos' },
                { val: 'APP', label: 'App movil' },
                { val: 'EXCEL_2025', label: 'Excel (historico)' },
              ].map(o => (
                <button key={o.val}
                  onClick={() => updateFilter('origen_datos', o.val)}
                  className={`px-4 py-2 text-sm rounded-md transition ${
                    filters.origen_datos === o.val
                      ? 'bg-white shadow text-blue-700 font-medium'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}>
                  {o.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs text-gray-500">Desde</label>
                <input type="date" value={filters.fecha_inicio}
                  onChange={e => updateFilter('fecha_inicio', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Hasta</label>
                <input type="date" value={filters.fecha_fin}
                  onChange={e => updateFilter('fecha_fin', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Sede</label>
                <select value={filters.sede_id} onChange={e => updateFilter('sede_id', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todas</option>
                  {sedes.length > 0
                    ? sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)
                    : SEDES.map((s, i) => <option key={i} value={i + 1}>{s}</option>)
                  }
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Departamento</label>
                <select value={filters.departamento_id} onChange={e => updateFilter('departamento_id', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  {departamentos.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Ruta</label>
                <select value={filters.ruta_id} onChange={e => updateFilter('ruta_id', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todas</option>
                  {rutas.map((r: any) => <option key={r.id} value={r.id}>{r.codigo}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo situacion</label>
                <select value={filters.tipo_situacion} onChange={e => updateFilter('tipo_situacion', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  <option value="INCIDENTE">Incidente</option>
                  <option value="ASISTENCIA_VEHICULAR">Asistencia</option>
                  <option value="EMERGENCIA">Emergencia</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Clima</label>
                <select value={filters.clima} onChange={e => updateFilter('clima', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todos</option>
                  <option value="DESPEJADO">Despejado</option>
                  <option value="NUBLADO">Nublado</option>
                  <option value="LLUVIA">Lluvia</option>
                  <option value="NEBLINA">Neblina</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Area</label>
                <select value={filters.area} onChange={e => updateFilter('area', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Todas</option>
                  <option value="URBANA">Urbana</option>
                  <option value="RURAL">Rural</option>
                </select>
              </div>
            </div>

            {filters.origen_datos === 'EXCEL_2025' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Los datos importados del Excel solo incluyen campos basicos (ubicacion, tipo, vehiculos).
                No tienen tiempos de respuesta, multimedia ni datos detallados de autoridades.
              </div>
            )}
          </div>
        )}

        {loading && !data ? (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {[
                { label: 'Situaciones', value: data.kpis?.total_situaciones, color: 'blue' },
                { label: 'Heridos', value: data.kpis?.total_heridos, color: 'orange' },
                { label: 'Fallecidos', value: data.kpis?.total_fallecidos, color: 'red' },
                { label: 'Vehiculos', value: data.kpis?.total_vehiculos, color: 'purple' },
                { label: 'Ilesos', value: data.kpis?.total_ilesos, color: 'green' },
                { label: 'Trasladados', value: data.kpis?.total_trasladados, color: 'cyan' },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                  <p className={`text-2xl font-bold text-${kpi.color}-600 mt-1`}>
                    {(kpi.value || 0).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-4 italic">Click en cualquier barra o sector para ver el detalle de las situaciones</p>

            {/* Graficos Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Situaciones por Mes */}
              <ChartCard title="Situaciones por mes">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.por_mes || []}
                    onClick={(e: any) => {
                      if (e?.activeLabel) openDetalle(`Situaciones en ${e.activeLabel}`, { mes: e.activeLabel });
                    }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="incidentes" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Incidentes" style={clickStyle} />
                    <Area type="monotone" dataKey="asistencias" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Asistencias" style={clickStyle} />
                    <Area type="monotone" dataKey="emergencias" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Emergencias" style={clickStyle} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Por Tipo */}
              <ChartCard title="Distribucion por tipo">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.por_tipo || []} dataKey="cantidad" nameKey="tipo" cx="50%" cy="50%"
                      outerRadius={100} label={({ tipo, cantidad }: any) => `${tipo}: ${cantidad}`}
                      onClick={(d: any) => openDetalle(`Tipo: ${d.tipo}`, { tipo_situacion: d.tipo })}
                      style={clickStyle}>
                      {(data.por_tipo || []).map((entry: any, i: number) => (
                        <Cell key={i} fill={TIPO_COLORS[entry.tipo] || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Por Departamento */}
              <ChartCard title="Por departamento">
                <ResponsiveContainer width="100%" height={Math.max(300, (data.por_departamento?.length || 5) * 28)}>
                  <BarChart data={data.por_departamento || []} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="departamento" type="category" tick={{ fontSize: 11 }} width={95} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#3b82f6" radius={[0, 4, 4, 0]} style={clickStyle}
                      onClick={(d: any) => openDetalle(`Depto: ${d.departamento}`, { departamento_nombre: d.departamento })} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Por Ruta */}
              <ChartCard title="Top rutas">
                <ResponsiveContainer width="100%" height={Math.max(300, (data.por_ruta?.length || 5) * 28)}>
                  <BarChart data={data.por_ruta || []} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="ruta" type="category" tick={{ fontSize: 11 }} width={55} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#10b981" radius={[0, 4, 4, 0]} style={clickStyle}
                      onClick={(d: any) => openDetalle(`Ruta: ${d.ruta}`, { ruta_codigo: d.ruta })} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Heridos y Fallecidos por Mes */}
              <ChartCard title="Heridos y fallecidos por mes">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.heridos_fallecidos || []}
                    onClick={(e: any) => {
                      if (e?.activeLabel) openDetalle(`Heridos/Fallecidos en ${e.activeLabel}`, { mes: e.activeLabel });
                    }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="heridos" fill="#f59e0b" name="Heridos" style={clickStyle} />
                    <Bar dataKey="fallecidos" fill="#ef4444" name="Fallecidos" style={clickStyle} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Tipo de Vehiculo */}
              <ChartCard title="Tipo de vehiculo involucrado">
                <ResponsiveContainer width="100%" height={Math.max(300, (data.por_vehiculo?.length || 5) * 28)}>
                  <BarChart data={data.por_vehiculo || []} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="tipo" type="category" tick={{ fontSize: 11 }} width={95} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#8b5cf6" radius={[0, 4, 4, 0]} style={clickStyle}
                      onClick={(d: any) => openDetalle(`Vehiculo: ${d.tipo}`, { tipo_vehiculo: d.tipo })} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Por Hora */}
              <ChartCard title="Distribucion por hora del dia">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.por_hora || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hora" tick={{ fontSize: 11 }}
                      tickFormatter={(h: number) => `${h}:00`} />
                    <YAxis />
                    <Tooltip labelFormatter={(h: any) => `${h}:00 - ${h}:59`} />
                    <Bar dataKey="cantidad" fill="#14b8a6" radius={[4, 4, 0, 0]} style={clickStyle}
                      onClick={(d: any) => openDetalle(`Hora: ${d.hora}:00 - ${d.hora}:59`, { hora: d.hora })} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Por Dia de Semana */}
              <ChartCard title="Distribucion por dia de la semana">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.por_dia_semana || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#f97316" radius={[4, 4, 0, 0]} style={clickStyle}
                      onClick={(d: any) => {
                        const dow = DIAS_SEMANA.indexOf(d.dia);
                        openDetalle(`Dia: ${d.dia}`, { dia_semana: dow >= 0 ? dow : 0 });
                      }} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Clima */}
              <ChartCard title="Clima al momento del hecho">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.por_clima || []} dataKey="cantidad" nameKey="clima" cx="50%" cy="50%"
                      outerRadius={100} label={({ clima, cantidad }: any) => `${clima}: ${cantidad}`}
                      onClick={(d: any) => openDetalle(`Clima: ${d.clima}`, { clima: d.clima })}
                      style={clickStyle}>
                      {(data.por_clima || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Area */}
              <ChartCard title="Urbana vs Rural">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.por_area || []} dataKey="cantidad" nameKey="area" cx="50%" cy="50%"
                      outerRadius={100} label={({ area, cantidad }: any) => `${area}: ${cantidad}`}
                      onClick={(d: any) => openDetalle(`Area: ${d.area}`, { area: d.area })}
                      style={clickStyle}>
                      {(data.por_area || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Origen de Datos */}
              <ChartCard title="Origen de datos">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={data.por_origen || []} dataKey="cantidad" nameKey="origen" cx="50%" cy="50%"
                      outerRadius={100} label={({ origen, cantidad }: any) => `${origen}: ${cantidad}`}
                      onClick={(d: any) => {
                        // Revertir el label al valor real
                        const origenVal = d.origen === 'Excel (historico)' ? 'EXCEL_2025'
                          : d.origen === 'App movil' ? 'APP' : d.origen;
                        openDetalle(`Origen: ${d.origen}`, { origen_datos: origenVal });
                      }}
                      style={clickStyle}>
                      {(data.por_origen || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Por Sede */}
              <ChartCard title="Situaciones por sede">
                <ResponsiveContainer width="100%" height={Math.max(300, (data.por_sede?.length || 5) * 32)}>
                  <BarChart data={data.por_sede || []} layout="vertical" margin={{ left: 110 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="sede" type="category" tick={{ fontSize: 11 }} width={105} />
                    <Tooltip />
                    <Bar dataKey="cantidad" fill="#6366f1" radius={[0, 4, 4, 0]} style={clickStyle}
                      onClick={(d: any) => openDetalle(`Sede: ${d.sede}`, { sede_nombre: d.sede })} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Top Causas */}
              {data.top_causas?.length > 0 && (
                <ChartCard title="Causas probables mas frecuentes">
                  <ResponsiveContainer width="100%" height={Math.max(300, (data.top_causas?.length || 5) * 28)}>
                    <BarChart data={data.top_causas || []} layout="vertical" margin={{ left: 150 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="causa" type="category" tick={{ fontSize: 10 }} width={145} />
                      <Tooltip />
                      <Bar dataKey="cantidad" fill="#ec4899" radius={[0, 4, 4, 0]} style={clickStyle}
                        onClick={(d: any) => openDetalle(`Causa: ${d.causa}`, { causa_probable: d.causa })} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Tiempos de Respuesta (solo APP) */}
              {data.tiempos_respuesta?.length > 0 && filters.origen_datos !== 'EXCEL_2025' && (
                <ChartCard title="Tiempo promedio de respuesta (min) - Solo datos App">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.tiempos_respuesta || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tipo" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip formatter={(val: any) => [`${val} min`, 'Promedio']} />
                      <Bar dataKey="promedio_min" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Promedio (min)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-gray-500">No se pudieron cargar las estadisticas</div>
        )}
      </div>

      {/* Modal de Detalle */}
      {detalle.open && (
        <DetalleModal
          title={detalle.title}
          data={detalleData}
          loading={detalleLoading}
          onClose={closeDetalle}
        />
      )}
    </div>
  );
}

// ==========================================
// Componentes auxiliares
// ==========================================

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function DetalleModal({ title, data, loading, onClose }: {
  title: string;
  data: any[];
  loading: boolean;
  onClose: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] max-w-6xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
            {!loading && <p className="text-sm text-gray-500">{data.length} situacion(es) encontrada(s){data.length === 500 ? ' (limite 500)' : ''}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : data.length === 0 ? (
            <p className="text-center py-10 text-gray-400">No se encontraron situaciones</p>
          ) : (
            <div className="space-y-2">
              {data.map((s: any) => (
                <SituacionRow key={s.id} s={s} expanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SituacionRow({ s, expanded, onToggle }: { s: any; expanded: boolean; onToggle: () => void }) {
  const fecha = s.fecha ? new Date(s.fecha).toLocaleString('es-GT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : '-';

  const tipoColor = s.tipo_situacion === 'INCIDENTE' ? 'bg-red-100 text-red-700'
    : s.tipo_situacion === 'EMERGENCIA' ? 'bg-amber-100 text-amber-700'
    : 'bg-blue-100 text-blue-700';

  return (
    <div className={`border rounded-lg transition ${expanded ? 'ring-2 ring-blue-300' : 'hover:bg-gray-50'}`}>
      {/* Fila principal - siempre visible */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onToggle}>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColor}`}>
          {s.tipo_situacion_nombre || s.tipo_situacion || '-'}
        </span>
        <span className="text-xs text-gray-400 font-mono">{s.codigo_boleta || `#${s.id}`}</span>
        <span className="text-sm text-gray-700 flex-1">{s.departamento || ''} {s.municipio ? `/ ${s.municipio}` : ''}</span>
        <span className="text-xs text-gray-500">{s.ruta ? `Ruta ${s.ruta}` : ''} {s.km ? `km ${s.km}` : ''}</span>
        <span className="text-xs text-gray-400">{fecha}</span>
        <span className="text-xs text-gray-300">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 text-sm">
            <Detail label="ID" value={s.id} />
            <Detail label="Boleta" value={s.codigo_boleta} />
            <Detail label="Tipo" value={s.tipo_situacion_nombre || s.tipo_situacion} />
            <Detail label="Estado" value={s.estado} />
            <Detail label="Fecha" value={fecha} />
            <Detail label="Unidad" value={s.unidad} />
            <Detail label="Ruta" value={s.ruta} />
            <Detail label="KM" value={s.km} />
            <Detail label="Sentido" value={s.sentido} />
            <Detail label="Departamento" value={s.departamento} />
            <Detail label="Municipio" value={s.municipio} />
            <Detail label="Clima" value={s.clima} />
            <Detail label="Area" value={s.area} />
            <Detail label="Origen" value={s.origen_datos === 'EXCEL_2025' ? 'Excel' : s.origen_datos} />
            <Detail label="Heridos" value={s.heridos} highlight={s.heridos > 0 ? 'text-amber-600 font-bold' : ''} />
            <Detail label="Fallecidos" value={s.fallecidos} highlight={s.fallecidos > 0 ? 'text-red-600 font-bold' : ''} />
            <Detail label="Ilesos" value={s.ilesos} />
            <Detail label="Trasladados" value={s.trasladados} />
            <Detail label="Causa" value={s.causa_probable} span={2} />
            <Detail label="Observaciones" value={s.observaciones} span={2} />
          </div>
          {s.latitud && s.longitud && (
            <div className="mt-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <a href={`https://www.google.com/maps?q=${s.latitud},${s.longitud}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                {Number(s.latitud).toFixed(5)}, {Number(s.longitud).toFixed(5)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, highlight, span }: {
  label: string; value: any; highlight?: string; span?: number;
}) {
  if (value === null || value === undefined || value === '') return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-300">-</p>
    </div>
  );
  return (
    <div className={span === 2 ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={highlight || 'text-gray-700'}>{value}</p>
    </div>
  );
}
