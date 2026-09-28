import { useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import {
  Camera,
  Flame,
  MapPin,
  MessageCircle,
  Radio,
  Salad,
  TrendingUp,
} from "lucide-react";

import { Reveal } from "../../components/ui";
import { ModuleVisual } from "./ModuleVisuals";
import type { ModuleKind, ModuleVisualSize } from "./ModuleVisuals";
import "./Modules.css";

const MODULES = [
  {
    kind: "trainer",
    icon: Camera,
    title: "AI Trainer",
    blurb:
      "Your webcam tracks 33 body landmarks in real time, counts reps from joint angles, and calls out shallow depth before it becomes a habit.",
    span: "md:col-span-8",
    variant: "featured",
  },
  {
    kind: "performance",
    icon: TrendingUp,
    title: "Performance",
    blurb:
      "Every session becomes a score out of 100 from rep count, form quality, and completion. Watch the weekly trend line, not the daily noise.",
    span: "md:col-span-4",
    variant: "narrow",
    stretch: true,
  },
  {
    kind: "diet",
    icon: Salad,
    title: "Dietician",
    blurb:
      "BMI and TDEE from your profile, a macro split you can actually hit, a meal plan, and a grocery list that follows from it.",
    span: "md:col-span-4",
    variant: "narrow",
    stretch: true,
  },
  {
    kind: "buddy",
    icon: MessageCircle,
    title: "Gym Buddy",
    blurb:
      "An AI coach that knows your plan and your history. Ask it why your squat stalls at rep eight. It answers at 2am.",
    span: "md:col-span-8",
    variant: "wide",
  },
  {
    kind: "habits",
    icon: Flame,
    title: "Habits",
    blurb:
      "A streak heatmap and a skip-risk model that nudges you the day before you were going to quit, not the week after.",
    span: "md:col-span-7",
    variant: "wide",
  },
  {
    kind: "gym",
    icon: Radio,
    title: "Smart Gym",
    blurb:
      "Live equipment sensors over a WebSocket, with sparklines per device and suggestions when a machine frees up.",
    span: "md:col-span-5",
    variant: "narrow",
    stretch: true,
  },
  {
    kind: "recommendations",
    icon: MapPin,
    title: "Recommendations",
    blurb:
      "Gyms near you ranked by how well they match your goal, your budget, and the equipment your plan actually needs.",
    span: "sm:col-span-2 md:col-span-12",
    variant: "full",
  },
] satisfies {
  kind: ModuleKind;
  icon: typeof Camera;
  title: string;
  blurb: string;
  span: string;
  variant: ModuleVisualSize;
  stretch?: boolean;
}[];

const VISUAL_HEIGHTS: Record<Exclude<ModuleVisualSize, "full">, string> = {
  featured: "h-56 sm:h-64 lg:h-[19rem]",
  wide: "h-52 sm:h-56 lg:h-64",
  narrow: "h-48 sm:h-56 lg:h-64",
};

const CARD_PADDING: Record<ModuleVisualSize, string> = {
  featured: "p-5 sm:p-7 lg:p-8",
  wide: "p-5 sm:p-7 lg:p-8",
  narrow: "p-5 sm:p-6 lg:p-5",
  full: "p-5 sm:p-7 lg:p-8",
};

function ModuleCard({ module, index }: { module: (typeof MODULES)[number]; index: number }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const reduceMotion = useReducedMotion();
  const Icon = module.icon;
  const isFullWidth = module.variant === "full";
  const isNarrow = module.variant === "narrow";

  const moduleMeta = (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className={`flex items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent ${isNarrow ? "size-9" : "size-10"}`}>
          <Icon className={isNarrow ? "size-[18px]" : "size-5"} aria-hidden />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-3">
          {String(index + 1).padStart(2, "0")} / 07
        </span>
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-4 ${isNarrow ? "hidden" : ""}`}>
        Module preview
      </span>
    </div>
  );

  const visual = (
    <div
      className={`${
        isFullWidth
          ? "h-52 sm:h-60 lg:order-1 lg:h-full lg:min-h-72"
          : VISUAL_HEIGHTS[module.variant]
      } overflow-hidden rounded-lg border border-hairline bg-canvas-deep`}
    >
      <ModuleVisual
        kind={module.kind}
        play={inView}
        reduced={Boolean(reduceMotion)}
        size={module.variant}
      />
    </div>
  );

  return (
    <article
      ref={ref}
      className={`${module.span} group flex min-w-0 flex-col ${module.stretch ? "md:self-stretch" : ""}`}
      aria-labelledby={`module-${module.kind}`}
    >
      <div className="module-card-surface flex-1">
        <div
          className={`${CARD_PADDING[module.variant]} ${
            isFullWidth
              ? "flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:gap-10"
              : "flex flex-col"
          }`}
        >
          {isFullWidth ? (
            <>
              {visual}
              <div className="flex min-w-0 flex-col justify-center lg:order-2">
                {moduleMeta}
                <h3 id={`module-${module.kind}`} className="display mt-8 text-2xl text-ink sm:text-[1.7rem] lg:text-3xl">
                  {module.title}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-3">{module.blurb}</p>
              </div>
            </>
          ) : (
            <>
              {moduleMeta}
              <div className="mt-6">{visual}</div>
              <h3
                id={`module-${module.kind}`}
                className={`display text-ink ${isNarrow ? "mt-6 text-2xl" : "mt-7 text-2xl sm:text-[1.7rem] lg:text-3xl"}`}
              >
                {module.title}
              </h3>
              <p className={`max-w-xl leading-relaxed text-ink-3 ${isNarrow ? "mt-2.5 text-[13px]" : "mt-3 text-sm"}`}>
                {module.blurb}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function Modules() {
  return (
    <section id="modules" className="mx-auto max-w-content px-4 py-24 sm:px-8">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h2 className="display max-w-2xl text-display-sm text-ink">
            A structured path to lasting strength
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-ink-3">
            Seven connected tools turn each workout into clearer feedback for the next one.
          </p>
        </div>
      </Reveal>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-12 md:items-start md:gap-5">
        {MODULES.map((module, index) => (
          <ModuleCard key={module.kind} module={module} index={index} />
        ))}
      </div>
    </section>
  );
}
