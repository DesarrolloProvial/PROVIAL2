import { OperacionesModel } from '../models/operaciones.model';

// ============================================
// INTERFACES
// ============================================

export interface SugerenciaAsignacion {
  unidad_id?: number;
  unidad_codigo?: string;
  combustible_actual?: number;
  tipo: 'UNIDAD' | 'GARITA' | 'ENCARGADO_RUTA';
  tripulacion: SugerenciaTripulacion[];
  score: number;
  razones: string[];
  prioridad: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface SugerenciaTripulacion {
  usuario_id: number;
  nombre_completo: string;
  chapa: string;
  rol_sugerido: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE' | 'GARITA' | 'ENCARGADO_RUTA';
  rol_frecuente: string | null;
  dias_descanso: number;
  turnos_mes: number;
  score: number;
  es_piloto: boolean;
}

export interface ParametrosGenerador {
  fecha: string;
  sede_id?: number;
  num_unidades?: number; // Número de unidades a asignar
  tripulantes_por_unidad?: number; // Número de tripulantes por unidad (1-3)
  incluir_garita?: boolean; // Incluir asignación de garita
  incluir_encargado_ruta?: boolean; // Incluir encargado de ruta
  priorizar_descanso?: boolean; // Priorizar brigadas con más descanso
  priorizar_equidad?: boolean; // Priorizar brigadas con menos turnos
  min_dias_descanso?: number; // Mínimo de días de descanso (default: 1)
  considerar_patron_trabajo?: boolean; // Considerar patrones (pilotos diario, agentes alternado)
}

// ============================================
// SERVICIO GENERADOR DE TURNOS
// ============================================

export class GeneradorTurnosService {
  /**
   * Genera sugerencias de asignaciones optimizadas
   */
  async generarSugerencias(params: ParametrosGenerador): Promise<SugerenciaAsignacion[]> {
    const {
      fecha,
      sede_id,
      num_unidades = 5,
      tripulantes_por_unidad = 2,
      incluir_garita = true,
      incluir_encargado_ruta = true,
      priorizar_descanso = true,
      priorizar_equidad = true,
      min_dias_descanso = 1,
      considerar_patron_trabajo = true,
    } = params;

    // 1. Obtener brigadas disponibles
    const brigadasDisponibles = await OperacionesModel.getBrigadasDisponibles(
      fecha,
      sede_id
    );

    // 2. Obtener unidades disponibles
    const unidadesDisponibles = await OperacionesModel.getUnidadesDisponibles(
      fecha,
      sede_id
    );

    // 3. Filtrar brigadas que cumplen con días mínimos de descanso
    const brigadasElegibles = brigadasDisponibles.filter(
      (b) => b.disponible || (b.dias_descanso >= min_dias_descanso)
    );

    // 4. Filtrar unidades con combustible suficiente (al menos 1/4 de tanque)
    const unidadesElegibles = unidadesDisponibles.filter((u) => {
      return (u.combustible_actual ?? 0) >= 0.25;
    });

    if (brigadasElegibles.length === 0) {
      return [];
    }

    if (unidadesElegibles.length === 0) {
      return [];
    }

    // 5. Ordenar brigadas por score
    const brigadasConScore = this.calcularScoreBrigadas(
      brigadasElegibles,
      priorizar_descanso,
      priorizar_equidad,
      considerar_patron_trabajo
    );

    // 6. Ordenar unidades por score
    const unidadesConScore = this.calcularScoreUnidades(unidadesElegibles);

    // 7. Generar asignaciones
    const sugerencias: SugerenciaAsignacion[] = [];
    const brigadasUsadas = new Set<number>();

    // 7.1. Encargado de ruta (si está habilitado)
    if (incluir_encargado_ruta) {
      const encargado = this.generarEncargadoRuta(brigadasConScore, brigadasUsadas);
      if (encargado) {
        sugerencias.push(encargado);
      }
    }

    // 7.2. Garita (si está habilitado) - 2 brigadas
    if (incluir_garita) {
      const garita = this.generarAsignacionGarita(brigadasConScore, brigadasUsadas);
      if (garita) {
        sugerencias.push(garita);
      }
    }

    // 7.3. Asignaciones de unidades
    const asignacionesUnidades = this.generarAsignacionesOptimas(
      unidadesConScore.slice(0, num_unidades),
      brigadasConScore,
      brigadasUsadas,
      tripulantes_por_unidad
    );

    sugerencias.push(...asignacionesUnidades);

    return sugerencias;
  }

