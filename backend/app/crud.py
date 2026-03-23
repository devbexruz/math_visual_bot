import json
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Shape, ShapeTypeEnum, User, Workspace


# ==================== USER ====================

async def get_user_by_telegram_id(db: AsyncSession, telegram_id: int) -> User | None:
    result = await db.execute(select(User).where(User.telegram_id == telegram_id))
    return result.scalar_one_or_none()


async def get_user_by_token(db: AsyncSession, token: str) -> User | None:
    result = await db.execute(select(User).where(User.token == token))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, telegram_id: int, fullname: str) -> User:
    token = secrets.token_hex(32)
    user = User(telegram_id=telegram_id, fullname=fullname, token=token)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def get_or_create_user(db: AsyncSession, telegram_id: int, fullname: str) -> User:
    user = await get_user_by_telegram_id(db, telegram_id)
    if user:
        return user
    return await create_user(db, telegram_id, fullname)


# ==================== WORKSPACE ====================

async def get_workspaces_by_user(db: AsyncSession, user_id: int) -> list[Workspace]:
    result = await db.execute(
        select(Workspace).where(Workspace.user_id == user_id).order_by(Workspace.created_at.desc())
    )
    return list(result.scalars().all())


async def get_workspace_by_id(db: AsyncSession, workspace_id: int) -> Workspace | None:
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    return result.scalar_one_or_none()


async def create_workspace(
    db: AsyncSession, user_id: int, name: str,
    description: str = "", workspace_type: str = "3D",
) -> Workspace:
    workspace = Workspace(
        user_id=user_id, name=name,
        description=description, workspace_type=workspace_type,
        shapes_count=0,
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return workspace


async def delete_workspace(db: AsyncSession, workspace_id: int) -> bool:
    workspace = await get_workspace_by_id(db, workspace_id)
    if not workspace:
        return False
    await db.delete(workspace)
    await db.commit()
    return True


# ==================== SHAPE ====================

async def get_shapes_by_workspace(db: AsyncSession, workspace_id: int) -> list[Shape]:
    result = await db.execute(
        select(Shape).where(Shape.workspace_id == workspace_id).order_by(Shape.created_at)
    )
    return list(result.scalars().all())


async def create_shape(db: AsyncSession, workspace_id: int, name: str, shape_type: str, data: dict) -> Shape:
    shape = Shape(
        workspace_id=workspace_id,
        name=name,
        type=ShapeTypeEnum(shape_type),
        data=json.dumps(data),
    )
    db.add(shape)

    # Update shapes_count
    workspace = await get_workspace_by_id(db, workspace_id)
    if workspace:
        workspace.shapes_count = workspace.shapes_count + 1

    await db.commit()
    await db.refresh(shape)
    return shape


async def delete_shape(db: AsyncSession, shape_id: int) -> bool:
    result = await db.execute(select(Shape).where(Shape.id == shape_id))
    shape = result.scalar_one_or_none()
    if not shape:
        return False

    workspace = await get_workspace_by_id(db, shape.workspace_id)
    await db.delete(shape)
    if workspace and workspace.shapes_count > 0:
        workspace.shapes_count = workspace.shapes_count - 1

    await db.commit()
    return True
