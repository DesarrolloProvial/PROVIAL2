import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { FileText, Download, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Inspeccion360Item {
  id: number;
  fecha: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  inspector: string;
  comandante: string | null;
  pdf_url: string;
}

interface Props {
  unidadId: number;
  dias?: number;
  limite?: number;
  autoOpen?: boolean; // Si es true, carga automaticamente sin necesidad de clic
}

export default function Inspeccion360Historial({ unidadId, dias = 30, limite = 20, autoOpen = false }: Props) {
  const [isOpen, setIsOpen] = useState(autoOpen);

  const { data, isLoading } = useQuery({
    queryKey: ['inspeccion360-historial', unidadId, dias, limite],
    queryFn: async () => {
      const response = await api.get(`/inspeccion360/historial/${unidadId}/pdfs?dias=${dias}&limite=${limite}`);
      return response.data.inspecciones as Inspeccion360Item[];
    },
    enabled: (isOpen || autoOpen) && !!unidadId,
  });

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'APROBADA':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'RECHAZADA':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'APROBADA':
        return 'bg-green-100 text-green-800';
      case 'RECHAZADA':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleViewPDF = async (inspeccionId: number) => {
    try {
      // Obtener token
      const token = localStorage.getItem('accessToken');

      // Abrir en nueva ventana
      const url = `/api/inspeccion360/${inspeccionId}/pdf`;

      // Crear un link temporal para descarga
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al obtener PDF');

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (error) {
      console.error('Error al abrir PDF:', error);
      alert('Error al abrir el PDF');
    }
  };

  const handleDownloadPDF = async (inspeccionId: number, fecha: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      const url = `/api/inspeccion360/${inspeccionId}/pdf`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al descargar PDF');

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `inspeccion_360_${unidadId}_${fecha.split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      alert('Error al descargar el PDF');
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Si es autoOpen, mostrar directamente el contenido
  if (autoOpen) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Historial de Inspecciones 360 (ultimos {dias} dias)
        </h4>

        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Cargando...</div>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            No hay inspecciones en este periodo
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((inspeccion) => (
              <div
                key={inspeccion.id}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  {getEstadoIcon(inspeccion.estado)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {formatFecha(inspeccion.fecha)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getEstadoClass(inspeccion.estado)}`}>
                        {inspeccion.estado}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Inspector: {inspeccion.inspector}
                      {inspeccion.comandante && ` | Comandante: ${inspeccion.comandante}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewPDF(inspeccion.id)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Ver PDF"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(inspeccion.id, inspeccion.fecha)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="Descargar PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
      >
        <FileText className="w-4 h-4" />
        <span>Inspecciones 360 ({isOpen ? 'ocultar' : 'ver historial'})</span>
      </button>

      {isOpen && (
        <div className="mt-3 bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Historial de Inspecciones 360 (ultimos {dias} dias)
          </h4>

          {isLoading ? (
            <div className="text-center py-4 text-gray-500">Cargando...</div>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No hay inspecciones en este periodo
            </div>
          ) : (
            <div className="space-y-2">
              {data.map((inspeccion) => (
                <div
                  key={inspeccion.id}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    {getEstadoIcon(inspeccion.estado)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {formatFecha(inspeccion.fecha)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getEstadoClass(inspeccion.estado)}`}>
                          {inspeccion.estado}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Inspector: {inspeccion.inspector}
                        {inspeccion.comandante && ` | Comandante: ${inspeccion.comandante}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewPDF(inspeccion.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="Ver PDF"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(inspeccion.id, inspeccion.fecha)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                      title="Descargar PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
