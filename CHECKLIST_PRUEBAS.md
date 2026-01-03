# Checklist de Pruebas por Módulo - Sistema PROVIAL

**Instrucciones:** Marca con ✅ las funcionalidades que funcionan correctamente y con ❌ las que tienen problemas. Anota los detalles a corregir en cada sección.

---

## 1. AUTENTICACIÓN (Web + Móvil)

### 1.1 Login Web
| Prueba | Estado | Notas |
|--------|--------|-------|
| Login con credenciales válidas | ☐ | |
| Login con credenciales inválidas (muestra error) | ☐ | |
| Login con campos vacíos (muestra validación) | ☐ | |
| Redirección al dashboard después de login | ☐ | |
| Token se guarda en localStorage | ☐ | |
| Logout cierra sesión correctamente | ☐ | |
| Sesión expira después del tiempo configurado | ☐ | |

**Detalles a corregir:**
```

```

### 1.2 Login Móvil
| Prueba | Estado | Notas |
|--------|--------|-------|
| Login con credenciales válidas | ☐ | |
| Login con credenciales inválidas | ☐ | |
| Campos de validación funcionan | ☐ | |
| Redirección a Home después de login | ☐ | |
| Token se guarda en AsyncStorage | ☐ | |
| Logout cierra sesión | ☐ | |
| Auto-refresh de token funciona | ☐ | |

**Detalles a corregir:**
```

```

---

## 2. BRIGADAS - APP MÓVIL

### 2.1 Pantalla Home
| Prueba | Estado | Notas |
|--------|--------|-------|
| Muestra nombre del usuario | ☐ | |
| Muestra sede asignada | ☐ | |
| Muestra estado de asignación | ☐ | |
| Botones de acciones visibles | ☐ | |
| Navegación a cada sección funciona | ☐ | |

**Detalles a corregir:**
```

```

### 2.2 Mi Asignación
| Prueba | Estado | Notas |
|--------|--------|-------|
| Muestra turno asignado (fecha, hora) | ☐ | |
| Muestra unidad asignada | ☐ | |
| Muestra ruta asignada | ☐ | |
| Muestra compañeros de tripulación | ☐ | |
| Mensaje si no hay asignación | ☐ | |

**Detalles a corregir:**
```

```

### 2.3 Iniciar Salida
| Prueba | Estado | Notas |
|--------|--------|-------|
| Formulario de kilometraje inicial | ☐ | |
| Selector de combustible | ☐ | |
| GPS obtiene ubicación automática | ☐ | |
| Validaciones de campos requeridos | ☐ | |
| Botón de confirmar funciona | ☐ | |
| Crea registro en la BD | ☐ | |
| Redirecciona después de guardar | ☐ | |

**Detalles a corregir:**
```

```

### 2.4 Nueva Situación
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de tipos de situación | ☐ | |
| Selector de kilómetro | ☐ | |
| Selector de sentido (N/S/E/O) | ☐ | |
| GPS automático | ☐ | |
| Campo de observaciones | ☐ | |
| Selector de combustible (opcional) | ☐ | |
| Guarda correctamente | ☐ | |

**Detalles a corregir:**
```

```

### 2.5 Incidente (Formulario Completo)
| Prueba | Estado | Notas |
|--------|--------|-------|
| Tipo de incidente seleccionable | ☐ | |
| Datos de ubicación (km, sentido) | ☐ | |
| Selector de departamento | ☐ | |
| Selector de municipio (filtra por depto) | ☐ | |
| Agregar vehículos involucrados | ☐ | |
| Agregar personas involucradas | ☐ | |
| Selector de autoridades | ☐ | |
| Selector de cuerpos de socorro | ☐ | |
| Daños materiales (checkbox) | ☐ | |
| Daños a infraestructura | ☐ | |
| Campo de obstrucción | ☐ | |
| Observaciones generales | ☐ | |
| Guarda todos los datos | ☐ | |

**Detalles a corregir:**
```

```

### 2.6 Captura de Multimedia
| Prueba | Estado | Notas |
|--------|--------|-------|
| Botón de tomar foto funciona | ☐ | |
| Cámara se abre correctamente | ☐ | |
| Foto se guarda localmente | ☐ | |
| Foto se sube al servidor | ☐ | |
| Barra de progreso de subida | ☐ | |
| Grabar video funciona | ☐ | |
| Video se sube al servidor | ☐ | |
| Límite de 30 segundos para video | ☐ | |
| Seleccionar de galería funciona | ☐ | |
| Muestra las 3 fotos obligatorias | ☐ | |
| Indicador de completitud | ☐ | |

