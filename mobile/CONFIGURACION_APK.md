# Configuración de App Móvil para Instalación en Teléfono

## 📱 Opción 1: Build APK con EAS (Recomendado)

### Paso 1: Instalar EAS CLI
```bash
npm install -g eas-cli
```

### Paso 2: Login en Expo
```bash
cd mobile
eas login
```

### Paso 3: Configurar Proyecto
```bash
eas build:configure
```

Esto creará un archivo `eas.json`. Actualízalo con:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### Paso 4: Actualizar `app.json`

Asegúrate de que `app.json` tenga:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "TU-PROJECT-ID-AQUI"
      }
    }
  }
}
```

### Paso 5: Configurar URL del Backend

Edita `mobile/src/constants/config.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'https://TU-URL-RAILWAY.railway.app/api',
  TIMEOUT: 30000,
};
```

### Paso 6: Build APK
```bash
eas build --platform android --profile preview
```

Esto generará un APK que puedes descargar e instalar en cualquier teléfono Android.

---

## 📱 Opción 2: Expo Go (Desarrollo Rápido)

### Paso 1: Instalar Expo Go
- Descarga "Expo Go" desde Google Play Store o App Store

### Paso 2: Iniciar Servidor
```bash
cd mobile
npm start
```

### Paso 3: Escanear QR
- Escanea el código QR con la cámara (iOS) o con Expo Go (Android)
- La app se cargará en tu teléfono

**⚠️ Limitación:** Requiere que el teléfono esté en la misma red que tu PC.

---

## 📱 Opción 3: Build Local APK (Sin Expo Account)

### Requisitos:
- Android Studio instalado
- Java JDK 11+

### Paso 1: Instalar Dependencias
```bash
cd mobile
npm install
```

### Paso 2: Generar Build Local
```bash
npx expo run:android --variant release
```

Esto generará un APK en:
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔧 Configuración Importante

### 1. URL del Backend

**Archivo:** `mobile/src/constants/config.ts`

```typescript
export const API_CONFIG = {
  // CAMBIAR ESTO A TU URL DE RAILWAY
  BASE_URL: 'https://provial-production.up.railway.app/api',
  TIMEOUT: 30000,
};

export const SOCKET_CONFIG = {
  // CAMBIAR ESTO A TU URL DE RAILWAY (sin /api)
  URL: 'https://provial-production.up.railway.app',
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 3000,
};
```

### 2. Permisos Android

Ya configurados en `app.json`:
- ✅ Ubicación (GPS)
- ✅ Cámara
- ✅ Almacenamiento

### 3. Iconos y Splash Screen

**Reemplaza estos archivos:**
- `mobile/assets/icon.png` (1024x1024)
- `mobile/assets/splash.png` (1284x2778)
- `mobile/assets/adaptive-icon.png` (1024x1024)

---

## 📦 Instalación del APK en Teléfono

### Método 1: Descarga Directa
1. Sube el APK a Google Drive, Dropbox, o servidor web
2. Abre el link en el teléfono
3. Descarga el APK
4. Permite "Instalar desde fuentes desconocidas"
5. Instala la app

### Método 2: USB
1. Conecta el teléfono a la PC
2. Copia el APK al teléfono
3. Abre el APK desde el explorador de archivos
4. Instala

### Método 3: ADB
```bash
adb install mobile/android/app/build/outputs/apk/release/app-release.apk
```

---

## 🧪 Testing de la App Móvil

### 1. Login
- Usuario: `00001`
- Contraseña: `provial123`

### 2. Funcionalidades a Probar

**✅ Ver Asignación:**
- Debe mostrar la asignación del día
- Ver ruta, unidad, compañeros

**✅ Registrar Salida:**
- Combustible inicial
- Odómetro inicial
- Firma digital

**✅ Reportar Situación:**
- Crear incidente
- Tomar fotos
- Agregar ubicación GPS
- Seleccionar tipo de situación

**✅ Finalizar Turno:**
- Combustible final
- Odómetro final
- Firma

**✅ Sincronización:**
- Verificar que las situaciones aparezcan en el COP web
- Verificar que los datos se actualicen en tiempo real

---

## 🔍 Troubleshooting

### Error: "Network request failed"
- Verifica que `API_CONFIG.BASE_URL` sea correcto
- Verifica que Railway esté funcionando
- Verifica que el teléfono tenga internet

### Error: "Unable to connect to server"
- Verifica que la URL no tenga `/` al final
- Verifica que el backend esté respondiendo en `/api/health`

### Error: "Location permission denied"
- Ve a Configuración → Apps → Provial Brigadas → Permisos
- Activa "Ubicación"

### Error: "Camera permission denied"
- Ve a Configuración → Apps → Provial Brigadas → Permisos
- Activa "Cámara"

---

## 📝 Checklist Pre-Deploy

- [ ] Actualizar `API_CONFIG.BASE_URL` con URL de Railway
- [ ] Actualizar `SOCKET_CONFIG.URL` con URL de Railway
- [ ] Verificar que `app.json` tenga `projectId` correcto
- [ ] Reemplazar iconos y splash screen
- [ ] Incrementar `version` en `app.json`
- [ ] Build APK con `eas build`
- [ ] Probar instalación en teléfono
- [ ] Probar login con usuario brigada
- [ ] Probar crear situación
- [ ] Verificar que aparezca en COP web

---

## 🚀 Comandos Rápidos

```bash
# Desarrollo local
cd mobile
npm start

# Build APK (EAS)
eas build --platform android --profile preview

# Build local
npx expo run:android --variant release

# Instalar en teléfono conectado
adb install app-release.apk
```

---

## 📞 Soporte

Si tienes problemas:
1. Verifica logs con: `npx expo start`
2. Revisa la consola del navegador
3. Verifica que Railway esté funcionando
4. Verifica permisos del teléfono
