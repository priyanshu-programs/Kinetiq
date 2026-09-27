"""Pure nutrition math + plan generation (no DB, no FastAPI) — easily unit-tested.

Mirrors the pure-service pattern of ``app/performance/service.py``.
"""

from __future__ import annotations

from app.models.enums import ActivityLevel, DietPref, Goal, Sex

# --- constants ---

_ACTIVITY_FACTOR: dict[ActivityLevel, float] = {
    ActivityLevel.sedentary: 1.2,
    ActivityLevel.light: 1.375,
    ActivityLevel.moderate: 1.55,
    ActivityLevel.active: 1.725,
    ActivityLevel.very_active: 1.9,
}

# kcal adjustment applied to TDEE per goal.
_GOAL_KCAL_DELTA: dict[Goal, float] = {
    Goal.lose: -500.0,
    Goal.maintain: 0.0,
    Goal.gain: 400.0,
}

# (protein, carbs, fat) fraction of target kcal per goal.
_MACRO_SPLIT: dict[Goal, tuple[float, float, float]] = {
    Goal.lose: (0.35, 0.35, 0.30),
    Goal.maintain: (0.30, 0.40, 0.30),
    Goal.gain: (0.30, 0.45, 0.25),
}

# Meal distribution of daily kcal.
_MEAL_SPLIT: list[tuple[str, float]] = [
    ("Breakfast", 0.30),
    ("Lunch", 0.35),
    ("Dinner", 0.25),
    ("Snack", 0.10),
]

# Template food items per diet preference and meal.
_MEAL_ITEMS: dict[DietPref, dict[str, list[str]]] = {
    DietPref.veg: {
        "Breakfast": ["Oats with milk", "Banana", "Almonds"],
        "Lunch": ["Paneer curry", "Brown rice", "Mixed salad"],
        "Dinner": ["Lentil dal", "Whole-wheat roti", "Sauteed vegetables"],
        "Snack": ["Greek yogurt", "Apple"],
    },
    DietPref.nonveg: {
        "Breakfast": ["Egg omelette", "Whole-wheat toast", "Orange"],
        "Lunch": ["Grilled chicken", "Brown rice", "Mixed salad"],
        "Dinner": ["Baked fish", "Quinoa", "Steamed broccoli"],
        "Snack": ["Greek yogurt", "Handful of nuts"],
    },
    DietPref.vegan: {
        "Breakfast": ["Oats with soy milk", "Banana", "Chia seeds"],
        "Lunch": ["Tofu stir-fry", "Brown rice", "Mixed salad"],
        "Dinner": ["Chickpea curry", "Whole-wheat roti", "Sauteed vegetables"],
        "Snack": ["Soy yogurt", "Apple"],
    },
}


# --- pure functions ---


def bmi(height_cm: float, weight_kg: float) -> float:
    """Body Mass Index, rounded to 1 dp."""
    m = height_cm / 100.0
    return round(weight_kg / (m * m), 1)


def bmr(sex: Sex, age: int, height_cm: float, weight_kg: float) -> float:
    """Mifflin–St Jeor basal metabolic rate (kcal/day)."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    if sex == Sex.male:
        return base + 5
    if sex == Sex.female:
        return base - 161
    return base - 78  # ``other`` → average of the two offsets


def tdee(bmr_value: float, activity: ActivityLevel) -> float:
    """Total daily energy expenditure."""
    return bmr_value * _ACTIVITY_FACTOR[activity]


def target_kcal(tdee_value: float, goal: Goal) -> float:
    """Calorie target adjusted for goal (never below a safe 1200 floor)."""
    return max(1200.0, tdee_value + _GOAL_KCAL_DELTA[goal])


def macro_split(target: float, goal: Goal) -> dict[str, float]:
    """Grams of protein/carbs/fat for the target kcal."""
    p_pct, c_pct, f_pct = _MACRO_SPLIT[goal]
    return {
        "protein_g": round(target * p_pct / 4),
        "carbs_g": round(target * c_pct / 4),
        "fat_g": round(target * f_pct / 9),
    }


def build_meals(diet_pref: DietPref, target: float) -> list[dict]:
    """Templated meals distributing the kcal target."""
    items_by_meal = _MEAL_ITEMS[diet_pref]
    return [
        {
            "name": name,
            "items": items_by_meal[name],
            "kcal": round(target * pct),
        }
        for name, pct in _MEAL_SPLIT
    ]


def build_grocery(meals: list[dict]) -> list[str]:
    """Unique, order-preserving grocery list aggregated from the meals."""
    seen: dict[str, None] = {}
    for meal in meals:
        for item in meal["items"]:
            seen.setdefault(item, None)
    return list(seen.keys())
