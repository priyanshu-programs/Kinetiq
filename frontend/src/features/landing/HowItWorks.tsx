import { Reveal } from "../../components/ui";

const STEPS = [
  {
    n: "01",
    title: "Build your profile",
    blurb: "Height, weight, goal, activity level. That is enough to compute BMI and TDEE.",
    meta: "2 minutes",
  },
  {
    n: "02",
    title: "Train in front of the camera",
    blurb: "Pick squat, push-up, or bicep curl. Pose runs on-device — no video leaves the browser.",
    meta: "3 exercises",
  },
  {
    n: "03",
    title: "Get scored, not judged",
    blurb: "Reps, form quality, and completion fold into one weekly performance score.",
    meta: "Out of 100",
  },
  {
    n: "04",
    title: "Keep the streak alive",
    blurb: "Skip-risk nudges land before the gap, and the plan adapts to what you actually did.",
    meta: "Daily",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-hairline bg-canvas-deep">
      <div className="mx-auto max-w-content px-4 py-24 sm:px-8">
        <Reveal>
          <p className="display text-xs text-accent">[ how it works ]</p>
          <h2 className="display mt-5 max-w-2xl text-display-sm text-ink">
            Four steps, then repetition
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className="flex h-full flex-col bg-canvas p-8 transition hover:bg-surface">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="display text-5xl text-accent">{s.n}</span>
                  <span className="display text-xs text-ink-4">{s.meta}</span>
                </div>
                <h3 className="display mt-10 text-xl text-ink">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-3">{s.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
