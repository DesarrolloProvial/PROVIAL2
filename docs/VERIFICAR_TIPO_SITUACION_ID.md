# Script SQL para Verificar ID de Tipo Situación

Ejecutar este query en PostgreSQL para verificar el ID del tipo ASISTENCIA_VEHICULAR:

## 1. Ver todos los tipos de situación
```sql
SELECT 
    id,
    nombre,
    descripcion,
    created_at
FROM tipo_situacion
ORDER BY id;
```

## 2. Buscar específicamente ASISTENCIA_VEHICULAR
```sql
SELECT 
    id,
    nombre,
    descripcion
FROM tipo_situacion
WHERE nombre LIKE '%ASISTENCIA%'
   OR nombre LIKE '%VEHICULAR%';
```

## 3. Verificar si el ID 70 existe
```sql
SELECT 
    id,
    nombre,
    descripcion
FROM tipo_situacion
WHERE id = 70;
```

## Resultado Esperado

Si el query 2 retorna:
```
id | nombre                | descripcion
---|-----------------------|------------------
70 | ASISTENCIA_VEHICULAR  | Asistencia a vehículos varados
```

Entonces el ID 70 es **CORRECTO** ✅

## Si el ID es Diferente

Si retorna un ID diferente, por ejemplo `75`, entonces debes:

1. Actualizar `AsistenciaScreen.tsx` línea 41:
   ```typescript
   const TIPO_SITUACION_ASISTENCIA_ID = 75;
   ```

2. Reiniciar la app móvil
