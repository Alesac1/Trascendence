# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dde-giov <dde-giov@student.42roma.it>      +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/10/16 13:47:18 by dde-giov          #+#    #+#              #
#    Updated: 2025/11/23 21:50:30 by dde-giov         ###   ########.fr        #
#                                                                              #
# **************************************************************************** #

NAME = Trascendence

USER := $(shell whoami)

# COLORS
CLR_RMV := \033[0m
RED := \033[1;31m
GREEN := \033[1;32m
YELLOW := \033[1;33m
BLUE := \033[1;34m
CYAN := \033[1;36m

RM := sudo rm -rf
DKCMP :=	docker compose -f
CMPYML :=	./docker-compose.yaml

all: $(NAME)

$(NAME):
	@echo "$(GREEN)Starting building $(CLR_RMV)of $(YELLOW)$(NAME) $(CLR_RMV)..."
	$(DKCMP) $(CMPYML) build
	
	$(DKCMP) $(CMPYML) up -d
	@echo "$(GREEN)$(NAME) started  $(CLR_RMV) ✔️"

build: $(NAME)

up:
	@echo "$(GREEN)Starting $(NAME) $(CLR_RMV)..."
	$(DKCMP) $(CMPYML) up -d
	@echo "$(GREEN)$(NAME) started  $(CLR_RMV) ✔️"

clean:
	@echo "$(RED)Stopping containers $(CLR_RMV)"
	@if [ -n "$$(docker ps -qa)" ]; then \
		docker stop $$(docker ps -qa); \
	fi

	@echo "$(RED)Removing containers $(CLR_RMV)"
	@if [ -n "$$(docker ps -qa)" ]; then \
		docker rm $$(docker ps -qa); \
	fi

	@echo "$(RED)Removing images $(CLR_RMV)"
	@if [ -n "$$(docker images -qa)" ]; then \
		docker rmi -f $$(docker images -qa); \
	fi

	@echo "$(RED)Removing volumes $(CLR_RMV)"
	@if [ -n "$$(docker volume ls -q)" ]; then \
		docker volume rm $$(docker volume ls -q); \
	fi

	@echo "$(RED)Removing networks $(CLR_RMV)"
	@if [ -n "$$(docker network ls --format '{{.Name}}' | grep -v 'bridge\|host\|none')" ]; then \
		docker network rm $$(docker network ls --format '{{.Name}}' | grep -v 'bridge\|host\|none'); \
	fi

prune: clean
	@docker system prune -a --volumes -f

down:
	@echo "$(RED)Stopping containers $(CLR_RMV)"
	$(DKCMP) $(CMPYML) down

re: clean all

restart: down up

fix-permissions:
	@echo "$(CYAN)Configuring Docker to run without sudo...$(CLR_RMV)"
	@if ! getent group docker > /dev/null; then \
		echo "$(YELLOW)Creating Docker group...$(CLR_RMV)"; \
		sudo groupadd docker; \
	else \
		echo "$(GREEN)Docker group already exists$(CLR_RMV)"; \
	fi
	@if ! groups $(USER) | grep -q docker; then \
		echo "$(YELLOW)Adding user $(USER) to Docker group...$(CLR_RMV)"; \
		sudo usermod -aG docker $(USER); \
		echo "$(YELLOW)Please log out and log back in for the group changes to take effect.$(CLR_RMV)"; \
	else \
		echo "$(GREEN)User $(USER) is already in the Docker group$(CLR_RMV)"; \
	fi

help:
	@echo "Available commands:"
	@echo "$(YELLOW)all$(CLR_RMV)                - Build and start the project"
	@echo "$(YELLOW)build$(CLR_RMV)              - Alias for 'all', build the project"
	@echo "$(YELLOW)up$(CLR_RMV)                 - Start the containers"
	@echo "$(YELLOW)clean$(CLR_RMV)              - Stop and remove containers, images, volumes, and networks"
	@echo "$(YELLOW)prune$(CLR_RMV)              - Clean everything and remove unused Docker resources"
	@echo "$(YELLOW)down$(CLR_RMV)               - Stop containers and bring down the services"
	@echo "$(YELLOW)re$(CLR_RMV)                 - Clean and rebuild the project"
	@echo "$(YELLOW)restart$(CLR_RMV)            - Restart the services (down and up)"
	@echo "$(YELLOW)env$(CLR_RMV)                - Ensure .env exists and contains JWT keys"
	@echo "$(YELLOW)fix-permissions$(CLR_RMV)    - Configure Docker to run without sudo"

env:
	@echo "$(CYAN)Ensuring project .env exists$(CLR_RMV)"
	@if [ ! -f .env ]; then \
		cp .env.example .env 2>/dev/null || touch .env; \
		echo "$(GREEN)Created new .env file$(CLR_RMV)"; \
	fi
	@echo "$(CYAN)Syncing microservice env files$(CLR_RMV)"
	@find Backend -mindepth 2 -maxdepth 2 -path '*/App' -type d 2>/dev/null | while read -r appdir; do \
		for subdir in "$$appdir" "$$appdir/src"; do \
			[ -d "$$subdir" ] || continue; \
			if [ -f "$$subdir/.env.example" ]; then \
				if [ ! -f "$$subdir/.env" ]; then \
					cp "$$subdir/.env.example" "$$subdir/.env"; \
					echo "$(GREEN)Created $$subdir/.env from template$(CLR_RMV)"; \
				else \
					echo "$(YELLOW)$$subdir/.env already exists$(CLR_RMV)"; \
				fi; \
			fi; \
		done; \
		if [ ! -f "$$appdir/.env.example" ] && [ ! -f "$$appdir/src/.env.example" ]; then \
			echo "$(YELLOW)No .env.example in $$appdir or $$appdir/src$(CLR_RMV)"; \
		fi; \
	done
	@BLOCKCHAIN_ENV="Backend/Blockchain/App/src/.env"; \
	if [ -f "$$BLOCKCHAIN_ENV" ]; then \
		CURRENT_KEY_RAW=$$(awk -F= '/^PRIVATE_KEY=/{print $$2}' "$$BLOCKCHAIN_ENV"); \
		CURRENT_KEY_STRIPPED=$$(printf "%s" "$$CURRENT_KEY_RAW" | tr -d '[:space:]'); \
		if [ -z "$$CURRENT_KEY_STRIPPED" ] || printf "%s" "$$CURRENT_KEY_STRIPPED" | grep -q '^//'; then \
			printf "$(YELLOW)Enter PRIVATE_KEY for Backend/Blockchain (input hidden): $(CLR_RMV)"; \
			if [ -t 0 ]; then stty -echo; fi; \
			read -r NEW_KEY; \
			if [ -t 0 ]; then stty echo; fi; \
			printf "\n"; \
			if grep -q '^PRIVATE_KEY=' "$$BLOCKCHAIN_ENV"; then \
				sed -i "s|^PRIVATE_KEY=.*|PRIVATE_KEY=$$NEW_KEY|" "$$BLOCKCHAIN_ENV"; \
			else \
				echo "PRIVATE_KEY=$$NEW_KEY" >> "$$BLOCKCHAIN_ENV"; \
			fi; \
			echo "$(GREEN)PRIVATE_KEY stored in $$BLOCKCHAIN_ENV$(CLR_RMV)"; \
		else \
			echo "$(GREEN)PRIVATE_KEY already set for Backend/Blockchain$(CLR_RMV)"; \
		fi; \
	else \
		echo "$(YELLOW)Missing $$BLOCKCHAIN_ENV file$(CLR_RMV)"; \
	fi
	@JWT_PRIV=$$(awk -F= '/^jwt_pub_key=/{print $$2}' .env); \
	JWT_PUB=$$(awk -F= '/^jwt_pub=/{print $$2}' .env); \
	VALID_PRIV=0; \
	VALID_PUB=0; \
	if [ -n "$$JWT_PRIV" ]; then \
		if printf "%s" "$$JWT_PRIV" | base64 --decode 2>/dev/null | grep -q -- '-----BEGIN RSA PRIVATE KEY-----'; then \
			VALID_PRIV=1; \
		fi; \
	fi; \
	if [ -n "$$JWT_PUB" ]; then \
		if printf "%s" "$$JWT_PUB" | base64 --decode 2>/dev/null | grep -Eq -- '-----BEGIN (RSA )?PUBLIC KEY-----'; then \
			VALID_PUB=1; \
		fi; \
	fi; \
	if [ "$$VALID_PRIV" -eq 1 ] && [ "$$VALID_PUB" -eq 1 ]; then \
		echo "$(GREEN)JWT keys already present in .env$(CLR_RMV)"; \
		exit 0; \
	fi; \
	TMPDIR=$$(mktemp -d); \
	trap 'rm -rf "$$TMPDIR"' EXIT; \
	echo "$(CYAN)Generating JWT key pair$(CLR_RMV)"; \
	ssh-keygen -t rsa -b 4096 -m PEM -N '' -f "$$TMPDIR/jwt" >/dev/null; \
	if ! openssl rsa -in "$$TMPDIR/jwt" -pubout -out "$$TMPDIR/jwt_public.pem" >/dev/null 2>&1; then \
		ssh-keygen -f "$$TMPDIR/jwt.pub" -e -m PKCS8 > "$$TMPDIR/jwt_public.pem"; \
	fi; \
	PRIV_KEY=$$(base64 < "$$TMPDIR/jwt" | tr -d '\n'); \
	PUB_KEY=$$(base64 < "$$TMPDIR/jwt_public.pem" | tr -d '\n'); \
	if grep -q '^jwt_pub_key=' .env; then \
		sed -i "s|^jwt_pub_key=.*|jwt_pub_key=$$PRIV_KEY|" .env; \
	else \
		echo "jwt_pub_key=$$PRIV_KEY" >> .env; \
	fi; \
	if grep -q '^jwt_pub=' .env; then \
		sed -i "s|^jwt_pub=.*|jwt_pub=$$PUB_KEY|" .env; \
	else \
		echo "jwt_pub=$$PUB_KEY" >> .env; \
	fi; \
	echo "$(GREEN)JWT keys generated and stored in .env (base64)$(CLR_RMV)"

.PHONY: all up build clean prune down re restart fix-permissions env
