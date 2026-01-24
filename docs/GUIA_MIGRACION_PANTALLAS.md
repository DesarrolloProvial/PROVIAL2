/**
 * GUÍA DE MIGRACIÓN: Pantallas Antiguas → FormBuilder
 * 
 * Este documento explica cómo reemplazar las pantallas hardcoded
 * con el nuevo sistema schema-driven usando FormBuilder.
 * 
 * Fecha: 2026-01-22
 */

# 🔄 Migración de Pantallas de Situaciones

## Problema Actual

Tienes **2 sistemas coexistiendo**:

### ❌ Sistema Antiguo (Hardcoded)
```
screens/brigada/
├── AsistenciaScreen.tsx      (40KB - 1000+ líneas)
├── EmergenciaScreen.tsx      (40KB - 1000+ líneas)
└── IncidenteScreen.tsx       (54KB - 1300+ líneas)
```

**Problemas:**
- Código duplicado masivo
- Difícil de mantener
- Cada cambio requiere editar múltiples archivos
- No soporta offline-first nativamente

### ✅ Sistema Nuevo (Schema-Driven)
```
screens/situaciones/
└── SituacionDinamicaScreen.tsx  (6KB - 170 líneas)

config/formularios/
├── asistenciaForm.ts
├── hechoTransitoForm.ts
└── emergenciaForm.ts
```

**Ventajas:**
- Una sola pantalla para TODAS las situaciones
- Configuración declarativa (JSON)
- Offline-first integrado
- 88% menos código

---

## 🎯 Plan de Migración

### Opción 1: Migración Gradual (RECOMENDADO)

**Paso 1:** Mantener ambos sistemas temporalmente
```typescript
// En BrigadaNavigator.tsx
<Stack.Screen 
  name="AsistenciaOLD" 
  component={AsistenciaScreen}  // Pantalla antigua
/>
<Stack.Screen 
  name="AsistenciaNEW" 
  component={SituacionDinamicaScreen}  // Pantalla nueva
  initialParams={{ codigoSituacion: 'ASISTENCIA' }}
/>
```

**Paso 2:** Probar pantalla nueva en paralelo
- Usuarios pueden elegir qué versión usar
- Comparar resultados
- Validar que todo funciona

**Paso 3:** Eliminar pantallas antiguas
```bash
# Cuando estés 100% seguro
rm AsistenciaScreen.tsx
rm EmergenciaScreen.tsx
rm IncidenteScreen.tsx
```

---

### Opción 2: Migración Inmediata (Riesgoso)

Reemplazar directamente en el navegador:

```typescript
// BrigadaNavigator.tsx - ANTES
<Stack.Screen name="Asistencia" component={AsistenciaScreen} />

// BrigadaNavigator.tsx - DESPUÉS
<Stack.Screen 
  name="Asistencia" 
  component={SituacionDinamicaScreen}
  initialParams={{ 
    codigoSituacion: 'ASISTENCIA',
    tipoSituacionId: 1,
    nombreSituacion: 'Asistencia Vial'
  }}
/>
```

---

## 📝 Ejemplo Completo de Migración

### ANTES: AsistenciaScreen.tsx (Antiguo - 1000+ líneas)

```typescript
export default function AsistenciaScreen() {
  const [tipoVehiculo, setTipoVehiculo] = useState('');
  const [marca, setMarca] = useState('');
  const [placa, setPlaca] = useState('');
  const [km, setKm] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [municipio, setMunicipio] = useState('');
  // ... 50+ estados más

  const handleSubmit = async () => {
    // 200+ líneas de lógica de validación
    // 100+ líneas de construcción de payload
    // 50+ líneas de llamadas API
  };

  return (
    <ScrollView>
      <TextInput 
        value={tipoVehiculo}
        onChangeText={setTipoVehiculo}
        // ...
      />
      <TextInput 
        value={marca}
        onChangeText={setMarca}
        // ...
      />
      {/* ... 50+ inputs más */}
    </ScrollView>
  );
}
```

### DESPUÉS: Usando SituacionDinamicaScreen (Nuevo - 0 líneas!)

**No necesitas crear ninguna pantalla nueva.** Solo actualizar el navegador:

```typescript
// BrigadaNavigator.tsx
<Stack.Screen 
  name="Asistencia" 
  component={SituacionDinamicaScreen}
  initialParams={{ 
    codigoSituacion: 'ASISTENCIA',
    tipoSituacionId: 1,
    nombreSituacion: 'Asistencia Vial'
  }}
/>
```

**¡Eso es todo!** La pantalla `SituacionDinamicaScreen` automáticamente:
1. Carga la config de `asistenciaForm.ts`
2. Renderiza todos los campos
3. Valida el formulario
4. Guarda offline
5. Sincroniza cuando hay conexión

---

## 🔧 Actualización del Navegador

### Archivo: `mobile/src/navigation/BrigadaNavigator.tsx`

**ANTES:**
```typescript
import AsistenciaScreen from '../screens/brigada/AsistenciaScreen';
import EmergenciaScreen from '../screens/brigada/EmergenciaScreen';
import IncidenteScreen from '../screens/brigada/IncidenteScreen';

// ...

<Stack.Screen name="Asistencia" component={AsistenciaScreen} />
<Stack.Screen name="Emergencia" component={EmergenciaScreen} />
<Stack.Screen name="Incidente" component={IncidenteScreen} />
```

