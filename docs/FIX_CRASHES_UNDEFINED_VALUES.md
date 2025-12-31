# Fix: Crashes por Valores Undefined en Formularios

**Fecha:** 2025-12-12
**Estado:** COMPLETADO

---

## Problema

La app movil se cerraba sin mostrar errores al:
1. Pulsar "Agregar Vehiculo" en pantalla de Incidente
2. Seleccionar municipio en el dropdown
3. Escribir en el campo de referencia/direccion

### Error Original
```
TypeError: Cannot read property 'length' of undefined at PlacaInput
```

---

## Causa Raiz

Los componentes `TextInput` y `Switch` de React Native Paper crashean silenciosamente cuando reciben `undefined` como valor en la prop `value`.

Esto ocurria porque:
1. `useFieldArray` de react-hook-form inicializaba items vacios con `{}`
2. Los campos del formulario no tenian valores por defecto
3. Al renderizar, `value` era `undefined` y los componentes crasheaban

---

## Solucion Implementada

### Patron de Correccion

Para **TextInput**:
```tsx
// ANTES (crashea con undefined)
<TextInput value={value} ... />

// DESPUES (seguro)
<TextInput value={value || ''} ... />
```

Para **Switch**:
```tsx
// ANTES (crashea con undefined)
<Switch value={value} ... />

// DESPUES (seguro)
<Switch value={value || false} ... />
```

Para **valores numericos**:
```tsx
// Strings que representan numeros
value={value?.toString() || ''}

// O con default 0
value={value?.toString() || '0'}
```

---

## Archivos Corregidos

### 1. VehiculoForm.tsx
**Ubicacion:** `mobile/src/components/VehiculoForm.tsx`

**Campos corregidos:**
- `tipo_vehiculo`, `color`, `marca` - TextInput con `|| ''`
- `placa` - PlacaInput con `|| ''`
- `placa_extranjera` - PlacaInput esExtranjero con `|| false`
- `estado_piloto` - RadioButton.Group con `|| 'ILESO'`
- `personas_asistidas` - TextInput numerico con `?.toString() || '0'`
- `nombre_propietario`, `direccion_propietario`, `modelo` - TextInput con `|| ''`
- `nombre_piloto`, `licencia_tipo`, `licencia_numero` - TextInput/SegmentedButtons con `|| ''`
- `licencia_antiguedad` - TextInput numerico con `?.toString() || ''`
- `etnia_piloto` - TextInput con `|| ''`
- `cargado`, `tiene_contenedor`, `es_bus`, `tiene_sancion` - Switch con `|| false`
- `carga_tipo`, `carga_descripcion` - TextInput con `|| ''`
- `contenedor_numero`, `contenedor_empresa` - TextInput con `|| ''`
- `bus_empresa`, `bus_ruta` - TextInput con `|| ''`
- `bus_pasajeros` - TextInput numerico con `?.toString() || ''`
- `sancion_articulo`, `sancion_descripcion` - TextInput con `|| ''`
- `sancion_monto` - TextInput numerico con `?.toString() || ''`

### 2. PlacaInput.tsx
**Ubicacion:** `mobile/src/components/PlacaInput.tsx`

**Cambio:**
```tsx
const safeValue = value || '';
const isValid = localExtranjero || PLACA_REGEX.test(safeValue) || safeValue === '';
const showError = safeValue.length > 0 && !isValid;
```

### 3. GruaForm.tsx
**Ubicacion:** `mobile/src/components/GruaForm.tsx`

**Campos corregidos:**
- `empresa`, `placa`, `tipo`, `piloto` - TextInput con `|| ''`
- `traslado` - Switch con `|| false`
- `traslado_a` - TextInput con `|| ''`
- `costo_traslado` - TextInput numerico con `?.toString() || ''`

### 4. AjustadorForm.tsx
**Ubicacion:** `mobile/src/components/AjustadorForm.tsx`

**Campos corregidos:**
- `empresa`, `nombre`, `telefono` - TextInput con `|| ''`
- `vehiculo_placa`, `vehiculo_marca`, `vehiculo_color` - TextInput con `|| ''`

### 5. IncidenteScreen.tsx
**Ubicacion:** `mobile/src/screens/brigada/IncidenteScreen.tsx`

**Campos corregidos:**
- `daniosMateriales`, `daniosInfraestructura` - Switch con `|| false`
- Picker `sentido` con `|| ''`
- `descripcionDaniosInfra`, `observaciones` - TextInput con `|| ''`

**Valores por defecto al agregar vehiculo:**
```tsx
appendVehiculo({
    tipo_vehiculo: '',
    color: '',
    marca: '',
    placa: '',
    placa_extranjera: false,
    estado_piloto: 'ILESO',
    personas_asistidas: 0,
    cargado: false,
    tiene_contenedor: false,
    es_bus: false,
    tiene_sancion: false,
})
```

### 6. AsistenciaScreen.tsx
**Ubicacion:** `mobile/src/screens/brigada/AsistenciaScreen.tsx`

**Campos corregidos:**
- `km`, `jurisdiccion`, `servicioProporcionado`, `observaciones` - TextInput con `|| ''`
- Picker `sentido` con `|| ''`
- Agregados valores por defecto a `appendVehiculo({...})`

### 7. EmergenciaScreen.tsx
**Ubicacion:** `mobile/src/screens/brigada/EmergenciaScreen.tsx`

**Campos corregidos:**
- `kmInicio`, `kmFin`, `jurisdiccion`, `observaciones` - TextInput con `|| ''`
- Picker `sentido` con `|| ''`

### 8. ObstruccionManager.tsx
**Ubicacion:** `mobile/src/components/ObstruccionManager.tsx`

**Cambio:** Removido titulo duplicado "Obstruccion de Via" (ya existe en pantalla padre)

---

## Prevencion Futura

Al crear nuevos formularios con `react-hook-form`:

1. **Siempre definir defaultValues completos** en `useForm()`
2. **Siempre usar `|| ''`** en TextInput value props
3. **Siempre usar `|| false`** en Switch value props
4. **Siempre pasar objeto con valores** en `append()` de useFieldArray, nunca `{}`

### Ejemplo Correcto:
```tsx
const { control } = useForm({
    defaultValues: {
        nombre: '',
        activo: false,
        items: []
    }
});

const { fields, append } = useFieldArray({ control, name: 'items' });

// Al agregar item, pasar valores por defecto
<Button onPress={() => append({
    campo1: '',
    campo2: false,
    campo3: 0
})}>
    Agregar
</Button>

// En el render, siempre usar fallback
<Controller
    control={control}
    name={`items.${index}.campo1`}
    render={({ field: { onChange, value } }) => (
        <TextInput value={value || ''} onChangeText={onChange} />
    )}
/>
```

---

## Verificacion

Despues de aplicar estos cambios:
- [x] "Agregar Vehiculo" funciona sin crash
- [x] Seleccionar municipio funciona sin crash
- [x] Escribir en campo referencia funciona sin crash
- [x] Todos los formularios de situaciones funcionan correctamente