  /**
   * Calcula el score de cada brigada
   */
  private calcularScoreBrigadas(
    brigadas: any[],
    priorizarDescanso: boolean,
    priorizarEquidad: boolean,
    considerarPatron: boolean
  ): any[] {
    return brigadas
      .map((brigada) => {
        let score = 100;
        const esPiloto = brigada.rol_tripulacion_frecuente === 'PILOTO';
        const diasDescanso = brigada.dias_descanso || 999;
        const turnosMes = brigada.turnos_ultimo_mes || 0;

        // Factor 1: Días de descanso (más días = más score)
        if (priorizarDescanso) {
          score += Math.min(diasDescanso * 5, 100); // Máximo +100 puntos
        }

        // Factor 2: Equidad (menos turnos = más score)
        if (priorizarEquidad) {
          score += Math.max(50 - turnosMes * 5, 0); // Máximo +50 puntos
        }

        // Factor 3: Disponibilidad (disponible = bonus)
        if (brigada.disponible) {
          score += 25;
        }

        // Factor 4: Patrones de trabajo
        if (considerarPatron) {
          // Pilotos trabajan casi todos los días
          if (esPiloto) {
            // Si es piloto y tiene 0-1 días de descanso, score normal o bajo
            if (diasDescanso === 0) {
              score -= 30; // Penalizar si trabajó ayer
            } else if (diasDescanso === 1) {
              score += 20; // Normal para pilotos
            } else {
              score += 40; // Bonus si ha descansado más
            }
          } else {
            // Agentes trabajan 1 día sí, 1 día no
            if (diasDescanso === 0) {
              score -= 50; // Fuerte penalización si trabajó ayer
            } else if (diasDescanso === 1) {
              score += 50; // Ideal para agentes
            } else if (diasDescanso === 2) {
              score += 30; // Aún aceptable
            } else {
              score += 20; // Ha descansado mucho
            }
          }
        }

        return {
          ...brigada,
          score,
          es_piloto: esPiloto,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Calcula el score de cada unidad
   */
  private calcularScoreUnidades(unidades: any[]): any[] {
    return unidades
      .map((unidad) => {
        let score = 100;

        // Factor 1: Combustible disponible (fracción 0-1.0 convertida a porcentaje)
        const porcentajeCombustible = (unidad.combustible_actual ?? 0) * 100;

        score += Math.min(porcentajeCombustible, 50); // Máximo +50 puntos

        // Factor 2: Días desde último uso (más días = más score)
        const diasDescanso = unidad.dias_desde_ultimo_uso || 999;
        score += Math.min(diasDescanso * 2, 30); // Máximo +30 puntos

        // Factor 3: Turnos del mes (menos turnos = más score)
        const turnosMes = unidad.turnos_ultimo_mes || 0;
        score += Math.max(20 - turnosMes * 2, 0); // Máximo +20 puntos

        return {
          ...unidad,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Genera asignaciones óptimas distribuyendo brigadas en unidades
   */
  private generarAsignacionesOptimas(
    unidades: any[],
    brigadas: any[],
    brigadasUsadas: Set<number>,
    tripulantesPorUnidad: number
  ): SugerenciaAsignacion[] {
    const sugerencias: SugerenciaAsignacion[] = [];

    for (const unidad of unidades) {
      const tripulacion: SugerenciaTripulacion[] = [];

      // 1. Asignar PILOTO (obligatorio)
      const piloto = this.buscarBrigadaParaRol(
        brigadas,
        brigadasUsadas,
        'PILOTO'
      );

      if (piloto) {
        tripulacion.push({
          usuario_id: piloto.id,
          nombre_completo: piloto.nombre_completo,
          chapa: piloto.chapa,
          rol_sugerido: 'PILOTO',
          rol_frecuente: piloto.rol_tripulacion_frecuente,
          dias_descanso: piloto.dias_descanso || 999,
          turnos_mes: piloto.turnos_ultimo_mes || 0,
          score: piloto.score,
          es_piloto: piloto.es_piloto || false,
        });
        brigadasUsadas.add(piloto.id);
      }

      // 2. Agregar más tripulantes según configuración
      const rolesAdicionales = tripulantesPorUnidad - 1;
      for (let i = 0; i < rolesAdicionales; i++) {
        const rol = i === 0 ? 'COPILOTO' : 'ACOMPAÑANTE';
        const brigada = this.buscarBrigadaParaRol(
          brigadas,
          brigadasUsadas,
          rol
        );

        if (brigada) {
          tripulacion.push({
            usuario_id: brigada.id,
            nombre_completo: brigada.nombre_completo,
            chapa: brigada.chapa,
            rol_sugerido: rol,
            rol_frecuente: brigada.rol_tripulacion_frecuente,
            dias_descanso: brigada.dias_descanso || 999,
            turnos_mes: brigada.turnos_ultimo_mes || 0,
            score: brigada.score,
            es_piloto: brigada.es_piloto || false,
          });
          brigadasUsadas.add(brigada.id);
        }
      }

      // 4. Calcular score de la asignación y razones
      const { scoreAsignacion, razones, prioridad } = this.evaluarAsignacion(
        unidad,
        tripulacion,
        'UNIDAD'
      );

      // Solo agregar si al menos hay un piloto
      if (tripulacion.length > 0 && tripulacion[0].rol_sugerido === 'PILOTO') {
        sugerencias.push({
          tipo: 'UNIDAD',
          unidad_id: unidad.id,
          unidad_codigo: unidad.codigo,
          combustible_actual: unidad.combustible_actual,
          tripulacion,
          score: scoreAsignacion,
          razones,
          prioridad,
        });
      }
    }

    return sugerencias.sort((a, b) => b.score - a.score);
  }

  /**
   * Busca la mejor brigada disponible para un rol específico
   */
  private buscarBrigadaParaRol(
    brigadas: any[],
    brigadasUsadas: Set<number>,
    rol: 'PILOTO' | 'COPILOTO' | 'ACOMPAÑANTE' | 'GARITA' | 'ENCARGADO_RUTA'
  ): any | null {
    // Filtrar brigadas no usadas
    const disponibles = brigadas.filter((b) => !brigadasUsadas.has(b.id));

    if (disponibles.length === 0) {
      return null;
    }

    // Para GARITA, preferir agentes (no pilotos) con más descanso
    if (rol === 'GARITA') {
      const noPilotos = disponibles.filter((b) => !b.es_piloto);
      if (noPilotos.length > 0) {
        return noPilotos[0]; // Ya están ordenadas por score
      }
    }

    // Para ENCARGADO_RUTA, preferir pilotos con experiencia
    if (rol === 'ENCARGADO_RUTA') {
      const pilotos = disponibles.filter((b) => b.es_piloto);
      if (pilotos.length > 0) {
        return pilotos[0];
      }
    }

    // Para roles de tripulación, preferir por rol frecuente
    if (rol === 'PILOTO' || rol === 'COPILOTO' || rol === 'ACOMPAÑANTE') {
      const conRolFrecuente = disponibles.filter(
        (b) => b.rol_tripulacion_frecuente === rol
      );

      if (conRolFrecuente.length > 0) {
        return conRolFrecuente[0]; // Ya están ordenadas por score
      }
    }

    // Si no hay con rol frecuente, tomar la siguiente mejor brigada
    return disponibles[0];
  }

  /**
   * Genera asignación para GARITA (2 brigadas)
   */
  private generarAsignacionGarita(
    brigadas: any[],
    brigadasUsadas: Set<number>
  ): SugerenciaAsignacion | null {
    const tripulacion: SugerenciaTripulacion[] = [];

    // Buscar 2 brigadas para garita (preferir agentes, no pilotos)
    for (let i = 0; i < 2; i++) {
      const brigada = this.buscarBrigadaParaRol(brigadas, brigadasUsadas, 'GARITA');
      if (brigada) {
        tripulacion.push({
          usuario_id: brigada.id,
          nombre_completo: brigada.nombre_completo,
          chapa: brigada.chapa,
          rol_sugerido: 'GARITA',
          rol_frecuente: brigada.rol_tripulacion_frecuente,
          dias_descanso: brigada.dias_descanso || 999,
          turnos_mes: brigada.turnos_ultimo_mes || 0,
          score: brigada.score,
          es_piloto: brigada.es_piloto || false,
        });
        brigadasUsadas.add(brigada.id);
      }
    }

    if (tripulacion.length < 2) {
      // No hay suficientes brigadas
      return null;
    }

    // Evaluar asignación de garita
    const { scoreAsignacion, razones, prioridad } = this.evaluarAsignacion(
      null,
      tripulacion,
      'GARITA'
    );

    return {
      tipo: 'GARITA',
      tripulacion,
      score: scoreAsignacion,
      razones,
      prioridad,
    };
  }

  /**
   * Genera encargado de ruta
   */
  private generarEncargadoRuta(
    brigadas: any[],
    brigadasUsadas: Set<number>
  ): SugerenciaAsignacion | null {
    const brigada = this.buscarBrigadaParaRol(brigadas, brigadasUsadas, 'ENCARGADO_RUTA');

    if (!brigada) {
      return null;
    }

    const tripulacion: SugerenciaTripulacion[] = [
      {
        usuario_id: brigada.id,
        nombre_completo: brigada.nombre_completo,
        chapa: brigada.chapa,
        rol_sugerido: 'ENCARGADO_RUTA',
        rol_frecuente: brigada.rol_tripulacion_frecuente,
        dias_descanso: brigada.dias_descanso || 999,
        turnos_mes: brigada.turnos_ultimo_mes || 0,
        score: brigada.score,
        es_piloto: brigada.es_piloto || false,
      },
    ];

    brigadasUsadas.add(brigada.id);

    const { scoreAsignacion, razones, prioridad } = this.evaluarAsignacion(
      null,
      tripulacion,
      'ENCARGADO_RUTA'
    );

    return {
      tipo: 'ENCARGADO_RUTA',
      tripulacion,
      score: scoreAsignacion,
      razones,
      prioridad,
    };
  }

  /**
   * Evalúa una asignación y genera razones
   */
  private evaluarAsignacion(
    unidad: any | null,
    tripulacion: SugerenciaTripulacion[],
    tipo: 'UNIDAD' | 'GARITA' | 'ENCARGADO_RUTA'
  ): { scoreAsignacion: number; razones: string[]; prioridad: 'ALTA' | 'MEDIA' | 'BAJA' } {
    let scoreAsignacion = 0;
    const razones: string[] = [];

    // Score de la unidad (solo si es tipo UNIDAD)
    if (tipo === 'UNIDAD' && unidad) {
      scoreAsignacion += unidad.score;

      // Razones basadas en combustible
      const porcentajeCombustible = (unidad.combustible_actual ?? 0) * 100;

      if (porcentajeCombustible > 70) {
        razones.push('Combustible óptimo');
      } else if (porcentajeCombustible > 40) {
        razones.push('Combustible adecuado');
      } else {
        razones.push('Combustible bajo - considerar recarga');
      }
    }

    // Score promedio de la tripulación
    const scoreTripulacion =
      tripulacion.reduce((sum, t) => sum + t.score, 0) / (tripulacion.length || 1);
    scoreAsignacion += scoreTripulacion;

    // Razones específicas según tipo
    if (tipo === 'GARITA') {
      razones.push('Asignación a GARITA - menos exigente físicamente');
      razones.push('Recomendado para brigadas que necesitan descanso ligero');
    } else if (tipo === 'ENCARGADO_RUTA') {
      razones.push('Supervisión general del turno');
      razones.push('Acceso a información de todas las unidades en ruta');
      if (tripulacion[0].es_piloto) {
        razones.push('Piloto experimentado - ideal para supervisión');
      }
    } else {
      // Razones para UNIDAD
      // Razones basadas en completitud de tripulación
      if (tripulacion.length >= 3) {
        razones.push('Tripulación completa');
      } else if (tripulacion.length >= 2) {
        razones.push('Tripulación mínima');
      } else {
        razones.push('Solo piloto - considerar agregar copiloto');
      }
    }

    // Razones basadas en días de descanso
    const promedioDescanso =
      tripulacion.reduce((sum, t) => sum + t.dias_descanso, 0) /
      (tripulacion.length || 1);

    if (promedioDescanso > 3) {
      razones.push('Brigadas bien descansadas');
    } else if (promedioDescanso > 1) {
      razones.push('Descanso adecuado');
    } else {
      razones.push('Poco descanso - monitorear fatiga');
    }

    // Razones basadas en equidad
    const promedioTurnos =
      tripulacion.reduce((sum, t) => sum + t.turnos_mes, 0) / (tripulacion.length || 1);

    if (promedioTurnos < 5) {
      razones.push('Distribución equitativa');
    } else if (promedioTurnos < 10) {
      razones.push('Carga de trabajo normal');
    } else {
      razones.push('Alta frecuencia de turnos');
    }

    // Determinar prioridad
    let prioridad: 'ALTA' | 'MEDIA' | 'BAJA' = 'MEDIA';
    if (scoreAsignacion >= 250) {
      prioridad = 'ALTA';
    } else if (scoreAsignacion < 200) {
      prioridad = 'BAJA';
    }

    return { scoreAsignacion, razones, prioridad };
  }
}

export const generadorTurnosService = new GeneradorTurnosService();
