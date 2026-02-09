import {
  Car,
  Truck,
  TreePine,
  Flame,
  Droplets,
  Mountain,
  AlertTriangle,
  Shield,
  Wrench,
  Coffee,
  MapPin,
  Eye,
  FileText,
  Users,
  Bike,
  Siren,
  CircleStop,
  Megaphone,
  Scale,
  TrafficCone,
  type LucideIcon,
} from 'lucide-react';

// Mapeo de nombres MDI (catalogo_tipo_situacion.icono) a componentes Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  // Hechos de tránsito
  'car-crash': Car,
  'car-impact': Car,
  'road-variant': Car,
  'tire': Car,
  'package-down': Truck,
  'truck-cargo-container': Truck,
  'weight': Truck,
  'car-tire-alert': Car,
  'axis-arrow': Car,
  'fire-truck': Flame,
  'pistol': Shield,
  'car-side': Car,
  'account-injury': AlertTriangle,
  'coffin': AlertTriangle,

  // Asistencia
  'tow-truck': Truck,

  // Emergencias
  'oil': Droplets,
  'car-off': Car,
  'car-brake-alert': Car,
  'tree': TreePine,
  'image-filter-hdr': Mountain,
  'landslide': Mountain,
  'waves': Droplets,
  'slope-downhill': Mountain,
  'arrow-down-bold-box': Mountain,
  'table-row-remove': Mountain,
  'water': Droplets,
  'home-flood': Droplets,
  'water-alert': Droplets,
  'volcano': Flame,

  // Operativo
  'police-station': MapPin,
  'map-marker-radius': MapPin,
  'traffic-cone': TrafficCone,
  'counter': Eye,
  'speedometer': Eye,
  'traffic-cone-off': TrafficCone,
  'car-wash': Car,
  'traffic-light': TrafficCone,
  'home-city': MapPin,
  'airplane': MapPin,
  'eye-check': Eye,
  'clipboard-check': FileText,
  'scale': Scale,
  'truck-wide': Truck,
  'shield-account': Shield,
  'police-badge': Shield,
  'police-badge-outline': Shield,
  'account-group': Users,
  'road-barrier': CircleStop,
  'bullhorn': Megaphone,
  'car-police': Siren,
  'file-document': FileText,
  'file-sign': FileText,
  'stop-circle': CircleStop,
  'account-switch': Users,

  // Apoyo
  'gavel': Shield,
  'car-multiple': Car,
  'road-worker': Wrench,
  'bike': Bike,
  'run': Users,
  'swim': Users,
  'run-fast': Users,
  'fire': Flame,
  'bank': MapPin,

  // Novedades
  'toilet': Coffee,
  'atm': MapPin,
  'food': Coffee,
  'wrench-clock': Wrench,
};

interface SituacionIconProps {
  icono?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
}

export default function SituacionIcon({ icono, color, size = 16, className = '' }: SituacionIconProps) {
  if (!icono) return null;

  const IconComponent = ICON_MAP[icono];
  if (!IconComponent) {
    return <span className={className} style={{ color: color || undefined, fontSize: size }}>●</span>;
  }

  return <IconComponent size={size} color={color || undefined} className={className} />;
}
