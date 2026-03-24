import logging

from aiogram import Bot, Dispatcher, F, Router, types
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

from .ai import generate_shapes, transcribe_audio
from .config import settings
from .crud import (
    create_shape,
    create_workspace,
    get_or_create_user,
    get_user_by_telegram_id,
)
from .database import async_session

logger = logging.getLogger(__name__)

bot = Bot(token=settings.BOT_TOKEN)
dp = Dispatcher()
router = Router()
dp.include_router(router)

WEBAPP_URL = settings.WEBHOOK_HOST

FULL_GUIDE = (
    "📐 <b>Math Visual AI — To'liq qo'llanma</b>\n"
    "\n"
    "Men sizga matematik grafiklarni yaxshiroq tasavvur qilishingiz "
    "uchun tezkor AI yordamchiman.\n"
    "\n"
    "💡 <b>Qanday ishlaydi?</b>\n"
    "Menga <b>matn yozing</b> yoki <b>ovozli xabar</b> yuboring, masalan:\n"
    "  • <i>\"Giperboloid va tekislik kesishmasini chizib ber\"</i>\n"
    "  • <i>\"y = x² parabolani ko'rsat\"</i>\n"
    "  • <i>\"Konus va ellipsoidni chiz\"</i>\n"
    "  • 🎙 <i>Ovozli xabar yuborishingiz ham mumkin!</i>\n"
    "\n"
    "Men uni sizga visual ravishda <b>3D</b> yoki <b>2D</b> formatda "
    "ko'rsataman.\n"
    "\n"
    "🛠 <b>Asosiy buyruqlar:</b>\n"
    "/start — Botni ishga tushirish\n"
    "/help  — Ushbu qo'llanmani ko'rish\n"
    "\n"
    "🎙 <b>Ovozli xabar:</b>\n"
    "Matn yozishning hojati yo'q — shunchaki ovozli xabar yuboring. "
    "AI gapingizni tushunadi va shakl yaratadi.\n"
    "\n"
    "📱 <b>Web ilova:</b>\n"
    "Quyidagi tugmani bosib to'liq interaktiv ilovani oching. "
    "U yerda siz workspace yaratib, bir nechta grafiklarni bir vaqtda "
    "ko'rishingiz, aylantirish, kattalashtirish va boshqa amallarni "
    "bajarishingiz mumkin.\n"
    "\n"
    "🔢 <b>Qo'llab-quvvatlanadigan shakllar:</b>\n"
    "  <b>2D:</b> nuqta, to'g'ri chiziq, ellips, parabola, "
    "giperbola\n"
    "  <b>3D:</b> nuqta, tekislik, konus, kub, ellipsoid, elliptik "
    "paraboloid, giperbolik paraboloid, giperboloid\n"
    "\n"
    "Savollaringiz bo'lsa — bemalol yozing yoki gapiring! 🚀"
)

WELCOME_BACK = (
    "👋 Qaytganingizdan xursandman!\n"
    "\n"
    "Menga matn yozing yoki 🎙 ovozli xabar yuboring — "
    "AI shakllarni yaratadi.\n"
    "\n"
    "Ilovani ochish uchun quyidagi tugmani bosing.\n"
    "Qo'llanma kerak bo'lsa — /help"
)


def _webapp_keyboard(token: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="📐 Math Visual AI",
            url=f"{WEBAPP_URL}?token={token}",
        )
    ]])


@router.message(CommandStart())
async def cmd_start(message: types.Message):
    tg_id = message.from_user.id
    fullname = message.from_user.full_name or "User"

    async with async_session() as db:
        existing = await get_user_by_telegram_id(db, tg_id)
        user = await get_or_create_user(db, tg_id, fullname)

    if existing is None:
        # Yangi foydalanuvchi — to'liq qo'llanma
        await message.answer(
            FULL_GUIDE,
            reply_markup=_webapp_keyboard(user.token),
            parse_mode="HTML",
        )
    else:
        # Qaytib kelgan foydalanuvchi — qisqa xabar
        await message.answer(
            WELCOME_BACK,
            reply_markup=_webapp_keyboard(user.token),
            parse_mode="HTML",
        )


