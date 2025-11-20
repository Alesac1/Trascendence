FROM node:20-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

# Copia package.json e installa dipendenze
COPY App/package*.json ./
RUN npm install --omit=dev

# Copia il resto dell'applicazione
COPY App/ .

# Ensure the SQLite data directory exists (can be overridden by a volume)
RUN mkdir -p data

EXPOSE 3001

CMD ["npm", "start"]
