# Mapeo de Campos: Incidentes COP vs Boleta Accidentología

## Resumen Ejecutivo

Este documento mapea los campos del sistema actual (COP) contra la Boleta Única de Registro de Hechos de Tránsito (UAV-205-13) del Departamento de Accidentología.

**Objetivo**: Integrar campos faltantes de Accidentología sin afectar funcionalidad existente del COP.

---

## Leyenda de Clasificación

| Símbolo | Significado |
|---------|-------------|
| **COP** | Campo solo para uso del COP |
| **ACC** | Campo solo para Accidentología |
| **AMBOS** | Campo de interés para ambos |
| ✅ | Ya existe en el sistema |
| ❌ | NO existe, debe agregarse |
| 🔄 | Existe pero requiere modificación |

---

## Nomenclatura de Sedes para Boletas

| ID Sede | Nombre | Código Boleta |
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

**Formato número boleta:** `{CODIGO_SEDE}-{AÑO}-{SECUENCIA}`
Ejemplo: `SC-2026-0001`, `SRMI-2026-0042`

---

## I. ENCABEZADO DEL HECHO

| Campo Boleta | Campo Sistema Actual | Clasificación | Estado |
|--------------|---------------------|---------------|--------|
| Número de Boleta (SC-001) | `numero_reporte` (INC-2026-0001) | **AMBOS** | 🔄 Cambiar formato a {SEDE}-{AÑO}-{SEQ} |
| Departamento | `sede.departamento` | **AMBOS** | ❌ No existe |
| Municipio | `municipio` | **AMBOS** | ❌ No existe |
| Área (Urbana/Rural) | `area` | **ACC** | ❌ No existe |
| Cantidad vehículos | Calculado de vehiculos[] | **AMBOS** | ✅ Existe |
| Ruta | `ruta_id` + `ruta.codigo` | **AMBOS** | ✅ Existe |
| Kilómetro | `km` | **AMBOS** | ✅ Existe |
| Sentido (N-S, S-N, etc.) | `sentido` | **AMBOS** | ✅ Existe |
| Fecha/Hora | `fecha_hora_aviso` | **AMBOS** | ✅ Existe |
| No. Grupo Operativo | `turno_id` o nuevo campo | **COP** | 🔄 Verificar relación |

---

## II. TIPOS DE HECHO DE TRÁNSITO

| Tipo Boleta | Existe en `tipo_hecho`? | Clasificación | Estado |
|-------------|------------------------|---------------|--------|
| 1. Choque | ✅ | AMBOS | ✅ |
| 2. Colisión | ✅ | AMBOS | ✅ |
| 3. Atropello | ✅ | AMBOS | ✅ |
| 4. Caída | ❌ | ACC | ❌ Agregar |
| 5. Derrape | ❌ | ACC | ❌ Agregar |
| 6. Salida de pista | ❌ | ACC | ❌ Agregar |
| 7. Vuelco | ✅ (Volcadura) | AMBOS | ✅ |
| 8. Ataque Armado | ❌ | ACC | ❌ Agregar |
| 9. Incendio | ✅ | AMBOS | ✅ |
| 10. Desprendimiento | ❌ | ACC | ❌ Agregar |
| 11. Ignorado | - | ACC | ❌ Agregar |
| 12. Otro Tipo | ✅ | AMBOS | ✅ |
| 13. Especifique | `subtipo_hecho` o descripción | AMBOS | ✅ |

---

## III. TIPOS DE VEHÍCULOS

| Tipo Boleta | Existe en `tipo_vehiculo`? | Clasificación | Estado |
|-------------|---------------------------|---------------|--------|
| 1. Bicicleta | ✅ | AMBOS | ✅ |
| 2. Motobicicleta | ❌ | ACC | ❌ Agregar |
| 3. Motocicleta | ✅ | AMBOS | ✅ |
| 4. Mototaxi | ❌ | ACC | ❌ Agregar |
| 5. Cisterna | ❌ | ACC | ❌ Agregar |
| 6. Tractor | ❌ | ACC | ❌ Agregar |
| 7. Camioneta Agrícola | ❌ | ACC | ❌ Agregar |
| 8. Sedan | ✅ (Automóvil) | AMBOS | ✅ |
| 9. Pick-up | ✅ | AMBOS | ✅ |
| 10. Panel | ✅ | AMBOS | ✅ |
| 11. Grúa | ❌ | ACC | ❌ Agregar |
| 12. Microbús | ✅ | AMBOS | ✅ |
| 13. Cabezal | ✅ | AMBOS | ✅ |
| 14. Camión | ✅ | AMBOS | ✅ |
| 15. Bus Urbano | ✅ | AMBOS | ✅ |
| 16. Bus Extraurbano | ✅ | AMBOS | ✅ |
| 17. NO HAY DATOS | - | ACC | ❌ Agregar |
| 18. Otro tipo | ✅ | AMBOS | ✅ |

