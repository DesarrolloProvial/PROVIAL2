# Sistema PROVIAL - Presentación Ejecutiva

## Gestión Integral de Operaciones Viales

**Versión:** 2.0.0
**Fecha:** Enero 2026

---

## 1. Resumen del Sistema

Sistema integral para la gestión de operaciones viales que digitaliza y automatiza los procesos de:
- Gestión de brigadas y unidades vehiculares
- Registro de situaciones e incidentes en tiempo real
- Supervisión y control de operaciones
- Reportes y estadísticas ejecutivas

### Componentes Desarrollados

| Componente | Tecnología | Estado |
|------------|------------|--------|
| **API Backend** | Node.js + Express + PostgreSQL | ✅ 100% |
| **Panel Web** | React + TypeScript + Vite | ✅ 95% |
| **App Móvil** | React Native + Expo | ✅ 85% |
| **Base de Datos** | PostgreSQL + PostGIS | ✅ 100% |

### Métricas de Desarrollo

| Métrica | Cantidad |
|---------|----------|
| Endpoints API | 388 |
| Páginas Web | 24 |
| Pantallas Móvil | 25 |
| Tablas BD | 45+ |
| Pruebas Automatizadas | 118 |
| Archivos de Código | 200+ |

---

## 2. Módulos por Departamento

### 2.1 BRIGADAS (App Móvil)

**Usuarios:** Personal de campo que opera las unidades vehiculares

| Funcionalidad | Descripción | Estado |
|---------------|-------------|--------|
| Login seguro | Autenticación JWT con refresh tokens | ✅ |
| Mi Asignación | Ver turno, unidad y ruta asignada | ✅ |
| Iniciar Salida | Confirmar inicio de jornada con GPS | ✅ |
| Registrar Situaciones | 15+ tipos de eventos (patrullaje, asistencia, incidente) | ✅ |
| Captura Multimedia | 3 fotos + 1 video obligatorios por incidente | ✅ |
| GPS Automático | Ubicación en cada registro | ✅ |
| Registro Combustible | Control de niveles de tanque | ✅ |
| Kilometraje | Registro de odómetro | ✅ |
| Cambio de Ruta | Cambiar ruta asignada | ✅ |
| Ingreso a Sede | Registrar entrada a base | ✅ |
| Finalizar Día | Cerrar jornada laboral | ✅ |
| Bitácora Personal | Ver historial del día | ✅ |
| Inspección 360 | Checklist de vehículo | 🔄 80% |
| Relevo de Unidad | Transferir unidad a otro operador | ✅ |

**Pantallas:** 22

---

### 2.2 OPERACIONES (Panel Web)

**Usuarios:** Supervisores que asignan turnos y monitorean actividad

| Funcionalidad | Descripción | Estado |
|---------------|-------------|--------|
| Dashboard Principal | Resumen de actividad en tiempo real | ✅ |
| Crear Asignaciones | Asignar brigadas a unidades y rutas | ✅ |
| Generador de Turnos | Crear turnos con fechas y horarios | ✅ |
| Ver Bitácora | Historial de todas las unidades | ✅ |
| Gestión de Brigadas | CRUD de personal | ✅ |
| Gestión de Unidades | CRUD de vehículos | ✅ |
| Movimientos de Brigadas | Reasignar personal entre sedes | ✅ |
| Resumen por Unidad | Estado actual de cada vehículo | ✅ |
| Situaciones Activas | Ver incidentes en curso | ✅ |
| Editar Situaciones | Modificar datos de eventos | ✅ |

**Páginas:** 8

---

### 2.3 COP - Centro de Operaciones (Panel Web)

**Usuarios:** Operadores que monitorean en tiempo real

| Funcionalidad | Descripción | Estado |
|---------------|-------------|--------|
| Mapa en Tiempo Real | Ubicación de unidades con PostGIS | ✅ |
| Lista de Situaciones | Filtros por tipo, estado, fecha | ✅ |
| Eventos Persistentes | Operativos especiales activos | ✅ |
| Situaciones Persistentes | Incidentes de larga duración | ✅ |
| Detalle de Incidente | Ver toda la información y multimedia | ✅ |
| Cerrar Situaciones | Finalizar eventos desde COP | ✅ |

**Páginas:** 4

---

### 2.4 ADMINISTRACIÓN (Panel Web)

**Usuarios:** Administradores del sistema

