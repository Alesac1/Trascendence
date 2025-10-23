FROM debian:latest

RUN apt-get update && apt-get upgrade -y

COPY ./App ./App

RUN chmod +x ./App/entrypoint.sh

ENTRYPOINT ["./App/entrypoint.sh"]