---

## IV. DATOS DEL VEHÍCULO (por cada vehículo)

### A. Datos del Vehículo

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Tipo (1-18) | `tipo_vehiculo_id` | **AMBOS** | ✅ |
| Placa | `placa` | **AMBOS** | ✅ |
| Color | `color` | **AMBOS** | ✅ |
| Modelo (año) | `anio` | **AMBOS** | ✅ |
| Marca | `marca_id` | **AMBOS** | ✅ |
| Empresa | `empresa` | **COP** | ❌ No existe |
| NIT Tarjeta Circulación | `nit` | **AMBOS** | ✅ |
| Lic/Transporte | `licencia_transporte` | **ACC** | ❌ No existe |
| Tarj/Operaciones | `tarjeta_operaciones` | **ACC** | ❌ No existe |
| Aseguradora | `aseguradora_id` | **AMBOS** | ✅ |
| Placa TC (remolque) | `placa_remolque` | **AMBOS** | ❌ No existe |
| Póliza de seguro | `numero_poliza` | **AMBOS** | ✅ |
| NIT Tarj Circ TC | `nit_remolque` | **ACC** | ❌ No existe |

### B. Datos del Conductor

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Nombre completo | `nombre_piloto` | **AMBOS** | ✅ |
| Edad | `piloto_edad` | **AMBOS** | ✅ |
| Sexo (M/F) | `piloto_sexo` | **AMBOS** | ✅ |
| Domicilio | `piloto_domicilio` | **ACC** | ❌ No existe (solo `direccion_propietario`) |
| Situación post-hecho | `estado_piloto` (Ileso/Lesionado/Fallecido/Fugado) | **AMBOS** | ✅ |
| Etnia | `piloto_etnia` | **ACC** | ✅ |

### C. Datos de la Licencia

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| ¿Tiene licencia? | `tiene_licencia` (Si/No/No porta) | **ACC** | ❌ No existe |
| Tipo de Licencia | `licencia_tipo` (A/B/C/M/E) | **AMBOS** | ✅ |
| Licencia # | `licencia_numero` | **AMBOS** | ✅ |
| Vencimiento | `licencia_vencimiento` | **AMBOS** | ✅ |
| Antigüedad | `licencia_antiguedad` | **AMBOS** | ✅ |
| Licencia Extranjera | `licencia_extranjera` | **ACC** | ❌ No existe |

### D. Estado de Ebriedad

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| ¿En estado de ebriedad? | `estado_ebriedad` (Si/No) | **ACC** | ❌ No existe |

### E. Situación de Pasajeros

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Pasajeros Ilesos # | `pasajeros_ilesos` | **ACC** | ❌ No existe |
| Pasajeros Lesionados # | `heridos_en_vehiculo` | **AMBOS** | ✅ |
| Pasajeros Fallecidos # | `fallecidos_en_vehiculo` | **AMBOS** | ✅ |
| Trasladados por MP # | `traslados.mp` | **ACC** | ❌ No existe |
| Trasladados por PNC # | `traslados.pnc` | **ACC** | ❌ No existe |
| Trasladados por BM # | `traslados.bomberos_municipales` | **ACC** | ❌ No existe |
| Trasladados por BV # | `traslados.bomberos_voluntarios` | **ACC** | ❌ No existe |
| Trasladados por IGSS # | `traslados.igss` | **ACC** | ❌ No existe |
| Trasladados por Funeraria # | `traslados.funeraria` | **ACC** | ❌ No existe |
| Trasladados por Cruz Roja # | `traslados.cruz_roja` | **ACC** | ❌ No existe |

