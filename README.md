# Sistema Provial Integral

# PROVIAL - Sistema Integral de Gestión Vial

Sistema completo para la gestión de incidentes viales, brigadas, y operaciones de carreteras en Guatemala.

## 🏗️ Arquitectura

- **Backend**: Node.js + TypeScript + Express + PostgreSQL
- **Mobile**: React Native + Expo (Brigadas)
- **Web**: React + TypeScript (Centro de Control)
- **Database**: PostgreSQL 16 + Redis

## 📁 Estructura del Proyecto

```
proyectoProvialMovilWeb/
├── backend/          # API REST
├── mobile/           # App móvil (Brigadas)
├── web/              # Panel web (COP/Operaciones)
├── migrations/       # Migraciones SQL
├── docker/           # Configuración Docker
└── shared/           # Tipos compartidos
```

## 🚀 Inicio Rápido

### 1. Levantar Base de Datos
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
npm install
npm run dev
```

### 3. Mobile
```bash
cd mobile
npm install
npx expo start
```

### 4. Web
```bash
cd web
npm install
npm run dev
```

## 📚 Documentación

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura técnica completa
- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) - Diseño de base de datos
- [ESTADO_ACTUAL.md](./ESTADO_ACTUAL.md) - Estado actual del proyecto
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Guía de inicio
- [INSTALL_GUIDE.md](./INSTALL_GUIDE.md) - Instalación detallada


## 📦 Dependencias Principales

- PostgreSQL 16
- Node.js 20+
- React Native (Expo SDK 54)
- TypeScript 5.9+

## 🛠️ Estado del Proyecto

**Última actualización**: Diciembre 2025

**Funcionalidades Implementadas**:
- ✅ Autenticación y roles
- ✅ Gestión de turnos y asignaciones
- ✅ Salidas e ingresos a sede
- ✅ Reportes de incidentes (en desarrollo - normalización de datos)
- ✅ Bitácora de situaciones
- ✅ Gestión de grupos y calendario

**En Desarrollo**:
- 🚧 Sistema de inteligencia (historial de vehículos/pilotos)
- 🚧 Formularios detallados de incidentes
- 🚧 Dashboard de análisis

## 📄 Licencia

UNLICENSED - Uso interno

### Mobile
- **Framework:** React Native + Expo
- **Navegación:** Expo Router
- **Estado:** Zustand + Immer
- **UI:** React Native Paper

### Infraestructura
- **Contenedores:** Docker + Docker Compose
- **Proxy:** Nginx
- **CI/CD:** GitHub Actions (opcional)
- **Hosting:** VPS (Hetzner/Contabo/DigitalOcean)

## 🚀 Quick Start

### Prerrequisitos
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/tu-org/proyecto-provial.git
cd proyecto-provial

# Instalar dependencias de todo el monorepo
npm install
```

### 2. Levantar servicios con Docker

```bash
# Iniciar PostgreSQL + Redis
docker-compose up -d

# Esperar a que PostgreSQL esté listo
sleep 5

# Ejecutar migraciones
cd migrations
./run_migrations.sh postgresql://postgres:postgres@localhost:5432/provial_db

# O en Windows:
psql postgresql://postgres:postgres@localhost:5432/provial_db -f 001_create_extensions.sql
# ... ejecutar cada migración en orden
```

### 3. Configurar variables de entorno

```bash
# Backend
cp backend/.env.example backend/.env
# Editar backend/.env con tus configuraciones

# Web
cp web/.env.example web/.env
```

### 4. Iniciar en modo desarrollo

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Web
cd web
npm run dev

# Terminal 3: Mobile
cd mobile
npm run start
```

## 📚 Documentación

- **[DATABASE_DESIGN.md](./DATABASE_DESIGN.md)** - Modelo de datos completo con DER
- **[migrations/README.md](./migrations/README.md)** - Guía de migraciones de BD
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Arquitectura del sistema (pendiente)
- **[API.md](./backend/API.md)** - Documentación de endpoints (pendiente)

## 📋 Fases de Desarrollo

### ✅ Fase 0: Infraestructura
- [x] Diseño de base de datos
- [x] Migraciones SQL
- [x] Estructura de monorepo
- [ ] Docker Compose configurado
- [ ] Documentación de arquitectura

### 🔨 Fase 1: API Core + Auth (En progreso)
- [ ] Setup backend con Express + TypeScript
- [ ] Autenticación JWT
- [ ] CRUD catálogos
- [ ] WebSockets base

### 📱 Fase 2: App Móvil Brigadas
- [ ] Desarrollo de app React Native
- [ ] Login y auth
- [ ] CRUD incidentes
- [ ] Generación de mensajes WhatsApp
- [ ] Modo offline básico

### 💻 Fase 3: Panel Web COP
- [ ] Dashboard de incidentes
- [ ] Tablero de estado de unidades
- [ ] Tiempo real con WebSockets
- [ ] Gestión de actividades

### 📊 Fase 4: Reportes Automatizados
- [ ] Reporte diario de actividades
- [ ] Hoja de accidentología
- [ ] Generación de PDFs

### 🗺️ Fase 5: Dashboard Radar COP
- [ ] Mapa de incidentes activos
- [ ] Búsqueda rápida
- [ ] Interfaz para llamadas

### 🌐 Fase 6: Portal Público
- [ ] App/web pública tipo Waze
- [ ] Reportes ciudadanos
- [ ] Gestión de reportes en COP

### 📈 Fase 7: Métricas y BI
- [ ] Dashboard estadístico
- [ ] Reportes de no atendidos
- [ ] Exportación de datos

### 🔐 Fase 8: Producción
- [ ] Seguridad y auditoría
- [ ] Despliegue en VPS
- [ ] Backups automáticos
- [ ] Capacitación
- [ ] Monitoreo

## 🤝 Contribuir

(Instrucciones de contribución - ajustar según tu flujo)

## 📄 Licencia

(Especificar licencia)

## 👥 Equipo

(Créditos del equipo de desarrollo)

---

**Versión:** 1.0.0-alpha
**Última actualización:** 2025-01-26
