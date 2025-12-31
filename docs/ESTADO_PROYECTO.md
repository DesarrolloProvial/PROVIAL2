# Estado del Proyecto PROVIAL

**Ultima actualizacion:** 2025-12-14 (Sistema de roles ENCARGADO_NOMINAS y mejoras UI)

Este documento muestra que tenemos vs que nos falta.

---

## Resumen Ejecutivo

| Modulo | Avance Estimado | Estado |
|--------|-----------------|--------|
| App Movil | 75% | Funcional, faltan fotos/PDF |
| Web COP | 45% | Base lista, falta mapa tiempo real |
| Web Operaciones | 65% | Gestion brigadas/unidades, asignacion roles |
| Web Accidentologia | 0% | No iniciado |
| Web Com. Social | 0% | No iniciado |
| Infraestructura | 85% | BD completa, Redis activo, falta WebSocket |

---

## APP MOVIL - Brigadas

### Implementado
- [x] Autenticacion JWT (token extendido a 12 horas)
- [x] Vista de asignacion del dia
- [x] Iniciar salida de unidad (km, combustible, ruta)
- [x] Registrar situaciones generales (patrullaje, parada, descanso, etc.)
- [x] Registrar hechos de transito con:
  - Datos del incidente
  - Vehiculos involucrados (placa, piloto, estado)
  - Gruas
  - Ajustadores de seguros
  - Autoridades presentes
  - Obstruccion de via
- [x] Registrar asistencias vehiculares
- [x] Registrar emergencias
- [x] Bitacora del dia con edicion
- [x] Ingreso a sede (motivos: combustible, almuerzo, etc.)
- [x] Finalizar jornada
- [x] GPS automatico
- [x] Modo pruebas con GPS manual en TODAS las pantallas de situaciones
- [x] Draft/borrador automatico
- [x] Deteccion de vehiculos reincidentes (PlacaInput)
- [x] Selector de departamento/municipio
- [x] **Cambiar tipo situacion** (accidente <-> asistencia)
- [x] **Sistema de turnos con fechas futuras** (asignaciones programadas)
- [x] **Vista v_mi_asignacion_hoy** con soporte para turnos
- [x] **Vista v_mi_salida_activa** con UNION para turnos y permanentes

### Pendiente
- [ ] **Captura de fotos** (3 obligatorias para accidentes)
- [ ] **Captura de video** (1 obligatorio para accidentes)
- [ ] **Generacion PDF 360** (inspeccion de unidad)
- [ ] **Generacion PDF Accidentologia** (informe al regresar)
- [ ] **Autocompletado inteligente** (placa/piloto existente)
- [ ] **Modo offline** con sincronizacion

---

## WEB COP - Centro de Operaciones

### Implementado
- [x] Login con JWT
- [x] Dashboard con metricas
- [x] Gestion de turnos
- [x] Generador de turnos
- [x] Creacion de asignaciones
- [x] Buscador de brigadas en asignaciones
- [x] Vista de unidades activas
- [x] Eventos persistentes (derrumbes, obras)
- [x] Asignar unidades a eventos
- [x] Bitacora por unidad (historico)
- [x] Boton de recarga manual en dashboard

### Pendiente
- [ ] **Mapa en tiempo real** con unidades en ruta
- [ ] **Tabla resumen en tiempo real** de unidades
- [ ] **WebSocket** para actualizaciones push
- [ ] **Edicion de situaciones** como si fuera brigada
- [ ] **Gestion mejorada de eventos persistentes**
  - Sin huecos en bitacora al rotar unidades
  - Actualizaciones desde unidad asignada
- [ ] **Vista de preliminares** (accidentes en progreso)
- [ ] **Notificaciones** a mandos/poblacion

---

## WEB OPERACIONES

### Implementado
- [x] Vista de unidades con estadisticas
- [x] Vista de brigadas con busqueda y filtros
- [x] Creacion de asignaciones con rango de fechas
- [x] Soporte para unidades de reaccion
- [x] **Header rediseñado con menu desplegable** (mejor UX)
- [x] **Sistema de desactivacion de brigadas con motivos**
  - Vacaciones
  - Rebajo medico
  - Suspension
  - Permiso
  - Otro (texto libre)
