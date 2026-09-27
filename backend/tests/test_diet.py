"""Diet module: pure nutrition math + plan/log endpoints."""

import pytest

from app.diet import service
from app.models.enums import ActivityLevel, DietPref, Goal, Sex
from app.models.user import Profile


# --- pure service math (known values) ---


def test_bmi_known_value():
    # 80 kg, 178 cm → 25.2
    assert service.bmi(178, 80) == 25.2


def test_bmr_mifflin_st_jeor_male():
    # 10*80 + 6.25*178 - 5*28 + 5 = 800 + 1112.5 - 140 + 5 = 1777.5
    assert service.bmr(Sex.male, 28, 178, 80) == pytest.approx(1777.5)


def test_bmr_female_offset():
    male = service.bmr(Sex.male, 28, 178, 80)
    female = service.bmr(Sex.female, 28, 178, 80)
    assert male - female == pytest.approx(166)  # +5 vs -161


def test_tdee_and_target_goal_delta():
    bmr = service.bmr(Sex.male, 28, 178, 80)
    tdee = service.tdee(bmr, ActivityLevel.moderate)
    assert tdee == pytest.approx(1777.5 * 1.55)
    lose = service.target_kcal(tdee, Goal.lose)
    gain = service.target_kcal(tdee, Goal.gain)
    assert gain - lose == pytest.approx(900)  # +400 vs -500


def test_target_kcal_safe_floor():
    assert service.target_kcal(1000, Goal.lose) == 1200.0


def test_macro_split_sums_to_target():
    macros = service.macro_split(2000, Goal.maintain)
    kcal = macros["protein_g"] * 4 + macros["carbs_g"] * 4 + macros["fat_g"] * 9
    assert kcal == pytest.approx(2000, abs=15)  # rounding tolerance


def test_meals_and_grocery():
    meals = service.build_meals(DietPref.vegan, 2000)
    assert len(meals) == 4
    assert sum(m["kcal"] for m in meals) == pytest.approx(2000, abs=5)
    grocery = service.build_grocery(meals)
    assert len(grocery) == len(set(grocery))  # de-duplicated


# --- endpoints ---


def _add_profile(db, user):
    db.add(
        Profile(
            user_id=user.id,
            age=28,
            sex=Sex.male,
            height_cm=178,
            weight_kg=80,
            goal=Goal.lose,
            activity_level=ActivityLevel.moderate,
            diet_pref=DietPref.nonveg,
        )
    )
    db.commit()


def test_plan_requires_complete_profile(client, auth_headers):
    r = client.post("/diet/plan", headers=auth_headers)
    assert r.status_code == 400


def test_plan_generates_and_persists(client, auth_headers, db, user):
    _add_profile(db, user)
    r = client.post("/diet/plan", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["bmi"] == 25.2
    assert body["target_kcal"] > 0
    assert len(body["meals"]) == 4
    assert body["grocery"]

    # latest plan returns what we just made
    r2 = client.get("/diet/plan", headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["target_kcal"] == body["target_kcal"]


def test_nutrition_log_round_trip(client, auth_headers):
    r = client.post(
        "/nutrition/logs",
        headers=auth_headers,
        json={"date": "2026-06-16", "food": "Oats", "kcal": 300, "protein": 10},
    )
    assert r.status_code == 201
    r2 = client.get("/nutrition/logs?date=2026-06-16", headers=auth_headers)
    assert r2.status_code == 200
    logs = r2.json()
    assert len(logs) == 1 and logs[0]["food"] == "Oats"
