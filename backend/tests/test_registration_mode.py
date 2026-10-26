"""RG-05 (Mode Registrasi-Saja) — auto-enroll tamu anonim ke roster + QR.

Rencana lengkap ada di task.v2.md Bagian 11. Test paling penting di file ini
adalah `test_mode_full_does_not_autoenroll` — regression guard yang
memastikan jalur RSVP anonim lama (Fase 1, `mode="full"`) tidak berubah sama
sekali walau event punya paket aktif.
"""

import uuid as uuid_module

from app.models.event import Event
from app.models.guest import Guest


def test_mode_full_does_not_autoenroll(client, published_premium_event):
    """Regression guard — event dengan `mode="full"` (default) TIDAK PERNAH
    auto-enroll, walau punya paket aktif. Perilaku RSVP anonim lama (Fase 1)
    harus tetap identik: nol Guest terbentuk, `guest_token` selalu null."""
    token, slug, event_id = published_premium_event()

    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Hadi", "jumlah_pax": 2, "status_hadir": True},
    )
    assert res.status_code == 201
    assert res.json()["guest_token"] is None

    headers = {"Authorization": f"Bearer {token}"}
    guests_res = client.get(f"/events/{event_id}/guests", headers=headers)
    assert guests_res.status_code == 200
    assert guests_res.json() == []


def test_autoenroll_creates_guest_and_returns_token(client, registration_only_event):
    token, slug, event_id = registration_only_event()

    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Indah", "jumlah_pax": 3, "status_hadir": True},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["guest_token"] is not None

    headers = {"Authorization": f"Bearer {token}"}
    guests = client.get(f"/events/{event_id}/guests", headers=headers).json()
    assert len(guests) == 1
    assert guests[0]["invite_token"] == body["guest_token"]
    assert guests[0]["max_pax"] == 3
    assert guests[0]["rsvp_status"] == "hadir"
    assert guests[0]["self_registered"] is True


def test_autoenroll_guest_can_actually_be_checked_in(client, registration_only_event):
    """QR check-in bukan cuma tampil di layar — QR-nya (payload `guest_token`
    hasil auto-enroll) harus benar-benar bisa di-scan lewat endpoint check-in
    (BT-02, `POST /guests/check-in`) yang sama dipakai untuk tamu roster biasa.
    Tanpa test ini, RG-05 cuma terbukti "menampilkan sesuatu yang terlihat
    seperti QR", bukan "menghasilkan QR check-in yang berfungsi" — yaitu
    tujuan utama mode ini (task.v2.md §11.2)."""
    token, slug, event_id = registration_only_event()

    rsvp_res = client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Putu", "jumlah_pax": 1, "status_hadir": True},
    )
    guest_token = rsvp_res.json()["guest_token"]
    assert guest_token is not None

    headers = {"Authorization": f"Bearer {token}"}
    checkin_res = client.post("/guests/check-in", headers=headers, json={"token": guest_token})
    assert checkin_res.status_code == 200, checkin_res.text
    body = checkin_res.json()
    assert body["name"] == "Putu"
    assert body["already_checked_in"] is False
    assert body["checked_in_at"] is not None

    guests = client.get(f"/events/{event_id}/guests", headers=headers).json()
    assert guests[0]["checked_in_at"] is not None
    assert guests[0]["self_registered"] is True


def test_autoenroll_resubmit_with_token_upserts_no_duplicate(client, registration_only_event):
    token, slug, event_id = registration_only_event()

    first = client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Joko", "jumlah_pax": 2, "status_hadir": True},
    )
    guest_token = first.json()["guest_token"]

    second = client.post(
        f"/invitations/{slug}/rsvp",
        json={
            "guest_name": "diabaikan",
            "jumlah_pax": 2,
            "status_hadir": False,
            "guest_token": guest_token,
        },
    )
    assert second.status_code == 201
    # `guest_token` TIDAK PERNAH terisi untuk guest existing — cuma untuk
    # guest yang baru dibuat di request itu (OWASP A01, lihat RSVPOut).
    assert second.json()["guest_token"] is None
    assert second.json()["status_hadir"] is False

    headers = {"Authorization": f"Bearer {token}"}
    guests = client.get(f"/events/{event_id}/guests", headers=headers).json()
    assert len(guests) == 1


