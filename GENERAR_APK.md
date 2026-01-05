# Guia para Generar APK de Provial

## Requisitos previos

1. Node.js 18+ instalado
2. Cuenta de Expo (gratis): https://expo.dev/signup

## Paso 1: Instalar EAS CLI

```bash
npm install -g eas-cli
```

## Paso 2: Iniciar sesion en Expo

```bash
eas login
# Ingresa tu email y password de Expo
```

## Paso 3: Configurar el proyecto

```bash
cd mobile

# Inicializar EAS (esto generara el projectId)
eas init
```

Esto actualizara automaticamente el `projectId` en app.json.

## Paso 4: Cambiar URL del API (IMPORTANTE)

Edita el archivo `mobile/src/constants/config.ts`:

```typescript
// Cambiar esta linea con la URL de tu Railway:
export const API_URL = 'https://TU-APP.railway.app/api';
```

## Paso 5: Generar APK

```bash
cd mobile

# Generar APK para pruebas (perfil preview)
eas build --platform android --profile preview
```

El proceso toma 10-15 minutos. Expo te enviara un email con el link de descarga.

## Paso 6: Descargar e instalar APK

1. Abre el link del email en tu telefono Android
2. Descarga el APK
3. Instala el APK (puede requerir habilitar "Fuentes desconocidas")

## Paso 7: Probar la app

1. Abre la app "Provial Brigadas"
2. Inicia sesion con:
   - Usuario: `19109`
   - Password: `provial123`

---

## Comandos utiles

```bash
# Ver estado de builds
eas build:list

# Ver logs de build actual
eas build:view

# Generar APK de desarrollo (con hot reload)
eas build --platform android --profile development

# Generar para Google Play Store
eas build --platform android --profile production
```

---

## Troubleshooting

### Error: "eas: command not found"
```bash
npm install -g eas-cli
```

### Error: "Project ID not found"
```bash
cd mobile
eas init
```

### Error: "Build failed"
Revisa los logs en https://expo.dev (seccion Builds)

### La app no conecta al servidor
1. Verifica que el backend este corriendo en Railway
2. Verifica la URL en `config.ts`
3. Asegurate de que sea HTTPS (no HTTP)
