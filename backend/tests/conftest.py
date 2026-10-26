import fakeredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — registers semua model ke Base.metadata
from app.core import rate_limit as rate_limit_module
from app.db.base import Base
from app.db.session import get_db
from app.main import app


@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = testing_session_local()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session, monkeypatch):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    # get_redis() membaca `_redis_client` sebagai module-level global di
    # call time — cukup pre-set variabelnya, semua caller (termasuk yang
    # sudah `from ... import get_redis`) otomatis kebagian instance fake ini.
    fake_redis = fakeredis.FakeAsyncRedis(decode_responses=True)
    monkeypatch.setattr(rate_limit_module, "_redis_client", fake_redis)

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture()
def register_and_login(client):
    """Helper: daftar user baru & return (access_token, email)."""

    def _do(email: str = "user@example.com", password: str = "password123"):
        res = client.post(
            "/auth/register",
            json={"email": email, "password": password, "full_name": "Test User"},
        )
        assert res.status_code == 200, res.text
        return res.json()["access_token"]

    return _do


@pytest.fixture()
def give_package(db_session):
    """Helper: set `Event.package` langsung di DB (tanpa lewat Xendit
    sungguhan) — dipakai buat test fitur yang butuh paket aktif. Ganti
    `make_premium` lama (yang gating akun-wide lewat `User.tier`) — sekarang
    paket melekat ke EVENT, bukan akun."""

    def _do(event_id, package: str = "intimate") -> None:
        import uuid as uuid_module

        from app.models.event import Event

        event = db_session.get(Event, uuid_module.UUID(str(event_id)))
        assert event is not None, f"event {event_id} tidak ditemukan"
        event.package = package
        db_session.commit()

    return _do


@pytest.fixture()
def give_addon(db_session):
    """Helper: tambah add-on (`amplop_digital`/`musik_galeri_countdown`/
    `selfie_checkin`) ke `Event.addons` langsung di DB, tanpa lewat Xendit."""

    def _do(event_id, addon: str) -> None:
        import uuid as uuid_module

        from app.models.event import Event

        event = db_session.get(Event, uuid_module.UUID(str(event_id)))
        assert event is not None, f"event {event_id} tidak ditemukan"
        addons = list(event.addons or [])
        if addon not in addons:
            addons.append(addon)
        event.addons = addons
        db_session.commit()

    return _do


@pytest.fixture()
def published_event(client, register_and_login):
    """Helper: daftar user, buat event, publish, return (access_token, slug, event_id)."""

    def _do(email: str = "couple@example.com"):
        access_token = register_and_login(email)
        headers = {"Authorization": f"Bearer {access_token}"}
        create_res = client.post(
            "/events",
            headers=headers,
            json={
                "partner1_name": "Budi",
                "partner2_name": "Ani",
                "event_date": "2027-01-01",
                "lokasi": "Balai Kota",
                "template_id": "klasik",
            },
        )
        assert create_res.status_code == 201, create_res.text
        event = create_res.json()

        publish_res = client.patch(f"/events/{event['id']}", headers=headers, json={"is_published": True})
        assert publish_res.status_code == 200, publish_res.text
        return access_token, event["slug"], event["id"]

    return _do


@pytest.fixture()
def published_premium_event(published_event, give_package):
    """Sama seperti `published_event`, tapi event-nya sudah punya paket
    ("intimate" — kapasitas 200, cukup untuk semua test) — dipakai buat test
    Kelola Tamu (UW-08), QR Check-in (BT-02), dan fitur lain yang butuh paket
    aktif. Nama fixture dipertahankan (bukan `published_event_with_package`)
    supaya semua callsite existing (50+ di test_guests.py/test_events.py)
    tidak perlu diubah — cuma mekanisme internalnya yang ganti dari
    `User.tier` jadi `Event.package`."""

    def _do(email: str = "premium-couple@example.com"):
        access_token, slug, event_id = published_event(email)
        give_package(event_id, "intimate")
        return access_token, slug, event_id

    return _do


@pytest.fixture()
def registration_only_event(client, published_premium_event):
    """Event dengan paket aktif ('intimate') DAN `mode='registration_only'` —
    dipakai buat test auto-enroll (RG-05, Mode Registrasi-Saja). Beda dari
    `published_premium_event`, yang defaultnya `mode='full'`."""

    def _do(email: str = "regonly-couple@example.com"):
        access_token, slug, event_id = published_premium_event(email)
        headers = {"Authorization": f"Bearer {access_token}"}
        patch_res = client.patch(
            f"/events/{event_id}", headers=headers, json={"mode": "registration_only"}
        )
        assert patch_res.status_code == 200, patch_res.text
        return access_token, slug, event_id

    return _do
