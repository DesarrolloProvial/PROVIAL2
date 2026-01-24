# 📋 DEFINICIÓN COMPLETA DE SITUACIONES - Preguntas de Clarificación

## ✅ Lo que Ya Entendí

### **Campos Base (TODAS las situaciones):**
- Tipo de situación
- Ubicación (coordenadas GPS)
- Ruta (de la asignación actual)
- KM
- Sentido (Norte, Sur, Oriente, Occidente, Ambos)
- Departamento
- Municipio
- Clima (Despejado, Nublado, Lluvia, Neblina)
- Carga vehicular (Fluido, Moderado, Denso, Congestionado)
- Observaciones

### **Componentes Complejos Ya Existentes:**
✅ `ObstruccionManager` - Manejo de obstrucción de vía con carriles
✅ `VehiculoForm` - Formulario de vehículos con 800+ líneas
✅ `GruaForm` - Formulario de grúas
✅ `AjustadorForm` - Formulario de ajustadores
✅ `AutoridadSocorroManager` - Autoridades y socorro

### **Regla Importante:**
✅ Asistencia ↔ Hecho de Tránsito pueden intercambiarse (confusión frecuente)

---

## ❓ **PREGUNTAS DE CLARIFICACIÓN**

### **1. Departamento/Municipio Offline**

**Pregunta:**
> ¿Cómo manejamos departamento/municipio cuando NO hay internet?

**Opciones:**
A) **Catálogo local en SQLite** - Sincroniza al iniciar app, usa offline
B) **Campo de texto libre** - Si no hay internet, el usuario escribe manualmente
C) **Opcional** - Si no hay internet, se deja vacío y se completa después
D) **Geolocalización** - Usar coordenadas para determinar (reverse geocoding offline con catálogo)

**Tu decisión:** ___________

---

### **2. "No de Grupo" en Hecho de Tránsito**

**Texto original:**
> "No de grupo (este se debe de tomar del usuario, es el numero del grupo al que pertenece, 1, 2 o administrativo)"

**Pregunta:**
- ¿Este dato está en el perfil del usuario (tabla `usuario.grupo_id`)?
- ¿O es un select manual que elige entre 1, 2, Administrativo?
- ¿El usuario puede pertenecer a diferentes grupos en diferentes turnos?

**Tu decisión:** ___________

---

### **3. Estructura de "Vehículos Involucrados"**

El `VehiculoForm` actual tiene ~800 líneas con secciones:
- Datos preliminares (tipo, marca, placa, color, etc.)
- Tarjeta de Circulación
- Licencia del piloto
- Carga (si aplica)
- Contenedor (si aplica)
- Bus (si es bus)
- Sanción (si aplica)
- Documentos consignados

**Preguntas:**
1. ¿Este formulario se usa IGUAL en Hecho, Asistencia y otras situaciones?
2. ¿O cada tipo tiene su propio subset de campos?
3. ¿En "Asistencia" solo se necesita 1 vehículo máximo?
4. ¿En "Hecho" pueden ser múltiples?

**Tu decisión:** ___________

---

### **4. "Vehículos Registrados" vs "Vehículos Involucrados"**

En varias situaciones mencionas **"vehículos registrados"**:
- Operativo con PNC-DT
- Operativo interinstitucional
- Operativo Provial

**Pregunta:**
- ¿Es el MISMO componente `VehiculoForm`?
- ¿O es solo una lista simple (placa, tipo, marca)?
- ¿Se registran datos del piloto también?

**Tu decisión:** ___________

---

### **5. Conteo Vehicular - Interfaz**

**Texto original:**
> "lo ideal seria que por tipo de vehiculo se tuviera un contador para ir sumando o restando los vehículos para tomar datos, pero como son muchos dudo que sea fácil estar haciendo scroll"

**Pregunta:**
¿Cuántos tipos de vehículos hay en el catálogo?
Según `situacionTypes.ts` hay ~40 tipos (Sedan, Pick-up, Camión, Bus, etc.)

**Propuesta A - Lista Filtrada:**
```
[Buscar tipo: ___________]  ← Input de búsqueda

[ Sedan          ]  [  +  ] 25 [ -  ]
[ Pick-up        ]  [  +  ] 12 [ -  ]
[ Camión         ]  [  +  ]  8 [ -  ]
[ Bus            ]  [  +  ]  3 [ -  ]

Solo mostrar los que tienen count > 0
```

**Propuesta B - Grid de Botones:**
```
┌────────┬────────┬────────┐
│ Sedan  │ Pick-up│ Camión │
│   25   │   12   │    8   │
└────────┴────────┴────────┘
```

**Propuesta C - Input Manual:**
```
Tipo de vehículo: [Select ▼]
Cantidad: [____]
[Agregar]

Lista:
- Sedan: 25
- Pick-up: 12
...
```

**Tu preferencia:** ___________

---

### **6. Toma de Velocidad - Formato**

**Texto original:**
> "sedan 55, 80, 100, 69 km/h"

