# 🔴 PROBLEMAS PENDIENTES - Prioridad Alta

**Fecha:** 2026-01-22 22:16  
**Estado:** Componentes creados pero con issues

---

## 🚨 PROBLEMA 1: Autoridades no se pueden seleccionar

### Síntomas:
- Los checkboxes de autoridades no responden al click
- No se puede seleccionar ninguna autoridad
- Mismo problema con Socorro

### Posibles Causas:
1. **AutoridadSocorroWrapper** no está pasando bien los eventos
2. **AutoridadSocorroManager** espera props diferentes
3. Problema con el `tipo` ('autoridad' vs 'autoridades')
4. El componente no está recibiendo el `control` correctamente

### Debug Agregado:
```typescript
console.log('[AutoridadSocorroWrapper] Renderizando con:', { value, tipo });
console.log('[AutoridadSocorroWrapper] Selección cambiada:', seleccionados);
```

### Acción Inmediata:
1. Revisar logs en consola
2. Verificar que `tipo` sea 'autoridad' o 'socorro' (sin 'es')
3. Verificar que los eventos de click lleguen al componente

---

## 🚨 PROBLEMA 2: Grúas y Ajustadores deben vincularse a vehículos

### Requerimiento:
Cada grúa y ajustador debe poder seleccionar a qué vehículo está asociado.

### Solución Necesaria:

#### En GruaForm:
Agregar campo de selección de vehículo:
```typescript
<Controller
    control={control}
    name={`gruas.${index}.vehiculo_index`}
    render={({ field: { onChange, value } }) => (
        <Picker
            selectedValue={value}
            onValueChange={onChange}
        >
            <Picker.Item label="Seleccione vehículo..." value={null} />
            {vehiculos.map((v, idx) => (
                <Picker.Item 
                    key={idx} 
                    label={`Vehículo ${idx + 1} - ${v.placa || 'Sin placa'}`} 
                    value={idx} 
                />
            ))}
        </Picker>
    )}
/>
```

#### En AjustadorForm:
Mismo campo de selección de vehículo.

### Problema:
- GruaForm y AjustadorForm NO tienen acceso a la lista de vehículos
- Necesitan recibir `vehiculos` como prop
- O usar `useWatch` para leer `vehiculos` del formulario

### Solución Propuesta:

**Opción 1: Pasar vehículos como prop**
```typescript
// En GruaManager
const vehiculos = useWatch({ control, name: 'vehiculos' }) || [];

<GruaForm
    control={control}
    index={index}
    vehiculos={vehiculos}  // ✅ Pasar lista
    onRemove={() => eliminarGrua(index)}
/>
```

**Opción 2: Usar useWatch dentro de GruaForm**
```typescript
// Dentro de GruaForm
const vehiculos = useWatch({ control, name: 'vehiculos' }) || [];
```

---

## 📋 TAREAS PENDIENTES

### Prioridad 1: Arreglar Autoridades ⚠️
- [ ] Revisar logs de debug
- [ ] Verificar que el `tipo` sea correcto
- [ ] Verificar que los clicks lleguen
- [ ] Si no funciona, crear un componente más simple

### Prioridad 2: Vincular Grúas a Vehículos
- [ ] Agregar `useWatch` para obtener vehículos
- [ ] Agregar campo `vehiculo_index` en GruaForm
- [ ] Agregar Picker/Select para seleccionar vehículo
- [ ] Mostrar "Vehículo 1 - ABC123" en el selector

### Prioridad 3: Vincular Ajustadores a Vehículos
- [ ] Mismo proceso que Grúas
- [ ] Agregar campo `vehiculo_index`
- [ ] Agregar Picker/Select

### Prioridad 4: Multimedia
- [ ] Integrar MultimediaCaptureOffline
- [ ] Crear wrapper si es necesario

---

## 🔧 CÓDIGO NECESARIO

### 1. Arreglo Rápido para Autoridades

Si el wrapper no funciona, usar directamente AutoridadSocorroManager:

