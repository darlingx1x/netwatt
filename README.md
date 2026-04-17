# NetWatt

Система оптимизации энергопотребления сетевой инфраструктуры. ВКР ТУИТ 2026.

## Быстрый старт

```bash
make up      # поднять dev-стек
make migrate # применить миграции
make seed    # залить каталог и демо-юзеров
make logs    # смотреть логи
make down    # остановить всё
```

Открыть:
- http://localhost:5180 — frontend
- http://localhost:8001/docs — Swagger
- Adminer — не используется в локальном режиме; подключайся через `psql -U netwatt -d netwatt`

## Локальный запуск (без Docker)

```bash
# Postgres + NATS
brew services start postgresql@16
nats-server -js -sd /tmp/nats-netwatt &

# Backend
cd backend && source .venv/bin/activate
uvicorn netwatt.main:app --reload --host 0.0.0.0 --port 8001 &

# Frontend
cd frontend && npm run dev
```

## Команды разработки

```bash
make fmt     # форматирование
make lint    # линтеры
make test    # тесты
make check   # всё вышеперечисленное
make fresh   # снести всё и пересоздать
```
