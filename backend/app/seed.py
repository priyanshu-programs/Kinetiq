"""Seed demo data: one demo user (with profile) and the seed gym dataset.

Run with: ``python -m app.seed`` (idempotent).
"""

from sqlalchemy import select

from app.auth.security import hash_password
from app.db import SessionLocal
from app.models.enums import ActivityLevel, DietPref, Goal, Sex
from app.models.user import Profile, User

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo1234"


def seed() -> None:
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == DEMO_EMAIL))
        if user is None:
            user = User(
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
            )
            db.add(user)
            db.flush()
            user.profile = Profile(
                user_id=user.id,
                age=28,
                sex=Sex.male,
                height_cm=178.0,
                weight_kg=80.0,
                goal=Goal.lose,
                activity_level=ActivityLevel.moderate,
                diet_pref=DietPref.nonveg,
            )
            db.commit()
            print(f"Seeded demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        else:
            print(f"Demo user already exists: {DEMO_EMAIL}")
        # Gyms live in app/reco/gyms.json and are loaded at request time by the
        # recommender (Phase 3); no DB seeding needed for them here.
    finally:
        db.close()


if __name__ == "__main__":
    seed()