**Detalles a corregir:**
```

```

### 2.7 Registro de Combustible
| Prueba | Estado | Notas |
|--------|--------|-------|
| Selector visual de nivel (VACIO a LLENO) | ☐ | |
| Guarda el registro | ☐ | |
| Se asocia a la situación actual | ☐ | |

**Detalles a corregir:**
```

```

### 2.8 Cambio de Ruta
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de rutas disponibles | ☐ | |
| Seleccionar nueva ruta | ☐ | |
| Guarda el cambio | ☐ | |
| Actualiza la ruta activa | ☐ | |

**Detalles a corregir:**
```

```

### 2.9 Ingreso a Sede
| Prueba | Estado | Notas |
|--------|--------|-------|
| Formulario de kilometraje | ☐ | |
| Selector de combustible | ☐ | |
| GPS de ubicación | ☐ | |
| Guarda el registro | ☐ | |

**Detalles a corregir:**
```

```

### 2.10 Finalizar Día
| Prueba | Estado | Notas |
|--------|--------|-------|
| Muestra resumen de la jornada | ☐ | |
| Confirmar finalización | ☐ | |
| Cierra la salida activa | ☐ | |
| Genera snapshot en bitácora histórica | ☐ | |

**Detalles a corregir:**
```

```

### 2.11 Bitácora Personal
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de situaciones del día | ☐ | |
| Muestra hora de cada evento | ☐ | |
| Muestra tipo de situación | ☐ | |
| Muestra ubicación | ☐ | |
| Ordenado cronológicamente | ☐ | |

**Detalles a corregir:**
```

```

### 2.12 Inspección 360
| Prueba | Estado | Notas |
|--------|--------|-------|
| Carga plantilla de inspección | ☐ | |
| Checklist de items | ☐ | |
| Captura de fotos | ☐ | |
| Captura de firma | ☐ | |
| Guarda inspección | ☐ | |

**Detalles a corregir:**
```

```

---

## 3. OPERACIONES - PANEL WEB

### 3.1 Dashboard Principal
| Prueba | Estado | Notas |
|--------|--------|-------|
| Carga estadísticas | ☐ | |
| Muestra unidades activas | ☐ | |
| Muestra situaciones del día | ☐ | |
| Gráficas se renderizan | ☐ | |
| Actualización de datos | ☐ | |

**Detalles a corregir:**
```

```

### 3.2 Crear Asignación
| Prueba | Estado | Notas |
|--------|--------|-------|
| Selector de fecha | ☐ | |
| Selector de turno | ☐ | |
| Lista de unidades disponibles | ☐ | |
| Lista de brigadas disponibles | ☐ | |
| Asignar piloto | ☐ | |
| Asignar copiloto (opcional) | ☐ | |
| Asignar ruta | ☐ | |
| Guardar asignación | ☐ | |
| Validación de disponibilidad | ☐ | |

**Detalles a corregir:**
```

```

### 3.3 Generador de Turnos
| Prueba | Estado | Notas |
|--------|--------|-------|
| Crear nuevo turno | ☐ | |
| Seleccionar rango de fechas | ☐ | |
| Configurar horarios | ☐ | |
| Asociar a sede | ☐ | |
| Ver turnos existentes | ☐ | |
| Editar turno | ☐ | |
| Eliminar turno | ☐ | |

**Detalles a corregir:**
```

```

### 3.4 Bitácora General
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de todas las situaciones | ☐ | |
| Filtro por fecha | ☐ | |
| Filtro por unidad | ☐ | |
| Filtro por tipo | ☐ | |
| Filtro por estado | ☐ | |
| Ver detalle de situación | ☐ | |
| Editar situación | ☐ | |
| Paginación funciona | ☐ | |

**Detalles a corregir:**
```

```

### 3.5 Gestión de Brigadas
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de brigadas | ☐ | |
| Crear nueva brigada | ☐ | |
| Editar brigada | ☐ | |
| Asignar a sede | ☐ | |
| Asignar a grupo | ☐ | |
| Activar/desactivar | ☐ | |
| Búsqueda por nombre | ☐ | |

**Detalles a corregir:**
```

```

