"""Seed data dummy untuk development lokal. Jalankan: python seed.py"""

from datetime import date, timedelta

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.event import Event
from app.models.guest import Guest
from app.models.user import User
from app.utils.slug import generate_unique_slug


def run() -> None:
    db = SessionLocal()
    try:
        # Catatan: ".local" adalah special-use domain (RFC 6762) yang ditolak
        # validasi native <input type="email"> di Chrome/Edge — dulu dipakai
        # di sini dan gagal login lewat browser walau backend menerimanya.
        existing = db.query(User).filter(User.email == "demo@wedding-saas.dev").first()
        if existing:
            print("Seed sudah pernah dijalankan, skip.")
            return

        user = User(
            email="demo@wedding-saas.dev",
            password_hash=hash_password("password123"),
            full_name="Demo Pasangan",
        )
        db.add(user)
        db.flush()

        slug = generate_unique_slug(db, "Ayu", "Bagas")
        event = Event(
            owner_id=user.id,
            partner1_name="Ayu",
            partner2_name="Bagas",
            event_date=date.today() + timedelta(days=90),
            lokasi="Gedung Serbaguna, Jl. Melati No. 1, Jakarta",
            dress_code="Batik / Kebaya",
            template_id="klasik",
            slug=slug,
            is_published=True,
        )
        db.add(event)
        db.flush()

        db.add_all(
            [
                Guest(event_id=event.id, name="Budi Santoso", category="keluarga"),
                Guest(event_id=event.id, name="Citra Dewi", category="kolega"),
            ]
        )

        db.commit()
        print(f"Seed selesai. Login: demo@wedding-saas.dev / password123. Undangan: /{slug}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
