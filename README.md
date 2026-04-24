# Fitness Tracker

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
```

## Frontend (Vite)

```bash
cd frontend
npm install
npm run dev
```

Сборка frontend:
```bash
npm run build
```
