from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout_template import WorkoutTemplate


class WorkoutTemplateRepository:
    async def get_by_id(self, db: AsyncSession, template_id: UUID) -> WorkoutTemplate | None:
        statement = select(WorkoutTemplate).where(WorkoutTemplate.id == template_id)
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_for_user(
        self, db: AsyncSession, template_id: UUID, user_id: UUID
    ) -> WorkoutTemplate | None:
        statement = select(WorkoutTemplate).where(
            WorkoutTemplate.id == template_id,
            or_(
                WorkoutTemplate.created_by_user_id == user_id,
                WorkoutTemplate.created_by_user_id.is_(None),
            ),
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def get_owned(
        self, db: AsyncSession, template_id: UUID, user_id: UUID
    ) -> WorkoutTemplate | None:
        statement = select(WorkoutTemplate).where(
            WorkoutTemplate.id == template_id,
            WorkoutTemplate.created_by_user_id == user_id,
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def list_for_user(self, db: AsyncSession, user_id: UUID) -> list[WorkoutTemplate]:
        statement = (
            select(WorkoutTemplate)
            .where(
                or_(
                    WorkoutTemplate.created_by_user_id == user_id,
                    WorkoutTemplate.created_by_user_id.is_(None),
                )
            )
            .order_by(WorkoutTemplate.created_at.desc(), WorkoutTemplate.id.desc())
        )
        result = await db.execute(statement)
        return list(result.scalars().all())

    async def get_user_template_by_title(
        self, db: AsyncSession, user_id: UUID, title: str
    ) -> WorkoutTemplate | None:
        statement = select(WorkoutTemplate).where(
            WorkoutTemplate.created_by_user_id == user_id,
            func.lower(WorkoutTemplate.title) == title.lower(),
        )
        result = await db.execute(statement)
        return result.scalar_one_or_none()

    async def create(
        self,
        db: AsyncSession,
        user_id: UUID,
        title: str,
        description: str | None,
    ) -> WorkoutTemplate:
        template = WorkoutTemplate(
            created_by_user_id=user_id,
            title=title,
            description=description,
        )
        db.add(template)
        await db.flush()
        return template

    async def update(
        self,
        db: AsyncSession,
        template: WorkoutTemplate,
        update_data: dict[str, str | None],
    ) -> WorkoutTemplate:
        for field_name, field_value in update_data.items():
            setattr(template, field_name, field_value)
        await db.flush()
        return template

    async def delete(self, db: AsyncSession, template: WorkoutTemplate) -> None:
        await db.delete(template)
        await db.flush()


workout_template_repository = WorkoutTemplateRepository()