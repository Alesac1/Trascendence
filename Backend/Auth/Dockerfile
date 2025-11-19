FROM node:20-alpine

WORKDIR /app

# Copia package.json e installa dipendenze
COPY App/package*.json ./
RUN npm install

# Copia il resto dell'applicazione
COPY App/ .

EXPOSE 3001

CMD ["npm", "start"]
