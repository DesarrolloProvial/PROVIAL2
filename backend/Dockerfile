# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar tsconfig (necesario para que tsc funcione)
COPY tsconfig.json ./

# Copiar código fuente
COPY src ./src

# Compilar TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Crear directorio de uploads
RUN mkdir -p /app/uploads && chown -R node:node /app

# Copiar package files
COPY package*.json ./

# Copiar tsconfig para validar en producción (opcional)
COPY tsconfig.json ./

# Instalar solo dependencias de producción
RUN npm install --omit=dev && npm cache clean --force

# Copiar código compilado
COPY --from=builder /app/dist ./dist

# Usar usuario no-root
USER node

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Comando de inicio
CMD ["node", "dist/index.js"]