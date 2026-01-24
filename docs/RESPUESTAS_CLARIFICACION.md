# 📋 RESPUESTAS A PREGUNTAS DE CLARIFICACIÓN

**Fecha:** 2026-01-22  
**Usuario:** Chris  
**Contexto:** Definición completa de las ~50 situaciones

---

## ✅ RESPUESTAS CONFIRMADAS

### 1. Departamento/Municipio Offline
**Respuesta:** Opción C - Opcional  
**Implementación:** Si no hay internet, se deja vacío y se completa después.

---

### 2. "No de Grupo" en Hecho de Tránsito
**Respuesta:** Está en `usuario.grupo` (columna de la tabla)  
**Nota:** Planean unificar tablas `brigada` y `usuario` antes de implementar esto.  
**Implementación:** Tomar automáticamente del perfil del usuario logueado.

---

### 3. Estructura de "Vehículos Involucrados"
**Respuestas:**
- El mismo `VehiculoForm` para todos
- **Marca y Tipo deben ser SELECT**, no text input
- **Asistencia:** Solo 1 vehículo
- **Hecho de Tránsito:** Hasta 100 vehículos

**Implementación:**
```typescript
{
    name: 'vehiculos',
    type: 'custom',
    component: 'VehiculoForm',
    componentProps: {
        maxVehiculos: 1, // Para Asistencia
        // maxVehiculos: 100, // Para Hecho
    }
}
```

---

### 4. "Vehículos Registrados" vs "Vehículos Involucrados"
**Respuesta:** Hay DOS tipos:

#### A) **Vehículos Registrados** (dato estadístico)
- Es un número simple: "30 vehículos registrados"
- Con desglose: Pick-up: 10, Sedan: 5, Bus: 15
- **NO usa VehiculoForm completo**

#### B) **Vehículos con Infracción/Sospecha**
- Si un vehículo/piloto tiene infracción o sospecha
- **SÍ usa VehiculoForm completo**

**Implementación:**
```typescript
// Para "Vehículos Registrados" (estadística)
{
    name: 'vehiculos_registrados_total',
    type: 'number',
    label: 'Total de Vehículos Registrados'
},
{
    name: 'vehiculos_registrados_desglose',
    type: 'custom',
    component: 'ContadorVehicular', // Nuevo componente
}

// Para vehículos con infracción
{
    name: 'vehiculos_infraccion',
    type: 'custom',
    component: 'VehiculoForm',
    componentProps: { maxVehiculos: 100 }
}
```

---

### 5. Conteo Vehicular - Interfaz
**Respuesta:** Propuesta A pero SIN búsqueda

**Implementación:**
```
[ Sedan          ]  [  +  ] 25 [ -  ]
[ Pick-up        ]  [  +  ] 12 [ -  ]
[ Camión         ]  [  +  ]  8 [ -  ]
[ Bus            ]  [  +  ]  3 [ -  ]

Solo mostrar los que tienen count > 0
```

**Componente:** `ContadorVehicular.tsx` (a crear)

---

### 6. Toma de Velocidad - Formato
**Respuesta:** Opción B - Por tipo con múltiples velocidades

**Implementación:**
```
Tipo: [Sedan ▼]
Velocidades: [55, 80, 100, 69] (separadas por coma)
[Agregar]

--- Estadísticas ---
Sedan: 4 mediciones (55, 69, 80, 100 km/h)
  Promedio: 76 km/h
  Mínima: 55 km/h
  Máxima: 100 km/h
```

**Componente:** `TomadorVelocidad.tsx` (a crear)

---

### 7. "Datos de Piloto" - Formato
**Respuesta:** Usar como referencia la sección de piloto en `VehiculoForm`

**Implementación:** Reutilizar la lógica existente de `VehiculoForm`.

---

### 8. "Datos de Vehículo" Simple
**Respuesta:** Igual que en `VehiculoForm`

**Implementación:** Reutilizar componente.

---

### 9. "Datos de Autoridad"
**Respuesta:** Usar `AutoridadSocorroManager` existente  
**Referencia:** Sección de recursos en autoridades y socorro

**Implementación:**
```typescript
{
    name: 'autoridades',
    type: 'custom',
    component: 'AutoridadSocorroManager',
}
```

---

### 10. "Motivo" - Campo Libre o Catálogo
**Respuesta:** Son SELECT con opción "Otro" que desbloquea texto libre

**Implementación:**
```typescript
{
    name: 'motivo',
    type: 'select',
    label: 'Motivo',
    options: [
        { value: 'exceso_velocidad', label: 'Exceso de velocidad' },
        { value: 'no_cinturon', label: 'No usar cinturón' },
        { value: 'otro', label: 'Otro' }
    ]
},
{
    name: 'motivo_otro',
    type: 'text',
    label: 'Especificar motivo',
    visibleIf: (data) => data.motivo === 'otro'
}
```

