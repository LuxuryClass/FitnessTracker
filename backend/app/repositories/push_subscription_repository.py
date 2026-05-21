from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_subscription import PushSubscription


class PushSubscriptionRepository:
    async def get_by_endpoint(self, db: AsyncSession, endpoint: str) -> PushSubscription | None:
        statement = select(PushSubscription).where(PushSubscription.endpoint == endpoint)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def list_by_user_id(self, db: AsyncSession, user_id: UUID) -> list[PushSubscription]:
        statement = select(PushSubscription).where(PushSubscription.user_id == user_id)
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def upsert(
        self,
        db: AsyncSession,
        *,
        user_id: UUID,
        endpoint: str,
        p256dh: str,
        auth: str,
        last_seen: datetime,
    ) -> PushSubscription:
        existing = await self.get_by_endpoint(db, endpoint)
        if existing is None:
            subscription = PushSubscription(
                user_id=user_id,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
                last_seen=last_seen,
            )
            db.add(subscription)
            await db.flush()
            return subscription

        existing.user_id = user_id
        existing.p256dh = p256dh
        existing.auth = auth
        existing.last_seen = last_seen
        await db.flush()
        return existing

    async def delete_by_endpoint(self, db: AsyncSession, endpoint: str) -> bool:
        subscription = await self.get_by_endpoint(db, endpoint)
        if subscription is None:
            return False
        await db.delete(subscription)
        await db.flush()
        return True


push_subscription_repository = PushSubscriptionRepository()
