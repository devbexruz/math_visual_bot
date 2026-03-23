import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..crud import (
    create_shape,
    delete_shape,
    get_shapes_by_workspace,
    get_workspace_by_id,
)
from ..database import get_db
from ..schemas import ShapeCreate, ShapeOut
from .users import get_current_user

router = APIRouter(prefix="/workspaces/{workspace_id}/shapes", tags=["shapes"])


def _shape_to_out(shape) -> dict:
    return {
        "id": shape.id,
        "workspace_id": shape.workspace_id,
        "name": shape.name,
        "type": shape.type.value,
        "data": json.loads(shape.data),
        "created_at": shape.created_at,
    }


@router.get("/", response_model=list[ShapeOut])
async def list_shapes(workspace_id: int, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ws = await get_workspace_by_id(db, workspace_id)
    if not ws or ws.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workspace not found")
    shapes = await get_shapes_by_workspace(db, workspace_id)
    return [_shape_to_out(s) for s in shapes]


@router.post("/", response_model=ShapeOut, status_code=201)
async def add_shape(workspace_id: int, body: ShapeCreate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ws = await get_workspace_by_id(db, workspace_id)
    if not ws or ws.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if body.type not in ("2D", "3D"):
        raise HTTPException(status_code=400, detail="type must be '2D' or '3D'")
    shape = await create_shape(db, workspace_id, body.name, body.type, body.data)
    return _shape_to_out(shape)


@router.delete("/{shape_id}", status_code=204)
async def remove_shape(workspace_id: int, shape_id: int, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ws = await get_workspace_by_id(db, workspace_id)
    if not ws or ws.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workspace not found")
    deleted = await delete_shape(db, shape_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Shape not found")
