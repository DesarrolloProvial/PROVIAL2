import { NavigatorScreenParams } from '@react-navigation/native';

// ========================================
// ROOT STACK (AUTH + MAIN)
// ========================================

export type RootStackParamList = {
  Auth: undefined;
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
// BRIGADA STACK
// ========================================

export type BrigadaStackParamList = {
  BrigadaHome: undefined;
  NuevaSituacion: { editMode?: boolean; situacionId?: number; situacionData?: any } | undefined;
  DetalleSituacion: { situacionId: number };
  Bitacora: undefined;
  Incidente: { editMode?: boolean; situacionId?: number; incidenteId?: number; situacionData?: any } | undefined;
  Asistencia: { editMode?: boolean; situacionId?: number; situacionData?: any } | undefined;
  Emergencia: { editMode?: boolean; situacionId?: number; situacionData?: any } | undefined;
  SalidaSede: undefined;
  IniciarSalida: { editMode?: boolean; salidaData?: any } | undefined;
  IngresoSede: { editMode?: boolean; ingresoData?: any } | undefined;
  SalidaDeSede: undefined;
  FinalizarDia: undefined;
  RegistroCombustible: undefined;
  Relevo: undefined;
  ConfiguracionPruebas: undefined;
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
