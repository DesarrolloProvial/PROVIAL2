# Guía de Despliegue - Sistema PROVIAL

## Requisitos Previos

- Node.js 20+
- PostgreSQL 14+ (con extensión PostGIS)
- Redis 6+
- Cuenta en Expo (para app móvil)
- (Opcional) Docker y Docker Compose

---

## Opciones de Hosting Recomendadas

### Opción 1: Económica (~$0-10/mes)

| Componente | Servicio | Costo |
|------------|----------|-------|
| Backend | Railway.app / Render.com | Gratis - $5/mes |
| Base de datos | Supabase / Railway | Gratis (500MB) |
| Redis | Upstash | Gratis (10K comandos/día) |
| Web | Vercel | Gratis |
| App Móvil | Expo EAS | Gratis (30 builds/mes) |

### Opción 2: Producción completa (~$50-100/mes)

| Componente | Servicio | Costo |
|------------|----------|-------|
| Backend + BD + Redis | DigitalOcean / AWS | $40-80/mes |
| Web | Vercel Pro | $20/mes |
| App Móvil | Expo EAS | $29/mes |

---

## 1. Desplegar Backend

### Opción A: Railway (Recomendado para empezar)

1. Crear cuenta en [railway.app](https://railway.app)

2. Conectar repositorio de GitHub

3. Configurar variables de entorno:
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=tu-clave-secreta-segura
JWT_REFRESH_SECRET=otra-clave-segura
CORS_ORIGIN=https://tu-web.vercel.app
```

4. Railway detectará el Dockerfile automáticamente

### Opción B: Render.com

1. Crear cuenta en [render.com](https://render.com)

2. Nuevo → Web Service → Conectar repositorio

3. Configurar:
   - Root Directory: `backend`
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`

4. Añadir PostgreSQL y Redis desde el dashboard

### Opción C: Docker (VPS propio)

```bash
# En el servidor
git clone https://github.com/Yorfad/PROVIAL.git
cd PROVIAL

# Configurar variables
cp backend/.env.production backend/.env
nano backend/.env  # Editar con credenciales reales

# Iniciar
docker-compose up -d
```

---

## 2. Desplegar Web (Vercel)

### Pasos:

1. Crear cuenta en [vercel.com](https://vercel.com)

2. Importar proyecto desde GitHub

3. Configurar:
   - Framework Preset: Vite
   - Root Directory: `web`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Editar `web/vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://TU-BACKEND-URL.railway.app/api/:path*"
    }
  ]
}
```

5. Deploy!

---

## 3. Compilar App Móvil (Expo EAS)

### Configuración inicial:

```bash
cd mobile

# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo
eas login

# Configurar proyecto
eas build:configure
```

### Configurar API URL:

Editar `mobile/src/constants/config.ts`:
```typescript
export const API_URL = 'https://tu-backend-url.railway.app/api';
```

### Compilar APK (Android):

```bash
# Preview (para pruebas internas)
eas build --platform android --profile preview

# Producción (para Play Store)
eas build --platform android --profile production
```

### Compilar iOS:

```bash
# Requiere cuenta Apple Developer ($99/año)
eas build --platform ios --profile preview
```

El build tarda 10-20 minutos. Recibirás un link para descargar el APK/IPA.

---

## 4. Base de Datos

### Ejecutar migraciones:

```bash
# Conectar a la base de datos
psql $DATABASE_URL

# Ejecutar migraciones en orden
\i migrations/001_create_extensions.sql
\i migrations/002_create_base_tables.sql
# ... continuar hasta la última migración
\i migrations/077_accidentologia_comunicacion_social.sql
```

### O con script:

```bash
cd migrations
for f in *.sql; do
  psql $DATABASE_URL -f "$f"
done
```

---

## 5. Verificación Post-Deploy

### Backend:
```bash
curl https://tu-backend.railway.app/health
# Debe retornar: {"status":"ok","timestamp":"..."}
```

### Web:
- Navegar a https://tu-web.vercel.app
- Verificar login funciona
- Verificar carga de dashboard

### App Móvil:
- Instalar APK en dispositivo Android
- Login con credenciales de prueba
- Verificar GPS y cámara funcionan

---

## 6. Checklist Pre-Producción

### Seguridad:
- [ ] JWT_SECRET cambiado (mínimo 64 caracteres)
- [ ] JWT_REFRESH_SECRET cambiado
- [ ] CORS_ORIGIN configurado con dominio real
- [ ] Rate limiting activo
- [ ] HTTPS habilitado

### Base de datos:
- [ ] Backup configurado
- [ ] Credenciales seguras
- [ ] Conexiones SSL

### Monitoreo:
- [ ] Logs configurados
- [ ] Alertas de errores
- [ ] Health checks activos

---

## 7. Comandos Útiles

```bash
# Ver logs del backend (Railway)
railway logs

# Ver logs (Docker)
docker-compose logs -f backend

# Reiniciar servicios
docker-compose restart

# Backup de base de datos
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Actualizar después de cambios
git pull
docker-compose up -d --build
```

---

## Soporte

Si encuentras problemas:
1. Verificar logs del backend
2. Verificar conexión a base de datos
3. Verificar variables de entorno

---

*Sistema PROVIAL v2.0.0 - Guía de Despliegue*
