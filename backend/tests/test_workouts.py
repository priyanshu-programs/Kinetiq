"""Smoke tests for the workout session endpoints (start → finish → history)."""


def test_start_finish_history_flow(client, auth_headers):
    start = client.post(
        "/workouts/sessions", json={"exercise": "squat"}, headers=auth_headers
    )
    assert start.status_code == 201
    session_id = start.json()["session_id"]

    rep_events = [
        {"rep_index": i, "form_score": 90.0, "tempo_ms": 1200, "flags": None}
        for i in range(10)
    ]
    finish = client.post(
        f"/workouts/sessions/{session_id}/finish",
        json={"total_reps": 10, "rep_events": rep_events},
        headers=auth_headers,
    )
    assert finish.status_code == 200
    body = finish.json()
    assert body["session"]["total_reps"] == 10
    assert 0.0 <= body["performance_score"]["score"] <= 100.0

    history = client.get("/workouts/sessions", headers=auth_headers)
    assert history.status_code == 200
    assert len(history.json()) == 1

    weekly = client.get("/performance/weekly", headers=auth_headers)
    assert weekly.status_code == 200
    assert len(weekly.json()) == 1


def test_finish_unknown_session_404(client, auth_headers):
    resp = client.post(
        "/workouts/sessions/999/finish",
        json={"total_reps": 0, "rep_events": []},
        headers=auth_headers,
    )
    assert resp.status_code == 404


def test_requires_auth(client):
    assert client.get("/workouts/sessions").status_code == 401
