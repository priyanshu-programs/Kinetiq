import { Link } from "react-router-dom";

import { useAuthStore } from "../store/authStore";

const CARDS = [
  { to: "/app/trainer", title: "AI Trainer", blurb: "Webcam rep counting & form feedback" },
  { to: "/app/performance", title: "Performance", blurb: "Your score & weekly trend" },
  { to: "/app/diet", title: "Dietician", blurb: "BMI, TDEE & meal plan" },
  { to: "/app/chat", title: "Gym Buddy", blurb: "Chat with your AI coach" },
  { to: "/app/habits", title: "Habits", blurb: "Streaks & skip-risk nudges" },
  { to: "/app/iot", title: "Smart Gym", blurb: "Live equipment sensors" },
  { to: "/app/reco", title: "Recommendations", blurb: "Gyms & programs for you" },
];

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const bmi = user?.profile?.bmi;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome{user?.email ? `, ${user.email.split("@")[0]}` : ""} 👋
      </h1>
      <p className="mt-1 text-slate-600">
        {bmi != null
          ? `Your current BMI is ${bmi}.`
          : "Complete your profile to unlock personalized plans."}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand hover:shadow-sm"
          >
            <h2 className="font-semibold text-slate-900">{c.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{c.blurb}</p>
          </Link>
        ))}
      </div>

      <p className="mt-8 text-xs text-slate-400">
        Not a medical device. Health and fitness output is informational only — not
        medical advice.
      </p>
    </div>
  );
}
