import type { Profile, Sex, Goal, ActivityLevel, DietPref } from "../../lib/types";

export interface ProfileDraft {
  age: string;
  sex: string;
  height_cm: string;
  weight_kg: string;
  goal: string;
  activity_level: string;
  diet_pref: string;
}

export type ProfileFieldName = keyof ProfileDraft;
export type ProfileErrors = Partial<Record<ProfileFieldName, string>>;
export type ProfilePayload = Omit<Profile, "bmi">;

export const PROFILE_STEPS: { title: string; subtitle: string; fields: ProfileFieldName[] }[] = [
  { title: "Your body", subtitle: "These details help tailor your fitness guidance.", fields: ["age", "sex", "height_cm", "weight_kg"] },
  { title: "Your goals", subtitle: "Tell us how you move and what you want to achieve.", fields: ["goal", "activity_level"] },
  { title: "Your diet", subtitle: "Choose the meals that fit your preferences.", fields: ["diet_pref"] },
];

const options: Partial<Record<ProfileFieldName, { value: string; label: string }[]>> = {
  sex: [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
  ],
  goal: [
    { value: "lose", label: "Lose weight" },
    { value: "maintain", label: "Maintain weight" },
    { value: "gain", label: "Gain weight" },
  ],
  activity_level: [
    { value: "sedentary", label: "Sedentary" },
    { value: "light", label: "Lightly active" },
    { value: "moderate", label: "Moderately active" },
    { value: "active", label: "Active" },
    { value: "very_active", label: "Very active" },
  ],
  diet_pref: [
    { value: "veg", label: "Vegetarian" },
    { value: "nonveg", label: "Non vegetarian" },
    { value: "vegan", label: "Vegan" },
  ],
};

export const labels: Record<ProfileFieldName, string> = {
  age: "Age",
  sex: "Sex",
  height_cm: "Height (cm)",
  weight_kg: "Weight (kg)",
  goal: "Goal",
  activity_level: "Activity level",
  diet_pref: "Diet preference",
};

export function profileComplete(profile: Profile | null): boolean {
  return profile !== null && (Object.keys(labels) as ProfileFieldName[]).every((field) => profile[field] != null);
}

export function draftFromProfile(profile: Profile | null): ProfileDraft {
  return {
    age: profile?.age?.toString() ?? "",
    sex: profile?.sex ?? "",
    height_cm: profile?.height_cm?.toString() ?? "",
    weight_kg: profile?.weight_kg?.toString() ?? "",
    goal: profile?.goal ?? "",
    activity_level: profile?.activity_level ?? "",
    diet_pref: profile?.diet_pref ?? "",
  };
}

export function validateProfileFields(draft: ProfileDraft, fields: ProfileFieldName[]): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const field of fields) {
    const value = draft[field].trim();
    if (!value) {
      errors[field] = `${labels[field]} is required.`;
    } else if (field === "age" && (!Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 120)) {
      errors[field] = "Enter an age from 0 to 120.";
    } else if (field === "height_cm" && (!Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 300)) {
      errors[field] = "Enter a height above 0 and up to 300 cm.";
    } else if (field === "weight_kg" && (!Number.isFinite(Number(value)) || Number(value) <= 0 || Number(value) > 500)) {
      errors[field] = "Enter a weight above 0 and up to 500 kg.";
    } else if (options[field] && !options[field]?.some((option) => option.value === value)) {
      errors[field] = `Choose a valid ${labels[field].toLowerCase()}.`;
    }
  }
  return errors;
}

export function toProfilePayload(draft: ProfileDraft): ProfilePayload {
  return {
    age: Number(draft.age),
    sex: draft.sex as Sex,
    height_cm: Number(draft.height_cm),
    weight_kg: Number(draft.weight_kg),
    goal: draft.goal as Goal,
    activity_level: draft.activity_level as ActivityLevel,
    diet_pref: draft.diet_pref as DietPref,
  };
}

export function displayValue(field: ProfileFieldName, value: string): string {
  return options[field]?.find((option) => option.value === value)?.label ?? value;
}

export const profileOptions = options;
