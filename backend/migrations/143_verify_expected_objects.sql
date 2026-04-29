-- Migration 143: Baseline audit de objetos esperados en BD
-- Detecta tablas, vistas, funciones e índices que el backend referencia
-- pero que podrían no existir.  No crea ni borra nada: solo reporta.
--
-- Objetos CRÍTICOS faltantes  → RAISE EXCEPTION (bloquea la migración).
-- Objetos de WARNING faltantes → RAISE WARNING  (continúa, queda en log).

DO $$
DECLARE
  missing_critical TEXT[] := ARRAY[]::TEXT[];
  missing_warn     TEXT[] := ARRAY[]::TEXT[];
  obj              TEXT;

  -- Listas de objetos esperados
  critical_tables TEXT[] := ARRAY[
    'turno','asignacion_unidad','tripulacion_turno','aviso_asignacion',
    'configuracion_visual_sede','historial_ruta_brigada',
    'usuario','sede','unidad','ruta',
    'salida_unidad','salida_evento',
    'situacion','situacion_actual','situacion_multimedia',
    'situacion_vehiculo','situacion_vehiculo_dispositivo',
    'situacion_causa','situacion_conflicto','situacion_persistente_asignacion',
    'actividad','ingreso_sede','movimiento_brigada','ubicacion_brigada',
    'unidad_reparacion','inspeccion_360','inspeccion_360_archivo',
    'notificacion','dispositivo_push','dispositivo_autorizado',
    'dispositivo_blacklist','control_acceso_app',
    'usuario_inactividad','catalogo_motivo_inactividad',
    'catalogo_tipo_situacion','causa_hecho_transito','dispositivo_seguridad',
    'rol','permiso','rol_permiso','usuario_rol','sub_rol_cop','delegacion_permiso_cop',
    'auditoria_log','log_administracion','password_reset_log',
    'reasignacion_sede','capa_mapa',
    'publicacion_social','plantilla_comunicacion','plantilla_inspeccion_360',
    'campo_personalizado','configuracion_sistema','configuracion_columnas_tabla',
    'idempotency_keys',
    'vehiculo','persona_accidente','piloto','vehiculo_aseguradora','vehiculo_grua',
    'aseguradora','grua','sancion','relevo','reporte_horario',
    'departamento','municipio','punto_mapa','registro_cambio',
    'historial_encargado_sede_grupo'
  ];

  warn_tables TEXT[] := ARRAY[
    'bitacora_historica','boleta_secuencia','estado_via','geometria_via',
    'topografia_via','motivo_no_atendido','marca','marca_vehiculo',
    'tipo_vehiculo','tarjeta_circulacion','etnia','contenedor','bus'
  ];

  critical_views TEXT[] := ARRAY[
    'v_asignaciones_por_sede','v_asignaciones_pendientes',
    'v_mi_asignacion_hoy','v_mi_salida_activa','v_unidades_en_salida',
    'v_brigadas_activas_ahora','v_disponibilidad_recursos',
    'v_composicion_unidades_ahora','v_situacion_decodificada',
    'v_turnos_completos','v_historial_inspecciones_360',
    'v_inspecciones_360_pendientes','v_encargados_actuales',
    'v_estadisticas_brigadas','v_estadisticas_unidades',
    'v_estado_grupos_actual','v_historial_movimientos',
    'v_situacion_multimedia_resumen','v_usuarios_admin'
  ];

  -- Referenciadas en código pero ausentes o en duda
  warn_views TEXT[] := ARRAY[
    'v_accidentologia_completa',
    'v_resumen_accidentologia',   -- referenciada en código, ausente en BD
    'v_estado_grupos_hoy'         -- referenciada en código, ausente en BD
  ];

  -- Vistas materializadas (accidentología)
  -- Solo mv_pilotos_problematicos y mv_vehiculos_reincidentes existen actualmente
  warn_matviews TEXT[] := ARRAY[
    'mv_pilotos_problematicos','mv_vehiculos_reincidentes',
    'mv_piloto_historial','mv_vehiculo_historial',
    'mv_puntos_calientes','mv_tendencias_temporales'
  ];

  critical_functions TEXT[] := ARRAY[
    'get_motivo_inactividad_actual',
    'validar_disponibilidad_brigada',
    'validar_disponibilidad_unidad_fecha',
    'iniciar_salida_unidad','finalizar_salida_unidad','finalizar_jornada_completa',
    'cerrar_dia_operativo','registrar_ingreso_sede','registrar_salida_de_sede',
    'fn_promover_a_persistente','contar_veces_en_ruta','obtener_comandante_unidad',
    'verificar_acceso_app','verificar_multimedia_completa',
    'puede_iniciar_salida_con_360','aprobar_inspeccion_360','rechazar_inspeccion_360',
    'refresh_intelligence_views','generar_calendario_grupos','generar_mensaje_plantilla',
    'fn_asignar_encargado','fn_remover_encargado','fn_verificar_acceso_grupo'
  ];

  -- Código referencia 'validar_disponibilidad_unidad' pero BD tiene 'validar_disponibilidad_unidad_fecha'
  warn_functions TEXT[] := ARRAY[
    'validar_disponibilidad_unidad'
  ];

  critical_indexes TEXT[] := ARRAY[
    'idx_asignacion_turno','idx_asignacion_unidad','idx_aviso_asignacion_asignacion'
  ];

  warn_indexes TEXT[] := ARRAY[
    'idx_asignacion_dia_cerrado','idx_asignacion_ruta',
    'idx_asignacion_unidad_estado_nomina','idx_auditoria_usuario',
    'idx_actividad_salida','idx_actividad_unidad'
  ];

