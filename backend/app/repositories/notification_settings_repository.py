from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_notification_settings import UserNotificationSettings


class NotificationSettingsRepository:
    async def get_by_user_id(
        self,
        db: AsyncSession,
        user_id: UUID,
    ) -> UserNotificationSettings | None:
        statement = select(UserNotificationSettings).where(UserNotificationSettings.user_id == user_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        enabled: bool,
        sound: bool,
        vibration: bool,
        do_not_disturb: bool,
        reminders: bool,
        reminder_offset_minutes: int,
    ) -> UserNotificationSettings:
        settings = UserNotificationSettings(
            user_id=user_id,
            enabled=enabled,
            sound=sound,
            vibration=vibration,
            do_not_disturb=do_not_disturb,
            reminders=reminders,
            reminder_offset_minutes=reminder_offset_minutes,
        )
        db.add(settings)
        await db.flush()
        return settings

    async def update(
        self,
        db: AsyncSession,
        settings: UserNotificationSettings,
        *,
        enabled: bool | None = None,
        sound: bool | None = None,
        vibration: bool | None = None,
        do_not_disturb: bool | None = None,
        reminders: bool | None = None,
        reminder_offset_minutes: int | None = None,
    ) -> UserNotificationSettings:
        if enabled is not None:
            settings.enabled = enabled
        if sound is not None:
            settings.sound = sound
        if vibration is not None:
            settings.vibration = vibration
        if do_not_disturb is not None:
            settings.do_not_disturb = do_not_disturb
        if reminders is not None:
            settings.reminders = reminders
        if reminder_offset_minutes is not None:
            settings.reminder_offset_minutes = reminder_offset_minutes
        await db.flush()
        return settings


notification_settings_repository = NotificationSettingsRepository()
