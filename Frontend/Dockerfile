FROM node:20-alpine

WORKDIR /app

# Copia package.json e installa dipendenze
COPY package*.json ./
RUN npm install

# Copia il resto dell'applicazione
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
