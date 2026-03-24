import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ..ai import generate_shapes, transcribe_audio
from ..crud import create_shape, create_workspace
from ..database import get_db
from ..schemas import WorkspaceOut
from .users import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


class GenerateRequest(BaseModel):
    prompt: str


class GenerateResponse(BaseModel):
    workspace: WorkspaceOut
    shapes_count: int


@router.post("/generate", response_model=GenerateResponse)
async def ai_generate(
    body: GenerateRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Foydalanuvchi so'rovi asosida Gemini orqali workspace + shapes yaratish."""
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="prompt bo'sh bo'lmasligi kerak")

    try:
        result = await generate_shapes(body.prompt)
    except Exception:
        logger.exception("Gemini xatosi")
        raise HTTPException(status_code=502, detail="AI so'rovni qayta ishlashda xatolik")

    ws_name = result.get("workspace_name", "Yangi olam")
    ws_desc = result.get("workspace_description", "")
    ws_type = result.get("workspace_type", "3D")
    if ws_type not in ("2D", "3D"):
        ws_type = "3D"
    shapes_list = result.get("shapes", [])

    if not shapes_list:
        raise HTTPException(status_code=422, detail="AI so'rovga mos shakl topa olmadi")

    workspace = await create_workspace(db, user.id, ws_name, ws_desc, ws_type)

    count = 0
    for s in shapes_list:
        try:
            await create_shape(
                db,
                workspace_id=workspace.id,
                name=s["name"],
                shape_type=s["type"],
                data=s["data"],
            )
            count += 1
        except Exception:
            logger.warning("Shape qo'shishda xato: %s", s, exc_info=True)

    # Refresh to get updated shapes_count
    await db.refresh(workspace)

    return GenerateResponse(workspace=WorkspaceOut.model_validate(workspace), shapes_count=count)


ALLOWED_AUDIO_TYPES = {
    "audio/ogg",
    "audio/wav",
    "audio/mpeg",
    "audio/mp4",
    "audio/webm",
    "audio/flac",
}

MAX_AUDIO_SIZE = 10 * 1024 * 1024  # 10 MB


class SpeechToTextResponse(BaseModel):
    text: str


@router.post("/speech-to-text", response_model=SpeechToTextResponse)
async def speech_to_text(
    file: UploadFile = File(...),
    user=Depends(get_current_user),
):
    """Audio faylni matnga o'girish (speech recognition)."""
    content_type = file.content_type or "audio/ogg"
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Qo'llab-quvvatlanmaydigan audio format: {content_type}",
        )

    audio_bytes = await file.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail="Audio fayl hajmi 10 MB dan oshmasligi kerak")

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio fayl bo'sh")

    try:
        text = await transcribe_audio(audio_bytes, mime_type=content_type)
    except Exception:
        logger.exception("Speech-to-text xatosi")
        raise HTTPException(status_code=502, detail="Ovozni matnga o'girishda xatolik yuz berdi")

    if not text:
        raise HTTPException(status_code=422, detail="Ovozdan matn aniqlab bo'lmadi")

    return SpeechToTextResponse(text=text)
