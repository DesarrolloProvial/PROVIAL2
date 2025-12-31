# Requerimientos Completos del Sistema PROVIAL

**Fecha de documentacion:** 2025-12-12
**Estado:** Documento de referencia principal

---

## Vision General

El sistema PROVIAL se divide en **5 modulos principales**, cada uno con su propia interfaz y usuarios:

1. **App Movil** - Para Brigadas en campo
2. **Web COP** - Centro de Operaciones en tiempo real
3. **Web Operaciones** - Gestion administrativa y logistica
4. **Web Accidentologia** - Analisis, estadisticas y peritajes
5. **Web Comunicacion Social** - Difusion publica de informacion

**Principio fundamental:** Bitacora unica como verdad absoluta para todos los departamentos.

---

## 1. APP MOVIL (Brigadas)

### Funcionalidades Actuales
- [x] Iniciar/Finalizar salida de unidad
- [x] Reportar situaciones (patrullaje, parada, etc.)
- [x] Registrar hechos de transito con vehiculos, gruas, ajustadores
- [x] Registrar asistencias vehiculares
- [x] Registrar emergencias
- [x] Bitacora del dia con edicion
- [x] Ingreso a sede (combustible, almuerzo, etc.)
- [x] GPS automatico y manual (modo pruebas)
- [x] Draft/borrador automatico de formularios

### Requerimientos Pendientes

#### Alta Prioridad
- [ ] **Cambiar tipo de situacion**: Poder cambiar entre ACCIDENTE y ASISTENCIA despues de creado
  - Causa: Es comun que se equivoquen al clasificar inicialmente
  - Impacto: Discrepancia entre datos de COP y Accidentologia

- [ ] **Fotos y video obligatorios**: 3 fotos + 1 video para accidentes, asistencias y emergencias
  - Opcional para patrullajes, paradas, operativos
  - Almacenamiento y compresion eficiente

- [ ] **Generacion de PDF - Hoja 360**: Inspeccion de unidad al salir
  - Verificar: rayones, danos, balizas, luces, llantas
  - Verificar equipamiento: primeros auxilios, conos (cantidad y estado), pala, machete, cuerda
  - Genera PDF automatico que se archiva

- [ ] **Generacion de PDF - Hoja Accidentologia**: Al regresar de ruta
  - Datos adicionales del accidente para analisis
  - Formato especifico (pendiente detalles exactos)

#### Media Prioridad
- [ ] **Edicion de situaciones hasta fin de jornada**: Ya parcialmente implementado
- [ ] **Reutilizacion de datos existentes**: Si placa/piloto ya existe, autocompletar datos

---

## 2. WEB COP (Centro de Operaciones)

### Funcionalidades Actuales
- [x] Dashboard con resumen de situaciones
- [x] Gestion de asignaciones y turnos
- [x] Vista de unidades activas
- [x] Eventos persistentes (derrumbes, obras)
- [x] Bitacora por unidad

### Requerimientos Pendientes

#### Alta Prioridad
- [ ] **Mapa en tiempo real**:
  - Mostrar unidades EN RUTA con su ubicacion GPS
  - Mostrar situacion actual de cada unidad
  - Actualizacion automatica (WebSocket o polling)

- [ ] **Tabla resumen en tiempo real**:
  - Todas las unidades en ruta
  - Estado actual, ubicacion, ultima actividad
  - Filtros y ordenamiento

- [ ] **Gestion de eventos persistentes mejorada**:
  - Asignar/desasignar unidades a situaciones de larga duracion
  - Cuando unidad esta en evento: puede agregar info y actualizaciones
  - Cambios de unidad deben reflejarse en bitacora (sin huecos de horas vacias)
  - Ejemplo: Puente con unidad 24/7, rotacion de turnos

- [ ] **Edicion de situaciones (como brigada)**:
  - COP puede editar cualquier situacion activa
  - Apoyar a brigadas en ruta
  - Mismo nivel de edicion que tiene el brigada

- [ ] **Sistema de preliminares**:
  - Brigadas crean accidente con datos minimos
  - Editan progresivamente con mas detalles
  - COP ve gravedad y necesidades en tiempo real

#### Media Prioridad
- [ ] **Difusion de informacion**:
  - Notificar a poblacion sobre situaciones en carretera
  - Notificar a mandos superiores
  - Integracion con Comunicacion Social

---

## 3. WEB OPERACIONES

### Funcionalidades Actuales
- [x] Gestion de unidades
- [x] Gestion de brigadas/personal
- [x] Creacion de asignaciones
- [x] Generador de turnos

### Requerimientos Pendientes

#### Alta Prioridad
- [ ] **Control historico de combustible y kilometraje**:
  - Graficas de consumo por unidad
  - Alertas de consumo anormal
  - Reportes de rendimiento

- [ ] **Gestion del 360 (Inspeccion de unidad)**:
  - Recibir PDFs generados por brigadas
  - Archivar y supervisar
  - Historial de inspecciones por unidad

- [ ] **Ubicacion de personal**:
  - Saber donde esta cada brigada
  - Historial de asignaciones

#### Media Prioridad
- [ ] **Inventario por sede** (PENDIENTE - falta informacion):
  - Conos, palas, machetes, etc.
  - Control de existencias
  - Asignacion a unidades

- [ ] **Gestion de Garita**:
  - Turno especial de control de acceso
  - Registro de entrada/salida de unidades y visitantes

---

## 4. WEB ACCIDENTOLOGIA

### Funcionalidades Actuales
- [ ] No implementado aun

### Requerimientos Pendientes

