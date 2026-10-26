def test_create_event_rejects_past_date(client, register_and_login):
    token = register_and_login("past@example.com")
    res = client.post(
        "/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "partner1_name": "A",
            "partner2_name": "B",
            "event_date": "2000-01-01",
            "lokasi": "X",
            "template_id": "klasik",
        },
    )
    assert res.status_code == 422


def test_create_event_rejects_javascript_maps_url(client, register_and_login):
    # maps_url dirender apa adanya sebagai <a href> di halaman publik
    # (InvitationView.tsx) — skema selain http/https harus ditolak, cegah
    # stored XSS lewat javascript: URI (OWASP A03).
    token = register_and_login("xss-maps@example.com")
    res = client.post(
        "/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "partner1_name": "A",
            "partner2_name": "B",
            "event_date": "2027-01-01",
            "lokasi": "X",
            "maps_url": "javascript:alert(document.domain)",
            "template_id": "klasik",
        },
    )
    assert res.status_code == 422


def test_update_event_rejects_javascript_maps_url(client, register_and_login):
    token = register_and_login("xss-maps-update@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    create_res = client.post(
        "/events",
        headers=headers,
        json={
            "partner1_name": "A",
            "partner2_name": "B",
            "event_date": "2027-01-01",
            "lokasi": "X",
            "template_id": "klasik",
        },
    )
    event_id = create_res.json()["id"]

    res = client.patch(
        f"/events/{event_id}",
        headers=headers,
        json={"maps_url": "javascript:alert(1)"},
    )
    assert res.status_code == 422


def test_create_event_accepts_valid_maps_url(client, register_and_login):
    token = register_and_login("valid-maps@example.com")
    res = client.post(
        "/events",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "partner1_name": "A",
            "partner2_name": "B",
            "event_date": "2027-01-01",
            "lokasi": "X",
            "maps_url": "https://maps.google.com/?q=Jakarta",
            "template_id": "klasik",
        },
    )
    assert res.status_code == 201
    assert res.json()["maps_url"] == "https://maps.google.com/?q=Jakarta"


def test_create_second_event_conflicts(client, register_and_login):
    token = register_and_login("dua-event@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "partner1_name": "A",
        "partner2_name": "B",
        "event_date": "2027-01-01",
        "lokasi": "X",
        "template_id": "klasik",
    }
    first = client.post("/events", headers=headers, json=payload)
    assert first.status_code == 201

    second = client.post("/events", headers=headers, json=payload)
    assert second.status_code == 409


def test_unpublished_event_not_visible_publicly(client, register_and_login):
    token = register_and_login("draft@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    create_res = client.post(
        "/events",
        headers=headers,
        json={
            "partner1_name": "A",
            "partner2_name": "B",
            "event_date": "2027-01-01",
            "lokasi": "X",
            "template_id": "klasik",
        },
    )
    slug = create_res.json()["slug"]

    res = client.get(f"/invitations/{slug}")
    assert res.status_code == 404


def test_non_owner_cannot_read_or_update_others_event(client, register_and_login):
    token_a = register_and_login("owner-a@example.com")
    token_b = register_and_login("owner-b@example.com")

    create_res = client.post(
        "/events",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "partner1_name": "A",
            "partner2_name": "B",
            "event_date": "2027-01-01",
            "lokasi": "X",
            "template_id": "klasik",
        },
    )
    event_id = create_res.json()["id"]

    res_get = client.get(f"/events/{event_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert res_get.status_code == 404

    res_patch = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"is_published": True},
    )
    assert res_patch.status_code == 404


def test_gift_info_requires_addon(client, published_event):
    # Amplop Digital (UW-09) khusus pemilik add-on ini — event tanpa add-on
    # (default) harus ditolak 402.
    token, _, event_id = published_event()
    res = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"bank_name": "BCA", "bank_account_number": "1234567890"},
    )
    assert res.status_code == 402


def test_gift_info_saved_and_returned_publicly_with_addon(
    client, published_premium_event, give_addon
):
    token, slug, event_id = published_premium_event()
    give_addon(event_id, "amplop_digital")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch(
        f"/events/{event_id}",
        headers=headers,
        json={
            "bank_name": "BCA",
            "bank_account_number": "1234567890",
            "bank_account_holder": "Budi Santoso",
            "ewallet_name": "GoPay",
            "ewallet_number": "081234567890",
            "ewallet_account_holder": "Budi Santoso",
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["bank_name"] == "BCA"
    assert body["bank_account_number"] == "1234567890"
    assert body["ewallet_name"] == "GoPay"

    # Halaman publik juga harus menampilkannya apa adanya (tujuan fiturnya
    # memang supaya tamu bisa lihat & transfer, bukan disembunyikan).
    public_res = client.get(f"/invitations/{slug}")
    assert public_res.status_code == 200
    public_body = public_res.json()
    assert public_body["bank_name"] == "BCA"
    assert public_body["bank_account_number"] == "1234567890"
    assert public_body["ewallet_number"] == "081234567890"


def test_gift_info_untouched_fields_dont_trigger_addon_gate(client, published_event):
    # Update yang sama sekali tidak menyentuh field gift (mis. cuma ganti
    # dress code) harus tetap bisa dipakai walau event belum punya paket/add-on.
    token, _, event_id = published_event()
    res = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"dress_code": "Batik"},
    )
    assert res.status_code == 200
    assert res.json()["dress_code"] == "Batik"


