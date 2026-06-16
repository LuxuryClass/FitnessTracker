from __future__ import annotations

import asyncio
import mimetypes
from dataclasses import dataclass, field
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import AsyncSessionLocal, close_database_connection
from app.models.exercise import Exercise
from app.models.exercise_media import ExerciseMedia
from app.services.storage_service import storage_service

# Папка с локальными медиа системных упражнений
ASSETS_DIR = Path(__file__).resolve().parent / "assets" / "exercises"

# Расширения изображений в порядке приоритета и расширение видео
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".avif", ".jfif")
VIDEO_EXTENSION = ".mp4"

# MIME-типы для всех используемых расширений
EXTRA_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".jfif": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".mp4": "video/mp4",
}

@dataclass(frozen=True)
class SystemExerciseSeed:
    name: str
    description: str
    primary_muscle_groups: list[str]
    secondary_muscles: list[str]
    equipment: list[str]
    media_filenames: list[str] = field(default_factory=list)

# Разрешённые значения (для самопроверки данных)
ALLOWED_PRIMARY_GROUPS = frozenset(
    {"chest", "back", "legs", "shoulders", "arms", "core", "cardio"}
)
ALLOWED_SECONDARY_SLUGS = frozenset(
    {
        "chest",
        "upper-back",
        "lower-back",
        "trapezius",
        "biceps",
        "triceps",
        "forearm",
        "deltoids",
        "quadriceps",
        "hamstring",
        "gluteal",
        "calves",
        "adductors",
        "abductors",
        "tibialis",
        "abs",
        "obliques",
    }
)

