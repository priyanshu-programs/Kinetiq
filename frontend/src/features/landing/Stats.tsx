import { Reveal } from "../../components/ui";

/** Capability facts about the build — not usage claims we cannot support. */
const STATS = [
  { value: "33", label: "Body landmarks tracked per frame by the on-device pose model." },
  { value: "7", label: "Modules behind one account, from form coaching to gym discovery." },
  { value: "100%", label: "Pose inference in your browser. Camera frames are never uploaded." },
];

export function Stats() {
  return (
    <section className="mx-auto max-w-content px-4 py-24 sm:px-8">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <Reveal>
          <p className="display text-xs text-accent">[ why it works ]</p>
          <h2 className="display mt-5 text-display-sm text-ink">
            We don't sell motivation. We sell feedback.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-3">
            Motivation is a mood. Feedback is a number you can act on. Every module
            here exists to turn something you felt into something you can measure.
          </p>
        </Reveal>

        <div className="flex flex-col justify-center divide-y divide-hairline border-t border-hairline">
          {STATS.map((s, i) => (
            <Reveal key={s.value} delay={i * 0.08}>
              <div className="flex items-start gap-8 py-8">
                <span className="display w-28 shrink-0 text-5xl leading-none text-accent sm:text-6xl">
                  {s.value}
                </span>
                <p className="text-sm leading-relaxed text-ink-3">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
