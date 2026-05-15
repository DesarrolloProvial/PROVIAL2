---
tags: [accidentologia, boleta, accidentes, campos]
---

# Módulo de Accidentología

## Referencia normativa

La boleta oficial es la **UAV-205-13** del Departamento de Accidentología de Guatemala (Boleta Única de Registro de Hechos de Tránsito).

---

## Nomenclatura de sedes para boletas

| ID Sede | Nombre | Código boleta |
|---------|--------|---------------|
| 1 | Central | SC |
| 2 | Mazatenango | SRSB |
| 3 | Poptún | SRPP |
| 4 | San Cristóbal | SRSCA |
| 5 | Quetzaltenango | SRQ |
| 6 | Coatepeque | SRCOA |
| 7 | Palín | SRTPE |
| 8 | Morales | SRMI |
| 9 | Río Dulce | SRDPBI |

**Formato de número de boleta:** `{CODIGO_SEDE}-{AÑO}-{SECUENCIA}`  
Ejemplos: `SC-2026-0001`, `SRMI-2026-0042`

---

## Tipos de hecho de tránsito (boleta UAV-205-13)

Los tipos en la boleta oficial vs el sistema:

| # | Tipo en boleta | En sistema `tipo_hecho` | Estado |
|---|----------------|------------------------|--------|
| 1 | Choque | ✅ | Existe |
| 2 | Colisión | ✅ | Existe |
| 3 | Atropello | ✅ | Existe |
| 4 | Caída | ❌ | Pendiente |
| 5 | Derrape | ❌ | Pendiente |
| 6 | Salida de pista | ❌ | Pendiente |
| 7 | Vuelco | ✅ (Volcadura) | Existe |
| 8 | Ataque Armado | ❌ | Pendiente |
| 9 | Incendio | ✅ | Existe |
| 10 | Desprendimiento | ❌ | Pendiente |
| 12 | Otro Tipo | ✅ | Existe |

---

## Catálogo de causas del hecho (`causa_hecho_transito`)

Tabla ya creada en migración 115-116. Las 23 causas de la boleta:

1. Exceso de velocidad
2. No obedecer señales
3. Hablar por teléfono
4. Realizar virajes prohibidos
5. Retroceso
6. Efectos de alcohol/drogas
7. Problemas de salud
8. Rebasar
9. Circular en vía contraria
10. Exceso de pasajeros
11. Exceso de carga
12. Condición de la vía
13. Falla mecánica
14. Estacionamiento prohibido
15. Baja visibilidad
16. Se ignora
17. Imprudencia del piloto
18. Imprudencia del peatón
19. Carga mal colocada
20. Fallecido por arma de fuego
21. Cansancio
22. Explosión de neumático
23. Otro (especificar)

---

## Mapeo de campos COP vs boleta

**Leyenda:** ✅ existe | ❌ pendiente | 🔄 existe pero requiere ajuste

### Encabezado del hecho

| Campo boleta | Campo sistema | Estado |
|--------------|---------------|--------|
| Número de Boleta | `numero_reporte` | 🔄 Cambiar formato a {SEDE}-{AÑO}-{SEQ} |
| Departamento | — | ❌ |
| Municipio | — | ❌ |
| Área (Urbana/Rural) | — | ❌ |
| Ruta | `ruta_id` | ✅ |
| Kilómetro | `km` | ✅ |
| Sentido | `sentido` | ✅ |
| Fecha/Hora | `fecha_hora_aviso` | ✅ |

### Datos del conductor (por vehículo)

| Campo boleta | Campo sistema | Estado |
|--------------|---------------|--------|
| Nombre completo | `nombre_piloto` | ✅ |
| Edad / Sexo / Etnia | `piloto_edad/sexo/etnia` | ✅ |
| Domicilio | — | ❌ |
| Situación post-hecho | `estado_piloto` (Ileso/Lesionado/Fallecido/Fugado) | ✅ |
| ¿Tiene licencia? | — | ❌ |
| Tipo/Número/Vencimiento licencia | `licencia_tipo/numero/vencimiento` | ✅ |
| Licencia extranjera | — | ❌ |
| Estado de ebriedad | — | ❌ |

### Pasajeros y traslados

| Campo boleta | Campo sistema | Estado |
|--------------|---------------|--------|
| Ilesos | — | ❌ |
| Lesionados | `heridos_en_vehiculo` | ✅ |
| Fallecidos | `fallecidos_en_vehiculo` | ✅ |
| Trasladados por MP/PNC/BM/BV/IGSS/Funeraria/Cruz Roja | — | ❌ (proponer `traslados_json` JSONB) |

### Dispositivos de seguridad (`dispositivo_seguridad`)

Tabla creada en migración 115-116. Junction: `situacion_vehiculo_dispositivo`.  
Tipos: Cinturón, Casco, Bolsa de aire, Silla P/Bebé, Reposa Cabeza, Otro.

### Aspectos físicos de la vía

| Campo boleta | Estado |
|--------------|--------|
| Material de vía | ✅ (`tipo_pavimento`) |
| Estado de vía (Óptimo/Bueno/Regular/Malo) | ❌ |
| Topografía (Subida/Bajada/Plana) | ❌ |
| Características geométricas | ❌ |
| No. de carriles | ❌ |

---

## Campos COP importantes no presentes en boleta (mantener)

| Campo | Uso |
|-------|-----|
| `estado` | Estado del incidente (REPORTADO/EN_ATENCION/REGULACION/CERRADO) |
| `requiere_bomberos/pnc/ambulancia` | Recursos solicitados |
| `reportado_por_nombre/telefono` | Datos del reportante |
| `obstruccion_detalle` | Carriles obstruidos |
| `danios_materiales/infraestructura` | Flags de daños |
| `personas_asistidas` | Número de personas |

---

## Tablas del módulo accidentología

Las tablas completas están en [[SCHEMA#Situaciones detalle]]. Resumen:
- `situacion` — registro central del hecho (campos `tipo_situacion = 'HECHO_TRANSITO'`)
- `situacion_vehiculo` — datos por vehículo involucrado (placa, piloto, estado)
- `vehiculo` — tabla maestra de vehículos (upsert por placa)
- `piloto` — tabla maestra de pilotos (upsert por licencia)
- `persona_accidente` — víctimas/peatones (no conductores)
- `situacion_causa` — causas del hecho (junction con `causa_hecho_transito`)
- `situacion_vehiculo_dispositivo` — dispositivos de seguridad por vehículo

---

Ver también: [[SCHEMA]], [[FLUJOS#2. Ciclo de vida de una Situación]]