**Nota:** De momento se desconocen las opciones específicas.

---

### 11. Coordenadas Múltiples
**Respuesta:** Se toma punto de inicio, el COP agrega latitud/longitud del punto final viendo el mapa

**Implementación:**
- Brigada: Solo captura punto de inicio (GPS automático)
- COP: Agrega punto final desde el mapa web

**No requiere componente especial en mobile.**

---

### 12. "Llamadas de Atención" en Operativos
**Respuesta:** Sí, justo así (lista con múltiples)

**Implementación:**
```
[+ Agregar llamada de atención]

--- Llamadas de Atención ---
1. Motivo: Exceso de velocidad
   Piloto: Juan Pérez (DPI: ...)
   Vehículo: P-123ABC (Sedan, Toyota)
   [Editar] [Eliminar]

2. Motivo: No usar cinturón
   ...
```

**Componente:** `LlamadaAtencionManager.tsx` (a crear)

---

### 13. "Sanción" Standalone
**Respuesta:** 
- Inspirarse en la parte de sanción en `VehiculoForm`
- Es un checkbox Sí/No

**Implementación:**
```typescript
{
    name: 'se_aplico_sancion',
    type: 'switch',
    label: '¿Se aplicó sanción?'
},
{
    name: 'detalles_sancion',
    type: 'custom',
    component: 'SancionForm', // Extraer de VehiculoForm
    visibleIf: (data) => data.se_aplico_sancion
}
```

---

### 14. Infografía vs Evidencia
**Respuesta:** Son sinónimos (lo mismo)  
**Formato:** 3 fotos y 1 video

**Implementación:**
```typescript
{
    name: 'multimedia',
    type: 'custom',
    component: 'MultimediaCapture',
    componentProps: {
        maxFotos: 3,
        maxVideos: 1,
        required: true // o false según situación
    }
}
```

---

### 15. Conversión Asistencia ↔ Hecho
**Respuesta:** 
- Si el usuario comienza a llenar Asistencia o Hecho y está equivocado
- Debe haber un checkbox "Es Asistencia/Hecho" (según qué se llena)
- Se habilitará el campo de tipo de situación nuevo
- Esto se tomará en las estadísticas
- Se guardará donde iba para documentar que el brigada se equivocó

**Implementación:**
```typescript
// En asistenciaForm.ts
{
    name: 'es_realmente_hecho',
    type: 'switch',
    label: '⚠️ ¿Es realmente Hecho de Tránsito?'
},
{
    name: 'tipo_hecho_real',
    type: 'select',
    label: 'Tipo de Hecho de Tránsito',
    options: '@catalogos.tipos_hecho',
    visibleIf: (data) => data.es_realmente_hecho
}

// En hechoTransitoForm.ts
{
    name: 'es_realmente_asistencia',
    type: 'switch',
    label: '⚠️ ¿Es realmente Asistencia Vial?'
},
{
    name: 'tipo_asistencia_real',
    type: 'select',
    label: 'Tipo de Asistencia',
    options: '@catalogos.tipos_asistencia',
    visibleIf: (data) => data.es_realmente_asistencia
}
```

**Backend:** Guardar en la tabla original pero marcar el error para estadísticas.

---

### 16. Checkbox "Área Afectada" en Emergencia
**Respuesta:** Sí, justo así

**Implementación:**
```typescript
{
    name: 'km',
    type: 'number',
    label: 'Kilómetro'
},
{
    name: 'es_area_afectada',
    type: 'switch',
    label: 'Área afectada (rango)'
},
{
    name: 'km_hasta',
    type: 'number',
    label: 'Hasta KM',
    visibleIf: (data) => data.es_area_afectada
}
```

---

### 17. "Apoyo Proporcionado" en Asistencia
**Respuesta:** Sí, es en la sección "Otros"  
**Propósito:** Documentar qué ayudas se dan a los usuarios a grandes rasgos

**Implementación:**
```typescript
{
    id: 'otros',
    title: 'Otros',
    fields: [
        {
            name: 'apoyo_proporcionado',
            type: 'textarea',
            label: 'Apoyo Proporcionado',
            placeholder: 'Describe el apoyo brindado...'
        }
    ]
}
```

---

### 18. Comida - Horario
**Respuesta:** 
- La app SÍ captura hora de inicio, hora de cierre y duración
- Está en Bitácora
- Solo se necesita select de tipo (desayuno, almuerzo, cena)

**Implementación:**
```typescript
{
    name: 'tipo_comida',
    type: 'select',
    label: 'Tipo de Comida',
    options: [
        { value: 'desayuno', label: 'Desayuno' },
        { value: 'almuerzo', label: 'Almuerzo' },
        { value: 'cena', label: 'Cena' }
    ]
}
```

