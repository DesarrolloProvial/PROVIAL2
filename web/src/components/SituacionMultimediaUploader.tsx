import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Camera, Video, Plus, Trash2, Loader2 } from 'lucide-react';

interface Props {
  situacionId?: number;
  actividadId?: number;
}

export default function SituacionMultimediaUploader({ situacionId, actividadId }: Props) {
  const [infografiaActiva, setInfografiaActiva] = useState(1);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const entityId = situacionId || actividadId;
  const entityType = situacionId ? 'situacion' : 'actividad';
  const queryKey = situacionId ? ['multimedia-situacion', situacionId] : ['multimedia-actividad', actividadId];

  const { data, refetch, isLoading } = useQuery({
    queryKey,
    queryFn: () => api.get(`/multimedia/${entityType}/${entityId}`).then(r => r.data),
    enabled: !!entityId,
  });

  // Agrupar por infografia_numero
  const infografias = useMemo(() => {
    const grupos: Record<number, { fotos: any[]; video: any | null }> = {};
    (data?.fotos || []).forEach((m: any) => {
      const n = m.infografia_numero || 1;
      if (!grupos[n]) grupos[n] = { fotos: [], video: null };
      grupos[n].fotos.push(m);
    });
    (data?.videos || []).forEach((m: any) => {
      const n = m.infografia_numero || 1;
      if (!grupos[n]) grupos[n] = { fotos: [], video: null };
      grupos[n].video = m;
    });
    // Ordenar fotos por orden dentro de cada grupo
    Object.values(grupos).forEach(g => {
      g.fotos.sort((a, b) => (a.orden || 0) - (b.orden || 0));
    });
    return grupos;
  }, [data]);

  const infografiaNumbers = Object.keys(infografias).map(Number).sort((a, b) => a - b);
  const maxNum = infografiaNumbers.length > 0 ? Math.max(...infografiaNumbers) : 0;

  // Asegurar que la infografía activa exista en los tabs si no tiene contenido aún
  const tabsToShow = [...new Set([...infografiaNumbers, infografiaActiva])].sort((a, b) => a - b);
  const currentInfografia = infografias[infografiaActiva] || { fotos: [], video: null };

  const handleUploadFoto = async (file: File) => {
    setUploading('foto');
    setError('');
    try {
      const formData = new FormData();
      formData.append('foto', file);
      formData.append('infografia_numero', String(infografiaActiva));
      await api.post(`/multimedia/${entityType}/${entityId}/foto`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al subir foto');
    } finally {
      setUploading(null);
    }
  };

  const handleUploadVideo = async (file: File) => {
    setUploading('video');
    setError('');
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('infografia_numero', String(infografiaActiva));
      await api.post(`/multimedia/${entityType}/${entityId}/video`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refetch();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al subir video');
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este archivo?')) return;
    setError('');
    try {
      await api.delete(`/multimedia/${id}`);
      await refetch();
    } catch {
      setError('Error al eliminar archivo');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs de infografías */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabsToShow.map(n => (
          <button
            key={n}
            onClick={() => setInfografiaActiva(n)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              infografiaActiva === n
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Infografía {n}
            {infografias[n] && (
              <span className="ml-1.5 text-[10px] opacity-75">
                {infografias[n].fotos.length}/3{infografias[n].video ? '+V' : ''}
              </span>
            )}
          </button>
        ))}
        <button
          onClick={() => setInfografiaActiva(maxNum + 1)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Slots: 3 fotos + 1 video */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Infografía {infografiaActiva}
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {currentInfografia.fotos.length}/3 fotos · {currentInfografia.video ? '1/1' : '0/1'} video
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* 3 slots de foto */}
          {[0, 1, 2].map(i => {
            const foto = currentInfografia.fotos[i];
            return (
              <div key={`foto-${i}`} className="aspect-square">
                {foto ? (
                  <div className="relative h-full">
                    <img
                      src={foto.url_thumbnail || foto.url_original}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      onClick={() => handleDelete(foto.id)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                      Foto {i + 1}
                    </div>
                  </div>
                ) : (
                  <label className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg transition ${
                    uploading === 'foto'
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 cursor-wait'
                      : 'border-gray-300 dark:border-gray-600 cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}>
                    {uploading === 'foto' ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-400 mt-1">Foto {i + 1}</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={!!uploading || currentInfografia.fotos.length >= 3}
                      onChange={(e) => e.target.files?.[0] && handleUploadFoto(e.target.files[0])}
                    />
                  </label>
                )}
              </div>
            );
          })}

          {/* 1 slot de video */}
          <div className="aspect-square">
            {currentInfografia.video ? (
              <div className="relative h-full">
                <div className="w-full h-full bg-gray-900 rounded-lg border border-gray-600 flex items-center justify-center">
                  <Video className="w-10 h-10 text-white/60" />
                </div>
                <button
                  onClick={() => handleDelete(currentInfografia.video.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                  title="Eliminar video"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                  Video
                </div>
                <a
                  href={currentInfografia.video.url_original}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center h-full border-2 border-dashed rounded-lg transition ${
                uploading === 'video'
                  ? 'border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20 cursor-wait'
                  : 'border-gray-300 dark:border-gray-600 cursor-pointer hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}>
                {uploading === 'video' ? (
                  <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                ) : (
                  <>
                    <Video className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-400 mt-1">Video</span>
                  </>
                )}
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  disabled={!!uploading}
                  onChange={(e) => e.target.files?.[0] && handleUploadVideo(e.target.files[0])}
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Resumen si hay más de 1 infografía */}
      {infografiaNumbers.length > 1 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">Resumen</p>
          <div className="flex flex-wrap gap-2">
            {infografiaNumbers.map(n => (
              <button
                key={n}
                onClick={() => setInfografiaActiva(n)}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Inf. {n}: {infografias[n].fotos.length} fotos · {infografias[n].video ? '1 video' : 'sin video'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
