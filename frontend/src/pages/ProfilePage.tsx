import { useState } from "react";

import { Button, Card, PageHeader } from "../components/ui";
import {
  PROFILE_STEPS,
  displayValue,
  draftFromProfile,
  labels,
  toProfilePayload,
  validateProfileFields,
} from "../features/profile/profileForm";
import { ProfileFields } from "../features/profile/ProfileFields";
import type { ProfileDraft, ProfileErrors, ProfileFieldName } from "../features/profile/profileForm";
import { useAuthStore } from "../store/authStore";

const allFields = PROFILE_STEPS.flatMap((step) => step.fields);

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const saveProfile = useAuthStore((state) => state.saveProfile);
  const [draft, setDraft] = useState<ProfileDraft>(() => draftFromProfile(user?.profile ?? null));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function change(field: ProfileFieldName, value: string) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    setSaveError(null);
  }

  async function save() {
    const nextErrors = validateProfileFields(draft, allFields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveProfile(toProfilePayload(draft));
      setEditing(false);
    } catch {
      setSaveError("Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Your profile" subtitle="Review and update the details behind your fitness guidance." />
      <Card className="mb-5 p-6" padded={false}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-4">Account</h2>
        <p className="mt-3 break-all text-lg text-ink">{user?.email}</p>
      </Card>
      <Card className="p-6 sm:p-8" padded={false}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="display text-2xl text-ink">Fitness details</h2>
            <p className="mt-1 text-sm text-ink-3">Your current details are saved to your account.</p>
          </div>
          {!editing && <Button variant="outline" onClick={() => setEditing(true)}>Edit details</Button>}
        </div>
        {editing ? (
          <>
            <ProfileFields draft={draft} errors={errors} fields={allFields} onChange={change} />
            {saveError && <p role="alert" className="mt-5 text-sm text-hot">{saveError}</p>}
            <div className="mt-8 flex gap-3">
              <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
              <Button variant="outline" onClick={() => { setDraft(draftFromProfile(user?.profile ?? null)); setErrors({}); setSaveError(null); setEditing(false); }} disabled={saving}>Cancel</Button>
            </div>
          </>
        ) : (
          <dl className="grid gap-5 sm:grid-cols-2">
            {allFields.map((field) => (
              <div key={field}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-4">{labels[field]}</dt>
                <dd className="mt-1 text-sm text-ink">{draft[field] ? displayValue(field, draft[field]) : "Not set"}{draft[field] && field === "height_cm" ? " cm" : draft[field] && field === "weight_kg" ? " kg" : ""}</dd>
              </div>
            ))}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-4">BMI</dt>
              <dd className="mt-1 text-sm text-ink">{user?.profile?.bmi ?? "Not available"}</dd>
            </div>
          </dl>
        )}
      </Card>
    </div>
  );
}