### 3.6 Gestión de Unidades
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de unidades | ☐ | |
| Crear nueva unidad | ☐ | |
| Editar unidad | ☐ | |
| Asignar a sede | ☐ | |
| Tipo de unidad | ☐ | |
| Activar/desactivar | ☐ | |
| Ver historial de unidad | ☐ | |

**Detalles a corregir:**
```

```

### 3.7 Movimientos de Brigadas
| Prueba | Estado | Notas |
|--------|--------|-------|
| Ver movimientos pendientes | ☐ | |
| Crear nuevo movimiento | ☐ | |
| Seleccionar brigada | ☐ | |
| Seleccionar sede destino | ☐ | |
| Aprobar movimiento | ☐ | |
| Rechazar movimiento | ☐ | |
| Historial de movimientos | ☐ | |

**Detalles a corregir:**
```

```

### 3.8 Resumen de Unidades
| Prueba | Estado | Notas |
|--------|--------|-------|
| Tabla de todas las unidades | ☐ | |
| Estado actual (en ruta, en sede, etc) | ☐ | |
| Última ubicación | ☐ | |
| Tripulación asignada | ☐ | |
| Combustible reportado | ☐ | |
| Kilometraje actual | ☐ | |

**Detalles a corregir:**
```

```

---

## 4. COP - CENTRO DE OPERACIONES

### 4.1 Mapa en Tiempo Real
| Prueba | Estado | Notas |
|--------|--------|-------|
| Mapa carga correctamente | ☐ | |
| Marcadores de unidades | ☐ | |
| Marcadores de situaciones | ☐ | |
| Click en marcador muestra info | ☐ | |
| Filtros por tipo | ☐ | |
| Actualización automática | ☐ | |
| Zoom funciona | ☐ | |
| Diferentes capas/vistas | ☐ | |

**Detalles a corregir:**
```

```

### 4.2 Lista de Situaciones
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de situaciones activas | ☐ | |
| Filtro por tipo | ☐ | |
| Filtro por fecha | ☐ | |
| Filtro por estado | ☐ | |
| Ver detalle completo | ☐ | |
| Ver multimedia adjunta | ☐ | |
| Cerrar situación | ☐ | |

**Detalles a corregir:**
```

```

### 4.3 Eventos Persistentes
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de eventos activos | ☐ | |
| Crear nuevo evento | ☐ | |
| Editar evento | ☐ | |
| Asignar unidades al evento | ☐ | |
| Cerrar evento | ☐ | |
| Historial de eventos | ☐ | |

**Detalles a corregir:**
```

```

### 4.4 Situaciones Persistentes
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de situaciones de larga duración | ☐ | |
| Filtros | ☐ | |
| Ver progreso | ☐ | |
| Actualizar estado | ☐ | |
| Cerrar situación | ☐ | |

**Detalles a corregir:**
```

```

---

## 5. ADMINISTRACIÓN

### 5.1 Panel Super Admin
| Prueba | Estado | Notas |
|--------|--------|-------|
| Acceso solo para SUPER_ADMIN | ☐ | |
| Estadísticas del sistema | ☐ | |
| Acceso a todas las secciones | ☐ | |

**Detalles a corregir:**
```

```

### 5.2 Gestión de Usuarios
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de usuarios | ☐ | |
| Crear nuevo usuario | ☐ | |
| Editar usuario | ☐ | |
| Cambiar contraseña | ☐ | |
| Asignar rol | ☐ | |
| Asignar sede | ☐ | |
| Activar/desactivar usuario | ☐ | |
| Búsqueda de usuarios | ☐ | |

**Detalles a corregir:**
```

```

### 5.3 Gestión de Sedes
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de sedes | ☐ | |
| Crear nueva sede | ☐ | |
| Editar sede | ☐ | |
| Configurar ubicación | ☐ | |
| Asignar encargado | ☐ | |
| Activar/desactivar | ☐ | |

**Detalles a corregir:**
```

```

### 5.4 Gestión de Grupos
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de grupos (G1, G2, etc) | ☐ | |
| Ver miembros de grupo | ☐ | |
| Editar grupo | ☐ | |
| Asignar brigadas a grupo | ☐ | |

**Detalles a corregir:**
```

```

### 5.5 Control de Acceso
| Prueba | Estado | Notas |
|--------|--------|-------|
| Bloquear acceso a app móvil | ☐ | |
| Desbloquear acceso | ☐ | |
| Ver usuarios bloqueados | ☐ | |
| Motivo de bloqueo | ☐ | |

**Detalles a corregir:**
```

```