BEGIN

  -- ── Tablas críticas ──────────────────────────────────────
  FOREACH obj IN ARRAY critical_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = obj
    ) THEN
      missing_critical := array_append(missing_critical, 'TABLE ' || obj);
    END IF;
  END LOOP;

  FOREACH obj IN ARRAY warn_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = obj
    ) THEN
      missing_warn := array_append(missing_warn, 'TABLE ' || obj);
    END IF;
  END LOOP;

  -- ── Vistas críticas ──────────────────────────────────────
  FOREACH obj IN ARRAY critical_views LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = obj
    ) THEN
      missing_critical := array_append(missing_critical, 'VIEW ' || obj);
    END IF;
  END LOOP;

  FOREACH obj IN ARRAY warn_views LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = obj
    ) THEN
      missing_warn := array_append(missing_warn, 'VIEW ' || obj);
    END IF;
  END LOOP;

  -- ── Vistas materializadas (solo warning) ─────────────────
  FOREACH obj IN ARRAY warn_matviews LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = obj
    ) THEN
      missing_warn := array_append(missing_warn, 'MATVIEW ' || obj);
    END IF;
  END LOOP;

  -- ── Funciones críticas ───────────────────────────────────
  FOREACH obj IN ARRAY critical_functions LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = obj AND routine_type = 'FUNCTION'
    ) THEN
      missing_critical := array_append(missing_critical, 'FUNCTION ' || obj);
    END IF;
  END LOOP;

  FOREACH obj IN ARRAY warn_functions LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = obj AND routine_type = 'FUNCTION'
    ) THEN
      missing_warn := array_append(missing_warn, 'FUNCTION ' || obj);
    END IF;
  END LOOP;

  -- ── Índices críticos ─────────────────────────────────────
  FOREACH obj IN ARRAY critical_indexes LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = obj
    ) THEN
      missing_critical := array_append(missing_critical, 'INDEX ' || obj);
    END IF;
  END LOOP;

  FOREACH obj IN ARRAY warn_indexes LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = obj
    ) THEN
      missing_warn := array_append(missing_warn, 'INDEX ' || obj);
    END IF;
  END LOOP;

  -- ── Reporte ──────────────────────────────────────────────
  IF array_length(missing_warn, 1) > 0 THEN
    RAISE WARNING E'Objetos referenciados en código pero ausentes en BD (no críticos):\n  • %',
      array_to_string(missing_warn, E'\n  • ');
  END IF;

  IF array_length(missing_critical, 1) > 0 THEN
    RAISE EXCEPTION E'OBJETOS CRÍTICOS FALTANTES — el backend fallará en producción:\n  • %',
      array_to_string(missing_critical, E'\n  • ');
  END IF;

  RAISE NOTICE 'Baseline audit OK — todos los objetos críticos presentes. Warnings: %',
    COALESCE(array_length(missing_warn, 1), 0);

END $$;