### F. Dispositivos de Seguridad Pasivo

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| ¿Llevaban dispositivo? | `usa_dispositivo_seguridad` | **ACC** | ❌ No existe |
| Cinturón | `dispositivo_cinturon` | **ACC** | ❌ No existe |
| Casco | `dispositivo_casco` | **ACC** | ❌ No existe |
| Bolsa de aire | `dispositivo_bolsa_aire` | **ACC** | ❌ No existe |
| Silla P/Bebé | `dispositivo_silla_bebe` | **ACC** | ❌ No existe |
| Reposa Cabeza | `dispositivo_reposa_cabeza` | **ACC** | ❌ No existe |
| Otro | `dispositivo_otro` | **ACC** | ❌ No existe |

### G. Datos Finales / Consignación

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Documentos consignados: Licencia | `doc_consignado_licencia` | **ACC** | ❌ No existe |
| Documentos consignados: Tarj Circ | `doc_consignado_tarjeta` | **ACC** | ❌ No existe |
| Consignado por (DGT/PMT/PNC) | `doc_consignado_por` | **ACC** | ❌ No existe |
| Lic. Transportes consignada | `doc_consignado_lic_transporte` | **ACC** | ❌ No existe |
| Tarj. Operaciones consignada | `doc_consignado_tarj_operaciones` | **ACC** | ❌ No existe |
| Póliza seguros consignada | `doc_consignado_poliza` | **ACC** | ❌ No existe |
| ¿Vehículo consignado? | `vehiculo_consignado` (Si/No) | **ACC** | ❌ No existe |
| Vehículo consignado por | `vehiculo_consignado_por` (PMT/PNC) | **ACC** | ❌ No existe |
| ¿Conductor consignado? | `conductor_consignado` (Si/No) | **ACC** | ❌ No existe |
| Conductor consignado por | `conductor_consignado_por` (Ejército/PMT/PNC) | **ACC** | ❌ No existe |
| ¿Llegaron a acuerdo? | `acuerdo` (Si/No) | **ACC** | ❌ No existe |
| Tipo acuerdo | `acuerdo_tipo` (Aseguradora/Iniciativa propia) | **ACC** | ❌ No existe |

---

## V. POSIBLES CAUSAS DEL HECHO DE TRÁNSITO

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Lista de 23 causas | `causa_probable` (texto libre) | **AMBOS** | 🔄 Convertir a catálogo |

**Catálogo sugerido `causa_hecho_transito`:**
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

## VI. ASPECTOS FÍSICOS DE LA VÍA

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Material de vía | `tipo_pavimento` | **ACC** | ✅ Existe (ampliar opciones) |
| Estado de la vía | `estado_via` (Óptimo/Bueno/Regular/Malo) | **ACC** | ❌ No existe |
| Topografía | `topografia` (Subida/Bajada/Plana) | **ACC** | ❌ No existe |
| Características Geométricas | `geometria_via` | **ACC** | ❌ No existe |
| Condición de la vía | `condicion_via` | **ACC** | ❌ No existe |
| No. de carriles | `numero_carriles` | **ACC** | ❌ No existe |

---

## VII. CLIMA

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Estado del tiempo | `condiciones_climaticas` | **AMBOS** | ✅ Existe (ampliar opciones) |
| Iluminación | `iluminacion` | **AMBOS** | ✅ Existe |

---

## VIII. DATOS DEL BRIGADA E INSTITUCIÓN DE APOYO

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Nombre Brigada | `creado_por` → `usuario.nombre_completo` | **AMBOS** | ✅ |
| Chapa Brigada | `creado_por` → `usuario.chapa` | **AMBOS** | ✅ |
| No. Unidad | `unidad_id` → `unidad.codigo` | **AMBOS** | ✅ |
| Nombre Agente externo | `agente_apoyo_nombre` | **ACC** | ❌ No existe |
| ID Agente | `agente_apoyo_id` | **ACC** | ❌ No existe |
| No. Unidad Agente | `agente_apoyo_unidad` | **ACC** | ❌ No existe |
| Institución (PMT/PNC/MP/BV/BM) | `agente_apoyo_institucion` | **ACC** | ❌ No existe |

