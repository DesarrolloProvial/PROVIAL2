---
tags: [formularios, campos, tipos, situacion, bitacora, matriz]
---

# Matriz de campos por tipo de situación

> **Fuente de verdad única** para decidir qué campos mostrar, ocultar o validar en cualquier vista.  
> Aplica a: creación móvil, edición móvil, formulario web, edición web, `LogSituacion` (bitácora diaria), `BitacoraPage`.

---

## Tipos de situación — valores reales en BD

| `tipo_situacion` (BD) | Nombre humano | Categoría |
|---|---|---|
| `INCIDENTE` | Hecho de tránsito | Evento crítico |
| `ASISTENCIA_VEHICULAR` | Asistencia vial | Servicio de apoyo |
| `EMERGENCIA` | Emergencia vial | Evento crítico |
| `PATRULLAJE` | Patrullaje | Actividad operativa |
| `REGULACION_TRAFICO` | Regulación de tráfico | Actividad operativa |
| `PARADA_ESTRATEGICA` | Parada estratégica | Actividad operativa |
| `COMIDA` / `DESCANSO` | Descanso / Comida | Pausa |
| `SALIDA_SEDE` | Salida de sede | Administrativo |
| `CAMBIO_RUTA` | Cambio de ruta | Administrativo |
| `OTROS` | Otros | Sin categoría |

> ⚠️ En código legado y algunas queries aparece también `ASISTENCIA` (alias de `ASISTENCIA_VEHICULAR`). Tratarlos igual.  
> ⚠️ El campo en BD es `tipo_situacion`, en el timeline llega como `tipo_macro`.

---

## Grupos de campos

| ID grupo | Campos que incluye |
|---|---|
| `identificacion` | código, tipo, subtipo (tipo_situacion_id), km, sentido |
| `ubicacion` | departamento, municipio, área |
| `coordenadas` | latitud, longitud |
| `tiempos` | hora_aviso, hora_llegada, hora_cierre, duración |
| `condiciones_basicas` | clima, carga_vehicular, tipo_pavimento / material_via |
| `condiciones_detalle` | iluminacion, visibilidad, via_estado, senalizacion |
| `causas` | causa_probable, causa_especificar |
| `victimas` | heridos_leves, heridos_graves, fallecidos, ilesos, trasladados, fugados |
| `danos` | danios_materiales, danios_infraestructura, danios_descripcion |
| `vehiculos` | array: placa, marca, color, piloto, licencia, heridos, fallecidos, daños, sanción |
| `obstruccion` | obstruccion_data JSONB |
| `autoridades` | reportado_por_nombre, reportado_por_telefono, acuerdo_involucrados, acuerdo_detalle |
| `observaciones` | array JSONB `[{hora, usuario, mensaje}]` — siempre como timeline |
| `multimedia` | fotos y videos (situacion_multimedia) |

---

## Matriz por tipo

### INCIDENTE — Hecho de tránsito

| Grupo | Visible | Obligatorio | Editable | Resumen bitácora | Detalle bitácora |
|---|---|---|---|---|---|
| identificacion | ✅ | ✅ | parcial | ✅ tipo + km | ✅ |
| ubicacion | ✅ | municipio recomendado | ✅ | depto / muni | ✅ |
| coordenadas | ✅ | — | ✅ | — | ✅ |
| tiempos | ✅ | — | ✅ | hora aviso | ✅ |
| condiciones_basicas | ✅ | — | ✅ | — | ✅ |
| condiciones_detalle | ✅ | — | ✅ | — | ✅ |
| causas | ✅ | — | ✅ | causa_probable | ✅ |
| victimas | ✅ | — | ✅ | resumen (H/F) | ✅ |
| danos | ✅ | — | ✅ | booleano | ✅ |
| vehiculos | ✅ | — | ✅ | count | ✅ |
| obstruccion | ✅ | — | ✅ | si hay | ✅ |
| autoridades | ✅ | — | ✅ | — | ✅ |
| observaciones | ✅ | — | ✅ | última msg | ✅ timeline |
| multimedia | ✅ | recomendado | ✅ | count | ✅ |

---

### ASISTENCIA_VEHICULAR — Asistencia vial

| Grupo | Visible | Obligatorio | Editable | Resumen bitácora | Detalle bitácora |
|---|---|---|---|---|---|
| identificacion | ✅ | ✅ | parcial | ✅ tipo + km | ✅ |
| ubicacion | ✅ | — | ✅ | — | ✅ |
| coordenadas | ✅ | — | ✅ | — | ✅ |
| tiempos | ✅ | — | ✅ | — | ✅ |
| condiciones_basicas | ✅ | — | ✅ | — | ✅ |
| condiciones_detalle | ❌ | — | — | — | — |
| causas | ❌ | — | — | — | — |
| victimas | ❌ | — | — | — | — |
| danos | ❌ | — | — | — | — |
| vehiculos | ✅ | — | ✅ | count | ✅ |
| obstruccion | si aplica | — | ✅ | — | ✅ |
| autoridades | ❌ | — | — | — | — |
| observaciones | ✅ | — | ✅ | última msg | ✅ timeline |
| multimedia | ✅ | — | ✅ | count | ✅ |

