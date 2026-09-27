from pydantic import BaseModel


class AdminAnalytics(BaseModel):
    total_users: int
    total_sessions: int
    avg_performance_score: float | None = None
    total_chat_messages: int
    total_habit_logs: int
    sessions_by_exercise: dict[str, int]
