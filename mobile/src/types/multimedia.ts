// types/multimedia.ts
// Tipos para el sistema de múltiples infografías

export type MediaEstado = 'PENDIENTE' | 'SUBIENDO' | 'SUBIDO' | 'ERROR';

export interface FotoItem {
    orden: number;
    uri: string;
    filename: string;
    url_original?: string;
    url_thumbnail?: string;
    cloudinary_id?: string;
    estado: MediaEstado;
    latitud?: number;
    longitud?: number;
}

export interface VideoItem {
    uri: string;
    filename: string;
    url_original?: string;
    cloudinary_id?: string;
    duracion_segundos?: number;
    estado: MediaEstado;
    latitud?: number;
    longitud?: number;
}

export interface Infografia {
    numero: number;
    titulo: string;
    fotos: FotoItem[];
    video: VideoItem | null;
    created_at: string;
}

export interface InfografiaManagerProps {
    situacionId: string;
    infografias: Infografia[];
    onChange: (infografias: Infografia[]) => void;
    disabled?: boolean;
}

export interface InfografiaValidation {
    minFotos: number;    // 1
    maxFotos: number;    // 3
    minVideos: number;   // 1
    maxVideos: number;   // 1
}

export const INFOGRAFIA_LIMITS: InfografiaValidation = {
    minFotos: 1,
    maxFotos: 3,
    minVideos: 1,
    maxVideos: 1,
};
