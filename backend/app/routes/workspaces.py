import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..crud import (
    create_workspace,
    delete_workspace,
    get_workspace_by_id,
    get_workspaces_by_user,
)
from ..database import get_db
from ..schemas import WorkspaceCreate, WorkspaceOut
from .users import get_current_user

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("/", response_model=list[WorkspaceOut])
async def list_workspaces(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_workspaces_by_user(db, user.id)


@router.post("/", response_model=WorkspaceOut, status_code=201)
async def create_new_workspace(body: WorkspaceCreate, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await create_workspace(db, user.id, body.name, body.description, body.workspace_type)


@router.get("/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(workspace_id: int, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ws = await get_workspace_by_id(db, workspace_id)
    if not ws or ws.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.delete("/{workspace_id}", status_code=204)
async def remove_workspace(workspace_id: int, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    ws = await get_workspace_by_id(db, workspace_id)
    if not ws or ws.user_id != user.id:
        raise HTTPException(status_code=404, detail="Workspace not found")
    await delete_workspace(db, workspace_id)
