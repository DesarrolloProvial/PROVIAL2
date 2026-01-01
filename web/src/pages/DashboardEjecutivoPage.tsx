import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

interface DashboardData {
  resumen: {
    brigadas_activas: number;
    unidades_activas: number;
    situaciones_hoy: number;
    km_recorridos_hoy: number;
  };
  situaciones_por_tipo: {
    tipo: string;
    cantidad: number;
    color: string;
  }[];
  situaciones_por_dia: {
    fecha: string;
    incidentes: number;
    asistencias: number;
    emergencias: number;
    total: number;
  }[];
  estado_unidades: {
    en_servicio: number;
    disponibles: number;
    en_mantenimiento: number;
    total: number;
  };
  situaciones_por_hora: {
    hora: number;
    cantidad: number;
  }[];
  situaciones_por_departamento: {
    departamento: string;
    cantidad: number;
  }[];
  comparativa_mensual: {
    mes_actual: { situaciones: number; km: number };
    mes_anterior: { situaciones: number; km: number };
    variacion_situaciones: number;
    variacion_km: number;
  };
  rendimiento_brigadas: {
    brigada_id: number;
    nombre: string;
    chapa: string;
    situaciones_atendidas: number;
    km_recorridos: number;
    horas_servicio: number;
  }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardEjecutivoPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    cargarDashboard();
  }, [dias]);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard?dias=${dias}`);
      setDashboard(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error cargando dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatHora = (hora: number) => `${hora.toString().padStart(2, '0')}:00`;

  const unidadesData = dashboard?.estado_unidades
    ? [
        { name: 'En Servicio', value: dashboard.estado_unidades.en_servicio, color: '#10b981' },
        { name: 'Disponibles', value: dashboard.estado_unidades.disponibles, color: '#3b82f6' },
        { name: 'Mantenimiento', value: dashboard.estado_unidades.en_mantenimiento, color: '#f59e0b' },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
          <button
            onClick={cargarDashboard}
            className="ml-4 text-red-600 underline hover:text-red-800"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
          <p className="text-gray-600">Vista general del sistema PROVIAL</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={dias}
            onChange={(e) => setDias(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value={7}>Ultimos 7 dias</option>
            <option value={15}>Ultimos 15 dias</option>
            <option value={30}>Ultimos 30 dias</option>
            <option value={60}>Ultimos 60 dias</option>
            <option value={90}>Ultimos 90 dias</option>
          </select>
          <button
            onClick={cargarDashboard}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Resumen Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Brigadas Activas</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard.resumen.brigadas_activas}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Unidades Activas</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard.resumen.unidades_activas}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Situaciones Hoy</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard.resumen.situaciones_hoy}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">KM Recorridos Hoy</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {dashboard.resumen.km_recorridos_hoy.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Comparativa Mensual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparativa Mensual - Situaciones</h3>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm text-gray-500">Mes Actual</p>
              <p className="text-2xl font-bold">{dashboard.comparativa_mensual.mes_actual.situaciones}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mes Anterior</p>
              <p className="text-2xl font-bold text-gray-400">{dashboard.comparativa_mensual.mes_anterior.situaciones}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              dashboard.comparativa_mensual.variacion_situaciones >= 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {dashboard.comparativa_mensual.variacion_situaciones >= 0 ? '+' : ''}
              {dashboard.comparativa_mensual.variacion_situaciones}%
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparativa Mensual - Kilometraje</h3>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm text-gray-500">Mes Actual</p>
              <p className="text-2xl font-bold">{dashboard.comparativa_mensual.mes_actual.km.toLocaleString()} km</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mes Anterior</p>
              <p className="text-2xl font-bold text-gray-400">{dashboard.comparativa_mensual.mes_anterior.km.toLocaleString()} km</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              dashboard.comparativa_mensual.variacion_km >= 0
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {dashboard.comparativa_mensual.variacion_km >= 0 ? '+' : ''}
              {dashboard.comparativa_mensual.variacion_km}%
            </div>
          </div>
        </div>
      </div>

      {/* Graficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Situaciones por Dia */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Situaciones por Dia</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboard.situaciones_por_dia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="fecha"
                tickFormatter={(fecha) => new Date(fecha).toLocaleDateString('es-GT', { day: '2-digit', month: 'short' })}
                tick={{ fontSize: 12 }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                labelFormatter={(fecha) => new Date(fecha).toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })}
              />
              <Legend />
              <Area type="monotone" dataKey="incidentes" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Incidentes" />
              <Area type="monotone" dataKey="asistencias" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Asistencias" />
              <Area type="monotone" dataKey="emergencias" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} name="Emergencias" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Situaciones por Tipo (Pie) */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribucion por Tipo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={dashboard.situaciones_por_tipo}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="cantidad"
                nameKey="tipo"
                label={({ tipo, percent }) => `${tipo} (${(percent * 100).toFixed(0)}%)`}
              >
                {dashboard.situaciones_por_tipo.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segunda fila de graficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estado de Unidades */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Unidades</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={unidadesData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {unidadesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="text-center mt-2">
            <span className="text-2xl font-bold">{dashboard.estado_unidades.total}</span>
            <span className="text-gray-500 ml-2">Total Unidades</span>
          </div>
        </div>

        {/* Situaciones por Hora */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Situaciones por Hora del Dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dashboard.situaciones_por_hora}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="hora"
                tickFormatter={formatHora}
                tick={{ fontSize: 10 }}
                interval={2}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={(hora) => formatHora(hora as number)} />
              <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tercera fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Situaciones por Departamento */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Situaciones por Departamento</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboard.situaciones_por_departamento} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="departamento"
                tick={{ fontSize: 11 }}
                width={120}
              />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rendimiento de Brigadas */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 10 Brigadas por Rendimiento</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-500">#</th>
                  <th className="text-left py-2 px-2 text-sm font-medium text-gray-500">Brigada</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-gray-500">Situaciones</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-gray-500">KM</th>
                  <th className="text-right py-2 px-2 text-sm font-medium text-gray-500">Horas</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.rendimiento_brigadas.map((brigada, index) => (
                  <tr key={brigada.brigada_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-2 text-sm">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-500'
                      }`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="text-sm font-medium text-gray-900">{brigada.nombre}</div>
                      <div className="text-xs text-gray-500">{brigada.chapa}</div>
                    </td>
                    <td className="py-2 px-2 text-right text-sm font-medium text-gray-900">
                      {brigada.situaciones_atendidas}
                    </td>
                    <td className="py-2 px-2 text-right text-sm text-gray-600">
                      {brigada.km_recorridos.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-sm text-gray-600">
                      {brigada.horas_servicio}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
