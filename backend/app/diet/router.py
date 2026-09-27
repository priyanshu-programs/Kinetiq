from datetime import date as date_type

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import get_current_user
from app.db import get_db
from app.diet import service
from app.models.diet import DietPlan, NutritionLog
from app.models.user import Profile, User
from app.ratelimit import limiter
from app.schemas.diet import DietPlanOut, NutritionLogIn, NutritionLogOut

router = APIRouter(tags=["diet"])

_REQUIRED_PROFILE_FIELDS = (
    "age",
    "sex",
    "height_cm",
    "weight_kg",
    "goal",
    "activity_level",
    "diet_pref",
)


def _profile_complete(profile: Profile | None) -> bool:
    if profile is None:
        return False
    return all(getattr(profile, f) is not None for f in _REQUIRED_PROFILE_FIELDS)


@router.post("/diet/plan", response_model=DietPlanOut)
@limiter.limit("30/minute")
def generate_plan(
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = user.profile
    if not _profile_complete(profile):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your profile (age, sex, height, weight, goal, activity, diet) first.",
        )

    bmi = service.bmi(profile.height_cm, profile.weight_kg)
    bmr = service.bmr(profile.sex, profile.age, profile.height_cm, profile.weight_kg)
    tdee = round(service.tdee(bmr, profile.activity_level))
    target = round(service.target_kcal(tdee, profile.goal))
    macros = service.macro_split(target, profile.goal)
    meals = service.build_meals(profile.diet_pref, target)
    grocery = service.build_grocery(meals)

    plan = DietPlan(
        user_id=user.id,
        bmi=bmi,
        tdee=tdee,
        target_kcal=target,
        macros=macros,
        meals=meals,
        grocery=grocery,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/diet/plan", response_model=DietPlanOut)
def latest_plan(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.scalars(
        select(DietPlan)
        .where(DietPlan.user_id == user.id)
        .order_by(DietPlan.created_at.desc())
        .limit(1)
    ).first()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No diet plan yet"
        )
    return plan


@router.post(
    "/nutrition/logs",
    response_model=NutritionLogOut,
    status_code=status.HTTP_201_CREATED,
)
def add_nutrition_log(
    body: NutritionLogIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = NutritionLog(user_id=user.id, **body.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/nutrition/logs", response_model=list[NutritionLogOut])
def list_nutrition_logs(
    date: date_type | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(NutritionLog).where(NutritionLog.user_id == user.id)
    if date:
        stmt = stmt.where(NutritionLog.date == date)
    logs = db.scalars(stmt.order_by(NutritionLog.id.desc()).limit(limit)).all()
    return logs
