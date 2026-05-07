# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite embebe estas vars en tiempo de build
ARG VITE_API_URL=/api
ARG VITE_SOCKET_URL=
ARG VITE_APP_ENV=production
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
ENV VITE_APP_ENV=$VITE_APP_ENV

RUN npm run build

# Serve stage — nginx sirve el build estático
FROM nginx:alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
