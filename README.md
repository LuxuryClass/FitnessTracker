# Fitness Crack

## Docker

```bash
# Первый запуск (сборка)
docker compose up --build -d
# Обычный повторный запуск (без пересборки)
docker compose up -d
# Логи API:
docker compose logs -f api
# Остановить контейнеры:
docker compose down