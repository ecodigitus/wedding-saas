def test_guest_endpoints_require_package(client, published_event):
    token, _, event_id = published_event()  # event tanpa paket (default)
    res = client.post(
        f"/events/{event_id}/guests",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Budi", "max_pax": 2},
    )
    assert res.status_code == 402


def test_guest_capacity_enforced_per_package(client, published_premium_event, monkeypatch):
    # Monkeypatch katalog ke max_guests kecil (2) supaya test tidak perlu
    # benar-benar bikin 200 tamu — cuma logikanya yang diuji, bukan angka
    # sungguhan dari PACKAGE_CATALOG (itu dicek terpisah lewat konten dict-nya).
    import app.api.routes.guests as guests_route

    monkeypatch.setitem(
        guests_route.PACKAGE_CATALOG, "intimate", {"label": "Intimate", "max_guests": 2, "price_idr": 399_000}
    )

    token, _, event_id = published_premium_event()
    headers = {"Authorization": f"Bearer {token}"}
    for name in ("Tamu 1", "Tamu 2"):
        res = client.post(
            f"/events/{event_id}/guests", headers=headers, json={"name": name, "max_pax": 1}
        )
        assert res.status_code == 201, res.text

    over_limit_res = client.post(
        f"/events/{event_id}/guests", headers=headers, json={"name": "Tamu 3", "max_pax": 1}
    )
    assert over_limit_res.status_code == 409
    assert "batas" in over_limit_res.json()["detail"].lower()


def test_premium_owner_can_crud_guests(client, published_premium_event):
    token, _, event_id = published_premium_event()
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        f"/events/{event_id}/guests",
        headers=headers,
        json={"name": "Budi Santoso", "category": "keluarga", "max_pax": 3},
    )
    assert create_res.status_code == 201, create_res.text
    guest = create_res.json()
    assert guest["rsvp_status"] == "menunggu"
    assert guest["max_pax"] == 3
    assert len(guest["invite_token"]) > 0

    list_res = client.get(f"/events/{event_id}/guests", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    update_res = client.patch(
        f"/events/{event_id}/guests/{guest['id']}", headers=headers, json={"max_pax": 5}
    )
    assert update_res.status_code == 200
    assert update_res.json()["max_pax"] == 5

    delete_res = client.delete(f"/events/{event_id}/guests/{guest['id']}", headers=headers)
    assert delete_res.status_code == 204
    assert client.get(f"/events/{event_id}/guests", headers=headers).json() == []


def test_guest_name_is_sanitized(client, published_premium_event):
    token, _, event_id = published_premium_event()
    res = client.post(
        f"/events/{event_id}/guests",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "<script>alert(1)</script>Budi", "max_pax": 1},
    )
    assert res.status_code == 201
    assert "<script>" not in res.json()["name"]


def _add_guest(client, token, event_id, **overrides):
    payload = {"name": "Citra", "max_pax": 2, **overrides}
    res = client.post(
        f"/events/{event_id}/guests", headers={"Authorization": f"Bearer {token}"}, json=payload
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_public_guest_lookup_by_token(client, published_premium_event):
    token, slug, event_id = published_premium_event()
    guest = _add_guest(client, token, event_id)

    res = client.get(f"/invitations/{slug}/guest/{guest['invite_token']}")
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "Citra"
    assert body["max_pax"] == 2
    assert body["already_responded"] is False


def test_public_guest_lookup_invalid_token_404(client, published_premium_event):
    _, slug, _ = published_premium_event()
    res = client.get(f"/invitations/{slug}/guest/token-ngasal")
    assert res.status_code == 404


def test_public_guest_lookup_rate_limited(client, published_premium_event):
    # Ditemukan lewat security review (OWASP A04) — endpoint ini sempat tidak
    # punya rate limit sama sekali, beda dari endpoint publik lain.
    _, slug, _ = published_premium_event()
    statuses = [client.get(f"/invitations/{slug}/guest/token-ngasal-{i}").status_code for i in range(121)]
    assert statuses.count(429) >= 1  # max_calls guest-lookup = 120


def test_rsvp_via_guest_token_locks_name(client, published_premium_event):
    token, slug, event_id = published_premium_event()
    guest = _add_guest(client, token, event_id, name="Dewi Asli")

    # guest_name yang dikirim client DIABAIKAN — nama diambil dari roster.
    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={
            "guest_name": "Nama Palsu",
            "jumlah_pax": 2,
            "status_hadir": True,
            "guest_token": guest["invite_token"],
        },
    )
    assert res.status_code == 201
    assert res.json()["guest_name"] == "Dewi Asli"


def test_rsvp_via_guest_token_rejects_over_max_pax(client, published_premium_event):
    token, slug, event_id = published_premium_event()
    guest = _add_guest(client, token, event_id, max_pax=2)

    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={
            "guest_name": "abaikan",
            "jumlah_pax": 5,
            "status_hadir": True,
            "guest_token": guest["invite_token"],
        },
    )
    assert res.status_code == 422


