# 📱 PROVIAL Móvil - App para Brigadas

Aplicación móvil React Native + Expo para brigadas de PROVIAL que permite registro de incidentes, asistencias y emergencias viales con soporte offline-first.

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+ y npm instalados
- Backend de PROVIAL ejecutándose
- Expo Go instalado en tu teléfono (para desarrollo)

### 1. Instalar Dependencias

```bash
cd mobile
npm install
```

### 2. Configurar URL del Backend

Edita `src/constants/config.ts`:

```typescript
// Para desarrollo local
export const API_URL = 'http://TU_IP_LOCAL:3000/api';

// Para producción (Railway)
export const API_URL = 'https://tu-proyecto.railway.app/api';
```

**Obtener tu IP local:**
- Windows: `ipconfig` (busca "IPv4 Address")
- Mac/Linux: `ifconfig` (busca "inet")

### 3. Ejecutar en Desarrollo

```bash
npm start
```

Esto abrirá Expo Dev Tools. Escanea el QR con Expo Go en tu teléfono.

**⚠️ Importante:** Tu teléfono y PC deben estar en la misma red WiFi.

---

## 📦 Build y Distribución

### Opción A: Build APK con EAS (Recomendado)

```bash
# Instalar EAS CLI (solo primera vez)
npm install -g eas-cli

# Login en Expo
eas login

# Configurar proyecto (solo primera vez)
eas build:configure

# Generar APK
eas build --platform android --profile preview
```

El APK estará disponible para descargar desde la consola de Expo.

### Opción B: Build Local

Requiere Android Studio instalado.

```bash
npx expo run:android --variant release
```

APK generado en: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🎯 Funcionalidades Principales

### Para Rol BRIGADA (Único rol con acceso móvil)

#### 📍 Gestión de Turnos y Ubicación
- Ver asignación de turno del día
- Registrar salida de sede (combustible inicial, odómetro, firma)
- Registrar ingreso a sede (combustible final, odómetro)
- Tracking GPS en tiempo real

#### 🚨 Reportar Situaciones
- **Hecho de Tránsito (Incidente):** Captura vehículos involucrados, heridos, fallecidos
- **Asistencia Vial:** Grúas, ajustadores, recursos necesarios
- **Emergencia Vial:** Obstrucciones, autoridades requeridas

#### 📸 Multimedia con Soporte Offline
- Captura de 3 fotos + 1 video obligatorios
- Upload directo a Cloudinary
- Queue de retry automático si falla
- Compresión automática de imágenes

#### 🔄 Arquitectura Offline-First
- Guardar drafts localmente (SQLite)
- Sincronización automática cuando hay conexión
- Reintentos con idempotencia
- No perder datos por falta de conexión

#### 🚗 Inspección 360 Vehicular
- Checklist completo de estado del vehículo
- Captura de fotos de daños
- Firma digital del inspector
- Generación de PDF automático

#### 💰 Otros Registros
- Registro de combustible
- Registro de relevo de personal
- Solicitudes de salida con autorización

---

## 🏗️ Arquitectura Técnica

### Stack Tecnológico
- **React Native** + **Expo SDK 52**
- **TypeScript** para tipado estático
- **React Navigation** para navegación
- **Zustand** para state management
- **React Hook Form** para formularios
- **Expo SQLite** para storage local (offline-first)
- **Expo Location** para GPS
- **Expo Camera** + **ImagePicker** para multimedia
- **AsyncStorage** para tokens y configuración

### Estructura del Proyecto

```
mobile/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── AutoridadSocorroManager.tsx
│   │   ├── FirmaCaptura.tsx
│   │   ├── FotoCaptura.tsx
│   │   ├── MultimediaCapture.tsx
│   │   ├── ObstruccionManager.tsx
│   │   └── ...
│   ├── constants/           # Configuración y constantes
│   │   ├── config.ts        # API_URL y configuración
│   │   └── colors.ts        # Paleta de colores
│   ├── navigation/          # Navegación de la app
│   │   ├── MainDrawer.tsx   # Drawer principal (solo BRIGADA)
│   │   └── BrigadaNavigator.tsx  # Stack de pantallas
│   ├── screens/
│   │   ├── auth/            # Pantallas de autenticación
│   │   ├── brigada/         # Pantallas para brigadas
│   │   └── shared/          # Pantallas compartidas
│   ├── services/            # Servicios y API
│   │   ├── api.ts           # Cliente HTTP
│   │   ├── auth.service.ts
│   │   ├── multimedia.service.ts
│   │   ├── cloudinaryUpload.ts  # Upload directo a Cloudinary
│   │   └── ...
│   ├── store/               # State management (Zustand)
│   │   ├── authStore.ts
│   │   └── ...
│   └── types/               # Tipos TypeScript
├── assets/                  # Imágenes, iconos, splash
├── app.json                 # Configuración Expo
├── eas.json                 # Configuración EAS Build
└── package.json
```

---

## 🔐 Seguridad y Autenticación