**Pregunta:**
¿Cómo se ingresa?

**Opción A - Lista de Registros:**
```
[Agregar medición]

Tipo: [Sedan  ▼]
Velocidad: [55] km/h
[Guardar]

--- Registros ---
1. Sedan - 55 km/h
2. Sedan - 80 km/h
3. Pick-up - 100 km/h
[...]
```

**Opción B - Por Tipo (múltiples velocidades):**
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

**Tu preferencia:** ___________

---

### **7. "Datos de Piloto" - Formato**

Usado en múltiples situaciones. ¿Qué campos incluye?

**¿Es esto?**
- Nombre completo
- DPI
- Licencia (número, tipo, vencimiento)
- Teléfono
- Dirección

**¿O es más simple?**
- Nombre
- DPI

**Tu decisión:** ___________

---

### **8. "Datos de Vehículo" Simple**

En situaciones como "Consignación", "Falla Mecánica", etc.
¿Es el `VehiculoForm` completo o solo?:
- Tipo
- Marca
- Placa
- Color

**Tu decisión:** ___________

---

### **9. "Datos de Autoridad"**

**Pregunta:**
¿Cuáles son los datos que se capturan?
- Nombre de la autoridad (PMT, PNC, etc.)
- Nombre del agente
- Placa/Distintivo
- Observaciones

**¿O usa el `AutoridadSocorroManager` existente?**

**Tu decisión:** ___________

---

### **10. "Motivo" - Campo Libre o Catálogo**

En varias situaciones hay "Motivo":
- Escoltando carga ancha
- Consignación
- Hospital

**Pregunta:**
- ¿Es text area libre?
- ¿O select de opciones predefinidas?

**Tu decisión:** ___________

---

### **11. Coordenadas Múltiples**

En situaciones como:
- Escoltando carga ancha (inicio, finalización carga, finalización apoyo)
- Apoyo a instituciones (inicio, fin, puntos de regulación)

**Pregunta:**
¿Cómo se capturan?

**Opción A - GPS Secuencial:**
```
Punto de inicio: [📍 Capturar GPS]
  Lat: 14.6349, Lon: -90.5069 ✅

Punto de fin: [📍 Capturar GPS]
  (Vacío)
```

**Opción B - Mapa con Pins:**
```
[Mapa interactivo]
  📍 Pin 1: Inicio
  📍 Pin 2: Fin
  📍 Pin 3: Regulación 1
  [+] Agregar punto
```

**Tu preferencia:** ___________

---

### **12. "Llamadas de Atención" en Operativos**

**Texto:**
> "llamadas de atención (con esto hay motivo por llamada de atención, datos de piloto y vehiculo)"

**Pregunta:**
¿Es una lista donde puedo agregar múltiples?

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

**¿Correcto?** ___________

---

### **13. "Sanción" Standalone**

En "Operativo con PNC-DT" hay:
- Llamadas de atención
- **Sanción** (separado)

**Pregunta:**
- ¿Es checkbox "¿Se aplicó sanción?" Sí/No?
- ¿O es otra lista como las llamadas de atención?
- ¿Qué datos tiene?

**Tu decisión:** ___________

---

### **14. Infografía vs Evidencia**

**Pregunta:**
- "Evidencia" = fotos/videos (el componente `MultimediaCapture`)
- "Infografía" = lo mismo pero opcional

**¿Son el mismo componente, solo que uno es obligatorio y otro opcional?**

**Tu decisión:** ___________

---

### **15. Conversión Asistencia ↔ Hecho**

**Texto:**
> "asistencia y hecho de transito deben poderse cambiar"

**Pregunta:**
¿Cómo funciona en la UI?

**Opción A - Botón en la pantalla:**
```
[Formulario de Asistencia lleno parcialmente]

[⚠️ Cambiar a Hecho de Tránsito]

→ Muestra modal de confirmación
→ Conserva datos comunes (ubicación, vehículos, etc.)
→ Abre formulario de Hecho con esos datos pre-llenados
```

**Opción B - Desde lista/bitácora:**
```
Situación #123 (Asistencia Vehicular)
  [Ver] [Editar] [Cambiar Tipo]
  
→ Modal: ¿Cambiar a Hecho de Tránsito?
→ Migra la información
```

**Tu preferencia:** ___________

---

### **16. Checkbox "Área Afectada" en Emergencia**

**Texto:**
> "en km hay un checkbox con area afectada para aceptar un rango de km por ejemplo del 30 al 32"

**UI Propuesta:**
```
Kilómetro: [30] 

☑ Área afectada (rango)
  Desde KM: [30]
  Hasta KM: [32]
```

**¿Correcto?** ___________

---

### **17. "Apoyo Proporcionado" en Asistencia**

**Texto:**
> "en la seccion de otros se necesito un input tipo text para que se especifique el apoyo proporcionado"

**Pregunta:**
- ¿Es en la sección "Otros" del formulario?
- ¿O solo aparece si el tipo de asistencia es "Otro"?

**Tu decisión:** ___________

---

