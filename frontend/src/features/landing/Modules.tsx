import {
  ArrowUpRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  MapPin,
  MessageCircle,
  Radio,
  Salad,
  TrendingUp,
} from "lucide-react";
import { useRef } from "react";

import { Reveal, cardBase } from "../../components/ui";

const MODULES = [
  {
    icon: Camera,
    title: "AI Trainer",
    blurb:
      "Your webcam tracks 33 body landmarks in real time, counts reps from joint angles, and calls out shallow depth before it becomes a habit.",
  },
  {
    icon: TrendingUp,
    title: "Performance",
    blurb:
      "Every session becomes a score out of 100 from rep count, form quality, and completion. Watch the weekly trend line, not the daily noise.",
  },
  {
    icon: Salad,
    title: "Dietician",
    blurb:
      "BMI and TDEE from your profile, a macro split you can actually hit, a meal plan, and a grocery list that follows from it.",
  },
  {
    icon: MessageCircle,
    title: "Gym Buddy",
    blurb:
      "An AI coach that knows your plan and your history. Ask it why your squat stalls at rep eight. It answers at 2am.",
  },
  {
    icon: Flame,
    title: "Habits",
    blurb:
      "A streak heatmap and a skip-risk model that nudges you the day before you were going to quit, not the week after.",
  },
  {
    icon: Radio,
    title: "Smart Gym",
    blurb:
      "Live equipment sensors over a WebSocket, with sparklines per device and suggestions when a machine frees up.",
  },
  {
    icon: MapPin,
    title: "Recommendations",
    blurb:
      "Gyms near you ranked by how well they match your goal, your budget, and the equipment your plan actually needs.",
  },
];

export function Modules() {
  const rail = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section id="modules" className="mx-auto max-w-content px-4 py-24 sm:px-8">
      <Reveal>
        <p className="display text-xs text-accent">[ what you get ]</p>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h2 className="display max-w-2xl text-display-sm text-ink">
            A structured path to lasting strength
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll(-1)}
              aria-label="Previous modules"
              className="rounded-lg border border-hairline p-3 text-ink-3 transition hover:border-accent hover:text-accent"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              onClick={() => scroll(1)}
              aria-label="Next modules"
              className="rounded-lg border border-hairline p-3 text-ink-3 transition hover:border-accent hover:text-accent"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </Reveal>

      <div
        ref={rail}
        className="mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {MODULES.map(({ icon: Icon, title, blurb }) => (
          <article
            key={title}
            className={`${cardBase} group flex w-[85vw] shrink-0 snap-start flex-col p-7 hover:border-accent/50 sm:w-[360px]`}
          >
            <Icon className="h-6 w-6 text-accent" aria-hidden />
            <h3 className="display mt-8 text-2xl text-ink">{title}</h3>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-3">{blurb}</p>
            <ArrowUpRight
              className="mt-8 h-5 w-5 text-ink-4 transition group-hover:text-accent"
              aria-hidden
            />
          </article>
        ))}
      </div>
    </section>
  );
}
