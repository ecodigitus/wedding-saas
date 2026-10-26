def test_submit_rsvp_success(client, published_event):
    _, slug, _ = published_event()
    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Citra", "jumlah_pax": 2, "status_hadir": True},
    )
    assert res.status_code == 201
    body = res.json()
    assert body["guest_name"] == "Citra"
    assert body["jumlah_pax"] == 2
    assert body["status_hadir"] is True


def test_submit_rsvp_sanitizes_xss_payload(client, published_event):
    _, slug, _ = published_event()
    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={
            "guest_name": "<script>alert(1)</script>Budi",
            "jumlah_pax": 1,
            "status_hadir": True,
        },
    )
    assert res.status_code == 201
    guest_name = res.json()["guest_name"]
    assert "<script>" not in guest_name
    assert "Budi" in guest_name


def test_submit_rsvp_to_unpublished_event_404(client, register_and_login):
    token = register_and_login("draft-rsvp@example.com")
    create_res = client.post(
        "/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "partner1_name": "A",
            "partner2_name": "B",
            "event_date": "2027-01-01",
            "lokasi": "X",
            "template_id": "klasik",
        },
    )
    slug = create_res.json()["slug"]

    res = client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Tamu", "jumlah_pax": 1, "status_hadir": True},
    )
    assert res.status_code == 404


def test_owner_can_list_and_export_rsvps(client, published_event):
    token, slug, event_id = published_event()
    client.post(
        f"/invitations/{slug}/rsvp",
        json={"guest_name": "Dewi", "jumlah_pax": 3, "status_hadir": True},
    )

    headers = {"Authorization": f"Bearer {token}"}
    list_res = client.get(f"/events/{event_id}/rsvps", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1
    assert list_res.json()[0]["guest_name"] == "Dewi"

    export_res = client.get(f"/events/{event_id}/rsvps/export", headers=headers)
    assert export_res.status_code == 200
    assert export_res.headers["content-type"].startswith("text/csv")
    assert "Dewi,3,Hadir" in export_res.text


def test_non_owner_cannot_read_others_rsvps(client, published_event, register_and_login):
    _, _, event_id = published_event("owner1@example.com")
    other_token = register_and_login("intruder@example.com")

    res = client.get(f"/events/{event_id}/rsvps", headers={"Authorization": f"Bearer {other_token}"})
    assert res.status_code == 404


def test_rsvp_submit_rate_limited(client, published_event):
    _, slug, _ = published_event()
    statuses = []
    for i in range(7):
        res = client.post(
            f"/invitations/{slug}/rsvp",
            json={"guest_name": f"Tamu{i}", "jumlah_pax": 1, "status_hadir": True},
        )
        statuses.append(res.status_code)

    assert statuses.count(201) == 5  # max_calls rsvp-submit = 5
    assert 429 in statuses


def test_submit_guestbook_sanitizes_xss_payload(client, published_event):
    _, slug, _ = published_event()
    res = client.post(
        f"/invitations/{slug}/guestbook",
        json={"nama": "Eka", "pesan": "Selamat ya! <img src=x onerror=alert(1)>"},
    )
    assert res.status_code == 201
    pesan = res.json()["pesan"]
    assert "<img" not in pesan
    assert "onerror" not in pesan
    assert "Selamat ya!" in pesan


def test_guestbook_public_read_lists_entries(client, published_event):
    _, slug, _ = published_event()
    client.post(f"/invitations/{slug}/guestbook", json={"nama": "Fajar", "pesan": "Bahagia selalu"})

    res = client.get(f"/invitations/{slug}/guestbook")
    assert res.status_code == 200
    entries = res.json()
    assert len(entries) == 1
    assert entries[0]["nama"] == "Fajar"


def test_guestbook_submit_rate_limited(client, published_event):
    _, slug, _ = published_event()
    statuses = []
    for i in range(7):
        res = client.post(
            f"/invitations/{slug}/guestbook",
            json={"nama": f"Tamu{i}", "pesan": "halo"},
        )
        statuses.append(res.status_code)

    assert statuses.count(201) == 5  # max_calls guestbook-submit = 5
    assert 429 in statuses


def test_owner_can_export_guestbook_but_export_is_not_bt06(client, published_event):
    """BT-06 (export data tamu & kehadiran) dipenuhi oleh export RSVP, bukan
    export buku tamu — export ini cuma nilai tambah turunan BT-01."""
    token, slug, event_id = published_event()
    client.post(f"/invitations/{slug}/guestbook", json={"nama": "Gita", "pesan": "Turut senang"})

    export_res = client.get(
        f"/events/{event_id}/guestbook/export", headers={"Authorization": f"Bearer {token}"}
    )
    assert export_res.status_code == 200
    assert "Gita,Turut senang" in export_res.text
    # Tidak ada kolom kehadiran di export ini — konfirmasi BT-06 memang di rsvp export.
    assert "status_hadir" not in export_res.text.lower()
