## API для frontend

### Базовые правила

- Базовый префикс всех endpoint: `/api`
- Формат запросов и ответов: `application/json`
- Защищенные endpoint требуют заголовок:
  - `Authorization: Bearer <access_token>`
- Swagger:
  - `GET /docs`
  - `GET /redoc`

### Формат ошибок

Ошибки из бизнес-логики:

```json
{
  "detail": "Текст ошибки"
}
```

Ошибки валидации FastAPI/Pydantic (422):

```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "Описание ошибки",
      "type": "..."
    }
  ]
}
```

---

## 1) Авторизация

### 1.1 `POST /api/auth/register`

Регистрация пользователя.

**Request body**

```json
{
  "email": "user@example.com",
  "username": "my_name",
  "password": "strong_password_123"
}
```

**Поля**

- `email` — строка, 5..255, приводится к lowercase
- `username` — строка, 3..100
- `password` — строка, 8..128

**Response 201**

```json
{
  "access_token": "<jwt_access>",
  "refresh_token": "<jwt_refresh>",
  "token_type": "bearer",
  "user": {
    "id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
    "email": "user@example.com",
    "username": "my_name",
    "is_active": true,
    "created_at": "2026-04-16T12:00:00+00:00",
    "updated_at": "2026-04-16T12:00:00+00:00"
  }
}
```

**Ошибки**

- `409` — email или username уже заняты
- `422` — ошибка валидации

---

### 1.2 `POST /api/auth/login`

Вход по email и паролю.

**Request body**

```json
{
  "email": "user@example.com",
  "password": "strong_password_123"
}
```

**Response 200**

```json
{
  "access_token": "<jwt_access>",
  "refresh_token": "<jwt_refresh>",
  "token_type": "bearer",
  "user": {
    "id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
    "email": "user@example.com",
    "username": "my_name",
    "is_active": true,
    "created_at": "2026-04-16T12:00:00+00:00",
    "updated_at": "2026-04-16T12:00:00+00:00"
  }
}
```

**Ошибки**

- `401` — неверный email/пароль, деактивированный пользователь
- `422` — ошибка валидации

---

### 1.3 `POST /api/auth/refresh`

Обновление пары токенов по refresh-токену.

**Request body**

```json
{
  "refresh_token": "<jwt_refresh>"
}
```

**Response 200**

```json
{
  "access_token": "<new_jwt_access>",
  "refresh_token": "<new_jwt_refresh>",
  "token_type": "bearer"
}
```

**Ошибки**

- `401` — невалидный токен, неверный тип токена, пользователь не найден/деактивирован
- `422` — ошибка валидации

---

### 1.4 `POST /api/auth/logout`

Логаут. Кладет текущий access-токен в blacklist до срока его истечения.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
{
  "detail": "Вы успешно вышли из системы."
}
```

**Ошибки**

- `401` — нет Bearer токена, токен невалидный/просроченный, неверный тип токена

---

### 1.5 `GET /api/auth/me`

Получение текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
{
  "id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "email": "user@example.com",
  "username": "my_name",
  "is_active": true,
  "created_at": "2026-04-16T12:00:00+00:00",
  "updated_at": "2026-04-16T12:00:00+00:00"
}
```

**Ошибки**

- `401` — нет Bearer токена, токен невалидный/отозван, пользователь не найден/деактивирован

---

## 2) Упражнения

### 2.1 `POST /api/exercises`

Создание пользовательского упражнения.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

```json
{
  "name": "Жим гантелей сидя",
  "description": "Контроль лопаток и плавное движение",
  "muscle_groups": ["плечи", "трицепс"],
  "equipment": "гантели"
}
```

**Поля**

- `name` — строка, 1..255
- `description` — `string | null`, максимум 2000
- `muscle_groups` — массив строк, 1..20 элементов, без дублей
- `equipment` — `string | null`, максимум 120

Что делает backend:

- убирает пробелы по краям строк
- `muscle_groups` приводит к lowercase
- проверяет дубль названия упражнения у текущего пользователя

**Response 201**

```json
{
  "id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
  "created_by_user_id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "name": "Жим гантелей сидя",
  "description": "Контроль лопаток и плавное движение",
  "muscle_groups": ["плечи", "трицепс"],
  "equipment": "гантели",
  "created_at": "2026-04-16T12:15:00+00:00",
  "updated_at": "2026-04-16T12:15:00+00:00"
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `409` — у пользователя уже есть упражнение с таким именем
- `422` — ошибка валидации

---

## 3) Тренировки

### 3.1 `POST /api/workouts`

Создание тренировки с привязкой упражнений.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

```json
{
  "title": "Push Day",
  "is_planned": true,
  "planned_for": "2026-04-20T18:00:00Z",
  "description": "Легкая неделя, техника",
  "exercises": [
    {
      "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89"
    },
    {
      "exercise_id": "6f7dd56f-8188-4e93-aa62-5e2e453de0db"
    }
  ]
}
```

**Поля**

- `title` — строка, 1..255
- `is_planned` — boolean
- `planned_for` — `datetime | null`
- `description` — `string | null`, максимум 2000
- `exercises` — массив 1..100, каждый элемент: `{ "exercise_id": "UUID" }`

**Правила**

- если `is_planned = true`, поле `planned_for` обязательно
- если `is_planned = false`, `planned_for` должно быть `null`
- `exercise_id` внутри одной тренировки не должны повторяться
- можно использовать:
  - системные упражнения
  - свои пользовательские упражнения
- нельзя использовать чужие пользовательские упражнения
- `order_index` в запросе не передаётся — backend ставит его по позиции элемента в массиве

**Response 201**

```json
{
  "id": "f642622f-42eb-4392-83f1-27c4f1433414",
  "user_id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "title": "Push Day",
  "is_planned": true,
  "planned_for": "2026-04-20T18:00:00+00:00",
  "description": "Легкая неделя, техника",
  "exercises": [
    {
      "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
      "order_index": 1
    },
    {
      "exercise_id": "6f7dd56f-8188-4e93-aa62-5e2e453de0db",
      "order_index": 2
    }
  ],
  "created_at": "2026-04-16T12:20:00+00:00",
  "updated_at": "2026-04-16T12:20:00+00:00"
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `403` — попытка использовать чужое пользовательское упражнение
- `404` — одно или несколько упражнений не найдены
- `422` — ошибка валидации

---

## Быстрый рабочий сценарий для frontend

1. Пользователь регистрируется (`POST /api/auth/register`) или логинится (`POST /api/auth/login`).
2. Frontend сохраняет `access_token` и `refresh_token`.
3. При истечении `access_token` вызывает `POST /api/auth/refresh`.
4. Пользователь создает свое упражнение через `POST /api/exercises`.
5. Frontend берет `id` созданного упражнения.
6. Frontend создает тренировку через `POST /api/workouts`, передавая `exercises[{exercise_id}]`.