def test_rsvp_via_guest_token_upserts_on_resubmit(client, published_premium_event):
    token, slug, event_id = published_premium_event()
    guest = _add_guest(client, token, event_id, max_pax=4)

    first = client.post(
        f"/invitations/{slug}/rsvp",
        json={
            "guest_name": "abaikan",
            "jumlah_pax": 1,
            "status_hadir": False,
            "guest_token": guest["invite_token"],
        },
    )
    assert first.status_code == 201

    second = client.post(
        f"/invitations/{slug}/rsvp",
        json={
            "guest_name": "abaikan",
            "jumlah_pax": 3,
            "status_hadir": True,
            "guest_token": guest["invite_token"],
        },
    )
    assert second.status_code == 201
    assert second.json()["id"] == first.json()["id"]  # baris yang sama, bukan baru
    assert second.json()["status_hadir"] is True
    assert second.json()["jumlah_pax"] == 3

    headers = {"Authorization": f"Bearer {token}"}
    rsvp_list = client.get(f"/events/{event_id}/rsvps", headers=headers).json()
    assert len(rsvp_list) == 1  # tidak ada duplikat

    guest_list = client.get(f"/events/{event_id}/guests", headers=headers).json()
    assert guest_list[0]["rsvp_status"] == "hadir"


def test_guest_without_rsvp_shows_menunggu_in_list(client, published_premium_event):
    token, _, event_id = published_premium_event()
    _add_guest(client, token, event_id)
    guest_list = client.get(f"/events/{event_id}/guests", headers={"Authorization": f"Bearer {token}"}).json()
    assert guest_list[0]["rsvp_status"] == "menunggu"


def test_check_in_guest_success(client, published_premium_event):
    token, _, event_id = published_premium_event()
    guest = _add_guest(client, token, event_id, name="Eko")

    res = client.post(
        "/guests/check-in",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": guest["invite_token"]},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["name"] == "Eko"
    assert body["already_checked_in"] is False
    assert body["checked_in_at"] is not None

    guest_list = client.get(f"/events/{event_id}/guests", headers={"Authorization": f"Bearer {token}"}).json()
    assert guest_list[0]["checked_in_at"] is not None


def test_check_in_guest_idempotent(client, published_premium_event):
    token, _, event_id = published_premium_event()
    guest = _add_guest(client, token, event_id)
    headers = {"Authorization": f"Bearer {token}"}

    first = client.post("/guests/check-in", headers=headers, json={"token": guest["invite_token"]})
    assert first.json()["already_checked_in"] is False
    first_time = first.json()["checked_in_at"]

    second = client.post("/guests/check-in", headers=headers, json={"token": guest["invite_token"]})
    assert second.status_code == 200
    assert second.json()["already_checked_in"] is True
    assert second.json()["checked_in_at"] == first_time  # tidak ke-overwrite


def test_check_in_invalid_token_404(client, published_premium_event):
    token, _, _ = published_premium_event()
    res = client.post(
        "/guests/check-in",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": "token-ngasal"},
    )
    assert res.status_code == 404


def test_check_in_rejects_guest_from_other_owners_event(client, published_premium_event):
    token_a, _, event_a = published_premium_event("owner-a@example.com")
    guest = _add_guest(client, token_a, event_a)

    token_b, _, _ = published_premium_event("owner-b@example.com")
    res = client.post(
        "/guests/check-in",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"token": guest["invite_token"]},
    )
    assert res.status_code == 404


def test_check_in_requires_package(client, published_event, db_session):
    import uuid as uuid_module

    from app.models.guest import Guest

    token, _, event_id = published_event()  # event tanpa paket
    # Guest disisipkan langsung ke DB (bypass create_guest yang sudah
    # men-gate paket di endpoint) — cuma cara mensimulasikan skenario ini
    # untuk test, karena API normal tidak bisa bikin guest tanpa paket sama
    # sekali. Defense-in-depth check di check-in tetap perlu diuji.
    guest = Guest(event_id=uuid_module.UUID(event_id), name="Test", max_pax=1)
    db_session.add(guest)
    db_session.commit()

    res = client.post(
        "/guests/check-in",
        headers={"Authorization": f"Bearer {token}"},
        json={"token": guest.invite_token},
    )
    assert res.status_code == 402


# --- BT-03 Selfie Check-in ---
# `upload_private_object`/`generate_signed_url` di-monkeypatch di sini (bukan
# moto) — yang mau diuji di file ini adalah logika endpoint (validasi,
# gating, ownership, persist selfie_key), bukan detail boto3-nya sendiri
# (itu sudah dicek terpisah di test_storage.py).

import io  # noqa: E402

from PIL import Image  # noqa: E402


def _make_test_jpeg() -> bytes:
    img = Image.new("RGB", (20, 20), color=(10, 20, 30))
    out = io.BytesIO()
    img.save(out, format="JPEG")
    return out.getvalue()


