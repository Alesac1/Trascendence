FROM node:20-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

# Copia package.json e installa dipendenze
COPY App/package*.json ./
RUN npm install --omit=dev

# Copia il resto dell'applicazione
COPY App/ .

RUN mkdir -p database

EXPOSE 3006

CMD ["npm", "start"]