**DESPUÉS:**
```typescript
import SituacionDinamicaScreen from '../screens/situaciones/SituacionDinamicaScreen';

// ...

<Stack.Screen 
  name="Asistencia" 
  component={SituacionDinamicaScreen}
  initialParams={{ 
    codigoSituacion: 'ASISTENCIA',
    tipoSituacionId: 1,
    nombreSituacion: 'Asistencia Vial'
  }}
/>

<Stack.Screen 
  name="Emergencia" 
  component={SituacionDinamicaScreen}
  initialParams={{ 
    codigoSituacion: 'EMERGENCIA',
    tipoSituacionId: 3,
    nombreSituacion: 'Emergencia Vial'
  }}
/>

<Stack.Screen 
  name="HechoTransito" 
  component={SituacionDinamicaScreen}
  initialParams={{ 
    codigoSituacion: 'HECHO_TRANSITO',
    tipoSituacionId: 2,
    nombreSituacion: 'Hecho de Tránsito'
  }}
/>
```

---

## 📊 Comparación de Código

| Aspecto | Sistema Antiguo | Sistema Nuevo |
|---------|----------------|---------------|
| **Líneas por pantalla** | 1000+ | 0 (reutiliza SituacionDinamicaScreen) |
| **Archivos necesarios** | 1 por tipo | 1 config JSON por tipo |
| **Validación** | Manual (200+ líneas) | Automática (declarativa) |
| **Offline** | No implementado | Incluido |
| **Sincronización** | No implementado | Incluida |
| **Mantenimiento** | Difícil (código duplicado) | Fácil (cambiar config) |

---

## 🎨 Personalización Avanzada

Si necesitas lógica específica para una situación:

### Opción A: Lógica en la Config
```typescript
// asistenciaForm.ts
{
  name: 'placa',
  type: 'text',
  validation: {
    validate: (value, formData) => {
      // Lógica custom
      if (formData.pais === 'GT' && !/^[A-Z]{1,3}\d{3,4}$/.test(value)) {
        return 'Formato de placa guatemalteca inválido';
      }
      return true;
    }
  }
}
```

### Opción B: Componente Custom
```typescript
// components/AsistenciaCustomSection.tsx
export function AsistenciaCustomSection({ formData, setValue }) {
  // Lógica específica de asistencia
  return (
    <View>
      {/* UI custom */}
    </View>
  );
}

// asistenciaForm.ts
{
  id: 'seccion_custom',
  component: AsistenciaCustomSection,
  componentProps: { /* props específicos */ }
}
```

---

## ✅ Checklist de Migración

### Pre-Migración
- [ ] Revisar `asistenciaForm.ts` y asegurar que tiene TODOS los campos
- [ ] Probar `SituacionDinamicaScreen` con datos reales
- [ ] Verificar que offline storage funciona
- [ ] Hacer backup de pantallas antiguas

### Migración
- [ ] Actualizar `BrigadaNavigator.tsx` con nuevas rutas
- [ ] Probar navegación a cada tipo de situación
- [ ] Verificar que los datos se guardan correctamente
- [ ] Probar sincronización online/offline

### Post-Migración
- [ ] Eliminar imports de pantallas antiguas
- [ ] Eliminar archivos `.tsx` antiguos
- [ ] Actualizar documentación
- [ ] Celebrar 🎉 (88% menos código!)

---

## 🚨 Problemas Comunes

### "No se ve ningún campo"
**Causa:** Config no está registrada en `config/formularios/index.ts`

**Solución:**
```typescript
// config/formularios/index.ts
export const formConfigRegistry = {
  'ASISTENCIA': asistenciaFormConfig,
  'EMERGENCIA': emergenciaFormConfig,
  'HECHO_TRANSITO': hechoTransitoFormConfig,
};
```

### "Los datos no se guardan"
**Causa:** `offlineStorage` no inicializado

**Solución:**
```typescript
// App.tsx
useEffect(() => {
  offlineStorage.init();
}, []);
```

### "Error de tipos TypeScript"
**Causa:** Params no definidos en navigation types

**Solución:** Ver `SituacionDinamicaScreen.tsx` líneas 26-32 para el tipo correcto

---

## 📚 Archivos de Referencia

### Implementación Actual
- `screens/situaciones/SituacionDinamicaScreen.tsx` - Pantalla genérica
- `config/formularios/asistenciaForm.ts` - Ejemplo de config
- `core/FormBuilder/FormBuilder.tsx` - Motor de renderizado

### Documentación
- `docs/FASE1_IMPLEMENTACION_COMPLETA.md` - Resumen de implementación
- `docs/CHANGELOG_FASE1_CONFIGS.md` - Detalles de configuraciones

---

## 🎯 Próximos Pasos

1. **Probar SituacionDinamicaScreen** con las 3 configs existentes
2. **Actualizar BrigadaNavigator** para usar la nueva pantalla
3. **Crear configs** para los ~50 tipos de situaciones restantes
4. **Eliminar pantallas antiguas** cuando todo funcione

---

## 💡 Conclusión

**No necesitas crear nuevas pantallas.** El trabajo ya está hecho:

- ✅ `SituacionDinamicaScreen` es la pantalla universal
- ✅ Solo necesitas crear archivos de configuración JSON
- ✅ El FormBuilder hace todo el trabajo pesado

**La migración es simple:**
1. Actualizar rutas en el navegador
2. Verificar que funciona
3. Eliminar código antiguo

**Resultado:**
- De 3000+ líneas → 500 líneas (configs)
- De 3 pantallas → 1 pantalla reutilizable
- De código duplicado → Configuración declarativa
