import { useEffect, useState } from "react";

import {
  Button,
  Card,
  Disclaimer,
  ErrorState,
  Loading,
  PageHeader,
} from "../../components/ui";
import { api } from "../../lib/api";
import type { Recommendation } from "../../lib/types";

export function RecoPage() {
  const [recos, setRecos] = useState<Recommendation[]>([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load(cityArg?: string) {
    setLoading(true);
    setError(false);
    const q = cityArg ? `?city=${encodeURIComponent(cityArg)}` : "";
    api
      .get<Recommendation[]>(`/recommendations${q}`)
      .then(({ data }) => setRecos(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function search(e: React.FormEvent) {
    e.preventDefault();
    load(city.trim() || undefined);
  }

  return (
    <div>
      <PageHeader
        title="Recommendations"
        subtitle={`Gyms matched to your goal${city ? " near " + city : ""}.`}
      />

      <form onSubmit={search} className="flex max-w-md gap-2">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Your city (optional)"
          className="auth-input flex-1"
        />
        <Button>Search</Button>
      </form>

      <div className="mt-6 space-y-3">
        {loading && <Loading />}
        {error && <ErrorState>Could not load recommendations.</ErrorState>}
        {!loading &&
          !error &&
          recos.map((r) => (
            <Card key={r.gym_id ?? r.name}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="display text-lg text-ink">{r.name}</h2>
                  <p className="mt-1 text-sm text-ink-3">{r.reason}</p>
                </div>
                <div className="ml-4 text-right">
                  <span className="display text-2xl leading-none text-accent">
                    {r.match_score}%
                  </span>
                  <p className="mt-1 text-xs text-ink-4">match</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-xs">
                {r.distance_km != null && (
                  <span className="text-ink-4">{r.distance_km} km away</span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    r.free
                      ? "bg-accent/10 text-accent"
                      : "bg-surface-raised text-ink-3"
                  }`}
                >
                  {r.free ? "Free" : "Paid"}
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full rounded-full bg-surface-raised">
                <div
                  className="h-1.5 rounded-full bg-accent"
                  style={{ width: `${r.match_score}%` }}
                />
              </div>
            </Card>
          ))}
      </div>

      <Disclaimer>
        Recommendations are informational only — not medical or professional advice.
      </Disclaimer>
    </div>
  );
}