@router.message(Command("help"))
async def cmd_help(message: types.Message):
    tg_id = message.from_user.id
    fullname = message.from_user.full_name or "User"

    async with async_session() as db:
        user = await get_or_create_user(db, tg_id, fullname)

    await message.answer(
        FULL_GUIDE,
        reply_markup=_webapp_keyboard(user.token),
        parse_mode="HTML",
    )


@router.message(F.text)
async def handle_text(message: types.Message):
    """Har qanday oddiy matn — Gemini ga yuboriladi."""
    tg_id = message.from_user.id
    fullname = message.from_user.full_name or "User"

    async with async_session() as db:
        user = await get_or_create_user(db, tg_id, fullname)

    waiting_msg = await message.answer("⏳ Gemini ishlamoqda, kuting...")
    await _process_prompt(message.text, user, waiting_msg)


@router.message(F.voice)
async def handle_voice(message: types.Message):
    """Ovozli xabar — Gemini bilan speech-to-text qilib, so'ng shakllar yaratadi."""
    tg_id = message.from_user.id
    fullname = message.from_user.full_name or "User"

    async with async_session() as db:
        user = await get_or_create_user(db, tg_id, fullname)

    waiting_msg = await message.answer("🎤 Ovoz tanilmoqda...")

    try:
        # 1. Voice faylni yuklab olish (OGG)
        file = await bot.get_file(message.voice.file_id)
        bio = await bot.download_file(file.file_path)
        audio_bytes = bio.read()

        # 2. Gemini orqali speech-to-text
        text = await transcribe_audio(audio_bytes, mime_type="audio/ogg")

        if not text or not text.strip():
            await waiting_msg.edit_text(
                "❌ Ovozni tanib bo'lmadi. Iltimos aniqroq gapiring yoki matn yozing."
            )
            return

    except Exception:
        logger.exception("Voice processing xatosi")
        await waiting_msg.edit_text(
            "❌ Ovozli xabarni qayta ishlashda xatolik yuz berdi."
        )
        return

    await waiting_msg.edit_text(
        f"🎤 Tanilgan matn: <i>{text}</i>\n\n⏳ Gemini ishlamoqda...",
        parse_mode="HTML",
    )
    await _process_prompt(text, user, waiting_msg)


async def _process_prompt(
    text: str, user, waiting_msg: types.Message
):
    """Gemini ga so'rov yuborish, workspace + shapes yaratish, natijani ko'rsatish."""
    try:
        result = await generate_shapes(text)
    except Exception:
        logger.exception("Gemini xatosi")
        await waiting_msg.edit_text(
            "AI yuklmaasi ortib ketdi biroz keyinroq urinib ko'ring...\n"
            "Uzur so'raymiz, hozirda bu xizmat bepul va resurslar cheklangan."
        )
        return

    ws_name = result.get("workspace_name", "Yangi olam")
    ws_desc = result.get("workspace_description", "")
    ws_type = result.get("workspace_type", "3D")
    shapes_list = result.get("shapes", [])

    if not shapes_list:
        await waiting_msg.edit_text(
            "🤔 So'rovingizga mos shakl topilmadi.\n"
            "Iltimos, aniqroq yozing. Masalan:\n"
            "<i>\"Konus va tekislik kesishmasini chiz\"</i>",
            parse_mode="HTML",
        )
        return

    # Workspace va shapes yaratish
    async with async_session() as db:
        workspace = await create_workspace(db, user.id, ws_name, ws_desc, ws_type)

        for s in shapes_list:
            try:
                await create_shape(
                    db,
                    workspace_id=workspace.id,
                    name=s["name"],
                    shape_type=s["type"],
                    data=s["data"],
                )
            except Exception:
                logger.warning("Shape qo'shishda xato: %s", s, exc_info=True)

    # Natija xabari
    shapes_text = "\n".join(
        f"  • <b>{s['name']}</b>" for s in shapes_list
    )

    webapp_url = f"{WEBAPP_URL}/world/{workspace.id}?token={user.token}&workspace={workspace.id}"
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(
            text="🌐 Olamni ochish",
            url=webapp_url,
        )
    ]])

    await waiting_msg.edit_text(
        f"✅ <b>{ws_name}</b>\n"
        f"{ws_desc}\n\n"
        f"📦 {len(shapes_list)} ta shakl yaratildi:\n"
        f"{shapes_text}\n\n"
        f"Quyidagi tugmani bosib ko'ring 👇",
        reply_markup=keyboard,
        parse_mode="HTML",
    )
