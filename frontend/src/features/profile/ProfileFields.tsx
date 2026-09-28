import { labels, profileOptions } from "./profileForm";
import type { ProfileDraft, ProfileErrors, ProfileFieldName } from "./profileForm";

export function ProfileFields({
  draft,
  errors,
  fields,
  onChange,
}: {
  draft: ProfileDraft;
  errors: ProfileErrors;
  fields: ProfileFieldName[];
  onChange: (field: ProfileFieldName, value: string) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field} className="block">
          <label htmlFor={`profile-${field}`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-3">{labels[field]}</label>
          {profileOptions[field] ? (
            <select
              id={`profile-${field}`}
              className="auth-input"
              value={draft[field]}
              onChange={(event) => onChange(field, event.target.value)}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `${field}-error` : undefined}
            >
              <option value="">Select {labels[field].toLowerCase()}</option>
              {profileOptions[field]?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          ) : (
            <input
              id={`profile-${field}`}
              className="auth-input"
              type="number"
              min={field === "age" ? 0 : undefined}
              max={field === "age" ? 120 : field === "height_cm" ? 300 : 500}
              step={field === "age" ? 1 : "any"}
              value={draft[field]}
              onChange={(event) => onChange(field, event.target.value)}
              aria-invalid={Boolean(errors[field])}
              aria-describedby={errors[field] ? `${field}-error` : undefined}
            />
          )}
          {errors[field] && <span id={`${field}-error`} className="mt-1.5 block text-xs text-hot">{errors[field]}</span>}
        </div>
      ))}
    </div>
  );
}
