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
