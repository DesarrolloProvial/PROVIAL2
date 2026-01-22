# Auditoría de Situaciones - Uso de `auditoria_log`

## 📊 Sistema de Auditoría para Situaciones

**Requisito**: Las situaciones cerradas SÍ se pueden editar, pero TODO cambio debe quedar registrado.

**IMPORTANTE**: Ya existe la tabla `auditoria_log` en la base de datos. Se utilizará para auditar cambios en situaciones.

### Tabla Existente: `auditoria_log`

```sql
-- TABLA YA EXISTENTE - NO CREAR NUEVA
CREATE TABLE auditoria_log (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuario(id),
  accion VARCHAR(50) NOT NULL,           -- 'CREADA', 'EDITADA', 'CERRADA'
  tabla_afectada VARCHAR(100),            -- 'situacion'
  registro_id BIGINT,                     -- ID de la situación
  datos_anteriores JSONB,                 -- Estado anterior completo
  datos_nuevos JSONB,                     -- Estado nuevo completo  
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Cómo Usar para Situaciones

Para cada cambio en una situación, insertar registro con:
- `accion`: 'CREADA', 'EDITADA', 'CERRADA'
- `tabla_afectada`: 'situacion'
- `registro_id`: el ID de la situación
- `datos_anteriores` y `datos_nuevos`: Estados completos en JSONB

### Ejemplos de Inserción

#### 1. Al crear situación:
```sql
INSERT INTO auditoria_log (
  usuario_id, accion, tabla_afectada, registro_id,
  datos_anteriores, datos_nuevos, ip_address
) VALUES (
  17000,
  'CREADA',
  'situacion',
  567,
  NULL,  -- no había datos antes
  '{"tipo": "HECHO_TRANSITO", "km": 50, "ruta_id": 86, "estado": "ACTIVA"}'::jsonb,
  '192.168.1.100'
);
```

#### 2. Al editar situación:
```sql
INSERT INTO auditoria_log (
  usuario_id, accion, tabla_afectada, registro_id,
  datos_anteriores, datos_nuevos
) VALUES (
  17001,
  'EDITADA',
  'situacion',
  567,
  '{"km": 50, "observaciones": "Vehículo obstruye carril"}'::jsonb,
  '{"km": 52, "observaciones": "Vehículo obstruye carril. Piloto con lesiones."}'::jsonb
);
```

#### 3. Al cerrar situación:
```sql
INSERT INTO auditoria_log (
  usuario_id, accion, tabla_afectada, registro_id,
  datos_anteriores, datos_nuevos
) VALUES (
  17000,
  'CERRADA',
  'situacion',
  567,
  '{"estado": "ACTIVA"}'::jsonb,
  '{"estado": "CERRADA"}'::jsonb
);
```

### Implementación Backend

#### Middleware de Auditoría

```typescript
// services/auditoria.service.ts
export async function registrarAuditoriaSituacion(
  situacionId: number,
  usuarioId: number,
  accion: 'CREADA' | 'EDITADA' | 'CERRADA',
  datosAnteriores: any | null,
  datosNuevos: any,
  req?: Request
) {
  await db.none(
    `INSERT INTO auditoria_log (
       usuario_id, accion, tabla_afectada, registro_id,
       datos_anteriores, datos_nuevos, ip_address, user_agent
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      usuarioId,
      accion,
      'situacion',
      situacionId,
      datosAnteriores,  // JSONB o NULL
      datosNuevos,      // JSONB
      req?.ip || null,
      req?.get('user-agent') || null
    ]
  );
}
```

#### Uso en Controlador

```typescript
// controllers/situacion.controller.ts
import { registrarAuditoriaSituacion } from '../services/auditoria.service';

// Crear situación
export async function createSituacion(req: Request, res: Response) {
  const datos = req.body;
  
  const situacion = await SituacionModel.create(datos);
  
  // Registrar creación
  await registrarAuditoriaSituacion(
    situacion.id,
    req.user!.userId,
    'CREADA',
    null,          // no había datos antes
    situacion,     // estado nuevo
    req
  );
  
  res.status(201).json(situacion);
}

// Editar situación
export async function updateSituacion(req: Request, res: Response) {
  const { id } = req.params;
  const datosNuevos = req.body;
  
  // 1. Obtener estado actual (antes de editar)
  const situacionAntes = await SituacionModel.findById(id);
  
  // 2. Actualizar
  await SituacionModel.update(id, datosNuevos);
  
  // 3. Obtener estado nuevo (después de editar)
  const situacionDespues = await SituacionModel.findById(id);
  
  // 4. Registrar en auditoría
  await registrarAuditoriaSituacion(
    id,
    req.user!.userId,
    'EDITADA',
    situacionAntes,    // estado antes
    situacionDespues,  // estado después
    req
  );
  
  res.json({ success: true });
}

// Cerrar situación
export async function cerrarSituacion(req: Request, res: Response) {
  const { id } = req.params;
  
  const situacionAntes = await SituacionModel.findById(id);
  
  await SituacionModel.update(id, { estado: 'CERRADA' });
  
  const situacionDespues = await SituacionModel.findById(id);
  
  await registrarAuditoriaSituacion(
    id,
    req.user!.userId,
    'CERRADA',
    situacionAntes,
    situacionDespues,
    req
  );
  
  res.json({ success: true });
}
```

### Consultar Historial

#### Endpoint

```typescript
GET /api/situaciones/:id/historial

// Implementación
export async function getHistorialSituacion(req: Request, res: Response) {
  const { id } = req.params;
  
  const historial = await db.manyOrNone(
    `SELECT 
       a.id,
       a.accion,
       a.datos_anteriores,
       a.datos_nuevos,
       a.created_at,
       u.id as usuario_id,
       u.nombres || ' ' || u.apellidos as usuario_nombre,
       tt.rol_tripulacion
     FROM auditoria_log a
     LEFT JOIN usuario u ON a.usuario_id = u.id
     LEFT JOIN tripulacion_turno tt ON tt.usuario_id = u.id
     WHERE a.tabla_afectada = 'situacion'
       AND a.registro_id = $1
     ORDER BY a.created_at DESC`,
    [id]
  );
  
  res.json({ situacion_id: id, historial });
}
```

#### Response

```json
{
  "situacion_id": 567,
  "historial": [
    {
      "id": 1235,
      "accion": "EDITADA",
      "datos_anteriores": { "km": 50 },
      "datos_nuevos": { "km": 52 },
      "created_at": "2026-01-21T15:30:00Z",
      "usuario_id": 17000,
      "usuario_nombre": "Lisardo García",
      "rol_tripulacion": "COMANDANTE"
    },
    {
      "id": 1234,
      "accion": "CERRADA",
      "datos_anteriores": { "estado": "ACTIVA" },
      "datos_nuevos": { "estado": "CERRADA" },
      "created_at": "2026-01-21T14:45:00Z",
      "usuario_id": 17000,
      "usuario_nombre": "Lisardo García",
      "rol_tripulacion": "COMANDANTE"
    },
    {
      "id": 1233,
      "accion": "CREADA",
      "datos_anteriores": null,
      "datos_nuevos": { "tipo": "HECHO_TRANSITO", "km": 50 },
      "created_at": "2026-01-21T14:30:00Z",
      "usuario_id": 17000,
      "usuario_nombre": "Lisardo García",
      "rol_tripulacion": "COMANDANTE"
    }
  ]
}
```

### Vista en Bitácora (COP)

```
┌────────────────────────────────────────────────────────┐
│ Situación #SIT-2026-0234 - HECHO_TRANSITO             │
│ Estado: CERRADA                                        │
│ Unidad: 030 | CA-9 Norte Km 52                        │
├────────────────────────────────────────────────────────┤
│ [Editar] [Ver Multimedia] [📋 Historial]              │
└────────────────────────────────────────────────────────┘

Al presionar [Historial]:

┌────────────────────────────────────────────────────────┐
│ 📋 Historial de Cambios - Situación #567              │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 21/01/2026 15:30 - EDITADA                            │
│ Por: Lisardo García (Comandante)                      │
│ Cambios:                                               │
│   • km: 50 → 52                                       │
│   • observaciones: modificadas                        │
│                                                        │
│ ───────────────────────────────────────────────────── │
│                                                        │
│ 21/01/2026 14:45 - CERRADA                            │
│ Por: Lisardo García (Comandante)                      │
│   • estado: ACTIVA → CERRADA                          │
│                                                        │
│ ───────────────────────────────────────────────────── │
│                                                        │
│ 21/01/2026 14:35 - EDITADA                            │
│ Por: Mario López (Piloto)                             │
│   • Agregó: vehículos[0] = P123ABC                    │
│                                                        │
│ ───────────────────────────────────────────────────── │
│                                                        │
│ 21/01/2026 14:30 - CREADA                             │
│ Por: Lisardo García (Comandante)                      │
│   • Situación creada                                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Beneficios

1. ✅ **Tabla existente** - No crear nueva, usar `auditoria_log`
2. ✅ **Genérica** - Sirve para auditar cualquier tabla
3. ✅ **Completa** - Guarda estados completos (antes/después)
4. ✅ **Trazabilidad** - Quién, qué, cuándo
5. ✅ **IP y User-Agent** - Info adicional de seguridad

---

**Fin del documento**
