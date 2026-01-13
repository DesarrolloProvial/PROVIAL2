# Integración Accidentología - Estado del Trabajo

## Fecha: 2026-01-12

## ✅ Migraciones Ejecutadas

| # | Archivo | Estado | Descripción |
|---|---------|--------|-------------|
| 091 | `091_integracion_accidentologia.sql` | ✅ | Catálogos, campos, estructura base |
| 091h | `091_hotfix_catalogos.sql` | ✅ | Fix para tipo_hecho/tipo_vehiculo.codigo |
| 092 | `092_accidentologia_blindaje.sql` | ✅ | Secuencias atómicas, CHECKs, índices |
| 093A | `093A_deprecacion_sin_romper.sql` | ✅ | Vistas de compatibilidad |
| 094 | `094_boleta_campos_faltantes.sql` | ✅ | Campos extra boleta |

## 📋 Migraciones Pendientes

| # | Archivo | Estado |
|---|---------|--------|
| 093B | `093B_backfill_constraints.sql` | 📋 Esqueleto (ver CHECKLIST_093BC.md) |
| 093C | `093C_limpieza_final.sql` | 📋 Esqueleto (ver CHECKLIST_093BC.md) |

## 📊 Resumen de Cambios en BD

### Tablas Nuevas
- `boleta_secuencia` - Secuencias atómicas para boletas
- `incidente_causa` - Tabla puente para causas múltiples
- `causa_hecho_transito` - Catálogo de causas
- `estado_via`, `topografia_via`, `geometria_via`, `dispositivo_seguridad` - Catálogos

### Columnas Nuevas
**incidente:**
- `numero_boleta`, `numero_boleta_secuencia`
- `area`, `material_via`, `no_grupo_operativo`
- `causa_especificar`, `croquis_url`, `fotos_urls`

**hoja_accidentologia:**
- `incidente_id` (1:1 con incidente)
- `estado_via_id`, `topografia_id`, `geometria_via_id`, `numero_carriles`
- `area`, `no_grupo_operativo`, `material_via`
- `senalizacion_presente`, `senalizacion_tipo`, `lugar_referencia`

**vehiculo_accidente:**
- `estado_ebriedad`, `tiene_licencia`
- `doc_consignado_tarjeta_circulacion`
- `doc_consignado_licencia_transporte`
- `doc_consignado_tarjeta_operaciones`
- `doc_consignado_poliza`
- `tipo_servicio`, `propietario_nombre`, `propietario_dpi`, `propietario_telefono`
- `departamento_registro_id`, `municipio_registro_id`

### Vistas Creadas
- `v_accidentologia_completa` - Para reportes y PDF
- `v_sede_completa` - Sede con datos normalizados
- `v_brigada` - Compatibilidad brigada→usuario
- `v_incidente_obstruccion` - Obstrucción consolidada
- `v_rol_permisos_diagnostico` - Diagnóstico sistema permisos

### Funciones y Triggers
- `fn_generar_numero_boleta(sede_id, fecha)` - Genera boleta atómica
- `tr_generar_boleta_incidente` - Auto-genera boleta en INSERT
- `tr_sync_sede_ubicacion` - Sincroniza campos texto legacy

---

## 📱 Cambios en Frontend (Constantes)

### Mobile (`mobile/src/constants/situacionTypes.ts`)
Agregadas constantes para accidentología:
- `AREAS` (URBANA/RURAL)
- `MATERIALES_VIA`
- `DOCUMENTOS_CONSIGNADOS`
- `TIPOS_SERVICIO_VEHICULO`
- `ESTADOS_VIA`
- `TOPOGRAFIAS_VIA`
- `GEOMETRIAS_VIA`
- `CONDICIONES_CLIMATICAS`
- `ILUMINACIONES`
- `CONSIGNADO_POR`

### Web (`web/src/constants/situacionTypes.ts`)
Mismas constantes agregadas para mantener sincronización.

---

## 🔄 Trabajo Completado y Pendiente

### ✅ Completado (Frontend)

1. **Constantes agregadas** (`situacionTypes.ts` mobile + web):
   - `AREAS`, `MATERIALES_VIA`
   - `DOCUMENTOS_CONSIGNADOS`, `TIPOS_SERVICIO_VEHICULO`
   - `ESTADOS_VIA`, `TOPOGRAFIAS_VIA`, `GEOMETRIAS_VIA`
   - `CONDICIONES_CLIMATICAS`, `ILUMINACIONES`, `CONSIGNADO_POR`

2. **Mobile - IncidenteScreen.tsx**:
   - ✅ Agregados campos: Área, Material de vía, Grupo operativo

3. **Mobile - VehiculoForm.tsx**:
   - ✅ Nueva sección "Documentos Consignados"
   - ✅ Checkboxes para todos los tipos de documentos
   - ✅ Selector de autoridad que consigna (PNC/PMT/MP)

4. **Web - IncidenteFormModal.tsx**:
   - ✅ Agregados campos: Área, Material de vía, Grupo operativo

5. **Web - VehiculoFormWeb.tsx**:
   - ✅ Nueva sección "Documentos Consignados"
   - ✅ Checkboxes para todos los tipos de documentos
   - ✅ Selector de autoridad que consigna (PNC/PMT/MP)

### ✅ Completado (Backend)

1. **accidentologia.model.ts**:
   - ✅ Interfaces actualizadas con nuevos campos (HojaAccidentologia, VehiculoAccidente)
   - ✅ Función `crear()` actualizada con campos boleta
   - ✅ Función `actualizar()` con camposPermitidos actualizados
   - ✅ Función `agregarVehiculo()` con campos documentos consignados
   - ✅ Función `actualizarVehiculo()` con campos documentos consignados
   - ✅ Nueva función `obtenerCompleto()` para PDF/reportes usando v_accidentologia_completa
   - ✅ Nueva función `obtenerPorIncidente()` para relación 1:1

2. **accidentologia.controller.ts**:
   - ✅ Nuevo endpoint `obtenerCompleto` (GET /api/accidentologia/completo/:incidenteId)
   - ✅ Nuevo endpoint `obtenerPorIncidente` (GET /api/accidentologia/incidente/:incidenteId)

3. **accidentologia.routes.ts**:
   - ✅ Rutas agregadas para los nuevos endpoints

### 🔄 Pendiente (Próximo Sprint)

1. **Verificar checklist 093B** (ver `CHECKLIST_093BC.md`)
2. **Ejecutar 093B** si todo pasa
3. **Después de 2 semanas estable, ejecutar 093C**

---

## 📁 Archivos de Referencia

- Checklist 093B/C: `docs/CHECKLIST_093BC.md`
- Diccionario de datos: `docs/DICCIONARIO_DATOS_PROVIAL.md`
- Mapeo incidentes: `docs/MAPEO_INCIDENTES_ACCIDENTOLOGIA.md`
