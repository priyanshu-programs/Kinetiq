import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { Logo } from "../components/Logo";
import { Button, Card } from "../components/ui";
import {
  PROFILE_STEPS,
  displayValue,
  draftFromProfile,
  labels,
  toProfilePayload,
  validateProfileFields,
  profileComplete,
} from "../features/profile/profileForm";
import { ProfileFields } from "../features/profile/ProfileFields";
import type { ProfileDraft, ProfileErrors, ProfileFieldName } from "../features/profile/profileForm";
import { useAuthStore } from "../store/authStore";

const allFields = PROFILE_STEPS.flatMap((step) => step.fields);

export function Onboarding() {
  const user = useAuthStore((state) => state.user);
  const saveProfile = useAuthStore((state) => state.saveProfile);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(user?.profile ?? null));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (user && (user.role === "admin" || profileComplete(user.profile))) {
    return <Navigate to="/app" replace />;
  }

  function change(field: ProfileFieldName, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setSaveError(null);
  }

  function next() {
    const nextErrors = validateProfileFields(draft, PROFILE_STEPS[step].fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setStep((previous) => previous + 1);
  }

  async function finish() {
    const nextErrors = validateProfileFields(draft, allFields);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstInvalidStep = PROFILE_STEPS.findIndex((item) => item.fields.some((field) => nextErrors[field]));
      setStep(firstInvalidStep);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveProfile(toProfilePayload(draft));
      navigate("/app", { replace: true });
    } catch {
      setSaveError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const current = PROFILE_STEPS[step];
  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
            <span className="text-lg font-bold uppercase text-ink">Kinetiq</span>
          </div>
          <button
            className="text-xs font-semibold uppercase text-ink-3 transition hover:text-ink"
            onClick={() => { logout(); navigate("/login", { replace: true }); }}
          >
            Log out
          </button>
        </div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Set up your profile</p>
        <h1 className="display mt-3 text-3xl text-ink sm:text-4xl">Make your training yours.</h1>
        <p className="mt-3 text-sm text-ink-3">A few details help tailor plans and guidance to you.</p>
        <ol className="my-8 flex gap-2" aria-label="Onboarding progress">
          {[...PROFILE_STEPS.map((item) => item.title), "Review"].map((title, index) => (
            <li key={title} className="flex-1">
              <div className={`h-1.5 rounded-full ${index <= step ? "bg-accent" : "bg-surface-raised"}`} />
              <span className={`mt-2 block text-xs ${index === step ? "text-ink" : "text-ink-4"}`}>{title}</span>
            </li>
          ))}
        </ol>
        <Card className="p-6 sm:p-8" padded={false}>
          <h2 className="display text-2xl text-ink">{current?.title ?? "Review your details"}</h2>
          <p className="mb-7 mt-2 text-sm text-ink-3">{current?.subtitle ?? "Check everything before we save your profile."}</p>
          {current ? (
            <ProfileFields draft={draft} errors={errors} fields={current.fields} onChange={change} />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase text-ink-4">Email</dt>
                <dd className="mt-1 break-all text-sm text-ink">{user?.email}</dd>
              </div>
              {allFields.map((field) => (
                <div key={field}>
                  <dt className="text-xs font-semibold uppercase text-ink-4">{labels[field]}</dt>
                  <dd className="mt-1 text-sm text-ink">{displayValue(field, draft[field])}{field === "height_cm" ? " cm" : field === "weight_kg" ? " kg" : ""}</dd>
                </div>
              ))}
            </dl>
          )}
          {saveError && <p role="alert" className="mt-5 text-sm text-hot">{saveError}</p>}
          <div className="mt-8 flex justify-between gap-3">
            {step > 0 ? <Button variant="outline" onClick={() => { setStep((previous) => previous - 1); setErrors({}); }}>Back</Button> : <span />}
            {current ? <Button onClick={next}>Continue</Button> : <Button onClick={finish} disabled={saving}>{saving ? "Saving…" : "Finish setup"}</Button>}
          </div>
        </Card>
      </div>
    </div>
  );
}
