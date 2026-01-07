# Script de Reset de Base de Datos

## 🎯 Propósito

Este script te permite **limpiar datos de prueba** sin perder la configuración base del sistema.

---

## ✅ Datos que SE MANTIENEN

- ✅ **Usuarios y brigadas** (información personal, credenciales)
- ✅ **Unidades** (vehículos y su información)
- ✅ **Rutas** (carreteras configuradas)
- ✅ **Sedes** (ubicaciones)
- ✅ **Departamentos** (estructura organizacional)
- ✅ **Configuraciones del sistema**

---

## ❌ Datos que SE ELIMINAN

- ❌ **Turnos** y asignaciones
- ❌ **Salidas de unidad**
- ❌ **Situaciones** (incidentes, asistencias, etc.)
- ❌ **Eventos persistentes** (cierres de carretera, etc.)
- ❌ **Movimientos de unidad** (historial GPS)
- ❌ **Registros de combustible**
- ❌ **Avisos**
- ❌ **Tripulaciones**

Además, resetea el estado operacional de las unidades:
- Ubicación GPS → NULL
- En servicio → false
- Odómetro → valor inicial
- Combustible actual → NULL

---

## 🚀 Cómo Usar

### Opción 1: Ejecutar con Node.js (Recomendado)

```bash
# Desde la carpeta backend
cd backend
node src/scripts/reset_database.js
```

**Ventajas:**
- ✅ Muestra tablas con conteos antes/después
- ✅ Verifica que datos maestros se preservan
- ✅ Manejo de errores con rollback automático

### Opción 2: Ejecutar SQL directamente

```bash
# Conectar a Railway
psql postgresql://postgres:password@host:port/database

# Copiar y pegar el contenido de reset_operational_data.sql
```

---

## 📊 Salida Esperada

```
🚀 Iniciando script de reset...

🔗 Conectando a la base de datos...
✅ Conexión establecida
🔄 Iniciando reset de datos operacionales...

📊 === CONTEO ANTES DEL RESET ===
┌─────────┬────────────────────────┬───────────┐
│ (index) │         tabla          │ registros │
├─────────┼────────────────────────┼───────────┤
│    0    │       'Avisos'         │    '5'    │
│    1    │    'Asignaciones'      │   '12'    │
│    2    │ 'Eventos Persistentes' │    '2'    │
│    3    │     'Movimientos'      │   '45'    │
│    4    │ 'Registros Combustible'│    '8'    │
│    5    │      'Salidas'         │    '6'    │
│    6    │    'Situaciones'       │   '15'    │
│    7    │   'Tripulaciones'      │   '24'    │
│    8    │      'Turnos'          │    '4'    │
└─────────┴────────────────────────┴───────────┘

🗑️  Eliminando datos operacionales...
   ✅ Avisos eliminados
   ✅ Registros de combustible eliminados
   ✅ Movimientos eliminados
   ✅ Eventos persistentes eliminados
   ✅ Situaciones eliminadas
   ✅ Salidas eliminadas
   ✅ Tripulaciones eliminadas
   ✅ Asignaciones eliminadas
   ✅ Turnos eliminados
   ✅ 3 unidades reseteadas

📊 === CONTEO DESPUÉS DEL RESET ===
┌─────────┬────────────────────────┬───────────┐
│ (index) │         tabla          │ registros │
├─────────┼────────────────────────┼───────────┤
│    0    │       'Avisos'         │    '0'    │
│    1    │    'Asignaciones'      │    '0'    │
│    2    │ 'Eventos Persistentes' │    '0'    │
│    3    │     'Movimientos'      │    '0'    │
│    4    │ 'Registros Combustible'│    '0'    │
│    5    │      'Salidas'         │    '0'    │
│    6    │    'Situaciones'       │    '0'    │
│    7    │   'Tripulaciones'      │    '0'    │
│    8    │      'Turnos'          │    '0'    │
└─────────┴────────────────────────┴───────────┘

📊 === DATOS MAESTROS PRESERVADOS ===
┌─────────┬─────────────────┬───────────┐
│ (index) │      tabla      │ registros │
├─────────┼─────────────────┼───────────┤
│    0    │ 'Departamentos' │    '8'    │
│    1    │    'Rutas'      │   '25'    │
│    2    │    'Sedes'      │    '3'    │
│    3    │   'Unidades'    │   '45'    │
│    4    │   'Usuarios'    │  '120'    │
└─────────┴─────────────────┴───────────┘

🎉 Reset completado exitosamente
✅ Datos operacionales eliminados
✅ Datos maestros preservados

✅ Script finalizado exitosamente
```

---

## ⚠️ Advertencias

### 🚨 IMPORTANTE

1. **Backup recomendado:** Aunque el script preserva datos maestros, es buena práctica hacer backup antes de ejecutar
2. **No reversible:** Una vez ejecutado, los datos operacionales no se pueden recuperar
3. **Producción:** Ten mucho cuidado al ejecutar en producción

### 💡 Cuándo Usar

✅ **Usar cuando:**
- Terminas una sesión de pruebas
- Quieres empezar con datos limpios
- Necesitas probar flujos desde cero
- Datos de prueba están desordenados

❌ **NO usar cuando:**
- Hay operaciones reales en curso
- Necesitas mantener historial
- Estás en producción con datos reales

---

## 🔄 Flujo de Trabajo Recomendado

1. **Hacer pruebas** (crear turnos, asignaciones, salidas, etc.)
2. **Ejecutar reset** cuando termines
3. **Verificar** que datos maestros están intactos
4. **Continuar** con nuevas pruebas

---

## 🛠️ Personalización

Si necesitas **preservar más datos**, edita el script y comenta las líneas de DELETE correspondientes:

```javascript
// await client.query('DELETE FROM situacion');  // ← Comentar para mantener situaciones
```

Si necesitas **eliminar más datos**, agrega nuevas líneas DELETE:

```javascript
await client.query('DELETE FROM mi_tabla_custom');
console.log('   ✅ Mi tabla eliminada');
```

---

## 📝 Archivos

- **SQL:** `reset_operational_data.sql` - Para ejecutar manualmente
- **JavaScript:** `backend/src/scripts/reset_database.js` - Para ejecutar con Node.js

---

## ❓ Troubleshooting

### Error: "DATABASE_URL no está definida"
**Solución:** Verifica que tu archivo `.env` tenga `DATABASE_URL` configurado

### Error: "Cannot find module 'pg'"
**Solución:** Ejecuta `npm install` en la carpeta `backend`

### Error: "violates foreign key constraint"
**Solución:** El script ya maneja el orden correcto de eliminación. Si persiste, revisa que no haya tablas custom con foreign keys.

---

## ✅ Verificación Manual

Después de ejecutar, puedes verificar manualmente:

```sql
-- Ver que no hay datos operacionales
SELECT COUNT(*) FROM turno;           -- Debe ser 0
SELECT COUNT(*) FROM asignacion_unidad; -- Debe ser 0
SELECT COUNT(*) FROM situacion;       -- Debe ser 0

-- Ver que datos maestros existen
SELECT COUNT(*) FROM usuario;         -- Debe ser > 0
SELECT COUNT(*) FROM unidad;          -- Debe ser > 0
SELECT COUNT(*) FROM ruta;            -- Debe ser > 0
```