- **JWT Tokens** almacenados en AsyncStorage
- Interceptor automático agrega `Authorization: Bearer` header
- Logout limpia tokens locales
- Timeout de 30 segundos en requests
- Solo rol `BRIGADA` puede acceder a la app móvil
- Otros roles (COP, OPERACIONES, ADMIN) son bloqueados

---

## 🌐 Conexión con Backend

### Endpoints Principales

```typescript
// Autenticación
POST /api/auth/login
POST /api/auth/logout

// Turnos
GET /api/turnos/asignacion/:unidadId

// Situaciones (offline-first con drafts)
POST /api/drafts/incidente              // Guardar draft
GET  /api/drafts/pending                // Obtener drafts pendientes
POST /api/drafts/:uuid/evidencias       // Registrar evidencia subida
POST /api/drafts/:uuid/finalize         // Finalizar y crear incidente real

// Multimedia (direct upload)
POST /api/cloudinary/sign               // Obtener signed URL para upload
POST /api/multimedia/situacion/:id/foto // Legacy upload (local storage)

// Inspección 360
POST /api/inspeccion360
GET  /api/inspeccion360/:id
```

---

## 📱 Permisos Requeridos

Ya configurados en `app.json`:

- **✅ Ubicación (GPS):** Para capturar coordenadas de situaciones
- **✅ Cámara:** Para fotos y videos de evidencia
- **✅ Almacenamiento:** Para guardar imágenes temporales
- **✅ Internet:** Para sincronización con backend

---

## 🧪 Testing y Desarrollo

### Credenciales de Prueba

```
Usuario: brigada01
Contraseña: [Consultar con admin del sistema]
```

### Modo de Pruebas

La app incluye un **Modo de Pruebas** que permite:
- Limpiar datos de testing
- Eliminar situaciones de prueba
- Resetear estado local

Acceso: Home → Menú → Configuración de Pruebas

### Variables de Entorno

Puedes usar archivos de configuración específicos:
- `src/constants/config.ts` - Configuración principal (se usa actualmente)

---

## 🔧 Troubleshooting

### Error: "Network request failed"
- Verifica que `API_URL` en `config.ts` sea correcto
- Verifica que el backend esté corriendo
- Verifica que el teléfono tenga internet

### Error: "Cannot connect to Metro"
- Verifica que teléfono y PC estén en la misma WiFi
- Usa `--tunnel`: `npx expo start --tunnel`
- Reinicia Metro: `npx expo start -c`

### Error: "Location permission denied"
- Android: Configuración → Apps → PROVIAL → Permisos → Ubicación
- iOS: Settings → Privacy → Location Services → PROVIAL

### Error: "Camera permission denied"
- Configuración → Apps → PROVIAL → Permisos → Cámara

### Fotos no se suben
- Verifica que Cloudinary esté configurado en backend
- Verifica que `STORAGE_TYPE=cloudinary` en variables de entorno
- Revisa logs del backend para errores de Cloudinary

### APK no instala
- Activa "Instalar desde fuentes desconocidas"
- Android: Configuración → Seguridad → Fuentes desconocidas

---

## 📋 Checklist Pre-Deploy

Antes de generar APK para producción:

- [ ] Actualizar `API_URL` en `config.ts` con URL de Railway
- [ ] Verificar que `app.json` tenga `version` incrementada
- [ ] Reemplazar iconos y splash screen con branding final
- [ ] Probar login con usuario brigada real
- [ ] Probar crear situación y verificar en COP web
- [ ] Probar upload de fotos a Cloudinary
- [ ] Probar modo offline y sincronización
- [ ] Probar inspección 360 y generación de PDF

---

## 🚀 Comandos Útiles

```bash
# Desarrollo
npm start                              # Iniciar Expo Dev Server
npm start -- --tunnel                  # Con tunneling (evita problemas de red)
npm start -- -c                        # Clear cache y reiniciar

# Build
eas build --platform android --profile preview    # APK de prueba
eas build --platform android --profile production # APK producción
npx expo run:android --variant release            # Build local

# Deploy
adb install app-release.apk           # Instalar APK vía USB

# Debugging
npx react-native log-android           # Ver logs Android
npx react-native log-ios               # Ver logs iOS
```

---

## 🔄 Próximas Mejoras

### En Progreso
- ✅ Sistema offline-first con drafts (backend completo)
- 🚧 Cliente SQLite para drafts locales (mobile en progreso)
- 🚧 Upload directo a Cloudinary desde mobile
- 🚧 Queue de sincronización automática

### Planeado
- Notificaciones push para asignaciones
- Tracking GPS en tiempo real durante turno
- Chat de brigada con COP
- Historial de situaciones reportadas
- Modo nocturno

---

## 📞 Soporte y Contacto

**Documentación Backend:** `backend/README.md`
**Documentación API:** Consultar endpoints en `backend/src/routes/`

---

## 📄 Licencia

Propiedad de PROVIAL - Sistema Interno de Gestión Operativa