def test_autoenroll_capacity_full_returns_409_with_guest_facing_message(
    client, registration_only_event, db_session
):
    _, slug, event_id = registration_only_event()

    event = db_session.get(Event, uuid_module.UUID(str(event_id)))
    max_guests = 200  # paket "intimate"
    for i in range(max_guests):
        db_session.add(Guest(event_id=event.id, name=f"Tamu{i}", max_pax=1))
    db_session.commit()

    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Kelvin", "jumlah_pax": 1, "status_hadir": True},
    )
    assert res.status_code == 409
    detail = res.json()["detail"].lower()
    assert "penuh" in detail
    # Pesan ini ditujukan ke TAMU, bukan ke owner — beda dari pesan 409 di
    # create_guest (owner) yang menyebut "upgrade paket".
    assert "upgrade" not in detail
    assert "paket" not in detail


def test_autoenroll_skipped_when_event_has_no_package(client, published_event):
    """`mode="registration_only"` boleh diset walau event belum punya paket
    (mode tidak menggerbangi kapabilitas berbayar) — tapi auto-enroll-nya
    sendiri tetap membutuhkan paket, jadi RSVP jatuh ke jalur anonim lama."""
    token, slug, event_id = published_event()
    headers = {"Authorization": f"Bearer {token}"}
    patch_res = client.patch(f"/events/{event_id}", headers=headers, json={"mode": "registration_only"})
    assert patch_res.status_code == 200
    assert patch_res.json()["mode"] == "registration_only"

    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Lestari", "jumlah_pax": 1, "status_hadir": True},
    )
    assert res.status_code == 201
    assert res.json()["guest_token"] is None

    # Konfirmasi tidak ada roster terbentuk — Kelola Tamu sendiri sudah
    # tergerbang paket (402), jadi ini juga membuktikan auto-enroll tidak
    # melewati gerbang itu dari sisi lain.
    guests_res = client.get(f"/events/{event_id}/guests", headers=headers)
    assert guests_res.status_code == 402


def test_personal_link_rsvp_never_returns_guest_token(client, published_premium_event):
    """Jalur RSVP lewat link personal (sudah ada sejak UW-08) — memverifikasi
    invariant yang sama juga berlaku di luar auto-enroll: guest EXISTING
    tidak pernah dapat `guest_token` di response."""
    token, slug, event_id = published_premium_event()
    headers = {"Authorization": f"Bearer {token}"}
    create_res = client.post(
        f"/events/{event_id}/guests", headers=headers, json={"name": "Made", "max_pax": 2}
    )
    invite_token = create_res.json()["invite_token"]
    # Guest yang diinput manual owner (bukan auto-enroll) harus tetap False.
    assert create_res.json()["self_registered"] is False

    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={
            "guest_name": "diabaikan",
            "jumlah_pax": 2,
            "status_hadir": True,
            "guest_token": invite_token,
        },
    )
    assert res.status_code == 201
    assert res.json()["guest_token"] is None


def test_mode_rejects_unknown_value(client, published_event):
    token, slug, event_id = published_event()
    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch(f"/events/{event_id}", headers=headers, json={"mode": "vip_only"})
    assert res.status_code == 422


def test_autoenroll_rate_limit_looser_than_default_rsvp_limit(client, registration_only_event):
    """`rsvp-autoenroll` (15/60s) sengaja lebih longgar dari `rsvp-submit`
    (5/60s, dites di test_rsvp_guestbook.py) — lihat alasan di routes/rsvp.py."""
    _, slug, _ = registration_only_event()
    statuses = []
    for i in range(17):
        res = client.post(
            f"/invitations/{slug}/rsvp",
            json={"guest_name": f"Tamu{i}", "jumlah_pax": 1, "status_hadir": True},
        )
        statuses.append(res.status_code)

    assert statuses.count(201) == 15
    assert 429 in statuses