### **18. Comida - Horario**

**Texto:**
> "Comida (requiere un select si es desayuno, almuerzo, cena)"

**Pregunta:**
¿Solo eso o también hora? (La app actualmente no captura hora de inicio/fin de situación, ¿cierto?)

**Tu decisión:** ___________

---

### **19. Unidad Supervisada**

**Texto:**
> "unidad supervisada (se selecciona unidad que este fuera para supervisar)"

**Pregunta:**
- ¿Es un select de las unidades activas (que tienen salida activa)?
- ¿O text input manual del código de unidad?

**Tu decisión:** ___________

---

### **20. Empresa en Escolta**

**Texto:**
> "empresa"

**Pregunta:**
- ¿Solo nombre de la empresa (text input)?
- ¿O select de catálogo?
- ¿Qué otros datos? (teléfono, contacto, etc.)

**Tu decisión:** ___________

---

### **21. Traslado en Consignación**

**Texto:**
> "hacia donde fue trasladado piloto/vehiculo"

**Pregunta:**
- ¿Es text area libre?
- ¿O select de ubicaciones comunes (delegación PNC, MP, juzgado, etc.)?

**Tu decisión:** ___________

---

### **22. Falla Mecánica - "Tipo de Falla"**

**Pregunta:**
- ¿Es select de opciones o text libre?
- Si es select, ¿cuáles son las opciones?

**Opciones posibles:**
- Sistema eléctrico
- Motor
- Transmisión
- Frenos
- Neumático
- Otro

**Tu decisión:** ___________

---

### **23. Abastecimiento - Combustible**

**Texto:**
> "combustible inicial, combustible final"

**Pregunta:**
- ¿Son números decimales (litros/galones)?
- ¿Hay cálculo automático (final - inicial)?
- ¿Se registra el costo también?

**Tu decisión:** ___________

---

### **24. Institución que Pidió Apoyo**

**Texto:**
> "datos de la institución que pidió apoyo (datos del encargado)"

**Pregunta:**
Campos:
- Nombre de la institución
- Nombre del encargado
- Teléfono
- Cargo
- ¿Algo más?

**Tu decisión:** ___________

---

### **25. Situaciones No Listadas**

Mencionaste al final:
> "retirando señalización, Regulación en aeropuerto, Denuncia de usuario, Apoyo a báscula, Escoltando Autoridades, Bloqueo, Manifestación, Orden del Día, no lo pongas"

**Pregunta:**
¿Estas situaciones NO deben aparecer en el sistema? ¿O simplemente no las implementamos ahorita?

**Tu decisión:**___________

---

## 📊 **Resumen de Grupos de Situaciones**

Ya las organicé por grupos de campos similares para el FormBuilder:

### **Grupo 1: Complejas con Subtipos (3)**
- Hecho de Tránsito (17 subtipos) → vehiculos, obstruccion, autoridades, gruas, evidencia
- Asistencia Vial (26 subtipos) → Similar a Hecho
- Emergencia Vial (11 subtipos) → NO vehiculos, rango KM

### **Grupo 2: Simples (11)**
Puesto fijo, Parada estratégica, Señalizando, Lavado, Regulación, Patrullaje, Parada Autorizada, Regulación colonia, Verificación, Baño, Cajero, Comida

### **Grupo 3: Conteo/Mediciones (2)**
- Conteo vehicular → Contadores
- Toma de velocidad → Lista de mediciones

### **Grupo 4: Supervisión (1)**
- Supervisando unidad → select unidad

### **Grupo 5: Escolta (1)**
- Escoltando carga ancha → 3 puntos GPS, empresa, piloto, vehículo

### **Grupo 6: Operativos (3)**
- Operativo PNC-DT → vehículos registrados, llamadas atención, sanciones, autoridades
- Operativo interinstitucional → Similar
- Operativo Provial → vehículos, llamadas atención

### **Grupo 7: Consignación (1)**
- Consignación → piloto, vehículo, autoridad, traslado

### **Grupo 8: Mantenimiento (1)**
- Falla Mecánica → tipo falla, grúa, foto

### **Grupo 9: Salud (2)**
- Hospital → motivo, hospital
- Compañero enfermo → malestar, acciones

### **Grupo 10: Administrativas (2)**
- Dejando personal
- Comisión

### **Grupo 11: Combustible (1)**
- Abastecimiento → inicial, final, odómetro

### **Grupo 12: Apoyos (9)**
- Apoyo MP, Otra unidad, Trabajos carretera, Ciclismo, DIGEF, Triatlón, Atletismo, Antorcha, Institución
- Todos: institución, encargado, puntos GPS

---

## 🎯 **SIGUIENTE PASO:**

Por favor responde las 25 preguntas marcadas con **"Tu decisión: ___________"** 

Con esa información podré diseñar:
1. ✅ El esquema de catálogos completo
2. ✅ La estructura de FormBuilder
3. ✅ Los componentes reutilizables
4. ✅ El sistema de validaciones

**¿Listo para responder?** 🚀
