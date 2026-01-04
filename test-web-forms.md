# Prueba de Formularios Web

## Credenciales de Prueba
- **Usuario**: 17045
- **Password**: test123
- **Rol**: COP

## Pasos para Probar

### 1. Abrir el navegador
```
http://localhost:5173
```

### 2. Iniciar sesión
- Usuario: `17045`
- Contraseña: `test123`

### 3. Navegar a Bitácora
- Ir a la página de **Operaciones** o **Dashboard**
- Buscar la unidad **030** o **1109** (tienen situaciones activas)
- Click en "Ver Bitácora" o el ícono de bitácora

### 4. Probar Edición de Situación

#### Situación INCIDENTE (ID: 38)
- Unidad: 030
- Tipo: INCIDENTE
- Debería abrir **IncidenteFormModal** (tema azul) con 5 pestañas:
  - General: Tipo de hecho, Km, Sentido, Departamento, Municipio, Obstrucción
  - Vehículos: Lista de vehículos con formulario completo
  - Recursos: Autoridades y Socorro
  - Otros: Daños y observaciones
  - Evidencia: Galería de fotos

#### Situación PATRULLAJE (ID: 49)
- Unidad: 1109
- Tipo: PATRULLAJE
- Debería abrir **GenericSituacionModal** (tema gris/verde) con:
  - Km, Sentido, Descripción, Observaciones

## URLs Directas para Prueba

```
# Bitácora Unidad 406 (tiene INCIDENTE activo)
http://localhost:5173/bitacora/406

# Bitácora Unidad 341 (tiene PATRULLAJE activo)
http://localhost:5173/bitacora/341
```

## Verificación de Consola

Abrir DevTools (F12) y verificar:
- No hay errores de JavaScript
- Las llamadas API a `/api/situaciones/{id}` devuelven 200
- Los datos se cargan correctamente en los formularios

## Formularios Creados

| Tipo de Situación | Formulario | Color |
|-------------------|------------|-------|
| INCIDENTE | IncidenteFormModal | Azul |
| ASISTENCIA_VEHICULAR | AsistenciaFormModal | Teal |
| PATRULLAJE, PARADA_ESTRATEGICA, etc. | GenericSituacionModal | Gris |
