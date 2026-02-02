import { NavigatorScreenParams } from '@react-navigation/native';
import { TipoSituacion } from '../services/draftStorage';

// ========================================
// ROOT STACK (AUTH + MAIN)
// ========================================

export type RootStackParamList = {
  Auth: undefined;
  ResetPassword: { username: string; tieneChapa: boolean };
  Main: NavigatorScreenParams<MainDrawerParamList>;
};

// ========================================
// MAIN DRAWER (ROLE-BASED)
// ========================================

export type MainDrawerParamList = {
  // BRIGADA screens
  BrigadaStack: NavigatorScreenParams<BrigadaStackParamList> | undefined;

  // COP screens
  COPStack: NavigatorScreenParams<COPStackParamList> | undefined;

  // ENCARGADO_SEDE screens
  SedeStack: NavigatorScreenParams<SedeStackParamList> | undefined;

  // Shared screens
  Perfil: undefined;
  Configuracion: undefined;
};

// ========================================
// PARAMS PARA SITUACION DINAMICA
// ========================================

export type SituacionDinamicaParams = {
  codigoSituacion: string;      // Código para buscar config (ASISTENCIA_VEHICULAR, HECHO_TRANSITO, etc.)
  tipoSituacionId: number;       // ID del tipo en la BD
  nombreSituacion: string;       // Nombre para mostrar en header
  tipoSituacion: TipoSituacion;  // Tipo para el draft storage
  editMode?: boolean;
  situacionId?: number;
  situacionData?: any;
};

// ========================================
// BRIGADA STACK
// ========================================

export type BrigadaStackParamList = {
  BrigadaHome: undefined;
  NuevaSituacion: { editMode?: boolean; situacionId?: number; situacionData?: any } | undefined;
  DetalleSituacion: { situacionId: number };
  Bitacora: undefined;

  // Situaciones - Ahora usan SituacionDinamicaScreen con params extendidos
  Incidente: SituacionDinamicaParams | undefined;
  Asistencia: SituacionDinamicaParams | undefined;
  Emergencia: SituacionDinamicaParams | undefined;

  // Otras pantallas
  IniciarSalida: { editMode?: boolean; salidaData?: any } | undefined;
  IngresoSede: { editMode?: boolean; ingresoData?: any } | undefined;
  SalidaDeSede: undefined;
  FinalizarDia: undefined;
  RegistroCombustible: undefined;
  Relevo: undefined;
  ConfiguracionPruebas: undefined;
  Inspeccion360: { unidadId: number; tipoUnidad?: string; salidaId?: number } | undefined;
  AprobarInspeccion360: { inspeccionId: number; salidaId?: number };
};

// ========================================
// COP STACK
// ========================================

export type COPStackParamList = {
  COPHome: undefined;
  MapaUnidades: undefined;
  BitacoraUnidad: { unidadId: number; unidadCodigo: string };
  DetalleSituacionCOP: { situacionId: number };
  GestionGrupos: undefined;
  GestionMovimientos: undefined;
};

// ========================================
// ENCARGADO_SEDE STACK
// ========================================

export type SedeStackParamList = {
  SedeHome: undefined;
  MisUnidades: undefined;
  BitacoraUnidadSede: { unidadId: number; unidadCodigo: string };
};