def test_upload_selfie_success(client, published_premium_event, give_addon, monkeypatch):
    import app.api.routes.guests as guests_route

    uploaded = {}
    monkeypatch.setattr(
        guests_route,
        "upload_private_object",
        lambda key, data, content_type: uploaded.update(key=key, data=data, content_type=content_type),
    )

    token, _, event_id = published_premium_event()
    give_addon(event_id, "selfie_checkin")
    guest = _add_guest(client, token, event_id, name="Eko")
    headers = {"Authorization": f"Bearer {token}"}
    client.post("/guests/check-in", headers=headers, json={"token": guest["invite_token"]})

    res = client.post(
        "/guests/check-in/selfie",
        headers=headers,
        data={"token": guest["invite_token"]},
        files={"photo": ("selfie.jpg", _make_test_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 200, res.text
    assert res.json()["has_selfie"] is True
    assert uploaded["content_type"] == "image/jpeg"
    assert uploaded["key"].startswith("selfies/")

    guest_list = client.get(f"/events/{event_id}/guests", headers=headers).json()
    assert guest_list[0]["has_selfie"] is True


def test_upload_selfie_rejects_invalid_image(client, published_premium_event, give_addon, monkeypatch):
    import app.api.routes.guests as guests_route

    monkeypatch.setattr(guests_route, "upload_private_object", lambda *a, **k: None)

    token, _, event_id = published_premium_event()
    give_addon(event_id, "selfie_checkin")
    guest = _add_guest(client, token, event_id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/guests/check-in/selfie",
        headers=headers,
        data={"token": guest["invite_token"]},
        files={"photo": ("fake.jpg", b"bukan gambar sungguhan", "image/jpeg")},
    )
    assert res.status_code == 422


def test_upload_selfie_requires_addon(client, published_premium_event, db_session):
    import uuid as uuid_module

    from app.models.guest import Guest

    # Event punya paket (jadi bisa check-in biasa) tapi belum beli add-on
    # selfie_checkin — guest disisipkan langsung ke DB, sama alasannya
    # dengan test_check_in_requires_package (API normal butuh paket utk
    # bikin guest, jadi paket tetap ada di sini, cuma add-on-nya yang belum).
    token, _, event_id = published_premium_event()
    guest = Guest(event_id=uuid_module.UUID(event_id), name="Test", max_pax=1)
    db_session.add(guest)
    db_session.commit()

    res = client.post(
        "/guests/check-in/selfie",
        headers={"Authorization": f"Bearer {token}"},
        data={"token": guest.invite_token},
        files={"photo": ("selfie.jpg", _make_test_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 402


def test_upload_selfie_invalid_token_404(client, published_premium_event):
    token, _, _ = published_premium_event()
    res = client.post(
        "/guests/check-in/selfie",
        headers={"Authorization": f"Bearer {token}"},
        data={"token": "token-ngasal"},
        files={"photo": ("selfie.jpg", _make_test_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 404


def test_upload_selfie_rejects_other_owners_guest(client, published_premium_event):
    token_a, _, event_a = published_premium_event("selfie-owner-a@example.com")
    guest = _add_guest(client, token_a, event_a)

    token_b, _, _ = published_premium_event("selfie-owner-b@example.com")
    res = client.post(
        "/guests/check-in/selfie",
        headers={"Authorization": f"Bearer {token_b}"},
        data={"token": guest["invite_token"]},
        files={"photo": ("selfie.jpg", _make_test_jpeg(), "image/jpeg")},
    )
    assert res.status_code == 404


def test_get_selfie_url_success(client, published_premium_event, give_addon, monkeypatch):
    import app.api.routes.guests as guests_route

    monkeypatch.setattr(guests_route, "upload_private_object", lambda *a, **k: None)
    monkeypatch.setattr(
        guests_route, "generate_signed_url", lambda key, expires_in=300: f"https://signed.example/{key}"
    )

    token, _, event_id = published_premium_event()
    give_addon(event_id, "selfie_checkin")
    guest = _add_guest(client, token, event_id)
    headers = {"Authorization": f"Bearer {token}"}
    client.post(
        "/guests/check-in/selfie",
        headers=headers,
        data={"token": guest["invite_token"]},
        files={"photo": ("selfie.jpg", _make_test_jpeg(), "image/jpeg")},
    )

    res = client.get(f"/events/{event_id}/guests/{guest['id']}/selfie-url", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["url"].startswith("https://signed.example/selfies/")
    assert body["expires_in"] == 300


def test_get_selfie_url_404_when_no_selfie(client, published_premium_event, give_addon):
    token, _, event_id = published_premium_event()
    give_addon(event_id, "selfie_checkin")
    guest = _add_guest(client, token, event_id)
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get(f"/events/{event_id}/guests/{guest['id']}/selfie-url", headers=headers)
    assert res.status_code == 404


def test_get_selfie_url_rejects_other_owners_event(client, published_premium_event):
    token_a, _, event_a = published_premium_event("selfie-url-owner-a@example.com")
    guest = _add_guest(client, token_a, event_a)

    token_b, _, event_b = published_premium_event("selfie-url-owner-b@example.com")
    res = client.get(
        f"/events/{event_b}/guests/{guest['id']}/selfie-url",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res.status_code == 404
