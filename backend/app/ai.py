import json
import logging

from google import genai
from google.genai import types

from .config import settings

logger = logging.getLogger(__name__)

client = genai.Client(api_key=settings.GEMINI_API_KEY)

SYSTEM_PROMPT = """\
Sen matematik grafik yordamchisan. Foydalanuvchi so'roviga asosan \
matematik shakllar ro'yxatini JSON formatda qaytar.

Javob formati — faqat bitta JSON obyekt:
{
  "workspace_name": "<so'rovga mos qisqa nom>",
  "workspace_description": "<so'rovni tavsiflovchi 1-2 gaplik izoh>",
  "workspace_type": "3D" yoki "2D",
  "shapes": [
    {"name": "<shape_nomi>", "type": "3D" yoki "2D", "data": {<parametrlar>}},
    ...
  ]
}

workspace_type qoidalari:
- Agar so'rov faqat 2D shakllar haqida bo'lsa — "2D".
- Agar so'rov 3D shakllar haqida bo'lsa — "3D".
- Agar aralash bo'lsa — "3D" tanlang.

Qo'llab-quvvatlanadigan 3D shakllar (type: "3D"):
- cone:                  {"a": number, "b": number, "c": number, "color": string}
  Tenglamasi: x²/a² + y²/b² − z²/c² = 0
- cube:                  {"x": number, "y": number, "z": number, "scaleX": number, "scaleY": number, "scaleZ": number, "color": string}
  Parallelepiped: markaz (x,y,z), o'lchamlari (scaleX, scaleY, scaleZ)
- ellips:                {"a": number, "b": number, "c": number, "color": string}
  Ellipsoid tenglamasi: x²/a² + y²/b² + z²/c² = 1
- plane:                 {"a": number, "b": number, "c": number, "d": number, "size": number, "color": string}
  Tekislik tenglamasi: ax + by + cz + d = 0, size — ko'rinish o'lchami
- ellipticParaboloid:    {"a": number, "b": number, "size": number, "color": string}
  Tenglamasi: z = x²/a² + y²/b²
- hyperbolicParaboloid:  {"a": number, "b": number, "size": number, "color": string}  
  Tenglamasi: z = x²/a² − y²/b²
- hyperboloid:           {"a": number, "b": number, "c": number, "color": string}
  Ikki pallali giperboloid: −x²/a² − y²/c² + z²/b² = 1
- hyperboloid1:          {"a": number, "b": number, "c": number, "color": string}
  Bir pallali giperboloid: x²/a² + z²/b² − y²/c² = 1
- dot:                   {"x": number, "y": number, "z": number, "color": string, "title": string}
  Fazodagi nuqta

Qo'llab-quvvatlanadigan 2D shakllar (type: "2D"):
- dot2d:       {"x": number, "y": number, "color": string, "title": string}
  Tekislikdagi nuqta
- line2d:      {"k": number, "b": number, "color": string, "title": string}
  To'g'ri chiziq: y = kx + b
- ellips2d:    {"a": number, "b": number, "cx": number, "cy": number, "color": string, "title": string}
  Ellips: (x-cx)²/a² + (y-cy)²/b² = 1. Agar a=b bo'lsa aylana.
- parabola2d:  {"a": number, "b": number, "c": number, "color": string, "title": string}
  Parabola: y = ax² + bx + c
- hyperbola2d: {"k": number, "b": number, "c": number, "color": string, "title": string}
  Giperbola: y = k/(x+b) + c

Qoidalar:
1. Ranglar turlicha va chiroyli bo'lsin (hex format: "#ff6347").
2. Parametrlar matematik jihatdan to'g'ri va vizual ko'rinadigan qiymatda bo'lsin.
3. Foydalanuvchi bir nechta shakl so'rasa — hammasini qaytar.
4. workspace_name — qisqa, lo'nda (masalan: "Konus va tekislik").
5. workspace_description — nimani ko'rsatayotganini tushuntirsin.
6. Faqat yuqoridagi ro'yxatdagi shakllardan foydalanishing mumkin.
7. Barcha shapes ning type maydoni workspace_type ga mos bo'lishi kerak.
"""
from google import genai

# Agar API kalitingiz muhit o'zgaruvchilarida (environment variables) bo'lsa, avtomatik topadi.
# Aks holda client = genai.Client(api_key="SIZNING_API_KALITINGIZ") deb bering.

# print("API qabul qiladigan aniq modellar ro'yxati:")
# for model in client.models.list():
#     print(model.name)

async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/ogg") -> str:
    """SpeechRecognition kutubxonasi orqali audio ni matnga o'girish."""
    import asyncio
    import io

    import speech_recognition as sr
    from pydub import AudioSegment

    def _recognize() -> str:
        audio_stream = io.BytesIO(audio_bytes)

        format_map = {
            "audio/ogg": "ogg",
            "audio/wav": "wav",
            "audio/mpeg": "mp3",
            "audio/mp4": "mp4",
            "audio/webm": "webm",
            "audio/flac": "flac",
        }
        fmt = format_map.get(mime_type, "ogg")

        # pydub orqali WAV ga konvertatsiya
        audio_segment = AudioSegment.from_file(audio_stream, format=fmt)
        wav_io = io.BytesIO()
        audio_segment.export(wav_io, format="wav")
        wav_io.seek(0)

        # SpeechRecognition orqali tanib olish
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_io) as source:
            audio_data = recognizer.record(source)

        try:
            text = recognizer.recognize_google(audio_data, language="uz-UZ")
        except sr.UnknownValueError:
            raise ValueError("Ovozni tanib bo'lmadi, qaytadan urinib ko'ring")
        except sr.RequestError as exc:
            raise RuntimeError(f"Speech Recognition xizmati xatosi: {exc}")

        return text

    return await asyncio.to_thread(_recognize)


async def generate_shapes(user_prompt: str) -> dict:
    """Gemini dan shakllar ro'yxatini olish.

    Returns dict: {"workspace_name": str, "workspace_description": str, "shapes": list[dict]}
    """
    response = await client.aio.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
        ),
    )
    result = json.loads(response.text)

    # Minimal validatsiya
    if "shapes" not in result or not isinstance(result["shapes"], list):
        raise ValueError("Gemini noto'g'ri format qaytardi")

    return result
