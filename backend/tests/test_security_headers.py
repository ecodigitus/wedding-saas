def test_response_has_security_headers(client):
    # OWASP A05 (Security Misconfiguration) — dulu tidak ada satu pun header
    # ini, ditemukan saat security review.
    res = client.get("/health")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
