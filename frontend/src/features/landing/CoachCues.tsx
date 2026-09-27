import { Quote } from "lucide-react";

import { Reveal, cardBase } from "../../components/ui";
import { EXERCISES, EXERCISE_ORDER } from "../trainer/exercises";

/**
 * The reference site uses a testimonial list here. We keep the rhythm but fill
 * it with the trainer's real cue strings from exercises.ts rather than
 * inventing member reviews.
 */
export function CoachCues() {
  return (
    <section id="proof" className="border-t border-hairline bg-canvas-deep">
      <div className="mx-auto max-w-content px-4 py-24 sm:px-8">
        <Reveal>
          <p className="display text-xs text-accent">[ in your ear ]</p>
          <h2 className="display mt-5 max-w-2xl text-display-sm text-ink">
            What the coach actually says
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-relaxed text-ink-3">
            No hype, no streak-shaming. Cues fire from joint angles the moment your
            depth drops off.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {EXERCISE_ORDER.map((key, i) => {
            const ex = EXERCISES[key];
            return (
              <Reveal key={key} delay={i * 0.08}>
                <article className={`${cardBase} flex h-full flex-col p-8`}>
                  <Quote className="h-5 w-5 text-accent" aria-hidden />
                  <p className="mt-8 flex-1 text-lg leading-snug text-ink">
                    “{ex.shallowCue}”
                  </p>
                  <div className="mt-8 border-t border-hairline pt-5">
                    <p className="display text-sm text-ink-2">{ex.label}</p>
                    <p className="mt-1 text-xs text-ink-4">
                      Target {ex.targetReps} reps · full depth at {ex.idealBottom}°
                    </p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
