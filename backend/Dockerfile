# Imagen base: Node.js 20 LTS en Alpine (imagen ligera)
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor:
WORKDIR /app

# Copiar package.json e instalar dependencias primero.
# Docker cachea esta capa. Si package.json no cambia,
# no reinstala dependencias en cada rebuild.
COPY package*.json ./
RUN npm install --production

# Copiar el resto del codigo fuente:
COPY . .

# Exponer el puerto que usa el servidor:
EXPOSE 3000

# Comando para iniciar la aplicacion:
CMD ["npm", "start"]