export type Role = "user" | "admin";
export type Sex = "male" | "female" | "other";
export type Goal = "lose" | "maintain" | "gain";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type DietPref = "veg" | "nonveg" | "vegan";

export interface Profile {
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: Goal | null;
  activity_level: ActivityLevel | null;
  diet_pref: DietPref | null;
  bmi: number | null;
}

export interface User {
  id: number;
  email: string;
  role: Role;
  profile: Profile | null;
}

export type Exercise = "squat" | "pushup" | "bicep_curl";

export interface WorkoutSession {
  id: number;
  exercise: Exercise;
  started_at: string;
  ended_at: string | null;
  total_reps: number;
  avg_form_score: number | null;
}

export interface PerformanceScore {
  score: number;
  efficiency: number | null;
  consistency: number | null;
  week: number | null;
  ts: string;
}

export interface WeeklyPerformance {
  week: number;
  score: number;
  efficiency: number;
  consistency: number;
}

export interface RepEventPayload {
  rep_index: number;
  form_score: number;
  tempo_ms: number | null;
  flags: Record<string, unknown> | null;
}

// --- Phase 3: AI modules ---

export interface Macros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Meal {
  name: string;
  items: string[];
  kcal: number;
}

export interface DietPlan {
  bmi: number | null;
  tdee: number | null;
  target_kcal: number | null;
  macros: Macros | null;
  meals: Meal[] | null;
  grocery: string[] | null;
  created_at: string;
}

export interface NutritionLog {
  id: number;
  date: string;
  food: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  sentiment: number | null;
  ts: string;
}

export interface ChatResponse {
  reply: string;
  sentiment: number;
  source: "llm" | "fallback";
  /** Which OpenRouter model answered; null for a fallback reply. */
  model?: string | null;
}

export interface HabitLog {
  id: number;
  date: string;
  planned: boolean;
  completed: boolean;
  time_of_day: number | null;
  weekday: number | null;
}

export interface RiskResponse {
  skip_probability: number;
  factors: string[];
}

export interface Nudge {
  id: number;
  message: string;
  reason: string | null;
  sent_at: string;
  dismissed: boolean;
}

export type DeviceType = "treadmill" | "bike" | "smartband";
export type SensorMetric = "heart_rate" | "resistance" | "speed" | "reps";

export interface Device {
  id: number;
  name: string;
  type: DeviceType;
  status: "online" | "offline";
}

export interface SensorReading {
  device_id: number;
  name: string;
  type: DeviceType;
  metric: SensorMetric;
  value: number;
  ts: string;
  suggestion: string | null;
}

export interface Recommendation {
  gym_id: string | null;
  name: string;
  distance_km: number | null;
  match_score: number;
  reason: string | null;
  free: boolean;
}

// --- Phase 4: dashboard summary & admin analytics ---

export interface DashboardSummary {
  profile_complete: boolean;
  latest_score: number | null;
  nutrition_consumed_kcal: number;
  nutrition_target_kcal: number | null;
  skip_probability: number;
  streak: number;
  active_nudges: number;
}

export interface AdminAnalytics {
  total_users: number;
  total_sessions: number;
  avg_performance_score: number | null;
  total_chat_messages: number;
  total_habit_logs: number;
  sessions_by_exercise: Record<string, number>;
}
