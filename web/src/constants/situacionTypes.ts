// Tipos de situaciones operativas - COMPARTIDO CON MOBILE
// Este archivo debe mantenerse sincronizado con mobile/src/constants/situacionTypes.ts

export type TipoSituacion =
  | 'SALIDA_SEDE'
  | 'PATRULLAJE'
  | 'CAMBIO_RUTA'
  | 'PARADA_ESTRATEGICA'
  | 'COMIDA'
  | 'DESCANSO'
  | 'INCIDENTE'
  | 'REGULACION_TRAFICO'
  | 'ASISTENCIA_VEHICULAR'
  | 'OTROS';

export type EstadoSituacion = 'ACTIVA' | 'CERRADA' | 'CANCELADA';

// Configuración de tipos de situaciones
export const SITUACIONES_CONFIG: Record<
  TipoSituacion,
  {
    label: string;
    descripcion: string;
    color: string;
    bgColor: string;
    requiereCombustible?: boolean;
    requiereKilometraje?: boolean;
    requiereRuta?: boolean;
    requiereTripulacion?: boolean;
    tieneFormEspecial?: boolean; // Indica si tiene su propio formulario (Incidente, Asistencia)
  }
> = {
  SALIDA_SEDE: {
    label: 'Salida de Sede',
    descripcion: 'Salida desde la sede central',
    color: '#3b82f6',
    bgColor: 'bg-blue-100 text-blue-700',
    requiereCombustible: true,
    requiereKilometraje: true,
    requiereRuta: true,
    requiereTripulacion: true,
  },
  PATRULLAJE: {
    label: 'Patrullaje',
    descripcion: 'Patrullaje activo en ruta',
    color: '#10b981',
    bgColor: 'bg-green-100 text-green-700',
    requiereRuta: true,
  },
  CAMBIO_RUTA: {
    label: 'Cambio de Ruta',
    descripcion: 'Cambio a otra ruta de patrullaje',
    color: '#f59e0b',
    bgColor: 'bg-yellow-100 text-yellow-700',
    requiereRuta: true,
  },
  PARADA_ESTRATEGICA: {
    label: 'Parada Estratégica',
    descripcion: 'Parada en punto estratégico',
    color: '#8b5cf6',
    bgColor: 'bg-purple-100 text-purple-700',
  },
  COMIDA: {
    label: 'Comida/Descanso',
    descripcion: 'Tiempo de comida o descanso',
    color: '#06b6d4',
    bgColor: 'bg-cyan-100 text-cyan-700',
  },
  DESCANSO: {
    label: 'Descanso',
    descripcion: 'Tiempo de descanso',
    color: '#14b8a6',
    bgColor: 'bg-teal-100 text-teal-700',
  },
  INCIDENTE: {
    label: 'Incidente',
    descripcion: 'Atención de incidente',
    color: '#ef4444',
    bgColor: 'bg-red-100 text-red-700',
    tieneFormEspecial: true,
  },
  REGULACION_TRAFICO: {
    label: 'Regulación de Tráfico',
    descripcion: 'Regulando el tráfico vehicular',
    color: '#f97316',
    bgColor: 'bg-orange-100 text-orange-700',
  },
  ASISTENCIA_VEHICULAR: {
    label: 'Asistencia Vehicular',
    descripcion: 'Asistencia a vehículo varado',
    color: '#14b8a6',
    bgColor: 'bg-teal-100 text-teal-700',
    tieneFormEspecial: true,
  },
  OTROS: {
    label: 'Otros',
    descripcion: 'Otra situación operativa',
    color: '#6b7280',
    bgColor: 'bg-gray-100 text-gray-700',
  },
};

// Sentidos de circulación
export const SENTIDOS = [
  { value: 'NORTE', label: 'Norte' },
  { value: 'SUR', label: 'Sur' },
  { value: 'ORIENTE', label: 'Oriente' },
  { value: 'OCCIDENTE', label: 'Occidente' },
];

// Estados de situaciones
export const ESTADOS_SITUACION = [
  { value: 'ACTIVA', label: 'Activa', color: '#10b981' },
  { value: 'CERRADA', label: 'Cerrada', color: '#6b7280' },
  { value: 'CANCELADA', label: 'Cancelada', color: '#ef4444' },
];

// ========================================
// CONSTANTES PARA FORMULARIOS DE INCIDENTES
// ========================================