- [x] **Historial de inactividad por brigada**
- [x] **Transferencia de brigadas entre sedes**
- [x] **Sistema de roles ENCARGADO_NOMINAS**:
  - ENCARGADO_NOMINAS Central (puede_ver_todas_sedes=true):
    - Puede editar TODOS los brigadas de cualquier sede
    - Puede asignar roles (COP, OPERACIONES, ACCIDENTOLOGIA, ENCARGADO_NOMINAS)
    - Para asignar brigadas a otra sede, debe transferirlos primero
  - ENCARGADO_NOMINAS Regional:
    - Solo puede ver y editar brigadas de su propia sede
    - NO puede asignar roles
- [x] **Modal para asignar roles a usuarios**
- [x] **Dashboard de sedes** (navegacion disponible)
- [x] **Situaciones fijas** (navegacion disponible)

### Pendiente
- [ ] **Historico de combustible** por unidad
- [ ] **Historico de kilometraje** por unidad
- [ ] **Graficas de rendimiento**
- [ ] **Gestion de inspecciones 360**
- [ ] **Inventario por sede** (pendiente info)
- [ ] **Gestion de garita**
- [ ] **Ubicacion de personal**

---

## WEB ACCIDENTOLOGIA

### Implementado
- (Nada aun)

### Pendiente
- [ ] **Dashboard de estadisticas**
  - Hechos por ruta
  - Tipos de vehiculo
  - Empresas con mas accidentes
  - Horarios criticos
  - Puntos negros
- [ ] **Informes de accidentologia**
- [ ] **Sistema de peritajes**
- [ ] **Comentarios a accidentes**
- [ ] **Exportacion de reportes**

---

## WEB COMUNICACION SOCIAL

### Implementado
- (Nada aun)

### Pendiente
- [ ] **Vista solo lectura** (como COP)
- [ ] **Galeria de fotos/videos**
- [ ] **Sistema de difusion** a redes sociales
- [ ] **Editor de publicaciones**

---

## BASE DE DATOS

### Tablas Principales
- [x] usuario, sede, unidad, ruta
- [x] turno, asignacion_unidad, tripulacion_turno
- [x] salida_unidad, ingreso_sede
- [x] situacion, detalle_situacion
- [x] incidente, vehiculo_incidente
- [x] evento_persistente
- [x] departamento, municipio
- [x] **rol** (catalogo de roles del sistema)
- [x] **usuario_rol** (asignacion de multiples roles por usuario)
- [x] **catalogo_motivo_inactividad** (vacaciones, rebajo medico, etc.)
- [x] **usuario_inactividad** (historial de inactividad con motivos)

### Vistas
- [x] v_mi_asignacion_hoy (soporta turnos y permanentes)
- [x] v_mi_salida_activa (UNION para turnos y permanentes)
- [x] v_situaciones_completas
- [x] v_ultima_situacion_unidad
- [x] v_asignaciones_completas

### Migraciones Recientes
- 038_add_rol_brigada.sql
- 039_fix_validar_disponibilidad_brigada.sql
- 040_turnos_rango_fechas.sql
- 041_fix_vista_mi_asignacion.sql
- 042_fix_vista_mi_salida_activa.sql
- 043_fix_iniciar_salida_unidad.sql (pendiente aplicar)
- 048_multi_role_system.sql (sistema multi-rol)

### Pendiente
- [ ] **Tabla de auditoria** (historial de cambios)
- [ ] **Tabla de fotos/videos** (multimedia)
- [ ] **Tabla de peritajes**
- [ ] **Tabla de comentarios** (accidentologia)
- [ ] **Tabla de inventario** (por sede)

---

## INFRAESTRUCTURA

### Implementado
- [x] Backend Node.js + Express + TypeScript
- [x] PostgreSQL con pg-promise
- [x] JWT para autenticacion (token 12h)
- [x] React Native + Expo para movil
- [x] React + Vite + TailwindCSS para web
- [x] Docker para desarrollo
- [x] **Redis activo** para cache

### Pendiente
- [ ] **WebSocket** (Socket.io) para tiempo real
- [ ] **Almacenamiento de archivos** (S3/MinIO para fotos/videos)
- [ ] **Generacion de PDF** (puppeteer o similar)
- [ ] **Sistema de notificaciones push**

---

## ROLES DEL SISTEMA