#### Alta Prioridad
- [ ] **Informes de accidentologia**:
  - Brigadas llenan informe al regresar de ruta
  - Datos adicionales a los del COP
  - Generacion automatica de PDF
  - Pendiente: formato exacto del informe

- [ ] **Estadisticas completas**:
  - Hechos por ruta
  - Tipo de vehiculo mas accidentado
  - Empresas con mas accidentes
  - Horarios criticos
  - Puntos negros (ubicaciones recurrentes)
  - Todas las metricas se pueden derivar de vistas SQL

- [ ] **Sistema de Peritajes**:
  - Crear peritajes para accidentes atendidos
  - Crear peritajes para accidentes NO atendidos por la institucion
  - Generar reportes PDF para solicitar mejoras viales
  - Ejemplo: "Se necesita senalizacion de curva peligrosa"
  - Vincular peritaje a hecho de transito si aplica

- [ ] **Comentarios a accidentes**:
  - Accidentologia puede comentar hechos
  - Tipos: "jurisdiccion incorrecta", "esto era asistencia", etc.
  - Historial de comentarios
  - Notificaciones a involucrados

---

## 5. WEB COMUNICACION SOCIAL

### Funcionalidades Actuales
- [ ] No implementado aun

### Requerimientos Pendientes

#### Alta Prioridad
- [ ] **Vista similar a COP pero solo lectura**:
  - Ver situaciones activas
  - Ver mapa (sin controles de edicion)
  - Ver resumen de hechos

- [ ] **Acceso a multimedia**:
  - 3 fotos + 1 video de cada situacion
  - Galeria organizada por fecha/tipo

- [ ] **Sistema de difusion a redes sociales**:
  - Seleccionar unidad/situacion
  - Editar informacion para publicar (resumir)
  - Compartir a multiples redes sociales
  - El publico puede ver y llamar al COP para mas info

---

## REQUERIMIENTOS GENERALES (Aplican a todo el sistema)

### Integridad de Datos

1. **Bitacora unica**
   - Una sola fuente de verdad
   - Todos los departamentos ven los mismos datos
   - Evita conflictos y variaciones

2. **Registros completos obligatorios**
   - Hora de llegada de autoridades
   - Hora de cada edicion
   - Quien hizo cada edicion
   - Relaciones completas: hecho -> conductor -> vehiculo -> etc.

3. **Auditoria total**
   - Guardar historial de cambios (quien, cuando, que cambio)
   - Log de todas las acciones criticas
   - Trazabilidad completa

### Seguridad

1. **Control de acceso por rol**
   - Brigada: solo sus datos
   - COP: todo en tiempo real, edicion
   - Operaciones: gestion administrativa
   - Accidentologia: analisis y estadisticas
   - Comunicacion Social: solo lectura + difusion

2. **Prevencion de filtraciones**
   - Control preciso de que informacion ve cada rol
   - Datos sensibles protegidos

### Inteligencia de Datos

1. **Deteccion de reincidencias**
   - Placas con multiples incidentes
   - Conductores reincidentes
   - Alertas automaticas

2. **Reutilizacion inteligente**
   - Si placa ya existe: autocompletar datos del vehiculo
   - Si conductor ya existe: autocompletar y solo actualizar si necesario
   - Vincular automaticamente a historial

### Robustez y Confiabilidad

1. **Manejo de errores critico**
   - Un registro no guardado = posible demanda millonaria
   - Prevenir todos los errores posibles
   - Reintentos automaticos
   - Modo offline con sincronizacion

2. **Optimizacion**
   - App movil rapida y fluida
   - Carga minima de datos
   - Compresion de imagenes/videos

---

## Matriz de Prioridades

| Modulo | Prioridad 1 (Critico) | Prioridad 2 (Importante) | Prioridad 3 (Deseable) |
|--------|----------------------|-------------------------|----------------------|
| Movil | Cambiar tipo situacion, Fotos/Video, PDF 360 | PDF Accidentologia, Autocompletado | - |
| COP | Mapa tiempo real, Tabla tiempo real, Edicion situaciones | Eventos persistentes mejorados | Difusion |
| Operaciones | Historico combustible/km, Gestion 360 | Ubicacion personal | Inventario, Garita |
| Accidentologia | Estadisticas, Informes | Peritajes | Comentarios |
| Com. Social | Vista lectura, Multimedia | Difusion redes | - |

---

## Proximos Pasos Sugeridos

1. **Fase 1 - Estabilizacion**
   - Corregir todos los bugs actuales
   - Asegurar que flujo basico funcione 100%
   - Implementar auditoria de cambios

2. **Fase 2 - COP Completo**
   - Mapa en tiempo real
   - Tabla resumen
   - Edicion de situaciones desde web

3. **Fase 3 - Multimedia**
   - Fotos y videos en app movil
   - Almacenamiento eficiente
   - Galeria en web

4. **Fase 4 - Reportes y PDFs**
   - Hoja 360
   - Informe Accidentologia
   - Peritajes

5. **Fase 5 - Estadisticas**
   - Dashboard Accidentologia
   - Graficas y metricas
   - Exportacion

6. **Fase 6 - Comunicacion Social**
   - Vista lectura
   - Sistema de difusion

---

## Notas Importantes

- El formato exacto del **informe de accidentologia** esta pendiente
- Los detalles del **inventario por sede** estan pendientes
- La estructura de **peritajes** necesita definicion
- El flujo de **difusion a redes sociales** necesita detallarse

---

*Este documento debe actualizarse conforme se reciban mas detalles de cada departamento.*