SYSTEM_EXERCISES: tuple[SystemExerciseSeed, ...] = (
    # ---------------------------- Грудь ----------------------------
    SystemExerciseSeed(
        name="Жим штанги лёжа",
        description="Базовое упражнение для развития массы и силы грудных мышц. Лёжа на горизонтальной скамье опустите штангу к середине груди и выжмите вверх до выпрямления рук.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "triceps", "deltoids"],
        equipment=["Штанга", "Скамья"],
    ),
    SystemExerciseSeed(
        name="Жим штанги на наклонной скамье",
        description="Жим под углом 30–45° смещает нагрузку на верх грудных и передние дельты. Опускайте штангу к верхней части груди и выжимайте вверх.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "deltoids", "triceps"],
        equipment=["Штанга", "Скамья"],
    ),
    SystemExerciseSeed(
        name="Жим гантелей лёжа",
        description="Жим гантелей даёт большую амплитуду и лучше прорабатывает грудь, чем штанга. В нижней точке гантели на уровне груди, в верхней — сводятся над грудью.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "triceps", "deltoids"],
        equipment=["Гантели", "Скамья"],
    ),
    SystemExerciseSeed(
        name="Жим гантелей на наклонной скамье",
        description="Наклонный жим гантелями акцентирует верх груди и передние дельты с увеличенной амплитудой движения.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "deltoids", "triceps"],
        equipment=["Гантели", "Скамья"],
    ),
    SystemExerciseSeed(
        name="Разведение гантелей лёжа",
        description="Изолирующее упражнение на растяжение и сведение грудных мышц. Разводите гантели по дуге с чуть согнутыми локтями, затем сводите над грудью.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "deltoids"],
        equipment=["Гантели", "Скамья"],
    ),
    SystemExerciseSeed(
        name="Отжимания от пола",
        description="Базовое упражнение с собственным весом для груди, трицепса и передних дельт. Держите корпус прямым и опускайтесь до угла 90° в локтях.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "triceps", "deltoids"],
        equipment=["Собственный вес"],
    ),
    SystemExerciseSeed(
        name="Отжимания на брусьях",
        description="С наклоном корпуса вперёд акцентируют низ груди, в вертикальном положении — трицепс. Опускайтесь до растяжения и выжимайте вверх.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "triceps", "deltoids"],
        equipment=["Брусья"],
    ),
    SystemExerciseSeed(
        name="Сведение рук в кроссовере",
        description="Изоляция грудных в блочном тренажёре с постоянным напряжением по всей амплитуде. Сводите рукояти перед собой, контролируя движение.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "deltoids"],
        equipment=["Блочный тренажёр"],
    ),
    SystemExerciseSeed(
        name="Жим в грудном тренажёре",
        description="Безопасный жим в тренажёре с фиксированной траекторией — удобно для новичков и для добивки груди в конце тренировки.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "triceps", "deltoids"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Сведение рук в тренажёре «бабочка»",
        description="Изолирующее сведение рук в тренажёре с акцентом на внутреннюю часть грудных. Сводите локти перед собой и удерживайте пиковое сокращение.",
        primary_muscle_groups=["chest"],
        secondary_muscles=["chest", "deltoids"],
        equipment=["Тренажёр"],
    ),
    # ---------------------------- Спина ----------------------------
    SystemExerciseSeed(
        name="Становая тяга",
        description="Базовое многосуставное упражнение для всей задней цепи. Поднимайте штангу с пола за счёт разгибания тазобедренных и коленных суставов, сохраняя спину прямой.",
        primary_muscle_groups=["back", "legs"],
        secondary_muscles=["lower-back", "gluteal", "hamstring", "trapezius", "forearm"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Подтягивания",
        description="Базовое упражнение с собственным весом на ширину спины. Подтягивайтесь хватом чуть шире плеч до уровня подбородка над перекладиной.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "biceps", "forearm"],
        equipment=["Турник"],
    ),
    SystemExerciseSeed(
        name="Тяга верхнего блока к груди",
        description="Тренирует широчайшие мышцы спины, имитируя подтягивания с регулируемой нагрузкой. Тяните рукоять к верху груди, сводя лопатки.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "biceps"],
        equipment=["Блочный тренажёр"],
    ),
    SystemExerciseSeed(
        name="Тяга штанги в наклоне",
        description="Базовая тяга для толщины спины. В наклоне корпуса около 45° тяните штангу к низу живота, сводя лопатки.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "lower-back", "biceps"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Тяга гантели одной рукой",
        description="Односторонняя тяга с упором на скамью для проработки широчайших без нагрузки на поясницу. Тяните гантель к поясу вдоль корпуса.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "biceps"],
        equipment=["Гантели", "Скамья"],
    ),
    SystemExerciseSeed(
        name="Тяга горизонтального блока",
        description="Тяга к поясу сидя для толщины средней части спины. Сводите лопатки и тяните рукоять к животу, держа спину прямой.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "biceps", "trapezius"],
        equipment=["Блочный тренажёр"],
    ),
    SystemExerciseSeed(
        name="Тяга Т-грифа",
        description="Мощная тяга для толщины и средней части спины с нейтральным хватом. Тяните гриф к груди, сводя лопатки.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "biceps", "trapezius"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Гиперэкстензия",
        description="Изолирующее упражнение для разгибателей спины и ягодиц. Опускайте корпус вниз и поднимайте до прямой линии с ногами, без переразгибания.",
        primary_muscle_groups=["back"],
        secondary_muscles=["lower-back", "gluteal", "hamstring"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Шраги с гантелями",
        description="Изоляция трапециевидных мышц. Поднимайте плечи строго вверх, удерживая гантели в опущенных руках, без вращения плечами.",
        primary_muscle_groups=["back"],
        secondary_muscles=["trapezius"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Пуловер с гантелью",
        description="Упражнение на растяжение широчайших и грудных. Лёжа поперёк скамьи опускайте гантель за голову и возвращайте над грудью на прямых руках.",
        primary_muscle_groups=["back"],
        secondary_muscles=["upper-back", "chest"],
        equipment=["Гантели", "Скамья"],
    ),
    # ---------------------------- Ноги ----------------------------
    SystemExerciseSeed(
        name="Приседания со штангой",
        description="Базовое упражнение для всего низа тела. Приседайте до параллели бёдер с полом, удерживая спину прямой и колени в направлении носков.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal", "hamstring", "lower-back", "abs"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Фронтальные приседания",
        description="Приседания со штангой на груди акцентируют квадрицепсы и требуют вертикального положения корпуса.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal", "abs"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Жим ногами в тренажёре",
        description="Базовое упражнение на квадрицепсы и ягодицы без осевой нагрузки на позвоночник. Опускайте платформу до угла 90° в коленях.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal", "hamstring"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Выпады с гантелями",
        description="Упражнение на ноги и ягодицы с акцентом на баланс. Делайте шаг вперёд и опускайтесь до угла 90° в обоих коленях.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal", "hamstring"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Болгарские сплит-приседания",
        description="Одноногие приседания с задней ногой на скамье. Сильно нагружают квадрицепс и ягодицу рабочей ноги.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal", "hamstring"],
        equipment=["Гантели", "Скамья"],
    ),
    SystemExerciseSeed(
        name="Румынская тяга",
        description="Тяга на прямых (слегка согнутых) ногах для бицепса бедра и ягодиц. Опускайте штангу вдоль ног, отводя таз назад, до растяжения задней поверхности.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["hamstring", "gluteal", "lower-back"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Разгибание ног в тренажёре",
        description="Изоляция квадрицепса. Сидя разгибайте ноги до прямой линии и удерживайте пиковое сокращение.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Сгибание ног лёжа в тренажёре",
        description="Изоляция бицепса бедра. Лёжа сгибайте ноги, подтягивая валик к ягодицам, и плавно опускайте.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["hamstring"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Подъём на носки стоя",
        description="Упражнение на икроножные мышцы. Поднимайтесь на носки в полную амплитуду и медленно опускайтесь ниже уровня платформы.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["calves"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Подъём на носки сидя",
        description="Акцент на камбаловидную мышцу голени за счёт согнутых коленей. Поднимайте вес носками, удерживая пиковое сокращение.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["calves"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Приседания гоблет",
        description="Приседания с гантелью у груди — отличный вариант для освоения техники и нагрузки квадрицепсов и ягодиц.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Ягодичный мостик со штангой",
        description="Основное упражнение на ягодицы. Лёжа спиной на скамье поднимайте таз со штангой до прямой линии корпуса и бёдер.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["gluteal", "hamstring"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Зашагивания на платформу",
        description="Функциональное упражнение на ноги и ягодицы. Зашагивайте на платформу одной ногой и поднимайтесь без отталкивания второй.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Отведение бедра в тренажёре",
        description="Изоляция ягодичных и отводящих мышц бедра. Разводите бёдра против сопротивления и плавно сводите.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["gluteal", "abductors"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Сведение бёдер в тренажёре",
        description="Изоляция приводящих мышц внутренней части бедра. Сводите бёдра против сопротивления и контролируйте возврат.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["adductors"],
        equipment=["Тренажёр"],
    ),
    SystemExerciseSeed(
        name="Гакк-приседания",
        description="Приседания в тренажёре с фиксированной траекторией и акцентом на квадрицепсы при сниженной нагрузке на спину.",
        primary_muscle_groups=["legs"],
        secondary_muscles=["quadriceps", "gluteal"],
        equipment=["Тренажёр"],
    ),
    # ---------------------------- Плечи ----------------------------
    SystemExerciseSeed(
        name="Жим штанги стоя",
        description="Базовый армейский жим для всех пучков дельт. Выжимайте штангу с уровня ключиц над головой, не прогибая поясницу.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids", "triceps", "trapezius"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Жим гантелей сидя",
        description="Жим гантелей над головой для развития дельт с большей амплитудой и независимой работой каждой руки.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids", "triceps"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Махи гантелями в стороны",
        description="Изоляция средних дельт, формирующих ширину плеч. Разводите гантели в стороны до уровня плеч с чуть согнутыми локтями.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Махи гантелями в наклоне",
        description="Изоляция задних дельт. В наклоне корпуса разводите гантели в стороны, сводя лопатки.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids", "upper-back"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Подъём гантелей перед собой",
        description="Изоляция передних дельт. Поднимайте гантели прямыми руками перед собой до уровня плеч.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Тяга штанги к подбородку",
        description="Тяга узким хватом к подбородку нагружает средние дельты и трапеции. Ведите локти вверх и в стороны.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids", "trapezius"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Жим Арнольда",
        description="Жим гантелей с разворотом кистей, прорабатывающий передние и средние дельты по всей амплитуде.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids", "triceps"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Тяга к лицу",
        description="Тяга каната к лицу для задних дельт и мышц верха спины, полезна для здоровья плеч. Разводите локти в стороны на уровне лица.",
        primary_muscle_groups=["shoulders"],
        secondary_muscles=["deltoids", "trapezius", "upper-back"],
        equipment=["Блочный тренажёр"],
    ),
    # ---------------------------- Руки ----------------------------
    SystemExerciseSeed(
        name="Подъём штанги на бицепс",
        description="Базовое упражнение на бицепс. Сгибайте руки со штангой, не раскачивая корпус, и полностью опускайте вес.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["biceps", "forearm"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Подъём гантелей на бицепс",
        description="Сгибания с гантелями с супинацией кисти для полного сокращения бицепса. Можно выполнять поочерёдно или одновременно.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["biceps", "forearm"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Молотковые сгибания",
        description="Сгибания нейтральным хватом нагружают бицепс и плечевую мышцу, утолщая руку. Держите гантели как молотки.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["biceps", "forearm"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Сгибания на скамье Скотта",
        description="Изоляция бицепса с упором локтей, исключающая читинг. Сгибайте штангу, контролируя негативную фазу.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["biceps"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Концентрированные сгибания",
        description="Изоляция бицепса сидя с упором локтя во внутреннюю часть бедра. Даёт максимальный пик сокращения.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["biceps"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Французский жим лёжа",
        description="Базовое изолирующее упражнение на трицепс. Лёжа опускайте штангу ко лбу за счёт сгибания локтей и разгибайте руки.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["triceps"],
        equipment=["Штанга"],
    ),
    SystemExerciseSeed(
        name="Разгибание из-за головы с гантелью",
        description="Растягивает и прорабатывает длинную головку трицепса. Опускайте гантель за голову и разгибайте руки вверх.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["triceps"],
        equipment=["Гантели"],
    ),
    SystemExerciseSeed(
        name="Разгибание на блоке на трицепс",
        description="Изоляция трицепса с постоянным напряжением. Разгибайте руки вниз, прижав локти к корпусу.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["triceps"],
        equipment=["Блочный тренажёр"],
    ),
    SystemExerciseSeed(
        name="Отжимания узким хватом",
        description="Отжимания с узкой постановкой рук смещают нагрузку на трицепс. Держите локти близко к корпусу.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["triceps", "chest"],
        equipment=["Собственный вес"],
    ),
    SystemExerciseSeed(
        name="Сгибание запястий со штангой",
        description="Изоляция сгибателей предплечья. Сидя с предплечьями на бёдрах сгибайте кисти вверх в полную амплитуду.",
        primary_muscle_groups=["arms"],
        secondary_muscles=["forearm"],
        equipment=["Штанга"],
    ),
    # ---------------------------- Кор ----------------------------
    SystemExerciseSeed(
        name="Планка",
        description="Статическое упражнение на стабилизацию кора. Удерживайте прямую линию тела на предплечьях и носках, напрягая пресс.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs", "obliques"],
        equipment=["Коврик"],
    ),
    SystemExerciseSeed(
        name="Скручивания",
        description="Базовое упражнение на прямую мышцу живота. Лёжа отрывайте лопатки от пола за счёт сокращения пресса.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs"],
        equipment=["Коврик"],
    ),
    SystemExerciseSeed(
        name="Подъём ног в висе",
        description="Упражнение на нижнюю часть пресса. В висе на турнике поднимайте прямые или согнутые ноги, не раскачиваясь.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs"],
        equipment=["Турник"],
    ),
    SystemExerciseSeed(
        name="Русские скручивания",
        description="Упражнение на косые мышцы живота. Сидя с приподнятыми ногами поворачивайте корпус из стороны в сторону.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs", "obliques"],
        equipment=["Коврик"],
    ),
    SystemExerciseSeed(
        name="Боковая планка",
        description="Статическая нагрузка на косые мышцы и стабилизаторы корпуса. Удерживайте тело прямой линией на одном предплечье.",
        primary_muscle_groups=["core"],
        secondary_muscles=["obliques", "abs"],
        equipment=["Коврик"],
    ),
    SystemExerciseSeed(
        name="Скручивания «велосипед»",
        description="Динамическое упражнение на пресс и косые мышцы. Поочерёдно тяните локоть к противоположному колену.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs", "obliques"],
        equipment=["Коврик"],
    ),
    SystemExerciseSeed(
        name="Подъём ног лёжа",
        description="Нагрузка на нижний пресс. Лёжа поднимайте прямые ноги до вертикали и медленно опускайте, не касаясь пола.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs"],
        equipment=["Коврик"],
    ),
    SystemExerciseSeed(
        name="Скручивания на верхнем блоке",
        description="Скручивания с отягощением на блоке («молитва») для проработки пресса с прогрессией нагрузки. Скругляйте спину, подтягивая канат вниз.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs"],
        equipment=["Блочный тренажёр"],
    ),
    SystemExerciseSeed(
        name="Ролик для пресса",
        description="Сложное упражнение на весь кор. Из упора на коленях выкатывайте ролик вперёд и возвращайтесь за счёт пресса.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs", "obliques"],
        equipment=["Ролик для пресса"],
    ),
    SystemExerciseSeed(
        name="Альпинист",
        description="Динамическое упражнение на пресс с кардио-эффектом. В упоре лёжа поочерёдно подтягивайте колени к груди в быстром темпе.",
        primary_muscle_groups=["core"],
        secondary_muscles=["abs", "obliques"],
        equipment=["Собственный вес"],
    ),
    # ---------------------------- Кардио ----------------------------
    SystemExerciseSeed(
        name="Бег на дорожке",
        description="Кардио для развития выносливости и сжигания калорий. Регулируйте скорость и наклон под свою цель.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=[],
        equipment=["Беговая дорожка"],
    ),
    SystemExerciseSeed(
        name="Велотренажёр",
        description="Низкоударное кардио для выносливости и ног с щадящей нагрузкой на суставы.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=[],
        equipment=["Велотренажёр"],
    ),
    SystemExerciseSeed(
        name="Эллиптический тренажёр",
        description="Кардио с одновременной работой рук и ног и минимальной ударной нагрузкой на суставы.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=[],
        equipment=["Эллиптический тренажёр"],
    ),
    SystemExerciseSeed(
        name="Гребной тренажёр",
        description="Кардио на всё тело, сочетающее работу ног, спины и рук. Толкайтесь ногами и завершайте движение тягой к корпусу.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=[],
        equipment=["Гребной тренажёр"],
    ),
    SystemExerciseSeed(
        name="Скакалка",
        description="Интенсивное кардио для выносливости и координации с акцентом на икроножные мышцы.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=["calves"],
        equipment=["Скакалка"],
    ),
    SystemExerciseSeed(
        name="Берпи",
        description="Высокоинтенсивное упражнение на всё тело: присед, упор лёжа, отжимание и выпрыгивание вверх в одном движении.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=[],
        equipment=["Собственный вес"],
    ),
    SystemExerciseSeed(
        name="Степпер",
        description="Кардио, имитирующее подъём по лестнице, с нагрузкой на ноги и ягодицы.",
        primary_muscle_groups=["cardio"],
        secondary_muscles=[],
        equipment=["Степпер"],
    ),
)

