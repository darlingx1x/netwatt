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
- http://localhost:5173 — frontend
- http://localhost:8000/docs — Swagger
- http://localhost:8080 — Adminer

## Команды разработки

```bash
make fmt     # форматирование
make lint    # линтеры
make test    # тесты
make check   # всё вышеперечисленное
make fresh   # снести всё и пересоздать
```