// Tipos de vehículos
export const TIPOS_VEHICULO = [
  'Motocicleta',
  'Sedan',
  'Pick-up',
  'Camión',
  'Bus',
  'Cabezal',
  'Jaula Cañera',
  'Rastra',
  'Bicicleta',
  'Jeep',
  'Bus escolar',
  'Maquinaria',
  'Bus turismo',
  'Tractor',
  'Ambulancia',
  'Camionetilla',
  'Pulman',
  'Autopatrulla PNC',
  'Bus extraurbano',
  'Bus urbano',
  'Camioneta agricola',
  'Cisterna',
  'Furgon',
  'Mototaxi',
  'Microbus',
  'Motobicicleta',
  'Plataforma',
  'Panel',
  'Unidad de PROVIAL',
  'Grúa',
  'Bus institucional',
  'Cuatrimoto',
  'Doble remolque',
  'Tesla',
  'Peaton',
  'Fugado',
  'Otro',
].sort();

// Marcas de vehículos
export const MARCAS_VEHICULO = [
  'Toyota',
  'Honda',
  'Nissan',
  'Jeep',
  'BMW',
  'Mitsubishi',
  'Suzuki',
  'Hyundai',
  'Mazda',
  'Chevrolet',
  'Freightliner',
  'International',
  'Volvo',
  'Italika',
  'Kia',
  'Volkswagen',
  'Ford',
  'Audi',
  'JAC',
  'Hino',
  'Otro',
].sort();

// Tipos de Hecho de Tránsito
export const TIPOS_HECHO_TRANSITO = [
  'Persona Fallecida',
  'Desprendimiento De Neumatico',
  'Salida De Pista',
  'Desprendimiento De Contenedor',
  'Explosion De Neumatico',
  'Caída De Carga',
  'Choque',
  'Colisión',
  'Colisión Múltiple',
  'Derrape',
  'Vehículo Incendiado',
  'Vuelco',
  'Desprendimiento',
  'Caída De Árbol',
  'Desprendimiento De Eje',
  'Desbalance De Carga',
  'Persona Atropellada',
].sort();

// Tipos de Asistencia Vial
export const TIPOS_ASISTENCIA = [
  'Pinchazo',
  'Trabajos De Carretera',
  'Consignación',
  'Ataque Armado',
  'Derrame',
  'Calentamiento',
  'Falta De Combustible',
  'Desperfectos Mecánicos',
  'Llamada De Atención',
  'Operativos',
  'Sanción',
  'Sistema Electrico',
  'Asistencia Al Usuario',
  'Doble Remolque',
  'Sinaprese',
  'Apoyo Atletismo',
  'Apoyo A Ciclismo',
  'Descarga De Batería',
  'Problemas De Salud',
  'Olvido La Llave',
  'Carga Sobredimensionada',
  'Desbalance De Carga',
  'Vehículo Abandonado',
  'Desprendimiento',
  'Caída De Poste',
  'Caída De Rama',
  'Operativo DGT',
  'Operativo PMT',
  'Apoyo A Digef',
  'Operativo Pnc Transito',
  'Sobrecarga',
  'Operativo En Conjunto',
  'Puesto De Atencion Al Usuario',
  'Incendio En Ruta',
].sort();

// Tipos de Emergencia Vial
export const TIPOS_EMERGENCIA = [
  'Acumulación De Agua',
  'Derrumbe',
  'Desbordamiento De Río',
  'Desprendimiento De Rocas',
  'Socavamiento',
  'Caída De Valla Publicitaría',
  'Hundimiento',
  'Caída De Puente',
  'Incendio Forestal',
  'Deslave',
  'Caída De Árbol',
  'Apoyo Antorcha',
].sort();

// Autoridades
export const AUTORIDADES = [
  'PMT',
  'PNC',
  'PROVIAL',
  'DGT',
  'Ejército',
  'MP',
  'COVIAL',
  'Caminos',
  'PNC DT',
  'PM',
  'Ninguna',
];

// Unidades de Socorro
export const UNIDADES_SOCORRO = [
  'Bomberos Voluntarios',
  'Bomberos Municipales',
  'CONRED',
  'Bomberos Departamentales',
  'Cruz Roja',
  'Ninguna',
];

// Estados de piloto/víctimas
export const ESTADOS_PILOTO = [
  { value: 'ILESO', label: 'Ileso' },
  { value: 'HERIDO', label: 'Herido' },
  { value: 'TRASLADADO', label: 'Trasladado' },
  { value: 'FALLECIDO', label: 'Fallecido' },
  { value: 'FUGADO', label: 'Fugado' },
];

// Niveles de daño
export const NIVELES_DANO = [
  'Leve',
  'Moderado',
  'Severo',
  'Pérdida Total',
];

