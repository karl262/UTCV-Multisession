FROM node:20-alpine

WORKDIR /app

# Copiar dependencias e instalar:
COPY package*.json ./
RUN npm install

# Instalar Angular CLI globalmente dentro del contenedor:
RUN npm install -g @angular/cli@21

# Copiar el resto del proyecto:
COPY . .

# Exponer el puerto del servidor de desarrollo de Angular:
EXPOSE 4200

# Iniciar en modo desarrollo con acceso desde cualquier IP (necesario en Docker):
CMD ["ng", "serve", "--host", "0.0.0.0", "--port", "4200"]
