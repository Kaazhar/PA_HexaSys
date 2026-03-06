FROM node:18-alpine

WORKDIR /app

# Copie package.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copie tout le code
COPY . .

# Expose le port
EXPOSE 3000

# Démarre le dev server
CMD ["npm", "start"]
