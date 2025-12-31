/**
 * Página de Galería Multimedia
 * Para Accidentología y Comunicación Social
 * Permite ver fotos y videos de situaciones para análisis o publicación
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Video,
  Filter,
  Download,
  Share2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import api from '../services/api';

interface MultimediaItem {
  id: number;
  tipo: 'FOTO' | 'VIDEO';
  orden: number | null;
  url_original: string;
  url_thumbnail: string | null;
  created_at: string;
}

interface SituacionConMultimedia {
  situacion_id: number;
  numero_situacion: string;
  tipo_situacion: string;
  estado: string;
  descripcion: string;
  observaciones: string;
  created_at: string;
  ruta_codigo: string;
  km: string;
  sentido: string;
  latitud: string;
  longitud: string;
  unidad_codigo: string;
  multimedia: MultimediaItem[];
  total_fotos: number;
  total_videos: number;
}

export default function GaleriaMultimediaPage() {
  const navigate = useNavigate();

  // Filtros
  const [filtros, setFiltros] = useState({
    desde: '',
    hasta: '',
    tipoSituacion: '',
    soloIncompletas: false,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Modal de visualización
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSituacion, setCurrentSituacion] = useState<SituacionConMultimedia | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  // Query para obtener galería
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['galeria-multimedia', filtros],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filtros.desde) params.append('desde', filtros.desde);
      if (filtros.hasta) params.append('hasta', filtros.hasta);
      if (filtros.tipoSituacion) params.append('tipoSituacion', filtros.tipoSituacion);
      if (filtros.soloIncompletas) params.append('soloIncompletas', 'true');
      params.append('limit', '50');

      const response = await api.get(`/multimedia/galeria?${params.toString()}`);
      return response.data as {
        situaciones: SituacionConMultimedia[];
        total: number;
      };
    },
  });

  // Abrir modal de visualización
  const openModal = (situacion: SituacionConMultimedia, mediaIndex = 0) => {
    setCurrentSituacion(situacion);
    setCurrentMediaIndex(mediaIndex);
    setModalVisible(true);
  };

  // Navegar en el modal
  const navigateMedia = (direction: 'prev' | 'next') => {
    if (!currentSituacion) return;
    const totalItems = currentSituacion.multimedia.length;
    if (direction === 'prev') {
      setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else {
      setCurrentMediaIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    }
  };

  // Obtener badge de tipo situación
  const getTipoBadge = (tipo: string) => {
    const colors: Record<string, string> = {
      INCIDENTE: 'bg-red-100 text-red-800',
      ASISTENCIA_VEHICULAR: 'bg-blue-100 text-blue-800',
      EMERGENCIA: 'bg-orange-100 text-orange-800',
      PATRULLAJE: 'bg-gray-100 text-gray-800',
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800';
  };

  // Obtener badge de completitud
  const getCompletitudBadge = (fotos: number, videos: number) => {
    const isComplete = fotos >= 3 && videos >= 1;
    return isComplete ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
        <CheckCircle2 size={12} />
        Completa
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">
        <AlertTriangle size={12} />
        {fotos}/3 fotos, {videos}/1 video
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Regresar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Camera className="text-purple-600" />
                  Galeria Multimedia
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Fotos y videos de situaciones para analisis y difusion
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                  showFilters ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200'
                }`}
              >
                <Filter size={18} />
                Filtros
              </button>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Actualizar
              </button>
            </div>
          </div>

          {/* Panel de filtros */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={filtros.desde}
                    onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={filtros.hasta}
                    onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Situación
                  </label>
                  <select
                    value={filtros.tipoSituacion}
                    onChange={(e) => setFiltros({ ...filtros, tipoSituacion: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Todos</option>
                    <option value="INCIDENTE">Incidentes</option>
                    <option value="ASISTENCIA_VEHICULAR">Asistencias</option>
                    <option value="EMERGENCIA">Emergencias</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filtros.soloIncompletas}
                      onChange={(e) =>
                        setFiltros({ ...filtros, soloIncompletas: e.target.checked })
                      }
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Solo incompletas</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : data?.situaciones.length === 0 ? (
          <div className="text-center py-16">
            <Camera size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No hay multimedia</h3>
            <p className="text-gray-400">
              No se encontraron situaciones con los filtros seleccionados
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.situaciones.map((situacion) => (
              <div
                key={situacion.situacion_id}
                className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Preview de multimedia */}
                <div className="relative h-48 bg-gray-100">
                  {situacion.multimedia.length > 0 ? (
                    <div className="grid grid-cols-3 h-full gap-0.5">
                      {situacion.multimedia.slice(0, 3).map((item, idx) => (
                        <div
                          key={item.id}
                          className="relative cursor-pointer overflow-hidden"
                          onClick={() => openModal(situacion, idx)}
                        >
                          {item.tipo === 'FOTO' ? (
                            <img
                              src={item.url_thumbnail || item.url_original}
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <Video size={32} className="text-white" />
                            </div>
                          )}
                          {idx === 2 && situacion.multimedia.length > 3 && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">
                                +{situacion.multimedia.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <Camera size={40} className="mx-auto mb-2" />
                        <span className="text-sm">Sin multimedia</span>
                      </div>
                    </div>
                  )}

                  {/* Badge de tipo */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTipoBadge(situacion.tipo_situacion)}`}>
                      {situacion.tipo_situacion.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Info de la situación */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-800">
                      {situacion.numero_situacion}
                    </h3>
                    {getCompletitudBadge(
                      Number(situacion.total_fotos),
                      Number(situacion.total_videos)
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} />
                      <span>
                        {situacion.ruta_codigo} Km {situacion.km}
                        {situacion.sentido && ` (${situacion.sentido})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>
                        {new Date(situacion.created_at).toLocaleDateString('es-GT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {situacion.unidad_codigo && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          🚓 Unidad {situacion.unidad_codigo}
                        </span>
                      </div>
                    )}
                  </div>

                  {situacion.descripcion && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                      {situacion.descripcion}
                    </p>
                  )}

                  {/* Acciones */}
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => openModal(situacion, 0)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm"
                    >
                      <Eye size={16} />
                      Ver
                    </button>
                    <button className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm">
                      <Download size={16} />
                    </button>
                    <button className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm">
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {data && data.total > 50 && (
          <div className="mt-6 flex justify-center">
            <p className="text-sm text-gray-500">
              Mostrando {data.situaciones.length} de {data.total} situaciones
            </p>
          </div>
        )}
      </div>

      {/* Modal de visualización */}
      {modalVisible && currentSituacion && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          {/* Botón cerrar */}
          <button
            onClick={() => setModalVisible(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X size={32} />
          </button>

          {/* Info de la situación */}
          <div className="absolute top-4 left-4 text-white z-10">
            <h3 className="font-bold text-lg">{currentSituacion.numero_situacion}</h3>
            <p className="text-sm text-gray-300">
              {currentSituacion.tipo_situacion.replace('_', ' ')} •{' '}
              {currentSituacion.ruta_codigo} Km {currentSituacion.km}
            </p>
          </div>

          {/* Navegación */}
          {currentSituacion.multimedia.length > 1 && (
            <>
              <button
                onClick={() => navigateMedia('prev')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/30 rounded-full p-2"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={() => navigateMedia('next')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 bg-black/30 rounded-full p-2"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          {/* Contenido del modal */}
          <div className="max-w-5xl max-h-[80vh] flex items-center justify-center">
            {currentSituacion.multimedia[currentMediaIndex]?.tipo === 'FOTO' ? (
              <img
                src={currentSituacion.multimedia[currentMediaIndex].url_original}
                alt="Vista completa"
                className="max-w-full max-h-[80vh] object-contain"
              />
            ) : (
              <video
                src={currentSituacion.multimedia[currentMediaIndex]?.url_original}
                controls
                autoPlay
                className="max-w-full max-h-[80vh]"
              />
            )}
          </div>

          {/* Indicador de posición */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {currentSituacion.multimedia.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentMediaIndex(idx)}
                className={`w-2 h-2 rounded-full ${
                  idx === currentMediaIndex ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>

          {/* Thumbnails en la parte inferior */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
            {currentSituacion.multimedia.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => setCurrentMediaIndex(idx)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${
                  idx === currentMediaIndex ? 'border-white' : 'border-transparent'
                }`}
              >
                {item.tipo === 'FOTO' ? (
                  <img
                    src={item.url_thumbnail || item.url_original}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <Video size={20} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
