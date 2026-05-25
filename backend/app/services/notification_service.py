from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories import notification_settings_repository, push_subscription_repository
from app.schemas.notifications import NotificationSettings, NotificationSettingsUpdateRequest, PushSubscriptionRequest


class NotificationService:
    async def _get_or_create_settings(
        self,
        db: AsyncSession,
        current_user: User,
    ) -> NotificationSettings:
        existing = await notification_settings_repository.get_by_user_id(db=db, user_id=current_user.id)
        if existing is None:
            created = await notification_settings_repository.create(
                db=db,
                user_id=current_user.id,
                enabled=False,
                sound=True,
                vibration=False,
                do_not_disturb=False,
                reminders=True,
                reminder_offset_minutes=0,
            )
            await db.commit()
            await db.refresh(created)
            return NotificationSettings.model_validate(created)

        return NotificationSettings.model_validate(existing)

    async def get_settings(self, db: AsyncSession, current_user: User) -> NotificationSettings:
        return await self._get_or_create_settings(db=db, current_user=current_user)

    async def update_settings(
        self,
        db: AsyncSession,
        current_user: User,
        payload: NotificationSettingsUpdateRequest,
    ) -> NotificationSettings:
        existing = await notification_settings_repository.get_by_user_id(db=db, user_id=current_user.id)
        if existing is None:
            existing = await notification_settings_repository.create(
                db=db,
                user_id=current_user.id,
                enabled=False,
                sound=True,
                vibration=False,
                do_not_disturb=False,
                reminders=True,
                reminder_offset_minutes=0,
            )

        updated = await notification_settings_repository.update(
            db=db,
            settings=existing,
            enabled=payload.enabled,
            sound=payload.sound,
            vibration=payload.vibration,
            do_not_disturb=payload.do_not_disturb,
            reminders=payload.reminders,
            reminder_offset_minutes=payload.reminder_offset_minutes,
        )
        await db.commit()
        await db.refresh(updated)
        return NotificationSettings.model_validate(updated)

    async def upsert_subscription(
        self,
        db: AsyncSession,
        current_user: User,
        payload: PushSubscriptionRequest,
    ) -> None:
        now_utc = datetime.now(timezone.utc)
        await push_subscription_repository.upsert(
            db=db,
            user_id=current_user.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            last_seen=now_utc,
        )
        await db.commit()

    async def delete_subscription(
        self,
        db: AsyncSession,
        current_user: User,
        endpoint: str,
    ) -> bool:
        deleted = await push_subscription_repository.delete_by_endpoint(db=db, endpoint=endpoint)
        if deleted:
            await db.commit()
        return deleted


notification_service = NotificationService()
