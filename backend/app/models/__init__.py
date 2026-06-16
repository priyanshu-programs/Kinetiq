"""ORM models. Importing this package registers every table on ``Base.metadata``."""

from app.models.diet import DietPlan, NutritionLog
from app.models.engagement import ChatMessage, HabitLog, Nudge
from app.models.iot import Device, SensorReading
from app.models.reco import GymRecommendation
from app.models.user import Profile, User
from app.models.workout import PerformanceScore, RepEvent, WorkoutSession

__all__ = [
    "User",
    "Profile",
    "WorkoutSession",
    "RepEvent",
    "PerformanceScore",
    "DietPlan",
    "NutritionLog",
    "ChatMessage",
    "HabitLog",
    "Nudge",
    "Device",
    "SensorReading",
    "GymRecommendation",
]
