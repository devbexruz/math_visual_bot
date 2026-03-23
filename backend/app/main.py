import logging
from contextlib import asynccontextmanager

from aiogram.types import Update
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from .bot import bot, dp
from .config import settings
from .database import Base, engine
from .routes import ai, shapes, users, workspaces

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Set webhook
    webhook_url = settings.webhook_url
    await bot.set_webhook(
        url=webhook_url,
        drop_pending_updates=True,
    )
    logger.info("Webhook set to %s", webhook_url)

    yield

    # Cleanup
    await bot.delete_webhook()
    await bot.session.close()


app = FastAPI(
    title="Math Visual AI",
    version="1.0.0",
    lifespan=lifespan,
    # Swagger endpointlari
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    # OPENAPI fayli manzilini ham /api ichiga kiriting
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(users.router, prefix="/api")
app.include_router(workspaces.router, prefix="/api")
app.include_router(shapes.router, prefix="/api")
app.include_router(ai.router, prefix="/api")


@app.post(settings.WEBHOOK_PATH)
async def telegram_webhook(request: Request):
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await dp.feed_update(bot, update)
    return {"ok": True}


@app.get("/")
async def root():
    return {"message": "Math Visual AI API"}
