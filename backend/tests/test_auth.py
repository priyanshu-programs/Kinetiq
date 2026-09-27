"""Auth core: register/login/me happy path + the documented edge cases
(duplicate email, bad creds, no/expired token) and server-side BMI on profile."""

from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config import settings


def _register(client, email="new@example.com", password="password123"):
    return client.post("/auth/register", json={"email": email, "password": password})


def _login(client, email="new@example.com", password="password123"):
    return client.post("/auth/login", data={"username": email, "password": password})


def test_register_login_me_happy_path(client):
    r = _register(client)
    assert r.status_code == 201
    assert r.json()["email"] == "new@example.com"

    r = _login(client)
    assert r.status_code == 200
    token = r.json()["access_token"]
    assert r.json()["token_type"] == "bearer"

    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "new@example.com"
    assert body["role"] == "user"
    assert body["profile"] is None


def test_register_duplicate_email_409(client):
    assert _register(client).status_code == 201
    assert _register(client).status_code == 409


def test_register_invalid_payload_422(client):
    # too-short password (min_length=8) and bad email
    assert client.post("/auth/register", json={"email": "x", "password": "1"}).status_code == 422


def test_login_bad_credentials_401(client):
    _register(client)
    assert _login(client, password="wrongpass").status_code == 401
    assert _login(client, email="ghost@example.com").status_code == 401


def test_me_without_token_401(client):
    assert client.get("/auth/me").status_code == 401


def test_me_with_expired_token_401(client, user):
    expired_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    expired = jwt.encode(
        {"sub": str(user.id), "exp": expired_at},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401


def test_profile_update_computes_bmi(client, auth_headers):
    r = client.put(
        "/profile",
        headers=auth_headers,
        json={"age": 30, "sex": "male", "height_cm": 180, "weight_kg": 81, "goal": "maintain"},
    )
    assert r.status_code == 200
    # 81 / 1.8^2 = 25.0
    assert r.json()["bmi"] == 25.0


def test_security_headers_present(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"
    assert r.headers["Referrer-Policy"] == "no-referrer"


def test_login_rate_limited_after_5_per_minute(client):
    _register(client)
    # limit is 5/minute on /auth/login (autouse fixture resets between tests)
    codes = [_login(client, password="wrongpass").status_code for _ in range(6)]
    assert codes[:5] == [401] * 5
    assert codes[5] == 429