```typescript
// En FieldRenderer.tsx, case 'custom':
if (field.component === 'AutoridadSocorroWrapper') {
    // Renderizar directamente sin wrapper
    return (
        <Controller
            control={control}
            name={field.name}
            render={({ field: { onChange, value } }) => {
                const safeValue = value || { seleccionados: [], detalles: {} };
                return (
                    <AutoridadSocorroManager
                        tipo={field.componentProps.tipo}
                        seleccionados={safeValue.seleccionados}
                        detalles={safeValue.detalles}
                        onSelectionChange={(sel) => onChange({ ...safeValue, seleccionados: sel })}
                        onDetallesChange={(det) => onChange({ ...safeValue, detalles: det })}
                    />
                );
            }}
        />
    );
}
```

### 2. Agregar Selector de Vehículo en GruaForm

```typescript
// Al inicio de GruaForm
const vehiculos = useWatch({ control, name: 'vehiculos' }) || [];

// Después del campo "piloto"
<Controller
    control={control}
    name={`gruas.${index}.vehiculo_index`}
    render={({ field: { onChange, value } }) => (
        <>
            <Text style={styles.fieldLabel}>Vehículo Asociado</Text>
            <Picker
                selectedValue={value}
                onValueChange={onChange}
                style={styles.picker}
            >
                <Picker.Item label="Ninguno" value={null} />
                {vehiculos.map((v, idx) => (
                    <Picker.Item 
                        key={idx}
                        label={`Vehículo ${idx + 1}${v.placa ? ` - ${v.placa}` : ''}`}
                        value={idx}
                    />
                ))}
            </Picker>
        </>
    )}
/>
```

### 3. Mismo para AjustadorForm

```typescript
const vehiculos = useWatch({ control, name: 'vehiculos' }) || [];

<Controller
    control={control}
    name={`ajustadores.${index}.vehiculo_index`}
    render={({ field: { onChange, value } }) => (
        <>
            <Text style={styles.fieldLabel}>Vehículo del Accidente</Text>
            <Picker
                selectedValue={value}
                onValueChange={onChange}
            >
                <Picker.Item label="Ninguno" value={null} />
                {vehiculos.map((v, idx) => (
                    <Picker.Item 
                        key={idx}
                        label={`Vehículo ${idx + 1}${v.placa ? ` - ${v.placa}` : ''}`}
                        value={idx}
                    />
                ))}
            </Picker>
        </>
    )}
/>
```

---

## 🎯 PLAN DE ACCIÓN

### Paso 1: Debug Autoridades (5 min)
1. Abrir consola del simulador
2. Ir a tab Recursos
3. Intentar seleccionar una autoridad
4. Ver qué logs aparecen
5. Reportar qué dice

### Paso 2: Arreglar Autoridades (15 min)
Según lo que digan los logs:
- Si no hay logs → El componente no se está renderizando
- Si hay logs pero no cambia → El onChange no está funcionando
- Si hay error → Arreglar el error específico

### Paso 3: Agregar Selector de Vehículos (30 min)
1. Modificar GruaForm para agregar `useWatch`
2. Agregar campo `vehiculo_index` con Picker
3. Probar que funcione
4. Repetir para AjustadorForm

---

## ⏰ TIEMPO ESTIMADO

| Tarea | Tiempo | Prioridad |
|-------|--------|-----------|
| Debug Autoridades | 5 min | 🔴 Alta |
| Arreglar Autoridades | 15 min | 🔴 Alta |
| Selector Vehículos Grúas | 15 min | 🟡 Media |
| Selector Vehículos Ajustadores | 15 min | 🟡 Media |
| **TOTAL** | **50 min** | |

---

## 🚀 SIGUIENTE ACCIÓN

**AHORA MISMO:**
1. Abre la consola del simulador
2. Ve a Recursos → Autoridades
3. Intenta seleccionar una autoridad
4. Dime qué logs ves en la consola

Con esa información sabré exactamente qué está fallando. 🔍
