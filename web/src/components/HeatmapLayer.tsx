import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet.heat';

interface HeatPoint {
  latitud: number;
  longitud: number;
  peso?: number;
}

interface Props {
  points: HeatPoint[];
  options?: L.HeatMapOptions;
}

export default function HeatmapLayer({ points, options }: Props) {
  const map = useMap();
  const layerRef = useRef<L.HeatLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    const latlngs: [number, number, number][] = points
      .filter(p => p.latitud && p.longitud)
      .map(p => [p.latitud, p.longitud, p.peso ?? 1]);

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    if (latlngs.length === 0) return;

    layerRef.current = L.heatLayer(latlngs, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 3,
      gradient: { 0.2: '#3B82F6', 0.5: '#F59E0B', 0.8: '#EF4444' },
      ...options,
    }).addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, points, options]);

  return null;
}