// Obstrucciones
export const OBSTRUCCIONES = [
  { value: 'NO', label: 'No obstruye' },
  { value: 'PARCIAL', label: 'Parcial' },
  { value: 'TOTAL', label: 'Total' },
];

// Fracciones de combustible
export const FRACCIONES_COMBUSTIBLE = [
  { value: 'LLENO', label: 'Lleno', decimal: 1 },
  { value: '3/4', label: '3/4', decimal: 0.75 },
  { value: '1/2', label: '1/2', decimal: 0.5 },
  { value: '1/4', label: '1/4', decimal: 0.25 },
  { value: 'VACIO', label: 'Vacío', decimal: 0 },
];

// ========================================
// CONSTANTES PARA ACCIDENTOLOGÍA (Boleta UAV-205-13)
// ========================================

// Área del incidente
export const AREAS = [
  { value: 'URBANA', label: 'Urbana' },
  { value: 'RURAL', label: 'Rural' },
];

// Material de la vía
export const MATERIALES_VIA = [
  { value: 'ASFALTO', label: 'Asfalto' },
  { value: 'PAVIMENTO', label: 'Pavimento/Concreto' },
  { value: 'ADOQUIN', label: 'Adoquín' },
  { value: 'TERRACERIA', label: 'Terracería' },
  { value: 'EMPEDRADO', label: 'Empedrado' },
  { value: 'BALASTRO', label: 'Balastro' },
];

// Documentos que pueden ser consignados
export const DOCUMENTOS_CONSIGNADOS = [
  { id: 'licencia', label: 'Licencia de conducir' },
  { id: 'tarjeta_circulacion', label: 'Tarjeta de circulación' },
  { id: 'tarjeta', label: 'Tarjeta de propiedad' },
  { id: 'licencia_transporte', label: 'Licencia de transporte' },
  { id: 'tarjeta_operaciones', label: 'Tarjeta de operaciones' },
  { id: 'poliza', label: 'Póliza de seguro' },
];

// Tipos de servicio de vehículo
export const TIPOS_SERVICIO_VEHICULO = [
  { value: 'PARTICULAR', label: 'Particular' },
  { value: 'COMERCIAL', label: 'Comercial' },
  { value: 'OFICIAL', label: 'Oficial' },
  { value: 'DIPLOMATICO', label: 'Diplomático' },
  { value: 'EMERGENCIA', label: 'Emergencia' },
  { value: 'TRANSPORTE_PUBLICO', label: 'Transporte Público' },
  { value: 'CARGA', label: 'Carga' },
];

// Estado de la vía
export const ESTADOS_VIA = [
  { value: 'OPTIMO', label: 'Óptimo' },
  { value: 'BUENO', label: 'Bueno' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'MALO', label: 'Malo' },
];

// Topografía de la vía
export const TOPOGRAFIAS_VIA = [
  { value: 'PLANA', label: 'Plana' },
  { value: 'SUBIDA', label: 'Subida' },
  { value: 'BAJADA', label: 'Bajada' },
];

// Geometría de la vía
export const GEOMETRIAS_VIA = [
  { value: 'RECTA', label: 'Recta' },
  { value: 'CURVA_SUAVE', label: 'Curva Suave' },
  { value: 'CURVA_CERRADA', label: 'Curva Cerrada' },
  { value: 'INTERSECCION', label: 'Intersección' },
  { value: 'ROTONDA', label: 'Rotonda' },
  { value: 'PERALTE', label: 'Peralte' },
  { value: 'PUENTE', label: 'Puente' },
];

// Condiciones climáticas
export const CONDICIONES_CLIMATICAS = [
  { value: 'DESPEJADO', label: 'Despejado' },
  { value: 'NUBLADO', label: 'Nublado' },
  { value: 'LLUVIA_LEVE', label: 'Lluvia Leve' },
  { value: 'LLUVIA_FUERTE', label: 'Lluvia Fuerte' },
  { value: 'NEBLINA', label: 'Neblina' },
  { value: 'VIENTO_FUERTE', label: 'Viento Fuerte' },
];

// Condiciones de iluminación
export const ILUMINACIONES = [
  { value: 'DIURNA', label: 'Diurna (día)' },
  { value: 'NOCTURNA_ILUMINADA', label: 'Nocturna con iluminación' },
  { value: 'NOCTURNA_OSCURA', label: 'Nocturna sin iluminación' },
  { value: 'CREPUSCULO', label: 'Crepúsculo/Amanecer' },
];

// Consignado por (autoridad)
export const CONSIGNADO_POR = [
  { value: 'PNC', label: 'PNC' },
  { value: 'PMT', label: 'PMT' },
  { value: 'MP', label: 'Ministerio Público' },
];
