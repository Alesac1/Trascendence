FROM node:22-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		git \
		python3 \
		build-essential \
	&& rm -rf /var/lib/apt/lists/*

COPY ./App /App

RUN chmod +x /App/entrypoint.sh

WORKDIR /App/DeployContract
RUN npm install

WORKDIR /App/srcs
RUN npm install

EXPOSE 3000

WORKDIR /App
ENTRYPOINT ["./entrypoint.sh"]