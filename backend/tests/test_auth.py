from app.core.security import verify_password
from app.models.user import User


def test_register_returns_tokens_and_hashes_password(client, db_session):
    res = client.post(
        "/auth/register",
        json={"email": "a@example.com", "password": "password123", "full_name": "A"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "access_token" in body and "refresh_token" in body

    user = db_session.query(User).filter(User.email == "a@example.com").first()
    assert user is not None
    # Password tidak pernah disimpan plaintext.
    assert user.password_hash != "password123"
    assert user.password_hash.startswith("$argon2")
    assert verify_password("password123", user.password_hash) is True
    assert verify_password("password-salah", user.password_hash) is False


def test_register_duplicate_email_is_generic_error(client, register_and_login):
    register_and_login("dup@example.com")
    res = client.post(
        "/auth/register",
        json={"email": "dup@example.com", "password": "password123"},
    )
    assert res.status_code == 400
    # Pesan tidak boleh membocorkan "email sudah dipakai" secara eksplisit
    # (cegah user enumeration) — cukup pesan generik.
    assert "sudah terdaftar" not in res.json()["detail"].lower()


def test_login_success(client, register_and_login):
    register_and_login("login@example.com", "rahasia123")
    res = client.post("/auth/login", json={"email": "login@example.com", "password": "rahasia123"})
    assert res.status_code == 200
    assert "access_token" in res.json()


def test_login_wrong_password_returns_generic_401(client, register_and_login):
    register_and_login("login2@example.com", "rahasia123")
    res = client.post("/auth/login", json={"email": "login2@example.com", "password": "salah-banget"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Email atau password salah."


def test_login_nonexistent_user_same_generic_error(client):
    res = client.post("/auth/login", json={"email": "tidak-ada@example.com", "password": "apapun123"})
    assert res.status_code == 401


def test_login_timing_consistent_regardless_of_email_existing(client, register_and_login):
    # OWASP A07 — sebelum diperbaiki, argon2.verify() cuma dipanggil kalau
    # email ADA (short-circuit `or`), bikin beda waktu proses ~70ms yang bisa
    # dipakai enumerasi email walau pesan error-nya sama.
    import time

    register_and_login("timing-check@example.com", "passwordbenar123")

    start = time.perf_counter()
    client.post("/auth/login", json={"email": "timing-check@example.com", "password": "salah"})
    existing_email_time = time.perf_counter() - start

    start = time.perf_counter()
    client.post("/auth/login", json={"email": "tidak-pernah-ada@example.com", "password": "salah"})
    nonexistent_email_time = time.perf_counter() - start

    # Toleransi longgar (bukan micro-benchmark) — yang penting BUKAN beda
    # puluhan ms seperti sebelum fix (argon2 di sini ~70ms).
    assert abs(existing_email_time - nonexistent_email_time) < 0.03


def test_me_requires_auth(client):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_with_valid_token(client, register_and_login):
    token = register_and_login("me@example.com")
    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == "me@example.com"


def test_me_with_garbage_token_rejected(client):
    res = client.get("/auth/me", headers={"Authorization": "Bearer bukan.token.valid"})
    assert res.status_code == 401


def test_refresh_rotates_and_revokes_old_token(client):
    reg = client.post(
        "/auth/register",
        json={"email": "refresh@example.com", "password": "password123"},
    )
    refresh_token = reg.json()["refresh_token"]

    first_refresh = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert first_refresh.status_code == 200
    assert first_refresh.json()["refresh_token"] != refresh_token

    # Refresh token LAMA sudah di-revoke saat rotasi — dipakai ulang harus ditolak.
    second_refresh = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert second_refresh.status_code == 401


def test_logout_revokes_refresh_token(client):
    reg = client.post(
        "/auth/register",
        json={"email": "logout@example.com", "password": "password123"},
    )
    refresh_token = reg.json()["refresh_token"]

    logout_res = client.post("/auth/logout", json={"refresh_token": refresh_token})
    assert logout_res.status_code == 204

    refresh_after_logout = client.post("/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_after_logout.status_code == 401


def test_login_rate_limited_after_threshold(client, register_and_login):
    register_and_login("ratelimit@example.com", "password123")
    statuses = []
    for _ in range(12):
        res = client.post(
            "/auth/login",
            json={"email": "ratelimit@example.com", "password": "password-salah"},
        )
        statuses.append(res.status_code)

    assert statuses.count(401) == 10  # max_calls login = 10
    assert 429 in statuses
    assert statuses[-1] == 429
