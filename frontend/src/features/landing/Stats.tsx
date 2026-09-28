import { useRef } from "react";
import {
  easeOut,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowCta, Reveal } from "../../components/ui";

/** Capability facts about the build — not usage claims we cannot support. */
const STATS = [
  { value: "33", label: "Body landmarks tracked per frame by the on-device pose model." },
  { value: "7", label: "Modules behind one account, from form coaching to gym discovery." },
  { value: "100%", label: "Pose inference in your browser. Camera frames are never uploaded." },
];

function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`h-6 w-6 shrink-0 ${className}`}
    >
      <path d="M12 0c.9 6.6 4.5 10.2 12 12-7.5 1.8-11.1 5.4-12 12-.9-6.6-4.5-10.2-12-12C7.5 10.2 11.1 6.6 12 0Z" />
    </svg>
  );
}

export function Stats() {
  const frameRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  // Zoomed in as the frame enters the viewport, settling to 1x once it is centred.
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ["start end", "center center"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [1.4, 1], { ease: easeOut });

  return (
    <section id="why-us" className="mx-auto max-w-content scroll-mt-20 px-4 py-24 sm:px-8">
      <div className="grid items-stretch gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left — feedback UI showcase image. */}
        <Reveal className="h-full">
          <div
            ref={frameRef}
            className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-hairline-strong bg-surface lg:min-h-[640px]"
          >
            <motion.img
              src="/feedback.webp"
              alt="On-screen form feedback overlay showing knee angle, squat depth, back angle, and rep count during a barbell squat."
              className="h-full w-full object-cover will-change-transform"
              style={reduce ? undefined : { scale }}
            />
          </div>
        </Reveal>

        {/* Right — heading, subcopy, CTA, then stat rows. */}
        <div className="flex flex-col">
          <Reveal>
            <h2 className="display text-display-md text-ink">
              We don&rsquo;t sell
              <br />
              <span className="text-ink-3">
                motivation. We sell feedback.
              </span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-ink-3">
              [ Motivation is a mood. Feedback is a number you can act on.
              Every module here exists to turn something you felt into
              something you can measure. ]
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-8">
              <ArrowCta to="/register">Join us today</ArrowCta>
            </div>
          </Reveal>

          <div className="mt-14 flex flex-1 flex-col justify-end divide-y divide-hairline border-b border-hairline lg:mt-0 lg:pt-16">
            {STATS.map((s, i) => (
              <Reveal key={s.value} delay={i * 0.12} from="right">
                <div className="flex items-center gap-5 py-7 sm:gap-8">
                  <Sparkle className="text-ink" />
                  <span className="display w-28 shrink-0 text-5xl leading-none text-ink sm:w-36 sm:text-6xl">
                    {s.value}
                  </span>
                  <p className="text-sm leading-relaxed text-ink-3">
                    [ {s.label} ]
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
