import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings

# OWASP A09 (Logging & Monitoring) — sebelumnya nol logging aplikasi sama
# sekali (cuma access log default uvicorn: method/path/status, tanpa
# konteks). Ini level dasar biar event keamanan (login gagal, webhook
# ditolak — lihat auth.py & billing.py) kelihatan lewat `docker logs`, tanpa
# perlu infra logging terpisah dulu di skala MVP ini.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)

app = FastAPI(title="Wedding SaaS API", version="0.1.0")


@app.middleware("http")
async def security_headers(request: Request, call_next):
    # OWASP A05 (Security Misconfiguration) — ini API JSON murni, tidak ada
    # kebutuhan legitimate untuk di-embed sebagai iframe atau di-sniff MIME-nya.
    # Bukan Content-Security-Policy penuh — itu butuh testing ekstensif
    # (allowlist Google Maps embed, font, dll di sisi frontend) sebelum aman
    # dipasang, dicatat sebagai rekomendasi terpisah, bukan blocker sekarang.
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
