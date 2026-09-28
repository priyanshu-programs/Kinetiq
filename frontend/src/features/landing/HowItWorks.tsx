import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Camera, Flame, Gauge, UserRound } from "lucide-react";

import { Reveal } from "../../components/ui";

const AUTO_ADVANCE_MS = 4000;

const STEPS = [
  {
    n: "01",
    title: "Build your profile",
    blurb:
      "Height, weight, age, goal, and activity level — four fields the model turns into your BMI and TDEE in under two minutes. No generic calorie chart and no guessing your maintenance number: every plan that follows starts from data pulled from your body, not an average stranger's.",
    icon: UserRound,
  },
  {
    n: "02",
    title: "Train in front of the camera",
    blurb:
      "Point the webcam at yourself and pick squat, push-up, or bicep curl. Pose tracking runs entirely on-device, reading 33 body landmarks per frame to count clean reps and flag shallow depth in real time — no camera frame ever leaves your browser or touches a server.",
    icon: Camera,
  },
  {
    n: "03",
    title: "Get scored, not judged",
    blurb:
      "Every set folds into one weekly score out of 100, built from rep count, form quality, and how much of the plan you actually completed. It is not a highlight reel or a pat on the back — it is a number that tells you exactly where you stand.",
    icon: Gauge,
  },
  {
    n: "04",
    title: "Keep the streak alive",
    blurb:
      "A streak heatmap tracks every session, and a skip-risk model flags the day before you were about to quit, not the week after. Miss a workout anyway and the plan quietly adapts around it, rebuilding the week from wherever you actually are instead of guilting you back to square one.",
    icon: Flame,
  },
];

export function HowItWorks() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const updateScrollState = () => {
      setCanScrollPrev(el.scrollLeft > 8);
      setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    };

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  const scrollByCard = useCallback((direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const atEnd = direction === 1 && el.scrollLeft >= el.scrollWidth - el.clientWidth - 8;
    const atStart = direction === -1 && el.scrollLeft <= 8;
    if (atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (atStart) {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      return;
    }
    const card = el.firstElementChild as HTMLElement | null;
    const amount = (card?.offsetWidth ?? el.clientWidth * 0.8) + 20;
    el.scrollBy({ left: amount * direction, behavior: "smooth" });
  }, []);

  // Auto-advance one card at a time; pauses on hover and restarts after a manual click.
  useEffect(() => {
    if (reduceMotion || paused) return;
    const id = window.setInterval(() => scrollByCard(1), AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [reduceMotion, paused, scrollByCard]);

  const handleArrowClick = (direction: 1 | -1) => {
    scrollByCard(direction);
    setPaused(true);
    window.setTimeout(() => setPaused(false), 50);
  };

  const maskImage = `linear-gradient(to right, ${
    canScrollPrev ? "transparent 0%" : "black 0%"
  }, black 10%, black 90%, ${canScrollNext ? "transparent 100%" : "black 100%"})`;

  return (
    <section id="how" className="relative overflow-hidden border-y border-hairline bg-canvas-deep">
      {/* Faint grid backdrop — decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Giant background type, echoing the heading — decorative only. */}
      <span
        aria-hidden
        className="display pointer-events-none absolute top-4 left-4 max-w-[92%] select-none text-left text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.92] text-ink/[0.05] sm:top-6 sm:left-8"
      >
        Four steps
      </span>
      <span
        aria-hidden
        className="display pointer-events-none absolute bottom-4 right-4 max-w-[92%] select-none text-right text-[clamp(2.5rem,8vw,6.5rem)] leading-[0.92] text-ink/[0.05] sm:bottom-6 sm:right-8"
      >
        Then repetition
      </span>

      <div className="relative mx-auto max-w-content px-4 pb-36 pt-40 sm:px-8 sm:pb-44 sm:pt-48">
        <Reveal>
          <h2 className="display max-w-2xl text-display-sm text-ink">
            Four steps, then repetition
          </h2>
        </Reveal>

        <div className="mt-14 flex items-end justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-3">
            [ How it works ]
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Previous step"
              onClick={() => handleArrowClick(-1)}
              className="text-ink transition hover:text-accent"
            >
              <ArrowLeft className="h-6 w-6" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next step"
              onClick={() => handleArrowClick(1)}
              className="text-ink transition hover:text-accent"
            >
              <ArrowRight className="h-6 w-6" aria-hidden />
            </button>
          </div>
        </div>

        <div className="relative mt-8">
          <div
            ref={scrollerRef}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ maskImage, WebkitMaskImage: maskImage }}
          >
            {STEPS.map((s, i) => (
              <Reveal
                key={s.n}
                delay={i * 0.06}
                className="w-[85vw] shrink-0 snap-start sm:w-[62vw] lg:w-[34%]"
              >
                <div className="flex h-full flex-col rounded-xl bg-stone p-8 transition-colors duration-300 hover:bg-accent sm:p-10">
                  <h3 className="display text-3xl text-canvas-deep sm:text-4xl">{s.title}</h3>
                  <p className="mt-5 text-justify text-base leading-relaxed text-stone-dark">
                    [ {s.blurb} ]
                  </p>
                  <div className="mt-auto flex h-16 w-16 items-center justify-center self-start rounded-lg bg-paper text-canvas-deep">
                    <s.icon className="h-7 w-7" aria-hidden />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
