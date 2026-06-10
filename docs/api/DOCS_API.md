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
- `total` — сколько сессий запланировано на всю текущую неделю (с понедельника по воскресенье).

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
    "muscle_group": "chest",
    "difference_kg": 5.0,
    "recent_max_weight_kg": 80.0,
    "previous_max_weight_kg": 75.0
  },
  {
    "exercise_id": "6f7dd56f-8188-4e93-aa62-5e2e453de0db",
    "exercise_name": "Приседания",
    "muscle_group": "legs",
    "difference_kg": -2.5,
    "recent_max_weight_kg": 117.5,
    "previous_max_weight_kg": 120.0
  },
  {
    "exercise_id": "2f4bc4c2-2df2-4c3e-ab64-1f0d2c137fee",
    "exercise_name": "Жим гантелей сидя",
    "muscle_group": "shoulders",
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
- `muscle_group` — первая `primary_muscle_groups` упражнения (одна из канонических: `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `cardio`)
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

### 2.5 `GET /api/users/me/notifications`

Получение текущих настроек уведомлений пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

```json
{
  "enabled": true,
  "sound": true,
  "vibration": false,
  "do_not_disturb": false,
  "reminders": true,
  "reminder_offset_minutes": 30
}
```

**Поля**

- `enabled` — включены ли уведомления вообще
- `sound` — использовать звук
- `vibration` — использовать вибрацию
- `do_not_disturb` — «Не беспокоить» (полный запрет отправки)
- `reminders` — напоминания о тренировках
- `reminder_offset_minutes` — за сколько минут до `planned_for` отправлять push

**Ошибки**

- `401` — нет/невалидный access-токен

---

### 2.6 `PATCH /api/users/me/notifications`

Обновление настроек уведомлений пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

Передается минимум одно поле:

```json
{
  "enabled": true,
  "sound": true,
  "vibration": false,
  "do_not_disturb": false,
  "reminders": true,
  "reminder_offset_minutes": 30
}
```

**Response 200**

```json
{
  "enabled": true,
  "sound": true,
  "vibration": false,
  "do_not_disturb": false,
  "reminders": true,
  "reminder_offset_minutes": 30
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `422` — ошибка валидации

---

### 2.7 `POST /api/users/me/notifications/subscriptions`

Регистрация/обновление push-подписки пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "base64==",
    "auth": "base64=="
  }
}
```

**Response 204**

**Ошибки**

- `401` — нет/невалидный access-токен
- `422` — ошибка валидации

---

### 2.8 `DELETE /api/users/me/notifications/subscriptions`

Удаление push-подписки пользователя.

**Headers**

- `Authorization: Bearer <access_token>`

**Request body**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response 204**

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — подписка не найдена

---

### 2.9 `GET /api/notifications/vapid-public-key`

Получение публичного VAPID ключа для регистрации push-подписки.

**Response 200**

```json
{
  "public_key": "BElu...base64url..."
}
```

**Ошибки**

- `400` — VAPID public key не настроен

---

## 3) Упражнения

В разделе есть два типа упражнений:
- системные (`GET /api/exercises/system`);
- пользовательские (`/api/exercises*`).

**Канонические значения групп мышц.**

- `primary_muscle_groups` — фронт-категории, по которым упражнение группируется на UI. Может быть пустым (упражнение попадает только в категорию «Личные»), максимум 10. Канонические ключи (whitelist на бэке):
  `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `cardio`.
- `secondary_muscles` — детальные мышцы (для будущей визуализации). Может быть пустым (например, для `cardio`). Без whitelist (свободный текст). Рекомендуемые ключи (lowercase, kebab-case для составных):
  `chest`, `upper-back`, `lower-back`, `trapezius`, `abs`, `obliques`, `biceps`, `triceps`, `forearm`, `deltoids`, `quadriceps`, `hamstring`, `gluteal`, `calves`, `adductors`, `abductors`, `neck`, `tibialis`.

Соответствие primary → допустимые secondary (UX-правило, живёт на фронте):

| primary    | secondary                                                          |
|------------|--------------------------------------------------------------------|
| chest      | chest                                                              |
| back       | upper-back, lower-back, trapezius                                  |
| legs       | quadriceps, hamstring, gluteal, calves, adductors, abductors, tibialis |
| shoulders  | deltoids, trapezius                                                |
| arms       | biceps, triceps, forearm                                           |
| core       | abs, obliques                                                      |
| cardio     | (пусто)                                                            |

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
    "primary_muscle_groups": ["legs"],
    "secondary_muscles": ["quadriceps", "gluteal", "hamstring"],
    "equipment": ["Штанга"],
    "media": [],
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
    "primary_muscle_groups": ["shoulders"],
    "secondary_muscles": ["deltoids", "triceps"],
    "equipment": ["Гантели"],
    "media": [
      {
        "id": "0c8b8df1-4b8e-4f4f-9be4-2a4f5a6d7e8f",
        "url": "https://bucket.example.com/exercises/...?presigned",
        "type": "image"
      }
    ],
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
  "primary_muscle_groups": ["shoulders"],
  "secondary_muscles": ["deltoids", "triceps"],
  "equipment": ["Гантели"],
  "media": [],
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
  "primary_muscle_groups": ["shoulders"],
  "secondary_muscles": ["deltoids", "triceps"],
  "equipment": ["Гантели", "Скамья"]
}
```

**Поля**

- `name` — строка, 1..255
- `description` — `string | null`, максимум 2000
- `primary_muscle_groups` — массив строк, 0..10 элементов, без дублей. Только канонические значения (whitelist выше). По умолчанию `[]`
- `secondary_muscles` — массив строк, 0..30 элементов, без дублей (кейс-инсенситивно), регистр сохраняется. По умолчанию `[]`
- `equipment` — массив строк, 0..20 элементов, каждый 1..120 символов, без дублей (кейс-инсенситивно), регистр сохраняется. По умолчанию `[]`

**Response 201**

```json
{
  "id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
  "created_by_user_id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "name": "Жим гантелей сидя",
  "description": "Контроль лопаток и плавное движение",
  "primary_muscle_groups": ["shoulders"],
  "secondary_muscles": ["deltoids", "triceps"],
  "equipment": ["Гантели", "Скамья"],
  "media": [],
  "created_at": "2026-04-16T12:15:00+00:00",
  "updated_at": "2026-04-16T12:15:00+00:00"
}
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `409` — у пользователя уже есть упражнение с таким именем
- `422` — ошибка валидации (в т.ч. `primary_muscle_groups` вне whitelist)

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
  "primary_muscle_groups": ["shoulders"],
  "secondary_muscles": ["deltoids"],
  "equipment": ["Гантели"]
}
```

**Поля**

- `name` — `string | optional`, 1..255
- `description` — `string | null | optional`, максимум 2000
- `primary_muscle_groups` — `string[] | optional`, 0..10 элементов, без дублей, только из whitelist
- `secondary_muscles` — `string[] | optional`, 0..30 элементов, без дублей (кейс-инсенситивно), регистр сохраняется
- `equipment` — `string[] | optional`, 0..20 элементов, каждый 1..120 символов, без дублей (кейс-инсенситивно), регистр сохраняется

**Response 200**

```json
{
  "id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
  "created_by_user_id": "8a2d0d8a-1be6-4f0a-b57e-ec3c6f6149a7",
  "name": "Жим гантелей стоя",
  "description": "Контроль корпуса",
  "primary_muscle_groups": ["shoulders"],
  "secondary_muscles": ["deltoids"],
  "equipment": ["Гантели"],
  "media": [],
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

Файлы медиа упражнения удаляются из bucket в фоне.

---

### 3.7 `POST /api/exercises/{exercise_id}/media`

Загрузка медиафайла (фото/видео) своего упражнения. Файл **добавляется в конец** списка медиа (`position = max + 1`), существующие медиа не затрагиваются. Лимит — 10 медиа на упражнение.

**Headers**

- `Authorization: Bearer <access_token>`
- `Content-Type: multipart/form-data`

**Request body (multipart)**

- `media` — файл: изображение (`image/*`, до 5 MB) или видео (`video/*`, до 50 MB)

**Response 200**

Обновлённое упражнение (формат как в `GET /api/exercises/{exercise_id}`), поле `media` отсортировано по `position`:

```json
{
  "id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
  "media": [
    { "id": "0c8b8df1-...", "url": "https://...presigned", "type": "image" },
    { "id": "5d2a1c44-...", "url": "https://...presigned", "type": "video" }
  ]
}
```

**Ошибки**

- `400` — недопустимый тип/размер файла или превышен лимит 10 медиа
- `401` — нет/невалидный access-токен
- `403` — попытка работать с чужим (в т.ч. системным) упражнением
- `404` — упражнение не найдено

---

### 3.8 `DELETE /api/exercises/{exercise_id}/media/{media_id}`

Удаление одного медиафайла своего упражнения по id. Файл удаляется из bucket в фоне.

**Headers**

- `Authorization: Bearer <access_token>`

**Response 200**

Обновлённое упражнение (формат как в `GET /api/exercises/{exercise_id}`).

**Ошибки**

- `401` — нет/невалидный access-токен
- `403` — попытка работать с чужим (в т.ч. системным) упражнением
- `404` — упражнение или медиа не найдено

---

## 4) Тренировки

Все endpoint-ы раздела возвращают **тренировки текущего пользователя**.

### 4.0 `GET /api/workouts/schedule`

Получение расписания тренировок в диапазоне дат.

**Headers**

- `Authorization: Bearer <access_token>`

**Query params**

- `date_from` — начало диапазона, формат `YYYY-MM-DD` (включительно)
- `date_to` — конец диапазона, формат `YYYY-MM-DD` (включительно)

**Response 200**

```json
[
  {
    "id": "d20027a7-2575-4335-9b4d-523eed70a489",
    "title": "День жимов",
    "date": "2026-05-16",
    "time": "09:00",
    "status": "planned",
    "exercises_count": 3,
    "muscle_groups": ["chest", "shoulders"]
  }
]
```

**Поля ответа**

- `id` — UUID тренировки
- `title` — название тренировки
- `date` — дата тренировки (`YYYY-MM-DD`), берётся из `planned_for`
- `time` — время тренировки (`HH:MM`), берётся из `planned_for`; `null` если время не задано
- `status` — `"planned"` или `"completed"`
- `exercises_count` — количество упражнений в тренировке
- `muscle_groups` — уникальные `primary_muscle_groups` со всех упражнений тренировки (значения из канонического whitelist: `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `cardio`)

**Логика статуса**

- `"completed"` — если существует `WorkoutSession` со `status='completed'` для этой тренировки (независимо от времени `planned_for`)
- `"planned"` — во всех остальных случаях

**Ошибки**

- `401` — нет/невалидный access-токен
- `422` — ошибка валидации (неверный формат дат)

---

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
        "order_index": 1,
        "target_sets": [
          { "set_index": 1, "target_reps": 10, "target_weight_kg": 60 }
        ]
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
      "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
      "target_sets": null
    },
    {
      "exercise_id": "6f7dd56f-8188-4e93-aa62-5e2e453de0db",
      "target_sets": [
        { "set_index": 1, "target_reps": 10, "target_weight_kg": 60 },
        { "set_index": 2, "target_reps": 8,  "target_weight_kg": 80 }
      ]
    }
  ]
}
```

**Поля**

- `title` — строка, 1..255
- `is_planned` — boolean
- `planned_for` — `datetime | null`
- `description` — `string | null`, максимум 2000
- `exercises` — массив 0..100 (тренировку можно создать без упражнений и наполнить позже), каждый элемент: `{ "exercise_id": "UUID", "target_sets": WorkoutTargetSetItem[] | null }`
- `target_sets[].set_index` — int `>= 1`, последовательные без пропусков
- `target_sets[].target_reps` — `int | null`, `> 0`
- `target_sets[].target_weight_kg` — `Decimal | null`, `>= 0`

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
      "exercise_id": "a7f5d856-7b53-4e5f-bf6d-8f8ed7483b89",
      "target_sets": null
    }
  ]
}
```

**Поля**

- `title` — `string | optional`, 1..255
- `is_planned` — `boolean | optional`
- `planned_for` — `datetime | null | optional`
- `description` — `string | null | optional`, максимум 2000
- `exercises` — `array | optional`, 0..100, без дублей по `exercise_id`. Формат элемента — как в `POST /api/workouts` (с опциональным `target_sets`)

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

### 5.6 `DELETE /api/workout-sessions/{session_id}/sets/{set_id}`

Удаление записи подхода из активной сессии (например, пользователь удалил строку подхода в UI).

**Headers**

- `Authorization: Bearer <access_token>`

**Правила**

- удалять подходы можно только в сессии со статусом `in_progress`;
- снятие галочки «выполнено» в UI не удаляет запись — она перезаписывается повторным upsert; удаление вызывается только при удалении строки подхода.

**Response 204** — без тела.

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — сессия или подход не найдены
- `400` — сессия уже завершена

---

## 6) Справочник

Раздел «Справочник» — редакционный (системный) контент: категории и статьи. Контент
наполняется через seed-команду (`docs/backend/SEEDS.md`), пользователи его не создают.

Структура:
- **Категория** — иконка, название, описание, число статей (`articles_count`).
- **Статья** — иконка, название, описание, время чтения (`reading_time_minutes`), счётчик
  просмотров (`views_count`) и markdown-текст (`content`).
- Внутри `content` встречаются картинки/видео ссылками вида
  `/api/guide/media/{object_key}` — это стабильный внутренний URL (см. 6.7).
- У каждого пользователя есть **личное избранное** (флаг `is_favorite` в карточках статей).

Все эндпоинты, кроме media-proxy (6.7), требуют `Authorization: Bearer <access_token>`.

### 6.1 `GET /api/guide/categories`

Список категорий справочника (упорядочен по `position`).

**Response 200**

```json
[
  {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Питание",
    "description": "Основы питания",
    "icon_url": "https://bucket.example.com/guide-icons/categories/ab12...png?...",
    "articles_count": 8
  }
]
```

`icon_url` — presigned URL (или `null`, если иконка не задана / хранилище не настроено).
Если категорий нет, возвращается `[]`.

**Ошибки**

- `401` — нет/невалидный access-токен

---

### 6.2 `GET /api/guide/categories/{category_id}`

Лендинг категории «Популярное и избранное»: блок личного избранного пользователя
(`featured`) и топ-5 статей по просмотрам (`popular`).

**Response 200**

```json
{
  "id": "11111111-1111-1111-1111-111111111111",
  "name": "Питание",
  "description": "Основы питания",
  "icon_url": null,
  "articles_count": 8,
  "featured": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "title": "Белки",
      "description": "Про белки",
      "icon_url": null,
      "reading_time_minutes": 5,
      "views_count": 12,
      "is_favorite": true
    }
  ],
  "popular": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "title": "Белки",
      "description": "Про белки",
      "icon_url": null,
      "reading_time_minutes": 5,
      "views_count": 12,
      "is_favorite": true
    }
  ]
}
```

`featured` пуст, если пользователь ничего не добавил в избранное в этой категории.
`popular` — максимум 5 статей, отсортированы по `views_count` убыв., затем по `position`.

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — категория не найдена

---

### 6.3 `GET /api/guide/categories/{category_id}/articles`

Кнопка «Просмотреть все» — полный список статей категории (упорядочен по `position`,
без `content`).

**Response 200**

```json
[
  {
    "id": "22222222-2222-2222-2222-222222222222",
    "title": "Белки",
    "description": "Про белки",
    "icon_url": null,
    "reading_time_minutes": 5,
    "views_count": 12,
    "is_favorite": false
  }
]
```

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — категория не найдена

---

### 6.4 `GET /api/guide/articles/{article_id}`

Одна статья с markdown-текстом. **Каждый успешный запрос увеличивает `views_count` на 1.**

**Response 200**

```json
{
  "id": "22222222-2222-2222-2222-222222222222",
  "guide_category_id": "11111111-1111-1111-1111-111111111111",
  "title": "Белки",
  "description": "Про белки",
  "icon_url": null,
  "reading_time_minutes": 5,
  "views_count": 13,
  "is_favorite": false,
  "content": "# Белки\n\nТекст с картинкой: ![схема](/api/guide/media/guide-media/diagram.png)",
  "created_at": "2026-06-10T17:21:57.695151Z",
  "updated_at": "2026-06-10T17:27:18.940733Z"
}
```

`content` — markdown; картинки/видео внутри ссылаются на `/api/guide/media/...` (см. 6.7).

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — статья не найдена

---

### 6.5 `POST /api/guide/articles/{article_id}/favorite`

Добавить статью в личное избранное. Идемпотентно (повторный вызов не создаёт дубль).

**Response 204** — без тела.

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — статья не найдена

---

### 6.6 `DELETE /api/guide/articles/{article_id}/favorite`

Убрать статью из личного избранного. Идемпотентно (если не было в избранном — тоже `204`).

**Response 204** — без тела.

**Ошибки**

- `401` — нет/невалидный access-токен
- `404` — статья не найдена

---

### 6.7 `GET /api/guide/media/{object_key}` (публичный)

Прокси для медиа, встроенного в markdown статей. **Не требует авторизации** — браузер
грузит `<img>`/`<video>` без `Authorization`-заголовка. Возвращает `307`-редирект на
свежий presigned URL файла в приватном бакете, поэтому ссылки в тексте не протухают.

Принимает только ключи с префиксом `guide-media/` (иначе `404`).

**Response 307** — `Location: <presigned-url>`.

**Ошибки**

- `404` — ключ не из `guide-media/` либо файл недоступен

---

## Быстрый рабочий сценарий для frontend

1. Пользователь регистрируется (`POST /api/auth/register`) или логинится (`POST /api/auth/login`).
2. Frontend сохраняет только `access_token` (в памяти), refresh хранится в `HttpOnly` cookie.
3. При истечении `access_token` вызывает `POST /api/auth/refresh` (браузер отправляет refresh cookie автоматически).
4. Frontend получает профиль через `GET /api/users/me`.
5. Frontend получает данные для главного экрана:
   - Метрики пользователя из `GET /api/users/me` (`streak_weeks`, `weekly_volume_tons`, `weekly_sessions_progress`)
   - Недавний прогресс через `GET /api/users/me/recent-progress`
   - Расписание на текущую неделю через `GET /api/workouts/schedule?date_from=...&date_to=...`; при листании WeekCalendar запрашивается следующая/предыдущая неделя
6. На странице расписания Frontend запрашивает `GET /api/workouts/schedule` для текущего месяца; при смене месяца запрашивается новый диапазон.
7. Frontend работает с упражнениями пользователя через `/api/exercises`.
7. Frontend создает и редактирует тренировки через `/api/workouts`, передавая массив `exercises` c элементами формата `{ "exercise_id": "UUID" }`.
8. При старте тренировки Frontend вызывает `POST /api/workout-sessions/start` (идемпотентен — повторный вызов для той же тренировки возвращает активную сессию, это используется для resume), отправляет подходы через `POST /api/workout-sessions/{session_id}/sets`, удаляет строки подходов через `DELETE /api/workout-sessions/{session_id}/sets/{set_id}` и завершает через `POST /api/workout-sessions/{session_id}/complete`, после чего перечитывает `GET /api/users/me` для обновлённых метрик.

Дополнительно: seed-команды backend описаны в `docs/backend/SEEDS.md`.