**Nota:** Hora se captura automáticamente al crear la situación.

---

### 19. Unidad Supervisada
**Respuesta:** Select con unidades activas

**Implementación:**
```typescript
{
    name: 'unidad_supervisada',
    type: 'select',
    label: 'Unidad Supervisada',
    options: '@catalogos.unidades_activas', // Catálogo dinámico
}
```

---

### 20. Empresa en Escolta
**Respuesta:** Text input para ingresar nombre de la empresa

**Implementación:**
```typescript
{
    name: 'nombre_empresa',
    type: 'text',
    label: 'Nombre de la Empresa'
}
```

---

### 21. Traslado en Consignación
**Respuesta:** Text libre

**Implementación:**
```typescript
{
    name: 'traslado_hacia',
    type: 'textarea',
    label: 'Hacia dónde fue trasladado',
    placeholder: 'Ej: Delegación PNC, MP, Juzgado...'
}
```

---

### 22. Falla Mecánica - "Tipo de Falla"
**Respuesta:** Select con opción "Otro" para texto libre

**Implementación:**
```typescript
{
    name: 'tipo_falla',
    type: 'select',
    label: 'Tipo de Falla',
    options: [
        { value: 'sistema_electrico', label: 'Sistema Eléctrico' },
        { value: 'motor', label: 'Motor' },
        { value: 'transmision', label: 'Transmisión' },
        { value: 'frenos', label: 'Frenos' },
        { value: 'neumatico', label: 'Neumático' },
        { value: 'otro', label: 'Otro' }
    ]
},
{
    name: 'tipo_falla_otro',
    type: 'text',
    label: 'Especificar tipo de falla',
    visibleIf: (data) => data.tipo_falla === 'otro'
}
```

---

### 23. Abastecimiento - Combustible
**Respuesta:** Es un catálogo ya existente que se usa en salida  
**Uso:** Se selecciona dos veces (inicial y final)

**Implementación:**
```typescript
{
    name: 'combustible_inicial',
    type: 'select',
    label: 'Combustible Inicial',
    options: '@catalogos.niveles_combustible'
},
{
    name: 'combustible_final',
    type: 'select',
    label: 'Combustible Final',
    options: '@catalogos.niveles_combustible'
}
```

**Nota:** Revisar catálogo existente en salida para reutilizar.

---

### 24. Institución que Pidió Apoyo
**Respuesta:** De momento esos datos (nombre institución, encargado, teléfono, cargo)

**Implementación:**
```typescript
{
    name: 'nombre_institucion',
    type: 'text',
    label: 'Nombre de la Institución'
},
{
    name: 'nombre_encargado',
    type: 'text',
    label: 'Nombre del Encargado'
},
{
    name: 'telefono_encargado',
    type: 'text',
    label: 'Teléfono',
    keyboardType: 'phone-pad'
},
{
    name: 'cargo_encargado',
    type: 'text',
    label: 'Cargo'
}
```

---

### 25. Situaciones No Listadas
**Respuesta:** NO deben aparecer en el sistema  
**Nota:** No confirmado si se usarán

**Lista excluida:**
- Retirando señalización
- Regulación en aeropuerto
- Denuncia de usuario
- Apoyo a báscula
- Escoltando Autoridades
- Bloqueo
- Manifestación
- Orden del Día

**Implementación:** No crear configuraciones para estas.

---

## 🎯 RESUMEN DE COMPONENTES A CREAR

### Componentes Nuevos Necesarios:

1. ✅ **ObstruccionManager** - Ya existe
2. ✅ **VehiculoForm** - Ya existe
3. ✅ **AutoridadSocorroManager** - Ya existe
4. ❌ **ContadorVehicular** - A crear (Pregunta #5)
5. ❌ **TomadorVelocidad** - A crear (Pregunta #6)
6. ❌ **LlamadaAtencionManager** - A crear (Pregunta #12)
7. ❌ **MultimediaCapture** - Verificar si existe o crear

### Catálogos Necesarios:

- ✅ `tipos_vehiculo` - Ya existe
- ✅ `marcas_vehiculo` - Ya existe
- ✅ `departamentos` - Ya existe
- ✅ `municipios` - Ya existe
- ✅ `niveles_combustible` - Existe en salida
- ❌ `unidades_activas` - Dinámico (query a BD)
- ❌ Motivos por situación - Pendiente definir

---

## ✅ TODO CLARO

Con estas respuestas puedo proceder a:

1. ✅ Crear los 4 componentes faltantes
2. ✅ Implementar las ~47 configuraciones de situaciones
3. ✅ Actualizar las 3 configs existentes con las correcciones
4. ✅ Registrar todo en el sistema

**Tiempo estimado:** 2-3 días de trabajo continuo.

---

**Próximo paso:** Implementar componentes faltantes y comenzar con las configuraciones.