| Funcionalidad | Descripción | Estado |
|---------------|-------------|--------|
| Panel SUPER_ADMIN | Gestión completa del sistema | ✅ |
| Gestión de Usuarios | Crear, editar, activar/desactivar | ✅ |
| Gestión de Roles | Asignar permisos | ✅ |
| Gestión de Sedes | Configurar ubicaciones | ✅ |
| Gestión de Grupos | G1, G2 y grupos personalizados | ✅ |
| Encargados por Sede | Asignar responsables | ✅ |
| Control de Acceso | Bloquear/desbloquear app | ✅ |
| Log de Auditoría | Historial de cambios | ✅ |
| Configuración General | Parámetros del sistema | ✅ |

**Páginas:** 6

---

### 2.5 DASHBOARD EJECUTIVO (Panel Web)

**Usuarios:** Directivos y gerencia

| Funcionalidad | Descripción | Estado |
|---------------|-------------|--------|
| Estadísticas Generales | KPIs principales | ✅ |
| Métricas por Sede | Comparativa entre ubicaciones | ✅ |
| Situaciones por Tipo | Distribución de eventos | ✅ |
| Situaciones por Día/Hora | Patrones temporales | ✅ |
| Estado de Flota | Disponibilidad de unidades | ✅ |
| Rendimiento de Brigadas | Productividad del personal | ✅ |
| Actividad Reciente | Timeline de eventos | ✅ |
| Gráficas Comparativas | Tendencias y análisis | ✅ |

**Páginas:** 2

---

### 2.6 ACCIDENTOLOGÍA (Backend + Web parcial)

**Usuarios:** Personal de análisis de accidentes

| Funcionalidad | Descripción | Estado |
|---------------|-------------|--------|
| Hojas de Accidente | Registro detallado de siniestros | ✅ |
| Vehículos Involucrados | Datos de cada vehículo | ✅ |
| Personas Involucradas | Conductores, pasajeros, peatones | ✅ |
| Tipos de Accidente | Catálogo configurable | ✅ |
| Estadísticas | Análisis de patrones | ✅ |
| Galería Multimedia | Acceso a fotos/videos | ✅ |

**Endpoints:** 16

---

### 2.7 COMUNICACIÓN SOCIAL (Backend + Web parcial)

**Usuarios:** Equipo de comunicaciones

| Funcionalidad | Descripción | Estado |
|---------------|-------------|--------|
| Plantillas de Mensajes | Templates con variables dinámicas | ✅ |
| Generar Publicaciones | Crear contenido desde situaciones | ✅ |
| Compartir en Redes | Facebook, Twitter, Instagram, WhatsApp, Threads | ✅ |
| Historial de Publicaciones | Registro de lo compartido | ✅ |
| Variables Dinámicas | {tipo}, {ubicacion}, {fecha}, etc. | ✅ |

**Endpoints:** 16

---

### 2.8 NOTIFICACIONES Y ALERTAS

| Funcionalidad | Descripción | Estado |
|---------------|-------------|--------|
| Push Notifications | Firebase Cloud Messaging | ✅ |
| Alertas por Eventos | Notificaciones automáticas | ✅ |
| Configuración de Alertas | Tipos y umbrales | ✅ |
| Historial | Registro de notificaciones | ✅ |
| Panel de Alertas | Ver alertas activas | ✅ |

**Endpoints:** 24

---

## 3. Arquitectura Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIOS                              │
├──────────────────┬──────────────────┬───────────────────────┤
│   App Móvil      │    Panel Web     │     Dashboard         │
│   (Brigadas)     │  (Operaciones)   │    (Directivos)       │
│   React Native   │     React        │      React            │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                    │
         └──────────────────┼────────────────────┘
                            │ HTTPS
                            ▼
              ┌─────────────────────────┐
              │      NGINX / CDN        │
              │   (Load Balancer)       │
              └───────────┬─────────────┘
                          │
              ┌───────────▼─────────────┐
              │    BACKEND API          │
              │   Node.js + Express     │
              │   (Múltiples instancias)│
              └───────────┬─────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ PostgreSQL  │  │    Redis    │  │   Storage   │