---

### EMERGENCIA — Emergencia vial

| Grupo | Visible | Obligatorio | Editable | Resumen bitácora | Detalle bitácora |
|---|---|---|---|---|---|
| identificacion | ✅ | ✅ | parcial | ✅ tipo + km | ✅ |
| ubicacion | ✅ | — | ✅ | — | ✅ |
| coordenadas | ✅ | — | ✅ | — | ✅ |
| tiempos | ✅ | — | ✅ | — | ✅ |
| condiciones_basicas | ✅ | — | ✅ | — | ✅ |
| condiciones_detalle | ❌ | — | — | — | — |
| causas | ❌ | — | — | — | — |
| victimas | ❌ | — | — | — | — |
| danos | ❌ | — | — | — | — |
| vehiculos | ❌ | — | — | — | — |
| obstruccion | si aplica | — | ✅ | — | ✅ |
| autoridades | ✅ | — | ✅ | — | ✅ |
| observaciones | ✅ | — | ✅ | última msg | ✅ timeline |
| multimedia | ✅ | — | ✅ | count | ✅ |

---

### PATRULLAJE / REGULACION_TRAFICO / OTROS (actividades operativas)

| Grupo | Visible | Notas |
|---|---|---|
| identificacion | ✅ | tipo, km, sentido |
| ubicacion | ❌ | — |
| coordenadas | ❌ | — |
| tiempos | ✅ | — |
| condiciones_basicas | ✅ | solo clima y carga_vehicular (sin tipo_pavimento) |
| condiciones_detalle | ❌ | — |
| causas | ❌ | — |
| victimas | ❌ | — |
| danos | ❌ | — |
| vehiculos | ❌ | — |
| obstruccion | ❌ | — |
| autoridades | ❌ | — |
| observaciones | ✅ | — |
| multimedia | ✅ | — |

---

## Reglas transversales

1. **Campo no aplica al tipo** → ocultar la línea entera, aunque tenga datos (ej: `causa_probable` en ASISTENCIA → hidden)
2. **Campo aplica pero está vacío** → mostrar con `—` para dejar claro que existe pero está sin completar
3. **Campo `referencia`** → eliminado de todas las vistas. Es campo legacy que ya no existe en el flujo
4. **`tipo_pavimento` / `material_via`** → mismo dato, diferente clave. Backend devuelve `tipo_pavimento`, móvil usa `material_via`. Renderizar como uno solo con fallback
5. **`observaciones`** → siempre como timeline `[{hora, usuario, mensaje}]`, nunca como string plano. El campo en `SituacionModel.update` fue eliminado de la lista dinámica para prevenir sobreescritura accidental. Toda nueva entrada va por `POST /situaciones/:id/observaciones` o por el append en `updateSituacion` controller (D-024).
6. **`obstruccion_data`** → JSONB; renderizar como claves individuales, no como JSON crudo
7. **Valores de `iluminacion`, `visibilidad`, `senalizacion`** → usar siempre los constants centralizados en `web/src/constants/situacionTypes.ts`: `ILUMINACIONES`, `VISIBILIDADES`, `SENALIZACIONES`. No definir opciones inline en ningún componente. Valores de `iluminacion`: `DIURNA / NOCTURNA_ILUMINADA / NOCTURNA_OSCURA / CREPUSCULO`. Valores de `visibilidad`: `BUENA / REGULAR / MALA / SIN_VISIBILIDAD`. Valores de `senalizacion`: `BUENA / REGULAR / DEFICIENTE / SIN_SENALIZACION`.

---

## Estado de aplicación por vista

| Vista | Archivo | Estado |
|---|---|---|
| `LogSituacion` — bitácora diaria | `web/src/pages/cop/COPBitacoraDiaPage.tsx` | ✅ aplicado |
| `BitacoraPage` — resumen de unidad | `web/src/pages/cop/BitacoraPage.tsx` | ✅ aplicado |
| Creación situación web | `web/src/components/cop/forms/CrearSituacionModal.tsx` | ✅ aplicado |
| Edición situación web (modal) | mismo archivo vía `editSituacionId` | ✅ aplicado |
| Edición situación web (página) | `web/src/pages/cop/EditarSituacionPage.tsx` + `FormularioHechoTransito.tsx` | ✅ aplicado |
| Creación / edición actividad web | `web/src/components/cop/forms/CrearActividadModal.tsx` | ✅ sin campos de situación (correcto) |
| Creación situación móvil | `mobile/src/config/formularios/hechoTransitoForm.ts` + `SituacionDinamicaScreen.tsx` | ✅ aplicado |
| Edición situación móvil | mismo screen vía `editMode` + `transformarDatosParaFormulario` | ✅ aplicado |

**Dead code identificado**: `web/src/components/cop/SituacionEditModal.tsx` — no tiene importadores, no se usa. No eliminar hasta confirmar que no hay rutas ocultas.

---

Ver también: [[FLUJOS]], [[SCHEMA]], [[PATRONES]]
