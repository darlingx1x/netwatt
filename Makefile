.PHONY: help up down logs restart ps fmt lint typecheck test test-backend test-frontend migrate migration seed check fresh shell-backend shell-db

COMPOSE := docker compose
BACKEND := $(COMPOSE) exec backend
FRONTEND := $(COMPOSE) exec frontend

help:
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

up: ## Поднять dev-стек
	$(COMPOSE) up -d --build
	@echo "Backend:  http://localhost:8000/docs"
	@echo "Frontend: http://localhost:5173"
	@echo "Adminer:  http://localhost:8080"

down: ## Остановить стек
	$(COMPOSE) down

logs: ## Логи всех сервисов
	$(COMPOSE) logs -f --tail=200

restart: ## Перезапустить бэкенд
	$(COMPOSE) restart backend worker

ps: ## Список сервисов
	$(COMPOSE) ps

fmt: ## Форматирование
	$(BACKEND) ruff format src tests
	$(BACKEND) ruff check --fix src tests

lint: ## Линтеры
	$(BACKEND) ruff check src tests
	$(BACKEND) mypy src
	$(FRONTEND) npm run lint

typecheck: ## TS + mypy
	$(BACKEND) mypy src
	$(FRONTEND) npm run typecheck

test-backend: ## Backend pytest
	$(BACKEND) pytest --cov=netwatt --cov-report=term-missing

test-frontend: ## Frontend vitest
	$(FRONTEND) npm run test

test: test-backend test-frontend ## Все тесты

migrate: ## Применить миграции
	$(BACKEND) alembic upgrade head

migration: ## Сгенерировать миграцию: make migration msg="add table"
	$(BACKEND) alembic revision --autogenerate -m "$(msg)"

seed: ## Залить сиды
	$(BACKEND) python -m netwatt.cli seed

check: lint typecheck test ## fmt+lint+typecheck+test

fresh: ## Снести всё и пересоздать
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build
	sleep 5
	$(MAKE) migrate

shell-backend: ## Shell в backend
	$(BACKEND) bash

shell-db: ## psql
	$(COMPOSE) exec postgres psql -U netwatt -d netwatt