### 5.6 Log de Auditoría
| Prueba | Estado | Notas |
|--------|--------|-------|
| Lista de cambios | ☐ | |
| Filtro por tipo de cambio | ☐ | |
| Filtro por usuario | ☐ | |
| Filtro por fecha | ☐ | |
| Ver detalle del cambio | ☐ | |
| Valores anteriores vs nuevos | ☐ | |

**Detalles a corregir:**
```

```

---

## 6. DASHBOARD EJECUTIVO

### 6.1 Estadísticas Generales
| Prueba | Estado | Notas |
|--------|--------|-------|
| Total de situaciones | ☐ | |
| Situaciones por tipo | ☐ | |
| Unidades activas | ☐ | |
| Brigadas en servicio | ☐ | |
| Gráfica de tendencia | ☐ | |

**Detalles a corregir:**
```

```

### 6.2 Métricas por Sede
| Prueba | Estado | Notas |
|--------|--------|-------|
| Selector de sede | ☐ | |
| Estadísticas de la sede | ☐ | |
| Comparativa entre sedes | ☐ | |
| Rendimiento de brigadas | ☐ | |

**Detalles a corregir:**
```

```

### 6.3 Análisis Temporal
| Prueba | Estado | Notas |
|--------|--------|-------|
| Situaciones por día | ☐ | |
| Situaciones por hora | ☐ | |
| Patrones de actividad | ☐ | |
| Selector de rango de fechas | ☐ | |

**Detalles a corregir:**
```

```

---

## 7. ACCIDENTOLOGÍA (Si aplica)

| Prueba | Estado | Notas |
|--------|--------|-------|
| Crear hoja de accidente | ☐ | |
| Editar hoja | ☐ | |
| Agregar vehículos | ☐ | |
| Agregar personas | ☐ | |
| Ver estadísticas | ☐ | |
| Exportar datos | ☐ | |

**Detalles a corregir:**
```

```

---

## 8. COMUNICACIÓN SOCIAL (Si aplica)

| Prueba | Estado | Notas |
|--------|--------|-------|
| Crear plantilla | ☐ | |
| Editar plantilla | ☐ | |
| Variables dinámicas funcionan | ☐ | |
| Generar publicación | ☐ | |
| Compartir en redes | ☐ | |
| Historial de publicaciones | ☐ | |

**Detalles a corregir:**
```

```

---

## 9. PRUEBAS DE RENDIMIENTO

| Prueba | Estado | Notas |
|--------|--------|-------|
| Tiempo de carga inicial web (<3s) | ☐ | |
| Tiempo de carga app móvil (<2s) | ☐ | |
| Respuesta de API (<500ms) | ☐ | |
| Subida de fotos (<10s) | ☐ | |
| Subida de video (<30s) | ☐ | |
| Múltiples usuarios simultáneos | ☐ | |

**Detalles a corregir:**
```

```

---

## 10. PRUEBAS DE DISPOSITIVOS

### Android
| Dispositivo | Versión | Estado | Notas |
|-------------|---------|--------|-------|
| | | ☐ | |
| | | ☐ | |
| | | ☐ | |

### iOS (si aplica)
| Dispositivo | Versión | Estado | Notas |
|-------------|---------|--------|-------|
| | | ☐ | |
| | | ☐ | |

### Navegadores Web
| Navegador | Versión | Estado | Notas |
|-----------|---------|--------|-------|
| Chrome | | ☐ | |
| Firefox | | ☐ | |
| Safari | | ☐ | |
| Edge | | ☐ | |

---

## RESUMEN DE PRUEBAS

| Módulo | Total Pruebas | Pasadas | Fallidas | % Éxito |
|--------|---------------|---------|----------|---------|
| Autenticación | | | | |
| Brigadas (Móvil) | | | | |
| Operaciones (Web) | | | | |
| COP | | | | |
| Administración | | | | |
| Dashboard | | | | |
| Accidentología | | | | |
| Comunicación Social | | | | |
| **TOTAL** | | | | |

---

## LISTA PRIORIZADA DE CORRECCIONES

### Críticas (Bloquean uso)
1.
2.
3.

### Importantes (Afectan experiencia)
1.
2.
3.

### Menores (Mejoras de UX)
1.
2.
3.

### Cosméticas (Detalles visuales)
1.
2.
3.

---

**Fecha de pruebas:** _______________
**Realizado por:** _______________
**Versión probada:** 2.0.0

---

*Sistema PROVIAL - Checklist de Pruebas v1.0*
