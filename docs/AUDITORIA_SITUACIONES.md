# Auditoría de Situaciones - Registro de Cambios

## 📊 Sistema de Auditoría para Situaciones Cerradas

**Requisito**: Las situaciones cerradas SÍ se pueden editar, pero TODO cambio debe quedar registrado.

### Tabla de Auditoría

```sql
CREATE TABLE situacion_auditoria (
  id SERIAL PRIMARY KEY,
  situacion_id INTEGER REFERENCES situacion(id) NOT NULL,
  usuario_id INTEGER REFERENCES usuario(id) NOT NULL,
  accion TEXT NOT NULL,  -- 'CREADA', 'EDITADA', 'CERRADA', 'REABIERTA'
  campos_modificados JSONB,  -- { campo: { antes: valor_anterior, despues: valor_nuevo } }
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT check_accion CHECK (accion IN ('CREADA', 'EDITADA', 'CERRADA', 'REABIERTA'))
);

CREATE INDEX idx_auditoria_situacion ON situacion_auditoria(situacion_id);
CREATE INDEX idx_auditoria_usuario ON situacion_auditoria(usuario_id);
CREATE INDEX idx_auditoria_created ON situacion_auditoria(created_at);
CREATE INDEX idx_auditoria_accion ON situacion_auditoria(accion);
```

### Tipos de Acciones

1. **CREADA**: Primera vez que se guarda la situación
2. **EDITADA**: Cualquier modificación a campos existentes
3. **CERRADA**: Cuando se cambia estado a CERRADA
4. **REABIERTA**: Si se reabre una situación cerrada (raro pero posible)

### Ejemplo de Registros

#### Al crear:
```json
{
  "situacion_id": 567,
  "usuario_id": 17000,
  "accion": "CREADA",
  "campos_modificados": null,
  "created_at": "2026-01-21T14:30:00Z"
}
```

#### Al editar (agregar vehículo):
```json
{
  "situacion_id": 567,
  "usuario_id": 17001,
  "accion": "EDITADA",
  "campos_modificados": {
    "vehiculos": {
      "antes": [],
      "despues": [{
        "tipo": "AUTOMOVIL",
        "placa": "P123ABC"
      }]
    }
  },
  "created_at": "2026-01-21T14:35:00Z"
}
```

#### Al editar (modificar km):
```json
{
  "situacion_id": 567,
  "usuario_id": 17000,
  "accion": "EDITADA",
  "campos_modificados": {
    "km": {
      "antes": 50,
      "despues": 52
    },
    "observaciones": {
      "antes": "Vehículo obstruye carril izquierdo",
      "despues": "Vehículo obstruye carril izquierdo. Piloto con lesiones leves."
    }
  },
  "created_at": "2026-01-21T15:30:00Z"
}
```

### Vista en Bitácora (COP)

Cuando el COP entra a ver una situación:

```
┌────────────────────────────────────────────────────────┐
│ Situación #SIT-2026-0234 - HECHO_TRANSITO             │
│ Estado: CERRADA                                        │
│ Unidad: 030 | CA-9 Norte Km 52                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│ [Editar] [Ver Multimedia] [Historial] ◀── Nuevo botón│
└────────────────────────────────────────────────────────┘

Al presionar [Historial]:

┌────────────────────────────────────────────────────────┐
│ 📋 Historial de Cambios                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│ 21/01/2026 15:30 - Editada                           │
│ Por: 17000 (Lisardo García - Comandante)             │
│ Cambios:                                              │
│   • km: 50 → 52                                       │
│   • observaciones: "..." → "... Piloto con lesiones.│
│                                                        │
│ ─────────────────────────────────────────────────────│
│                                                        │
│ 21/01/2026 14:45 - Cerrada                           │
│ Por: 17000 (Lisardo García - Comandante)             │
│                                                        │
│ ─────────────────────────────────────────────────────│
│                                                        │
│ 21/01/2026 14:40 - Editada                           │
│ Por: 17002 (Juan Pérez - Acompañante)                │
│ Cambios:                                              │
│   • Agregó: autoridades → ["PNC"]                    │
│                                                        │
│ ─────────────────────────────────────────────────────│
│                                                        │
│ 21/01/2026 14:35 - Editada                           │
│ Por: 17001 (Mario López - Piloto)                    │
│ Cambios:                                              │
│   • Agregó: vehiculos[0] - P123ABC                   │
│                                                        │
│ ─────────────────────────────────────────────────────│
│                                                        │
│ 21/01/2026 14:30 - Creada                            │
│ Por: 17000 (Lisardo García - Comandante)             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Implementación Backend

#### Middleware de Auditoría

```typescript
// middleware/auditoria.ts
export async function registrarAuditoria(
  situacionId: number,
  usuarioId: number,
  accion: 'CREADA' | 'EDITADA' | 'CERRADA' | 'REABIERTA',
  camposModificados?: Record<string, { antes: any, despues: any }>
) {
  await db.none(
    `INSERT INTO situacion_auditoria (situacion_id, usuario_id, accion, campos_modificados)
     VALUES ($1, $2, $3, $4)`,
    [situacionId, usuarioId, accion, camposModificados || null]
  );
}
```

#### Uso en Controlador

```typescript
// controllers/situacion.controller.ts
export async function updateSituacion(req: Request, res: Response) {
  const { id } = req.params;
  const datosNuevos = req.body;
  
  // 1. Obtener datos actuales
  const situacionActual = await SituacionModel.findById(id);
  
  // 2. Comparar y detectar cambios
  const camposModificados = compararCambios(situacionActual, datosNuevos);
  
  // 3. Actualizar situación
  await SituacionModel.update(id, datosNuevos);
  
  // 4. Registrar en auditoría
  await registrarAuditoria(
    id,
    req.user!.userId,
    'EDITADA',
    camposModificados
  );
  
  res.json({ success: true });
}

function compararCambios(actual: any, nuevo: any) {
  const cambios: Record<string, any> = {};
  
  for (const key in nuevo) {
    if (nuevo[key] !== actual[key]) {
      cambios[key] = {
        antes: actual[key],
        despues: nuevo[key]
      };
    }
  }
  
  return Object.keys(cambios).length > 0 ? cambios : null;
}
```

### Endpoint para Obtener Historial

```typescript
GET /api/situaciones/:id/historial

Response 200:
{
  "situacion_id": 567,
  "historial": [
    {
      "id": 1234,
      "usuario": {
        "id": 17000,
        "nombre": "Lisardo García",
        "rol": "Comandante"
      },
      "accion": "EDITADA",
      "cambios": {
        "km": { "antes": 50, "despues": 52 },
        "observaciones": { "antes": "...", "despues": "..." }
      },
      "fecha": "2026-01-21T15:30:00Z"
    },
    {
      "id": 1233,
      "usuario": {
        "id": 17000,
        "nombre": "Lisardo García",
        "rol": "Comandante"
      },
      "accion": "CERRADA",
      "cambios": null,
      "fecha": "2026-01-21T14:45:00Z"
    }
    // ... más registros
  ]
}
```

### Beneficios

1. ✅ **Trazabilidad completa** - Se sabe quién editó qué y cuándo
2. ✅ **Transparencia** - COP puede ver todo el historial
3. ✅ **Auditoría** - Cumplimiento normativo si lo requieren
4. ✅ **Resolución de conflictos** - Ver qué cambió y por qué
5. ✅ **Flexibilidad** - Permitir ediciones sin perder control

---

**Fin de documento de auditoría**
