FROM nginx:alpine

# Rimuovi la configurazione di default
RUN rm /etc/nginx/conf.d/default.conf

# Copia la configurazione personalizzata
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

# Crea directory per i certificati SSL
RUN mkdir -p /etc/nginx/ssl

# Genera certificato self-signed
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/nginx.key \
    -out /etc/nginx/ssl/nginx.crt \
    -subj "/C=IT/ST=Italy/L=Rome/O=42/OU=Transcendence/CN=localhost"

EXPOSE 443 80

CMD ["nginx", "-g", "daemon off;"]
