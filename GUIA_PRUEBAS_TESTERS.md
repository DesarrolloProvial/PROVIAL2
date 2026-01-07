# Guía de Pruebas - Sistema PROVIAL

## Acceso al Sistema

**Contraseña universal para todos los usuarios:** `provial123`

### URLs de Acceso
- **Web:** https://provial-6pp77ghp6-yorfads-projects.vercel.app
- **API:** https://provial-production.up.railway.app/api

---

## Usuarios por Departamento

### 1. SUPER_ADMIN (Administración Total)
| Usuario | Nombre |
|---------|--------|
| `admin` | Administrador Sistema |
| `19109` | Morales Mejía, Yair Alexander |

**Qué puede hacer:**
- Acceso total al sistema
- Crear/editar usuarios, roles, sedes
- Ver todas las sedes y operaciones
- Configurar el sistema

**Página inicial:** `/super-admin`

---

### 2. OPERACIONES (Gestión de Turnos)
| Usuario | Nombre |
|---------|--------|
| `operaciones` | Operaciones Central |

**Qué puede hacer:**
- Crear turnos y asignaciones de unidades
- Asignar tripulación a unidades
- Ver estado de todas las unidades
- Gestionar situaciones activas

**Página inicial:** `/operaciones`

---

### 3. COP (Centro de Operaciones)
| Usuario | Nombre |
|---------|--------|
| `cop.admin` | Administrador COP |
| `cop.test` | Usuario COP Pruebas |

**Qué puede hacer:**
- Monitorear situaciones en tiempo real
- Ver mapa con ubicación de unidades
- Gestionar situaciones persistentes
- Comunicarse con brigadas

**Página inicial:** `/dashboard`

---

### 4. ADMIN (Administración de Sede)
| Usuario | Nombre |
|---------|--------|
| `admin.test` | Usuario Admin |

**Qué puede hacer:**
- Gestionar usuarios de su sede
- Ver reportes de su sede
- Configurar parámetros de sede

**Página inicial:** `/operaciones`

---

### 5. MANDOS (Supervisión)
| Usuario | Nombre |
|---------|--------|
| `mandos` | Usuario Mandos |
| `mandos.test` | Usuario Mandos Test |

**Qué puede hacer:**
- Ver dashboard ejecutivo
- Monitorear operaciones
- Ver reportes y estadísticas

**Página inicial:** `/dashboard-ejecutivo`

---

### 6. ACCIDENTOLOGIA
| Usuario | Nombre |
|---------|--------|
| `accidentologia` | Usuario Accidentología |
| `accidentologia.test` | Usuario Accidentologia Test |

**Qué puede hacer:**
- Registrar hojas de accidentología
- Ver historial de accidentes
- Generar reportes de accidentes

**Página inicial:** `/dashboard-ejecutivo`

---

### 7. COMUNICACION_SOCIAL
| Usuario | Nombre |
|---------|--------|
| `comunicacion.test` | Usuario Comunicacion Social Test |

**Qué puede hacer:**
- Ver situaciones para comunicados
- Gestionar publicaciones
- Acceder a información para prensa

**Página inicial:** `/dashboard-ejecutivo`

---

### 8. BRIGADA (App Móvil)
| Usuario | Nombre |
|---------|--------|
| `00001` | Agente Brigada 01 |
| `10005` | Calderon Rodriguez Gerson Noe |
| `10013` | Gonzales Cardona Luis Alberto |
| `10025` | Monzon Morales Mitsiu Yonathan |
| `10032` | Ramos Cinto Rodelfi Adelaido |

*Hay 414 usuarios brigada disponibles*

**Qué puede hacer (App Móvil):**
- Ver su asignación del día
- Marcar salida/entrada de turno
- Reportar situaciones con fotos
- Ver mapa de su ruta
- Registrar inspección 360 del vehículo

---

## Flujo de Pruebas Sugerido

### Prueba 1: Crear una Asignación (Web)
1. Ingresar como `operaciones` / `provial123`
2. Click en "Nueva Asignación"
3. Seleccionar fecha (mañana)
4. Seleccionar una unidad disponible
5. Seleccionar ruta
6. Agregar tripulación (buscar brigadas por nombre)
7. Designar un comandante
8. Guardar

### Prueba 2: Ver Asignación en App Móvil
1. Instalar APK en teléfono Android
2. Ingresar con un usuario brigada que fue asignado
3. Ver detalles de la asignación
4. Probar "Marcar Salida" (si es el día correcto)

### Prueba 3: Monitoreo COP (Web)
1. Ingresar como `cop.admin` / `provial123`
2. Ver dashboard con situaciones activas
3. Ver mapa (si hay unidades en ruta)

### Prueba 4: Administración (Web)
1. Ingresar como `admin` / `provial123`
2. Ir a Super Admin
3. Ver lista de usuarios
4. Ver configuración de sedes

---

## App Móvil (Android)

### Instalación
1. Descargar APK (link proporcionado por separado)
2. En el teléfono: Configuración → Seguridad → Permitir fuentes desconocidas
3. Instalar el APK
4. Abrir "Provial Brigadas"

### Funciones Principales
- **Mi Asignación:** Ver turno asignado para hoy
- **Marcar Salida:** Iniciar turno (registra hora y ubicación)
- **Reportar Situación:** Crear reporte con fotos y ubicación
- **Marcar Entrada:** Finalizar turno

### Notas
- Requiere permisos de ubicación y cámara
- Funciona solo con usuarios rol BRIGADA
- Necesita conexión a internet

---

## Reportar Problemas

Si encuentras un error, anota:
1. Usuario con el que ingresaste
2. Qué acción intentaste hacer
3. Qué mensaje de error apareció
4. Captura de pantalla si es posible

---

## Resumen del Sistema

| Módulo | Plataforma | Roles con Acceso |
|--------|------------|------------------|
| Gestión de Turnos | Web | OPERACIONES, ADMIN, SUPER_ADMIN |
| Dashboard COP | Web | COP, MANDOS |
| Administración | Web | ADMIN, SUPER_ADMIN |
| Dashboard Ejecutivo | Web | MANDOS, ACCIDENTOLOGIA, COMUNICACION_SOCIAL |
| App Brigadas | Móvil (Android) | BRIGADA |

**Total de usuarios activos:** 425
- 414 Brigadas
- 11 Usuarios administrativos
