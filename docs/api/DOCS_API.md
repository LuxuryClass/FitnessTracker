## API для frontend

### Базовые правила

- Базовый префикс всех endpoint: `/api`
- Формат запросов и ответов: `application/json`
- Защищенные endpoint требуют заголовок:
  - `Authorization: Bearer <access_token>`
- Refresh-токен хранится в `HttpOnly` cookie и отправляется браузером автоматически.
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
  "name": "my_name",
  "password": "strong_password_123"
}
```

**Поля**

- `email` — строка, 5..255, приводится к lowercase
- `name` — строка, 3..100
- `password` — строка, 8..128

**Response 201**

```json
{
  "access_token": "<jwt_access>",
  "token_type": "bearer",
  "user": {
    "id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
    "email": "user@example.com",
    "name": "my_name",
    "gender": null,
    "birth_date": null,
    "height": null,
    "weight": null,
    "avatar_url": null,
    "is_active": true,
    "streak_weeks": 0,
    "weekly_volume_tons": 0.0,
    "weekly_sessions_progress": {
      "completed": 0,
      "total": 0
    },
    "created_at": "2026-04-16T12:00:00+00:00",
    "updated_at": "2026-04-16T12:00:00+00:00"
  }
}
```

**Set-Cookie**

- В ответе backend выставляет `HttpOnly` cookie с refresh-токеном.

**Ошибки**

- `409` — email или name уже заняты
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
  "token_type": "bearer",
  "user": {
    "id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
    "email": "user@example.com",
    "name": "my_name",
    "gender": null,
    "birth_date": null,
    "height": null,
    "weight": null,
    "avatar_url": null,
    "is_active": true,
    "streak_weeks": 0,
    "weekly_volume_tons": 0.0,
    "weekly_sessions_progress": {
      "completed": 0,
      "total": 0
    },
    "created_at": "2026-04-16T12:00:00+00:00",
    "updated_at": "2026-04-16T12:00:00+00:00"
  }
}
```

**Set-Cookie**

- В ответе backend выставляет `HttpOnly` cookie с refresh-токеном.

**Ошибки**

- `401` — неверный email/пароль, деактивированный пользователь
- `422` — ошибка валидации

---

### 1.3 `POST /api/auth/refresh`

Обновление access-токена по refresh-токену из `HttpOnly` cookie.

**Cookies**

- `refresh_token` (имя cookie определяется backend-настройкой)

**Response 200**

```json
{
  "access_token": "<new_jwt_access>",
  "token_type": "bearer"
}
```

**Set-Cookie**

- В ответе backend выставляет новую `HttpOnly` cookie с ротированным refresh-токеном.

**Ошибки**

- `401` — refresh cookie отсутствует, токен невалидный/просроченный, неверный тип токена, refresh-сессия отозвана, пользователь не найден/деактивирован

---

### 1.4 `POST /api/auth/logout`

Логаут. Кладет текущий access-токен в Redis blacklist до срока его истечения (best-effort), отзывает refresh-сессию в Redis (если refresh cookie передана) и очищает refresh cookie.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
{
  "detail": "Вы успешно вышли из системы."
}
```

**Set-Cookie**

- В ответе backend удаляет refresh cookie.

**Ошибки**

- `401` — нет Bearer токена, токен невалидный/просроченный, неверный тип токена

---

## 2) Профиль пользователя

### 2.1 `GET /api/users/me`

Получение текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
{
  "id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "email": "user@example.com",
  "name": "my_name",
  "gender": "male",
  "birth_date": "1999-01-15",
  "height": 180,
  "weight": 80,
  "avatar_url": "https://t3.storageapi.dev/...X-Amz-Signature=...",
  "is_active": true,
  "streak_weeks": 3,
  "weekly_volume_tons": 1.4,
  "weekly_sessions_progress": {
    "completed": 2,
    "total": 4
  },
  "created_at": "2026-04-16T12:00:00+00:00",
  "updated_at": "2026-04-16T12:00:00+00:00"
}
```

`weekly_sessions_progress` считается так:

- `completed` — сколько сессий завершено в текущей неделе;
- `total` — `completed + сколько сессий запланировано на оставшиеся дни текущей недели`.

**Ошибки**

- `401` — нет Bearer токена, токен невалидный/отозван, пользователь не найден/деактивирован

---

### 2.2 `PATCH /api/users/me`

Обновление профиля текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

Передается минимум одно поле:

```json
{
  "email": "new_email@example.com",
  "name": "new_name"
}
```

**Поля**

- `email` — `string | optional`, 5..255, нормализуется в lowercase
- `name` — `string | optional`, 3..100

**Response 200**

```json
{
  "id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "email": "new_email@example.com",
  "name": "new_name",
  "avatar_url": "https://t3.storageapi.dev/...X-Amz-Signature=...",
  "is_active": true,
  "streak_weeks": 3,
  "weekly_volume_tons": 1.4,
  "weekly_sessions_progress": {
    "completed": 2,
    "total": 4
  },
  "created_at": "2026-04-16T12:00:00+00:00",
  "updated_at": "2026-04-18T10:00:00+00:00"
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `409` — email или name уже заняты
- `422` — ошибка валидации

---

### 2.3 `POST /api/users/me/avatar`

Загрузка новой аватарки текущего пользователя в bucket.
При успешной замене новая аватарка становится текущей, а предыдущий файл удаляется из bucket.

**Headers**

- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Form-data**

- `avatar` — файл изображения (`image/*`), максимум `5 MB`.

**Response 200**

```json
{
  "id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "email": "user@example.com",
  "name": "my_name",
  "avatar_url": "https://t3.storageapi.dev/...X-Amz-Signature=...",
  "is_active": true,
  "streak_weeks": 3,
  "weekly_volume_tons": 1.4,
  "weekly_sessions_progress": {
    "completed": 2,
    "total": 4
  },
  "created_at": "2026-04-16T12:00:00+00:00",
  "updated_at": "2026-04-18T10:00:00+00:00"
}
```

**Ошибки**

- `avatar_url` в ответе — это presigned GET URL (временная ссылка, генерируется backend-ом).
- `400` — файл не изображение, пустой файл, файл больше 5 MB, storage не настроен
- `401` — нет/невалидный access-токен

---

### 2.4 `GET /api/users/me/recent-progress`

Получение топ-3 упражнений по частоте выполнения за последние 30 дней с расчётом прогресса.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
[
  {
    "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
    "exercise_name": "Жим лёжа",
    "muscle_group": "грудь",
    "difference_kg": 5.0,
    "recent_max_weight_kg": 80.0,
    "previous_max_weight_kg": 75.0
  },
  {
    "exercise_id": "6f7dd56f-8188-4e93-aa62-5e2e453de0db",
    "exercise_name": "Приседания",
    "muscle_group": "ноги",
    "difference_kg": -2.5,
    "recent_max_weight_kg": 117.5,
    "previous_max_weight_kg": 120.0
  },
  {
    "exercise_id": "2f4bc4c2-2df2-4c3e-ab64-1f0d2c137fee",
    "exercise_name": "Жим гантелей сидя",
    "muscle_group": "плечи",
    "difference_kg": 10.0,
    "recent_max_weight_kg": 30.0,
    "previous_max_weight_kg": 20.0
  }
]
```

Если пользователь не выполнял упражнения за последние 30 дней или выполнял каждое только 1 раз, возвращается пустой массив `[]`.

**Поля ответа**

- `exercise_id` — UUID упражнения
- `exercise_name` — название упражнения
- `muscle_group` — первая группа мышц из `muscle_groups` упражнения
- `difference_kg` — разница в весе (может быть отрицательной)
- `recent_max_weight_kg` — максимальный вес за последние 7 дней
- `previous_max_weight_kg` — вес для сравнения (может быть `null` для новых упражнений)

**Логика расчёта прогресса**

1. **Выбор упражнений:**
   - Берутся все упражнения, выполненные за последние 30 дней
   - Сортируются по частоте выполнения (количество подходов)
   - Возвращаются топ-3

2. **Расчёт разницы (difference_kg):**
   - Если есть данные за 30-37 дней назад:
     ```
     difference = max(вес за последние 7 дней) - max(вес за 30-37 дней назад)
     ```
   - Если данных за 30-37 дней нет (новое упражнение):
     ```
     difference = max(вес за последние 7 дней) - первый вес этого упражнения
     ```
   - Если упражнение выполнено только 1 раз: не показывается в прогрессе

**Ошибки**

- `401` — нет/невалидный access-токен

---

## 3) Упражнения

В разделе есть два типа упражнений:
- системные (`GET /api/exercises/system`);
- пользовательские (`/api/exercises*`).

### 3.1 `GET /api/exercises/system`

Список системных упражнений.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
[
  {
    "id": "2f4bc4c2-2df2-4c3e-ab64-1f0d2c137fee",
    "created_by_user_id": null,
    "name": "Приседания со штангой",
    "description": "Базовое упражнение на ноги и ягодицы.",
    "muscle_groups": ["квадрицепсы", "ягодицы", "бицепс бедра"],
    "equipment": "штанга",
    "created_at": "2026-04-20T10:00:00+00:00",
    "updated_at": "2026-04-20T10:00:00+00:00"
  }
]
```

Если системных упражнений пока нет, возвращается `[]`.

**Ошибки**

- `401` — нет/невалидный access-токен

---

### 3.2 `GET /api/exercises`

Список упражнений текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
[
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
]
```

**Ошибки**

- `401` — нет/невалидный access-токен

---

### 3.3 `GET /api/exercises/{exercise_id}`

Получение упражнения текущего пользователя по id.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

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
- `403` — попытка работать с чужим упражнением
- `404` — упражнение не найдено

---

### 3.4 `POST /api/exercises`

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
- `equipment` — строка, 1..120

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

### 3.5 `PATCH /api/exercises/{exercise_id}`

Частичное обновление упражнения текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

Передается минимум одно поле:

```json
{
  "name": "Жим гантелей стоя",
  "description": "Контроль корпуса",
  "muscle_groups": ["плечи", "трицепс"],
  "equipment": "гантели"
}
```

**Поля**

- `name` — `string | optional`, 1..255
- `description` — `string | null | optional`, максимум 2000
- `muscle_groups` — `string[] | optional`, 1..20 элементов, без дублей
- `equipment` — `string | optional`, 1..120

**Response 200**

```json
{
  "id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
  "created_by_user_id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "name": "Жим гантелей стоя",
  "description": "Контроль корпуса",
  "muscle_groups": ["плечи", "трицепс"],
  "equipment": "гантели",
  "created_at": "2026-04-16T12:15:00+00:00",
  "updated_at": "2026-04-18T10:00:00+00:00"
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `403` — попытка работать с чужим упражнением
- `404` — упражнение не найдено
- `409` — у пользователя уже есть упражнение с таким именем
- `422` — ошибка валидации

---

### 3.6 `DELETE /api/exercises/{exercise_id}`

Удаление упражнения текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 204**

Тело ответа отсутствует.

**Ошибки**

- `401` — нет/невалидный access-токен
- `403` — попытка удалить чужое упражнение
- `404` — упражнение не найдено
- `400` — упражнение используется в тренировке и не может быть удалено

---

## 4) Тренировки

Все endpoint-ы раздела возвращают **тренировки текущего пользователя**.

### 4.1 `GET /api/workouts`

Список тренировок текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
[
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
      }
    ],
    "created_at": "2026-04-16T12:20:00+00:00",
    "updated_at": "2026-04-16T12:20:00+00:00"
  }
]
```

**Ошибки**

- `401` — нет/невалидный access-токен

---

### 4.2 `GET /api/workouts/{workout_id}`

Получение тренировки текущего пользователя по id.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

Формат такой же, как элемент в `GET /api/workouts`.

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — тренировка не найдена

---

### 4.3 `POST /api/workouts`

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
- `order_index` в запросе не передается — backend ставит его по позиции элемента в массиве

**Response 201**

Формат такой же, как элемент в `GET /api/workouts`.

**Ошибки**

- `401` — нет/невалидный access-токен
- `403` — попытка использовать чужое пользовательское упражнение
- `404` — одно или несколько упражнений не найдены
- `422` — ошибка валидации

---

### 4.4 `PATCH /api/workouts/{workout_id}`

Частичное обновление тренировки текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

Передается минимум одно поле:

```json
{
  "title": "Push Day (updated)",
  "is_planned": true,
  "planned_for": "2026-04-21T18:00:00Z",
  "description": "Техника + умеренный объем",
  "exercises": [
    {
      "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89"
    }
  ]
}
```

**Поля**

- `title` — `string | optional`, 1..255
- `is_planned` — `boolean | optional`
- `planned_for` — `datetime | null | optional`
- `description` — `string | null | optional`, максимум 2000
- `exercises` — `array | optional`, 1..100, без дублей по `exercise_id`

**Правила**

- валидация `is_planned` и `planned_for` выполняется по итоговому состоянию после PATCH
- если передан `exercises`, список упражнений в тренировке заменяется полностью

**Response 200**

Формат такой же, как элемент в `GET /api/workouts`.

**Ошибки**

- `401` — нет/невалидный access-токен
- `403` — попытка использовать чужое пользовательское упражнение
- `404` — тренировка или упражнение не найдены
- `400` — некорректная комбинация полей `is_planned`/`planned_for`
- `422` — ошибка валидации

---

### 4.5 `DELETE /api/workouts/{workout_id}`

Удаление тренировки текущего пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 204**

Тело ответа отсутствует.

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — тренировка не найдена

---

## 5) Тренировочные сессии

Все endpoint-ы раздела работают только с **сессиями текущего пользователя**.

### 5.1 `POST /api/workout-sessions/start`

Запуск тренировочной сессии по существующей тренировке.

Если у пользователя уже есть активная сессия этой же тренировки, backend вернет ее (без создания дубля).

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

```json
{
  "workout_id": "f642622f-42eb-4392-83f1-27c4f1433414"
}
```

**Response 200**

```json
{
  "id": "5bcb3b4f-6d64-4f96-9a4d-cdc39528b366",
  "user_id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "workout_id": "f642622f-42eb-4392-83f1-27c4f1433414",
  "status": "in_progress",
  "started_at": "2026-05-07T18:20:00+00:00",
  "completed_at": null,
  "created_at": "2026-05-07T18:20:00+00:00",
  "updated_at": "2026-05-07T18:20:00+00:00",
  "sets": []
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — тренировка не найдена
- `400` — уже есть активная сессия другой тренировки
- `422` — ошибка валидации

---

### 5.2 `GET /api/workout-sessions/active`

Получение текущей активной сессии пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

Если активной сессии нет:

```json
null
```

Если есть активная сессия:

```json
{
  "id": "5bcb3b4f-6d64-4f96-9a4d-cdc39528b366",
  "user_id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "workout_id": "f642622f-42eb-4392-83f1-27c4f1433414",
  "status": "in_progress",
  "started_at": "2026-05-07T18:20:00+00:00",
  "completed_at": null,
  "created_at": "2026-05-07T18:20:00+00:00",
  "updated_at": "2026-05-07T18:30:00+00:00",
  "sets": [
    {
      "id": "5a8559bf-c5ca-4b51-ab8d-1fda29b3f019",
      "session_id": "5bcb3b4f-6d64-4f96-9a4d-cdc39528b366",
      "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
      "client_event_id": "dfa7b7a7-0baf-4efd-a98b-c13fc52f9b5a",
      "set_index": 1,
      "weight_kg": 60.0,
      "reps": 10,
      "created_at": "2026-05-07T18:22:00+00:00",
      "updated_at": "2026-05-07T18:22:00+00:00"
    }
  ]
}
```

**Ошибки**

- `401` — нет/невалидный access-токен

---

### 5.3 `GET /api/workout-sessions/{session_id}`

Получение конкретной сессии пользователя по id (активной или завершенной).

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

Формат такой же, как в `GET /api/workout-sessions/active` (объект с полем `sets`).

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — сессия не найдена

---

### 5.4 `POST /api/workout-sessions/{session_id}/sets`

Создание или обновление записи подхода (upsert) в рамках активной сессии.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

```json
{
  "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
  "client_event_id": "dfa7b7a7-0baf-4efd-a98b-c13fc52f9b5a",
  "set_index": 1,
  "weight_kg": 60.0,
  "reps": 10
}
```

**Поля**

- `exercise_id` — UUID упражнения из выбранной тренировки
- `client_event_id` — UUID события клиента (для идемпотентности)
- `set_index` — номер подхода, `>= 1`
- `weight_kg` — вес, `>= 0`
- `reps` — количество повторений, `>= 1`

**Правила**

- если повторно отправить тот же `client_event_id`, дубль не создается (возвращается уже сохраненная запись);
- upsert выполняется по паре (`exercise_id`, `set_index`);
- подход можно добавить только в сессию со статусом `in_progress`.

**Response 200**

```json
{
  "id": "5a8559bf-c5ca-4b51-ab8d-1fda29b3f019",
  "session_id": "5bcb3b4f-6d64-4f96-9a4d-cdc39528b366",
  "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
  "client_event_id": "dfa7b7a7-0baf-4efd-a98b-c13fc52f9b5a",
  "set_index": 1,
  "weight_kg": 60.0,
  "reps": 10,
  "created_at": "2026-05-07T18:22:00+00:00",
  "updated_at": "2026-05-07T18:22:00+00:00"
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — сессия не найдена
- `400` — сессия завершена или упражнение не входит в тренировку
- `422` — ошибка валидации

---

### 5.5 `POST /api/workout-sessions/{session_id}/complete`

Завершение активной сессии.

При завершении backend обновляет пользовательские метрики:

- `streak_weeks`
- `weekly_volume_tons`

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
{
  "id": "5bcb3b4f-6d64-4f96-9a4d-cdc39528b366",
  "user_id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "workout_id": "f642622f-42eb-4392-83f1-27c4f1433414",
  "status": "completed",
  "started_at": "2026-05-07T18:20:00+00:00",
  "completed_at": "2026-05-07T19:05:00+00:00",
  "created_at": "2026-05-07T18:20:00+00:00",
  "updated_at": "2026-05-07T19:05:00+00:00",
  "sets": [
    {
      "id": "5a8559bf-c5ca-4b51-ab8d-1fda29b3f019",
      "session_id": "5bcb3b4f-6d64-4f96-9a4d-cdc39528b366",
      "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
      "client_event_id": "dfa7b7a7-0baf-4efd-a98b-c13fc52f9b5a",
      "set_index": 1,
      "weight_kg": 60.0,
      "reps": 10,
      "created_at": "2026-05-07T18:22:00+00:00",
      "updated_at": "2026-05-07T18:22:00+00:00"
    }
  ]
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — сессия не найдена
- `400` — сессия уже завершена

---

## Быстрый рабочий сценарий для frontend

1. Пользователь регистрируется (`POST /api/auth/register`) или логинится (`POST /api/auth/login`).
2. Frontend сохраняет только `access_token` (в памяти), refresh хранится в `HttpOnly` cookie.
3. При истечении `access_token` вызывает `POST /api/auth/refresh` (браузер отправляет refresh cookie автоматически).
4. Frontend получает профиль через `GET /api/users/me`.
5. Frontend получает данные для главного экрана:
   - Метрики пользователя из `GET /api/users/me` (`streak_weeks`, `weekly_volume_tons`, `weekly_sessions_progress`)
   - Недавний прогресс через `GET /api/users/me/recent-progress`
6. Frontend работает с упражнениями пользователя через `/api/exercises`.
7. Frontend создает и редактирует тренировки через `/api/workouts`, передавая массив `exercises` c элементами формата `{ "exercise_id": "UUID" }`.
8. При старте тренировки Frontend вызывает `POST /api/workout-sessions/start`, отправляет подходы через `POST /api/workout-sessions/{session_id}/sets` и завершает через `POST /api/workout-sessions/{session_id}/complete`.

Дополнительно: seed-команды backend описаны в `docs/backend/SEEDS.md`.