def test_partner_info_saved_normalized_and_public_without_addon(client, published_event):
    # Orang tua & Instagram mempelai bukan fitur berbayar: tidak ada gate add-on,
    # handle disimpan tanpa "@", dan tampil di endpoint publik.
    token, slug, event_id = published_event()
    res = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "partner1_parents": "Bpk. Contoh & Ibu Contoh",
            "partner1_instagram": "@budi.contoh",
            "partner2_instagram": "ani_contoh",
        },
    )
    assert res.status_code == 200, res.text
    assert res.json()["partner1_instagram"] == "budi.contoh"

    public_body = client.get(f"/invitations/{slug}").json()
    assert public_body["partner1_parents"] == "Bpk. Contoh & Ibu Contoh"
    assert public_body["partner1_instagram"] == "budi.contoh"
    assert public_body["partner2_instagram"] == "ani_contoh"
    assert public_body["partner2_parents"] is None


def test_instagram_handle_rejects_markup_and_urls(client, published_event):
    token, _, event_id = published_event()
    for bad in ["<script>alert(1)</script>", "https://instagram.com/x", "a b"]:
        res = client.patch(
            f"/events/{event_id}",
            headers={"Authorization": f"Bearer {token}"},
            json={"partner1_instagram": bad},
        )
        assert res.status_code == 422, bad


def test_uw11_requires_addon(client, published_event):
    token, _, event_id = published_event()
    res = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"show_countdown": True},
    )
    assert res.status_code == 402


def test_uw11_saved_and_returned_publicly_with_addon(client, published_premium_event, give_addon):
    token, slug, event_id = published_premium_event()
    give_addon(event_id, "musik_galeri_countdown")
    headers = {"Authorization": f"Bearer {token}"}
    res = client.patch(
        f"/events/{event_id}",
        headers=headers,
        json={
            "music_url": "https://example.com/music.mp3",
            "gallery_urls": ["https://example.com/1.jpg", "https://example.com/2.mp4"],
            "show_countdown": True,
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["music_url"] == "https://example.com/music.mp3"
    assert body["gallery_urls"] == ["https://example.com/1.jpg", "https://example.com/2.mp4"]
    assert body["show_countdown"] is True

    public_res = client.get(f"/invitations/{slug}")
    assert public_res.status_code == 200
    public_body = public_res.json()
    assert public_body["music_url"] == "https://example.com/music.mp3"
    assert public_body["gallery_urls"] == ["https://example.com/1.jpg", "https://example.com/2.mp4"]
    assert public_body["show_countdown"] is True


def test_theme_assets_saved_public_and_validated(client, published_premium_event, give_addon):
    token, slug, event_id = published_premium_event()
    give_addon(event_id, "musik_galeri_countdown")
    headers = {"Authorization": f"Bearer {token}"}
    ok = client.patch(
        f"/events/{event_id}",
        headers=headers,
        json={"theme_assets": {"hero_bg": "https://cdn.example.com/hero.webp", "envelope": "https://cdn.example.com/env.webp"}},
    )
    assert ok.status_code == 200, ok.text
    assert client.get(f"/invitations/{slug}").json()["theme_assets"]["hero_bg"] == "https://cdn.example.com/hero.webp"

    unknown = client.patch(f"/events/{event_id}", headers=headers, json={"theme_assets": {"bukan_slot": "https://x.test/a.png"}})
    assert unknown.status_code == 422
    js = client.patch(f"/events/{event_id}", headers=headers, json={"theme_assets": {"hero_bg": "javascript:alert(1)"}})
    assert js.status_code == 422


def test_theme_assets_requires_addon(client, published_event):
    token, _, event_id = published_event()
    res = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"theme_assets": {"hero_bg": "https://cdn.example.com/hero.webp"}},
    )
    assert res.status_code == 402


def test_music_url_rejects_javascript_scheme(client, published_premium_event):
    token, _, event_id = published_premium_event()
    res = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"music_url": "javascript:alert(1)"},
    )
    assert res.status_code == 422


def test_gallery_urls_rejects_javascript_scheme(client, published_premium_event):
    token, _, event_id = published_premium_event()
    res = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"gallery_urls": ["https://example.com/ok.jpg", "javascript:alert(1)"]},
    )
    assert res.status_code == 422


def test_gallery_urls_rejects_too_many_items(client, published_premium_event):
    token, _, event_id = published_premium_event()
    res = client.patch(
        f"/events/{event_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"gallery_urls": [f"https://example.com/{i}.jpg" for i in range(13)]},
    )
    assert res.status_code == 422
