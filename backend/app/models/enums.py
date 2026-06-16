import enum


class Role(str, enum.Enum):
    user = "user"
    admin = "admin"


class Sex(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


class Goal(str, enum.Enum):
    lose = "lose"
    maintain = "maintain"
    gain = "gain"


class ActivityLevel(str, enum.Enum):
    sedentary = "sedentary"
    light = "light"
    moderate = "moderate"
    active = "active"
    very_active = "very_active"


class DietPref(str, enum.Enum):
    veg = "veg"
    nonveg = "nonveg"
    vegan = "vegan"


class Exercise(str, enum.Enum):
    squat = "squat"
    pushup = "pushup"
    bicep_curl = "bicep_curl"


class ChatRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"


class DeviceType(str, enum.Enum):
    treadmill = "treadmill"
    bike = "bike"
    smartband = "smartband"


class DeviceStatus(str, enum.Enum):
    online = "online"
    offline = "offline"


class SensorMetric(str, enum.Enum):
    heart_rate = "heart_rate"
    resistance = "resistance"
    speed = "speed"
    reps = "reps"