---

## IX. CROQUIS TOPOGRÁFICO

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Dibujo/Croquis | `foto_url` o `croquis_url` | **ACC** | 🔄 Ampliar para múltiples imágenes |

---

## X. OBSERVACIONES

| Campo Boleta | Campo Sistema | Clasificación | Estado |
|--------------|---------------|---------------|--------|
| Observaciones | `observaciones_finales` | **AMBOS** | ✅ Existe |

---

## CAMPOS COP QUE NO ESTÁN EN BOLETA (Mantener)

| Campo | Uso |
|-------|-----|
| `origen` | Quién reportó (BRIGADA/USUARIO_PUBLICO/CENTRO_CONTROL) |
| `estado` | Estado del incidente (REPORTADO/EN_ATENCION/REGULACION/CERRADO) |
| `fecha_hora_asignacion` | Cuándo se asignó la unidad |
| `fecha_hora_llegada` | Cuándo llegó la unidad |
| `fecha_hora_estabilizacion` | Cuándo se estabilizó |
| `requiere_bomberos/pnc/ambulancia` | Recursos solicitados (booleanos) |
| `reportado_por_nombre/telefono/email` | Datos del reportante público |
| `visibilidad` | Condición de visibilidad |
| `senalizacion` | Estado de señalización |
| `danios_materiales/infraestructura` | Flags de daños |
| `danios_infraestructura_desc` | Descripción de daños |
| `obstruccion_detalle` | Detalle de carriles obstruidos |
| `cargado/carga_tipo/carga_detalle` | Datos de carga del vehículo |
| `contenedor/contenedor_detalle` | Datos de contenedor |
| `bus_detalle` | Detalles específicos de bus |
| `sancion/sancion_detalle` | Información de sanciones |
| `personas_asistidas` | Número de personas asistidas |

---

## RESUMEN DE CAMBIOS REQUERIDOS

### Nuevas Tablas/Catálogos Sugeridos:
1. `causa_hecho_transito` - 23 causas posibles
2. `dispositivo_seguridad` - Tipos de dispositivos
3. `institucion_apoyo` - PMT, PNC, MP, BV, BM, etc.
4. `material_via` - Asfalto, Pavimento, Adoquín, etc.
5. `estado_via` - Óptimo, Bueno, Regular, Malo
6. `topografia_via` - Subida, Bajada, Plana
7. `geometria_via` - Recta, Curva, Mixta, etc.

### Nuevos Campos en `incidente`:
- `municipio`
- `area` (URBANA/RURAL)
- `numero_boleta_manual` (para migración)

### Nuevos Campos en `vehiculo_incidente`:
- `piloto_domicilio`
- `tiene_licencia` (SI/NO/NO_PORTA)
- `licencia_extranjera` (boolean)
- `estado_ebriedad` (boolean)
- `pasajeros_ilesos` (int)
- `traslados_json` (JSONB con MP, PNC, BM, BV, IGSS, Funeraria, Cruz Roja)
- `dispositivos_seguridad_json` (JSONB)
- `consignacion_json` (JSONB con documentos y autoridades)
- `acuerdo` (boolean)
- `acuerdo_tipo`
- `empresa`
- `licencia_transporte`
- `tarjeta_operaciones`
- `placa_remolque`
- `nit_remolque`

### Nuevos Campos para Vía:
- `estado_via`
- `topografia`
- `geometria_via`
- `numero_carriles`
- `condicion_via`

### Nuevos Campos para Apoyo Externo:
- `agente_apoyo_nombre`
- `agente_apoyo_id`
- `agente_apoyo_unidad`
- `agente_apoyo_institucion`

---

## PRÓXIMOS PASOS RECOMENDADOS

1. **Fase 1**: Crear catálogos (tipos hecho, causas, vía, etc.)
2. **Fase 2**: Migración para agregar campos faltantes
3. **Fase 3**: Actualizar modelo backend
4. **Fase 4**: Actualizar formularios Brigada/COP
5. **Fase 5**: Crear generador de PDF con formato boleta
6. **Fase 6**: Testing y validación con Accidentología

---

*Documento generado: 2026-01-12*
*Referencia: Boleta UAV-205-13*
