# syntax=docker/dockerfile:1
FROM node:20-alpine

ENV NODE_ENV=production

# Directorio de trabajo
WORKDIR /app

# Copiar solo manifiestos para aprovechar la caché de capas
COPY package*.json ./

# Instalar únicamente dependencias de producción
RUN npm install --omit=dev && npm cache clean --force

# Copiar el código fuente con propietario no root
COPY --chown=node:node src ./src

# Shift-Left Security: ejecutar como usuario no root
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
