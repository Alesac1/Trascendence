# **************************************************************************** #
#                                                                              #
#                                                         :::      ::::::::    #
#    Makefile                                           :+:      :+:    :+:    #
#                                                     +:+ +:+         +:+      #
#    By: dde-giov <dde-giov@student.42roma.it>      +#+  +:+       +#+         #
#                                                 +#+#+#+#+#+   +#+            #
#    Created: 2025/10/16 13:47:18 by dde-giov          #+#    #+#              #
#    Updated: 2025/10/16 13:53:02 by dde-giov         ###   ########.fr        #
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
CMPYML :=	./docker-compose.yml

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
	@echo "$(YELLOW)fix-permissions$(CLR_RMV)    - Configure Docker to run without sudo"

.PHONY: all up build clean prune down re restart fix-permissions
