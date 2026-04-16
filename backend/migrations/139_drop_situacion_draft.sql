-- Migración 139: eliminar sistema de drafts server-side
-- El flujo offline-first actual usa POST /api/situaciones con codigo_situacion
-- (determinista, AsyncStorage local). La tabla situacion_draft nunca tuvo
-- registros en producción y el controller nunca fue llamado desde el móvil.

DROP TABLE IF EXISTS situacion_draft CASCADE;
