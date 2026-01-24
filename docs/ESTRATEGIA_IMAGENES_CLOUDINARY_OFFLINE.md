# 📸 Estrategia de Imágenes Offline-First con Cloudinary

Para garantizar que la aplicación funcione en carreteras sin señal, la captura de evidencias no puede depender de una subida inmediata a internet. Esta estrategia asegura que las imágenes se guarden, organicen y gestionen de manera eficiente y segura.

## 🔄 Flujo de Trabajo

1.  **Captura Offline**: Fotos/Videos se guardan localmente en el dispositivo.
2.  **Generación de ID**: Se usa el Código Único de Situación (CUS) basado en IDs.
3.  **Sincronización Inteligente**: Al detectar internet, se suben los archivos a Cloudinary renombrándolos con el CUS.

---

## 🆔 Naming Convention (Estándar de Nombres)

Usaremos los CÓDIGOS (IDs) del sistema numérico.

**Formato del Código Base:**
`YYYYMMDD-SEDE_ID-UNIDAD_ID-TIPO_ID-RUTA_ID-KM-NUM_SALIDA`

**Ejemplo Real:**
`20250123-01-1520-04-01-50-01`

### Estructura en Cloudinary

Al subir un archivo, su `public_id` (nombre final) será:

`[CARPETA_RAIZ] / [TIPO_ID] / [CODIGO_BASE]_[TIPO_ARCHIVO]_[INDEX]`

**Ejemplos de Archivos Finales:**
> `provial_evidencias/04/20250123-01-1520-04-01-50-01_FOTO_1.jpg`

---

## 🛠️ Guía Exacta de Configuración Cloudinary (Upload Preset)

Sigue estos pasos para crear el preset "Unsigned" correctamente:

1.  Ve a **Settings > Upload > Upload presets**.
2.  Click en **Add upload preset**.

### Configuración requerida:

| Opción | Valor a Seleccionar | Razón Importante |
|--------|---------------------|------------------|
| **Signing Mode** | `Unsigned` | Permite subir sin backend intermedio. |
| **Folder** | `provial_evidencias` | Carpeta raíz para mantener orden. |
| **Use filename or external ID** | **ON (Activado)** ✅ | **CRUCIAL**: Permite que usemos nuestro código como nombre. |
| **Unique filename** | **OFF (Desactivado)** ❌ | Para que NO agregue caracteres aleatorios al final. |
| **Disallow public ID** | **OFF (Desactivado)** ❌ | Si lo activas, **bloqueas** nuestra capacidad de poner nombres. |
| **Use the last segment...** | **OFF (Desactivado)** | Es solo cosmético, no afecta funcionamiento. |
| **Auto tagging** | (Ignorar / Dejar en 0.0) | Enviaremos los tags nosotros desde el código. |

3.  Click en **Save**.
4.  Copia el **Name** del preset (será algo como `ml_default` o el que tú escribas).

---

## � Beneficios de esta Estructura

1.  **Búsqueda Precisa por Códigos**: Buscar `01-50` (Ruta 01, KM 50) nos da todos los eventos en ese punto exacto.
2.  **Auditoría y Orden**: Los archivos se ordenan cronológicamente y por tipo numérico.
3.  **Eliminación Inteligente (TTL)**: El script de limpieza puede analizar los códigos.

---

## 💻 Implementación Técnica (Sync Service)

El servicio de sincronización construirá el nombre usando los IDs guardados en la base de datos local y enviará los tags manualmente:

```typescript
// 1. Obtener datos y codigos
const codigo = generateSituationCode(reporte); // "20250123-01-..."
const tipoArchivo = media.type === 'video' ? 'VIDEO' : 'FOTO';
// ID 04 = Hecho de tránsito
const carpeta = reporte.tipoSituacionId.toString(); 

// 2. Subir con tags manuales
await uploadToCloudinary(uri, {
  public_id: `${carpeta}/${codigo}_${tipoArchivo}_${index}`,
  // AQUÍ enviamos los tags, no dependemos del auto-tagging de Cloudinary
  tags: [`tipo_${reporte.tipoSituacionId}`, 'retencion_policy_check', 'provial_app'] 
});
```

---

## 🧹 Estrategia de Eliminación

El script de limpieza usará los IDs de tipo para aplicar las políticas (ej: borrar carpeta `01` > 24h).