| Rol | Acceso Web | Descripcion |
|-----|------------|-------------|
| BRIGADA | Solo App Movil | Personal de campo |
| COP | Web COP | Centro de Operaciones Provial |
| OPERACIONES | Web Operaciones | Gestion de recursos |
| ENCARGADO_NOMINAS | Web Operaciones | Gestion de personal y roles |
| ACCIDENTOLOGIA | Web Accidentologia | Estadisticas y peritajes |
| ADMIN | Todo | Administrador del sistema |

### Permisos ENCARGADO_NOMINAS

**Central (puede_ver_todas_sedes = true)**:
- Ver todos los brigadas de todas las sedes
- Editar cualquier brigada
- Activar/Desactivar brigadas con motivo
- Transferir brigadas entre sedes
- **Asignar roles** (COP, OPERACIONES, ACCIDENTOLOGIA, ENCARGADO_NOMINAS)
- Eliminar brigadas sin historial

**Regional (puede_ver_todas_sedes = false)**:
- Ver solo brigadas de su sede
- Editar solo brigadas de su sede
- Activar/Desactivar brigadas de su sede
- Transferir brigadas de su sede a otra
- **NO puede asignar roles**
- Eliminar brigadas sin historial de su sede

---

## ENDPOINTS API - Brigadas

| Metodo | Ruta | Roles | Descripcion |
|--------|------|-------|-------------|
| GET | /api/brigadas | OPERACIONES, ADMIN, ENCARGADO_NOMINAS | Listar brigadas |
| GET | /api/brigadas/:id | OPERACIONES, ADMIN, ENCARGADO_NOMINAS | Obtener brigada |
| POST | /api/brigadas | ADMIN, ENCARGADO_NOMINAS | Crear brigada |
| PUT | /api/brigadas/:id | OPERACIONES, ADMIN, ENCARGADO_NOMINAS | Actualizar brigada |
| PUT | /api/brigadas/:id/desactivar | OPERACIONES, ADMIN, ENCARGADO_NOMINAS | Desactivar con motivo |
| PUT | /api/brigadas/:id/activar | OPERACIONES, ADMIN, ENCARGADO_NOMINAS | Activar brigada |
| PUT | /api/brigadas/:id/transferir | OPERACIONES, ADMIN, ENCARGADO_NOMINAS | Transferir a otra sede |
| DELETE | /api/brigadas/:id | ADMIN, ENCARGADO_NOMINAS | Eliminar brigada |
| GET | /api/brigadas/:id/roles | ADMIN, ENCARGADO_NOMINAS | Obtener roles de usuario |
| POST | /api/brigadas/:id/roles | ADMIN, ENCARGADO_NOMINAS* | Asignar rol |
| DELETE | /api/brigadas/:id/roles/:rolId | ADMIN, ENCARGADO_NOMINAS* | Revocar rol |
| GET | /api/brigadas/:id/inactividad | OPERACIONES, ADMIN, ENCARGADO_NOMINAS | Historial inactividad |
| GET | /api/brigadas/catalogo/motivos-inactividad | OPERACIONES, ADMIN, ENCARGADO_NOMINAS | Catalogo motivos |
| GET | /api/brigadas/catalogo/roles | ADMIN, ENCARGADO_NOMINAS | Roles disponibles |

*Solo ENCARGADO_NOMINAS con puede_ver_todas_sedes=true

---

## Proxima Iteracion Sugerida

Basado en los requerimientos, la prioridad deberia ser:

1. **Mapa tiempo real para COP** - Es lo que mas necesitan
2. **WebSocket** - Habilita el tiempo real
3. **Fotos/Videos** - Comunicacion Social lo necesita
4. **Auditoria de cambios** - Requerimiento legal
5. **Dashboard Accidentologia** - Estadisticas pendientes

---

## COMO INICIAR EL PROYECTO

```bash
# Backend (desde carpeta backend)
npm run dev

# Web (desde carpeta web)
npm run dev

# Mobile (desde carpeta mobile)
npx expo start
```

### Puertos
- Backend: http://localhost:3000
- Web: http://localhost:5173
- Docker PostgreSQL: localhost:5432
- Docker Redis: localhost:6379

---

*Ver `REQUERIMIENTOS_COMPLETOS.md` para detalles de cada funcionalidad.*