def _validate_seed() -> None:
    """Защита от опечаток в данных сидов."""
    for item in SYSTEM_EXERCISES:
        bad_primary = set(item.primary_muscle_groups) - ALLOWED_PRIMARY_GROUPS
        if bad_primary:
            raise ValueError(
                f"{item.name}: недопустимые primary_muscle_groups: {sorted(bad_primary)}"
            )
        bad_secondary = set(item.secondary_muscles) - ALLOWED_SECONDARY_SLUGS
        if bad_secondary:
            raise ValueError(
                f"{item.name}: недопустимые secondary_muscles: {sorted(bad_secondary)}"
            )

def _normalize_name(value: str) -> str:
    return value.strip().lower()

def _guess_content_type(filename: str) -> str:
    extension = Path(filename).suffix.lower()
    if extension in EXTRA_CONTENT_TYPES:
        return EXTRA_CONTENT_TYPES[extension]
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"

def _resolve_media_filenames(exercise_name: str) -> list[str]:
    """сначала фото, затем видео"""
    filenames: list[str] = []
    for extension in IMAGE_EXTENSIONS:
        candidate = ASSETS_DIR / f"{exercise_name}{extension}"
        if candidate.is_file():
            filenames.append(candidate.name)
            break
    video = ASSETS_DIR / f"{exercise_name}{VIDEO_EXTENSION}"
    if video.is_file():
        filenames.append(video.name)
    return filenames

