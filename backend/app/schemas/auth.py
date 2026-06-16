from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import ActivityLevel, DietPref, Goal, Role, Sex


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class RegisterResponse(BaseModel):
    id: int
    email: EmailStr


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ProfileIn(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    sex: Sex | None = None
    height_cm: float | None = Field(default=None, gt=0, le=300)
    weight_kg: float | None = Field(default=None, gt=0, le=500)
    goal: Goal | None = None
    activity_level: ActivityLevel | None = None
    diet_pref: DietPref | None = None


class ProfileOut(ProfileIn):
    model_config = ConfigDict(from_attributes=True)

    bmi: float | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    role: Role
    profile: ProfileOut | None = None
