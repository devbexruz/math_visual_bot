from datetime import datetime

from pydantic import BaseModel


# ---- User ----
class UserCreate(BaseModel):
    telegram_id: int
    fullname: str


class UserOut(BaseModel):
    id: int
    telegram_id: int
    fullname: str
    token: str
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Workspace ----
class WorkspaceCreate(BaseModel):
    name: str
    description: str = ""
    workspace_type: str = "3D"


class WorkspaceOut(BaseModel):
    id: int
    user_id: int
    name: str
    description: str
    workspace_type: str
    shapes_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Shape ----
class ShapeCreate(BaseModel):
    name: str
    type: str  # "2D" or "3D"
    data: dict  # JSON object — will be stored as string


class ShapeOut(BaseModel):
    id: int
    workspace_id: int
    name: str
    type: str
    data: dict
    created_at: datetime

    class Config:
        from_attributes = True
