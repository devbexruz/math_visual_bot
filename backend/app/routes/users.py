from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..crud import get_or_create_user, get_user_by_token
from ..database import get_db
from ..schemas import UserCreate, UserOut

router = APIRouter(prefix="/users", tags=["users"])


async def get_current_user(authorization: str = Header(...), db: AsyncSession = Depends(get_db)):
    token = authorization.removeprefix("Bearer ").strip()
    user = await get_user_by_token(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user


@router.post("/auth", response_model=UserOut)
async def auth_user(body: UserCreate, db: AsyncSession = Depends(get_db)):
    """Telegram bot calls this to register/login a user. Returns user with token."""
    user = await get_or_create_user(db, body.telegram_id, body.fullname)
    return user


@router.get("/me", response_model=UserOut)
async def get_me(user=Depends(get_current_user)):
    return user