│  + PostGIS  │  │   (Cache)   │  │(Fotos/Video)│
│  (Separado) │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘
```

---

## 4. Costos de Operación

### 4.1 Hosting y Servicios (Mensual)

| Servicio | Opción Económica | Opción Empresarial |
|----------|------------------|-------------------|
| Base de Datos PostgreSQL | $25 | $80 |
| Servidor Backend (2 instancias) | $20 | $60 |
| Redis (Cache/Sesiones) | $10 | $25 |
| Hosting Web (CDN) | $20 | $20 |
| Almacenamiento (100GB) | $10 | $30 |
| Monitoreo y Logs | $0 | $25 |
| **TOTAL MENSUAL** | **$85** | **$240** |
| **TOTAL ANUAL** | **$1,020** | **$2,880** |

### 4.2 Almacenamiento Proyectado

| Período | Datos | Multimedia | Total | Costo/mes |
|---------|-------|------------|-------|-----------|
| Año 1 | 2 GB | 100 GB | 102 GB | $10 |
| Año 3 | 6 GB | 350 GB | 356 GB | $25 |
| Año 5 | 10 GB | 600 GB | 610 GB | $40 |
| Año 10 | 20 GB | 1.2 TB | 1.22 TB | $75 |

### 4.3 Costos Únicos

| Concepto | Costo |
|----------|-------|
| Cuenta Apple Developer (iOS) | $99/año |
| Dominio .com/.gt | $15-50/año |
| Certificado SSL | $0 (Let's Encrypt) |
| Cuenta Google Play (Android) | $25 (único) |

---

## 5. Tiempos de Mantenimiento

### 5.1 Actualizaciones Sin Interrupción (0 downtime)

| Tipo de Cambio | Tiempo de Desarrollo | Interrupción |
|----------------|---------------------|--------------|
| Corrección de bug menor | 1-4 horas | 0 segundos |
| Nueva funcionalidad pequeña | 1-3 días | 0 segundos |
| Actualización de seguridad | 1-2 horas | 0 segundos |
| Cambio en interfaz web | Inmediato | 0 segundos |

### 5.2 Actualizaciones con Ventana de Mantenimiento

| Tipo de Cambio | Tiempo | Interrupción |
|----------------|--------|--------------|
| Migración de base de datos compleja | 2-4 horas | 5-15 minutos |
| Cambio de arquitectura mayor | 1-2 semanas | 30-60 minutos |
| Actualización de versión mayor | 1-2 días | 10-30 minutos |

### 5.3 App Móvil

| Acción | Tiempo |
|--------|--------|
| Compilar nueva versión | 15-20 minutos |
| Publicar en Play Store | 1-3 días (revisión) |
| Publicar en App Store | 1-7 días (revisión) |
| Usuarios actualizan | A su conveniencia |

---

## 6. Seguridad Implementada

| Medida | Implementación |
|--------|----------------|
| Autenticación | JWT con refresh tokens |
| Autorización | Roles (BRIGADA, OPERACIONES, COP, ADMIN, SUPER_ADMIN) |
| Encriptación | HTTPS/TLS en tránsito, bcrypt para contraseñas |
| Rate Limiting | 100 requests/15min por IP |
| Protección SQL Injection | Queries parametrizadas |
| Protección XSS | Sanitización de inputs |
| CORS | Dominios permitidos configurables |
| Auditoría | Log de todos los cambios críticos |
| Backups | Automáticos diarios (configurables) |

---

## 7. Escalabilidad

El sistema está diseñado para crecer:

| Métrica | Capacidad Actual | Escalable a |
|---------|------------------|-------------|
| Usuarios concurrentes | 100 | 10,000+ |
| Brigadas activas | 500 | 5,000+ |
| Unidades | 1,000 | 10,000+ |
| Situaciones/día | 10,000 | 100,000+ |
| Almacenamiento | 100 GB | Ilimitado |

---

## 8. Soporte y Mantenimiento

### Incluido en la operación:

- Monitoreo 24/7 del sistema
- Backups automáticos diarios
- Actualizaciones de seguridad
- Corrección de bugs críticos
- Soporte técnico vía tickets

### Desarrollo adicional (cotización aparte):

- Nuevos módulos
- Integraciones con otros sistemas
- Personalizaciones específicas
- Capacitación de usuarios

---

## 9. Próximos Pasos

1. **Semana 1:** Pruebas finales de todos los módulos
2. **Semana 2:** Configurar ambiente de producción
3. **Semana 3:** Migración de datos históricos
4. **Semana 4:** Capacitación de usuarios
5. **Semana 5:** Lanzamiento controlado (piloto)
6. **Semana 6:** Lanzamiento completo

---

## 10. Contacto

Para dudas técnicas o comerciales sobre el proyecto.

---

*Sistema PROVIAL v2.0.0 - Documento de Presentación Ejecutiva*
