from app.core.config import settings
from app.services import xendit


def _fake_invoice(**_kwargs):
    return {"id": "inv-fake-123", "invoice_url": "https://checkout.xendit.co/web/inv-fake-123"}


def test_purchase_without_xendit_configured_returns_503(client, published_event):
    token, _, event_id = published_event()
    res = client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "package", "item_key": "intimate"},
    )
    assert res.status_code == 503


def test_purchase_package_creates_pending_payment(client, published_event, monkeypatch):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    res = client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "package", "item_key": "intimate"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["checkout_url"] == "https://checkout.xendit.co/web/inv-fake-123"

    status_res = client.get(
        f"/events/{event_id}/billing/status", headers={"Authorization": f"Bearer {token}"}
    )
    assert status_res.status_code == 200
    body = status_res.json()
    assert body["package"] is None  # belum PAID (webhook belum masuk), masih pending
    assert body["latest_payment"]["status"] == "pending"
    assert body["latest_payment"]["item_type"] == "package"
    assert body["latest_payment"]["item_key"] == "intimate"
    # Katalog ikut dikembalikan supaya frontend tidak perlu hardcode harga.
    assert any(p["key"] == "intimate" and p["price_idr"] == 399_000 for p in body["catalog"]["packages"])


def test_purchase_smaller_package_after_bigger_one_rejected(
    client, published_event, give_package, monkeypatch
):
    """Gap ditemukan lewat pertanyaan pemilik produk: owner yang sudah punya
    paket besar (mis. Grand) tidak boleh bisa beli paket lebih kecil (mis.
    Intimate) — sebelumnya tidak ada guard sama sekali, webhook akan menimpa
    `event.package` tanpa syarat begitu pembayaran itu lunas."""
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    give_package(event_id, "grand")

    res = client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "package", "item_key": "intimate"},
    )
    assert res.status_code == 409
    assert "kapasitas lebih" in res.json()["detail"].lower()

    status_res = client.get(
        f"/events/{event_id}/billing/status", headers={"Authorization": f"Bearer {token}"}
    )
    assert status_res.json()["package"] == "grand"  # tidak berubah


def test_purchase_same_package_again_rejected(client, published_event, give_package, monkeypatch):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    give_package(event_id, "celebration")

    res = client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "package", "item_key": "celebration"},
    )
    assert res.status_code == 409


def test_purchase_bigger_package_after_smaller_one_allowed(
    client, published_event, give_package, monkeypatch
):
    """Upgrade (paket dengan kapasitas lebih besar) TETAP harus bisa —
    guard di atas cuma menolak downgrade/beli-ulang, bukan upgrade."""
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    give_package(event_id, "intimate")

    res = client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "package", "item_key": "grand"},
    )
    assert res.status_code == 200, res.text


def test_purchase_addon_without_package_rejected(client, published_event, monkeypatch):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    res = client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "addon", "item_key": "amplop_digital"},
    )
    assert res.status_code == 409


def test_purchase_addon_already_owned_rejected(
    client, published_event, give_package, give_addon, monkeypatch
):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    give_package(event_id, "intimate")
    give_addon(event_id, "amplop_digital")

    res = client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "addon", "item_key": "amplop_digital"},
    )
    assert res.status_code == 409


def test_purchase_unknown_item_rejected(client, published_event, monkeypatch):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    res = client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "package", "item_key": "not-a-real-package"},
    )
    assert res.status_code == 422


def test_purchase_rejects_other_owners_event(client, published_event, monkeypatch):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    _, _, event_a = published_event("owner-a@example.com")
    token_b, _, _ = published_event("owner-b@example.com")
    res = client.post(
        f"/events/{event_a}/billing/purchase",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"item_type": "package", "item_key": "intimate"},
    )
    assert res.status_code == 404


def test_webhook_rejects_missing_or_wrong_token(client, published_event, monkeypatch):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(settings, "xendit_webhook_token", "the-real-token")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "package", "item_key": "intimate"},
    )

    no_token_res = client.post(
        "/billing/webhook/xendit",
        json={"id": "inv-fake-123", "external_id": "package-x", "status": "PAID"},
    )
    assert no_token_res.status_code == 401

    wrong_token_res = client.post(
        "/billing/webhook/xendit",
        json={"id": "inv-fake-123", "external_id": "package-x", "status": "PAID"},
        headers={"x-callback-token": "salah"},
    )
    assert wrong_token_res.status_code == 401


def test_webhook_paid_activates_package(client, published_event, monkeypatch):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(settings, "xendit_webhook_token", "the-real-token")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "package", "item_key": "intimate"},
    )

    webhook_res = client.post(
        "/billing/webhook/xendit",
        json={"id": "inv-fake-123", "external_id": "package-x", "status": "PAID", "paid_amount": 399_000},
        headers={"x-callback-token": "the-real-token"},
    )
    assert webhook_res.status_code == 204

    status_res = client.get(
        f"/events/{event_id}/billing/status", headers={"Authorization": f"Bearer {token}"}
    )
    body = status_res.json()
    assert body["package"] == "intimate"
    assert body["latest_payment"]["status"] == "paid"


def test_webhook_paid_activates_addon(client, published_event, give_package, monkeypatch):
    monkeypatch.setattr(settings, "xendit_secret_key", "fake-secret")
    monkeypatch.setattr(settings, "xendit_webhook_token", "the-real-token")
    monkeypatch.setattr(xendit, "create_invoice", _fake_invoice)

    token, _, event_id = published_event()
    give_package(event_id, "intimate")
    client.post(
        f"/events/{event_id}/billing/purchase",
        headers={"Authorization": f"Bearer {token}"},
        json={"item_type": "addon", "item_key": "amplop_digital"},
    )

    webhook_res = client.post(
        "/billing/webhook/xendit",
        json={"id": "inv-fake-123", "external_id": "addon-x", "status": "PAID", "paid_amount": 100_000},
        headers={"x-callback-token": "the-real-token"},
    )
    assert webhook_res.status_code == 204

    status_res = client.get(
        f"/events/{event_id}/billing/status", headers={"Authorization": f"Bearer {token}"}
    )
    assert status_res.json()["addons"] == ["amplop_digital"]
    # Paket yang sudah ada sebelumnya tidak boleh ke-reset oleh pembelian add-on.
    assert status_res.json()["package"] == "intimate"


def test_webhook_unknown_invoice_is_ignored_not_error(client, monkeypatch):
    monkeypatch.setattr(settings, "xendit_webhook_token", "the-real-token")
    res = client.post(
        "/billing/webhook/xendit",
        json={"id": "inv-tidak-dikenal", "external_id": "x", "status": "PAID"},
        headers={"x-callback-token": "the-real-token"},
    )
    assert res.status_code == 204