async def _upload_exercise_asset(filename: str) -> tuple[str, str] | None:
    file_path = ASSETS_DIR / filename
    if not file_path.is_file():
        print(f"[warn] asset not found, skip upload: {file_path}")
        return None

    return await storage_service.upload_exercise_media_bytes(
        content=file_path.read_bytes(),
        content_type=_guess_content_type(filename),
        filename=filename,
    )

async def _attach_media(exercise: Exercise, media_filenames: list[str]) -> int:
    position = max((item.position for item in exercise.media), default=0)
    uploaded = 0
    for media_filename in media_filenames:
        result = await _upload_exercise_asset(media_filename)
        if result is None:
            continue
        object_key, media_type = result
        position += 1
        exercise.media.append(
            ExerciseMedia(
                object_key=object_key,
                media_type=media_type,
                position=position,
            )
        )
        uploaded += 1
    return uploaded

async def seed_system_exercises() -> tuple[int, int, int, int, int]:
    _validate_seed()

    inserted = 0
    updated = 0
    deleted = 0
    kept = 0
    media_added = 0

    async with AsyncSessionLocal() as db:
        statement = select(Exercise).where(Exercise.created_by_user_id.is_(None))
        result = await db.execute(statement)
        existing_system_exercises = list(result.scalars().all())
        existing_by_name = {
            _normalize_name(exercise.name): exercise
            for exercise in existing_system_exercises
        }
        seed_names = {_normalize_name(item.name) for item in SYSTEM_EXERCISES}

        for seed_item in SYSTEM_EXERCISES:
            normalized_name = _normalize_name(seed_item.name)
            existing_exercise = existing_by_name.get(normalized_name)
            media_filenames = seed_item.media_filenames or _resolve_media_filenames(seed_item.name)

            if existing_exercise is None:
                new_exercise = Exercise(
                    created_by_user_id=None,
                    name=seed_item.name,
                    description=seed_item.description,
                    primary_muscle_groups=seed_item.primary_muscle_groups,
                    secondary_muscles=seed_item.secondary_muscles,
                    equipment=seed_item.equipment,
                )
                db.add(new_exercise)
                media_added += await _attach_media(new_exercise, media_filenames)
                inserted += 1
                continue

            # Догрузка медиа для уже существующих упражнений, у которых его ещё нет.
            if media_filenames and not existing_exercise.media:
                media_added += await _attach_media(existing_exercise, media_filenames)

            changed = False
            if existing_exercise.name != seed_item.name:
                existing_exercise.name = seed_item.name
                changed = True
            if existing_exercise.description != seed_item.description:
                existing_exercise.description = seed_item.description
                changed = True
            if existing_exercise.primary_muscle_groups != seed_item.primary_muscle_groups:
                existing_exercise.primary_muscle_groups = seed_item.primary_muscle_groups
                changed = True
            if existing_exercise.secondary_muscles != seed_item.secondary_muscles:
                existing_exercise.secondary_muscles = seed_item.secondary_muscles
                changed = True
            if existing_exercise.equipment != seed_item.equipment:
                existing_exercise.equipment = seed_item.equipment
                changed = True
            if changed:
                updated += 1

        await db.commit()

        # --- Удаление устаревших системных упражнений ---
        # Удаляем только те, что не используются в тренировках (FK).
        # Если упражнение уже встречается в истории пользователей — оставляем его.
        for exercise in existing_system_exercises:
            if _normalize_name(exercise.name) in seed_names:
                continue
            try:
                async with db.begin_nested():
                    await db.delete(exercise)
                    await db.flush()
                deleted += 1
            except IntegrityError:
                # Упражнение защищено внешним ключом (используется в тренировках)
                kept += 1

        await db.commit()

    return inserted, updated, deleted, kept, media_added

async def main() -> None:
    inserted, updated, deleted, kept, media_added = await seed_system_exercises()
    print(
        "System exercises seed completed. "
        f"inserted={inserted}, updated={updated}, deleted={deleted}, kept={kept}, "
        f"media_added={media_added}"
    )
    await close_database_connection()

if __name__ == "__main__":
    asyncio.run(main())