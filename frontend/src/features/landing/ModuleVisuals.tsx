import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export type ModuleKind =
  | "trainer"
  | "performance"
  | "diet"
  | "buddy"
  | "habits"
  | "gym"
  | "recommendations";

export type ModuleVisualSize = "featured" | "wide" | "narrow" | "full";

type VisualProps = { play: boolean; reduced: boolean; size: ModuleVisualSize };

function appear({ play, reduced }: VisualProps, delay = 0, y = 10) {
  return {
    initial: reduced ? false : { opacity: 0, y },
    animate: { opacity: play || reduced ? 1 : 0, y: play || reduced ? 0 : y },
    transition: { duration: 0.42, delay: play && !reduced ? delay : 0, ease: "easeOut" as const },
  };
}

function line({ play, reduced }: VisualProps, delay = 0) {
  return {
    initial: reduced ? false : { pathLength: 0, opacity: 0 },
    animate: { pathLength: play || reduced ? 1 : 0, opacity: play || reduced ? 1 : 0 },
    transition: { duration: 0.85, delay: play && !reduced ? delay : 0, ease: "easeOut" as const },
  };
}

type Pt = [number, number];

interface SquatPose {
  knee: Pt;
  hip: Pt;
  shoulder: Pt;
  head: Pt;
  elbow: Pt;
  wrist: Pt;
}

/** Side-view squat rig. Ankle stays planted; every other joint articulates. */
const ANKLE: Pt = [110, 150];

const SQUAT_TOP: SquatPose = {
  knee: [114, 110],
  hip: [104, 66],
  shoulder: [116, 20],
  head: [123, 8],
  elbow: [138, 34],
  wrist: [156, 28],
};

const SQUAT_MID: SquatPose = {
  knee: [125, 117],
  hip: [94, 94],
  shoulder: [116, 51],
  head: [123, 39],
  elbow: [138, 63],
  wrist: [155, 56],
};

/** Thigh ends parallel to the floor (hip y == knee y). */
const SQUAT_DEEP: SquatPose = {
  knee: [136, 124],
  hip: [84, 122],
  shoulder: [116, 82],
  head: [124, 70],
  elbow: [140, 92],
  wrist: [158, 84],
};

/** Hips stop well above parallel — the "shallow" rep the cue calls out. */
const SQUAT_SHALLOW: SquatPose = {
  knee: [126, 118],
  hip: [93, 100],
  shoulder: [116, 58],
  head: [123, 46],
  elbow: [139, 70],
  wrist: [156, 63],
};

// 4-rep super-cycle: three full-depth reps, then one shallow rep.
const SQUAT_SEQ: SquatPose[] = [SQUAT_TOP];
for (const bottom of [SQUAT_DEEP, SQUAT_DEEP, SQUAT_DEEP, SQUAT_SHALLOW]) {
  SQUAT_SEQ.push(SQUAT_MID, bottom, SQUAT_MID, SQUAT_TOP);
}

// Within each 2.4s rep: slow eccentric → bottom pause → drive up → top pause.
const REP_PHASES = [0.96, 0.29, 0.72, 0.43];
const CYCLE_S = REP_PHASES.reduce((a, b) => a + b, 0) * 4;
const SQUAT_TIMES: number[] = [0];
{
  let t = 0;
  for (let rep = 0; rep < 4; rep++) {
    for (const d of REP_PHASES) {
      t += d;
      SQUAT_TIMES.push(t / CYCLE_S);
    }
  }
}
const SQUAT_EASE: ("easeIn" | "easeOut" | "easeInOut")[] = Array.from(
  { length: (SQUAT_SEQ.length - 1) / 4 },
  () => ["easeIn", "easeOut", "easeOut", "easeInOut"] as const,
).flat();

const ACCENT = "#c3ff96";

/** JS mirror of the framer easing names used in SQUAT_EASE. */
function easeLocal(kind: (typeof SQUAT_EASE)[number], t: number): number {
  if (kind === "easeIn") return t * t;
  if (kind === "easeOut") return 1 - (1 - t) * (1 - t);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

const RINGS: { get: (p: SquatPose) => Pt; r: number }[] = [
  { get: (p) => p.knee, r: 3 },
  { get: (p) => p.hip, r: 3 },
  { get: (p) => p.shoulder, r: 3 },
  { get: (p) => p.elbow, r: 2.5 },
];

const REP_LABELS = ["08", "09", "10", "10"];
const WARN = "#ffb366";

function TrainerVisual(props: VisualProps) {
  const { play, reduced } = props;
  const animating = play && !reduced;

  // Ticks once per 2.4s rep, in lockstep with the 4-rep skeleton cycle.
  const [rep, setRep] = useState(0);

  // Bone/joint refs get exact coordinates written every animation frame —
  // no reliance on SVG transform interpolation.
  const torsoRef = useRef<SVGLineElement | null>(null);
  const thighRef = useRef<SVGLineElement | null>(null);
  const shinRef = useRef<SVGLineElement | null>(null);
  const armUpRef = useRef<SVGLineElement | null>(null);
  const armForeRef = useRef<SVGLineElement | null>(null);
  const headRef = useRef<SVGCircleElement | null>(null);
  const ringRefs = useRef<(SVGCircleElement | null)[]>([]);
  const shadowRef = useRef<SVGEllipseElement | null>(null);
  const markerRef = useRef<SVGCircleElement | null>(null);
  const repRef = useRef(0);

  useEffect(() => {
    if (!animating) return;
    let raf = 0;
    const t0 = performance.now();

    const setLine = (
      el: SVGLineElement | null,
      x1: number,
      y1: number,
      x2: number,
      y2: number,
    ) => {
      if (!el) return;
      el.setAttribute("x1", x1.toFixed(1));
      el.setAttribute("y1", y1.toFixed(1));
      el.setAttribute("x2", x2.toFixed(1));
      el.setAttribute("y2", y2.toFixed(1));
    };
    const setPt = (el: SVGCircleElement | null, cx: number, cy: number) => {
      if (!el) return;
      el.setAttribute("cx", cx.toFixed(1));
      el.setAttribute("cy", cy.toFixed(1));
    };

    const tick = (now: number) => {
      const elapsed = ((now - t0) / 1000) % CYCLE_S;
      const frac = elapsed / CYCLE_S;
      let i = 0;
      while (i < SQUAT_TIMES.length - 2 && frac >= SQUAT_TIMES[i + 1]) i++;
      const span = SQUAT_TIMES[i + 1] - SQUAT_TIMES[i];
      const lt = easeLocal(
        SQUAT_EASE[i],
        span <= 0 ? 0 : (frac - SQUAT_TIMES[i]) / span,
      );
      const A = SQUAT_SEQ[i];
      const B = SQUAT_SEQ[i + 1];
      const mix = (get: (p: SquatPose) => Pt): Pt => [
        get(A)[0] + (get(B)[0] - get(A)[0]) * lt,
        get(A)[1] + (get(B)[1] - get(A)[1]) * lt,
      ];
      const knee = mix((p) => p.knee);
      const hip = mix((p) => p.hip);
      const shoulder = mix((p) => p.shoulder);
      const head = mix((p) => p.head);
      const elbow = mix((p) => p.elbow);
      const wrist = mix((p) => p.wrist);

      setLine(torsoRef.current, hip[0], hip[1], shoulder[0], shoulder[1]);
      setLine(thighRef.current, hip[0], hip[1], knee[0], knee[1]);
      setLine(shinRef.current, knee[0], knee[1], ANKLE[0], ANKLE[1]);
      setLine(armUpRef.current, shoulder[0], shoulder[1], elbow[0], elbow[1]);
      setLine(armForeRef.current, elbow[0], elbow[1], wrist[0], wrist[1]);
      setPt(headRef.current, head[0], head[1]);
      const joints = [knee, hip, shoulder, elbow];
      ringRefs.current.forEach((ring, k) => {
        const q = joints[k];
        if (q) setPt(ring, q[0], q[1]);
      });

      // Shadow spreads and gauge marker drops with hip depth (66 → 122).
      const depth = Math.min(1, Math.max(0, (hip[1] - 66) / (122 - 66)));
      shadowRef.current?.setAttribute("rx", (26 + 14 * depth).toFixed(1));
      const marker = markerRef.current;
      if (marker) {
        marker.setAttribute("cy", (44 + 88 * depth).toFixed(1));
        const shallowPose = A === SQUAT_SHALLOW || B === SQUAT_SHALLOW;
        marker.setAttribute("fill", shallowPose ? WARN : ACCENT);
      }

      const r = Math.floor(elapsed / (CYCLE_S / 4)) % 4;
      if (r !== repRef.current) {
        repRef.current = r;
        setRep(r);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animating]);

  const shownRep = animating ? rep : 0;
  const shallow = animating && rep === 3;

  return (
    <div className="flex h-full items-center justify-center gap-2 px-3 sm:gap-6 sm:px-6 lg:gap-10 lg:px-10">
      <div className="relative h-full min-w-0 flex-1">
        <div className="absolute inset-3 rounded-md border border-dashed border-accent/20" />
        <svg viewBox="0 0 200 180" className="relative h-full w-full" fill="none" aria-hidden>
          <defs>
            <filter id="trainerGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path d="M14 120H176M14 84H176M14 48H176" stroke="#ffffff12" strokeDasharray="4 5" />
          {/* Thigh-parallel target */}
          <line x1="14" x2="176" y1="134" y2="134" stroke="#c3ff96" strokeOpacity="0.35" strokeDasharray="6 4" />
          <text x="168" y="129" fill="#c3ff96" opacity="0.55" fontSize="7" letterSpacing="1.5">PARALLEL</text>
          {/* Mirrored so the athlete faces left, shifted down for headroom */}
          <g transform="translate(200 12) scale(-1 1)">
          {/* Floor + planted foot */}
          <line x1="10" x2="182" y1="156" y2="156" stroke="#ffffff26" strokeWidth="2" />
          <line x1="110" y1="148" x2="110" y2="156" stroke="#c3ff96" strokeWidth="5" strokeLinecap="round" />
          <path d="M102 156H128" stroke="#c3ff96" strokeWidth="5" strokeLinecap="round" />
          {/* Contact shadow breathes with depth */}
          <ellipse
            ref={shadowRef}
            cx="112"
            cy="159"
            rx="26"
            ry="4"
            fill="#000000"
            opacity="0.45"
          />

          {/* Depth gauge */}
          <line x1="191" y1="44" x2="191" y2="132" stroke="#ffffff1a" strokeWidth="4" strokeLinecap="round" />
          <rect x="188" y="116" width="6" height="16" rx="3" fill="#c3ff96" opacity="0.25" />
          <circle
            ref={markerRef}
            cx="191"
            cy="44"
            r="4.5"
            fill="#c3ff96"
            stroke="#171717"
            strokeWidth="1.5"
          />

          <g filter="url(#trainerGlow)" stroke="#c3ff96" strokeLinecap="round">
            {/* Torso: hip → shoulder */}
            <line
              ref={torsoRef}
              x1={SQUAT_TOP.hip[0]} y1={SQUAT_TOP.hip[1]}
              x2={SQUAT_TOP.shoulder[0]} y2={SQUAT_TOP.shoulder[1]}
              strokeWidth="7"
            />
            {/* Thigh: hip → knee */}
            <line
              ref={thighRef}
              x1={SQUAT_TOP.hip[0]} y1={SQUAT_TOP.hip[1]}
              x2={SQUAT_TOP.knee[0]} y2={SQUAT_TOP.knee[1]}
              strokeWidth="7"
            />
            {/* Shin: knee → planted ankle */}
            <line
              ref={shinRef}
              x1={SQUAT_TOP.knee[0]} y1={SQUAT_TOP.knee[1]}
              x2={ANKLE[0]} y2={ANKLE[1]}
              strokeWidth="5"
            />
            {/* Arm reaching forward for counterbalance */}
            <line
              ref={armUpRef}
              x1={SQUAT_TOP.shoulder[0]} y1={SQUAT_TOP.shoulder[1]}
              x2={SQUAT_TOP.elbow[0]} y2={SQUAT_TOP.elbow[1]}
              strokeWidth="4"
            />
            <line
              ref={armForeRef}
              x1={SQUAT_TOP.elbow[0]} y1={SQUAT_TOP.elbow[1]}
              x2={SQUAT_TOP.wrist[0]} y2={SQUAT_TOP.wrist[1]}
              strokeWidth="4"
            />
            {/* Head */}
            <circle
              ref={headRef}
              cx={SQUAT_TOP.head[0]}
              cy={SQUAT_TOP.head[1]}
              r="9"
              fill="#c3ff9624"
              strokeWidth="3"
            />
            {/* Joint rings */}
            {RINGS.map((ring, i) => (
              <circle
                key={i}
                ref={(el) => {
                  ringRefs.current[i] = el;
                }}
                cx={ring.get(SQUAT_TOP)[0]}
                cy={ring.get(SQUAT_TOP)[1]}
                r={ring.r}
                fill="#171717"
                strokeWidth="1.5"
              />
            ))}
          </g>
          </g>
        </svg>
        <span className="absolute bottom-3 left-4 text-[10px] uppercase tracking-widest text-accent/70">Pose tracking</span>
      </div>
      <div className="w-[43%] max-w-48 space-y-3 lg:max-w-56 lg:space-y-4">
        <motion.div {...appear(props, 0.25)} className="rounded-lg border border-hairline bg-surface/90 p-3 lg:p-4">
          <p className="text-[10px] uppercase tracking-widest text-ink-3">Rep count</p>
          <p className="display mt-1 text-4xl leading-none text-accent lg:text-5xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={REP_LABELS[shownRep]}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="inline-block"
              >
                {REP_LABELS[shownRep]}
              </motion.span>
            </AnimatePresence>
            <span className="ml-1 text-base text-ink-3">/ 10</span>
          </p>
        </motion.div>
        <motion.div
          {...appear(props, 0.7)}
          className="rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 lg:px-4 lg:py-3"
          style={
            shallow
              ? { borderColor: `${WARN}66`, backgroundColor: `${WARN}1a` }
              : undefined
          }
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest text-accent"
            style={shallow ? { color: WARN } : undefined}
          >
            Form cue
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={shallow ? "shallow" : "good"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="mt-1 text-xs leading-snug text-ink-2"
            >
              {shallow ? "Reach full depth" : "Depth good · 88°"}
            </motion.p>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function PerformanceVisual(props: VisualProps) {
  return (
    <div className="flex h-full flex-col justify-between p-4 sm:p-5 lg:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-ink-3">Weekly score</p>
          <motion.p {...appear(props, 0.55)} className="display mt-1 text-4xl leading-none text-accent lg:text-5xl">
            82<span className="ml-1 text-base text-ink-3">/ 100</span>
          </motion.p>
        </div>
        <motion.span {...appear(props, 0.8)} className="rounded-full border border-accent/25 bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent">
          +12 this week
        </motion.span>
      </div>
      <svg viewBox="0 0 280 92" preserveAspectRatio="none" className="h-24 w-full lg:h-32" fill="none" aria-hidden>
        <path d="M0 76H280M0 42H280M0 8H280" stroke="#ffffff16" strokeDasharray="4 5" />
        <motion.path
          d="M2 70 L48 58 L91 64 L133 44 L177 48 L220 25 L278 13"
          stroke="#c3ff96"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...line(props, 0.15)}
        />
        <motion.circle cx="278" cy="13" r="5" fill="#c3ff96" {...appear(props, 0.85, 0)} />
      </svg>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-ink-4">
        <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
      </div>
    </div>
  );
}

const MACROS = [
  { name: "Protein", amount: "140g", width: "72%", delay: 0.08 },
  { name: "Carbs", amount: "210g", width: "86%", delay: 0.2 },
  { name: "Fat", amount: "65g", width: "54%", delay: 0.32 },
];

function DietVisual(props: VisualProps) {
  const { play, reduced, size } = props;
  const compact = size === "narrow";
  return (
    <div className={`flex h-full flex-col justify-center p-3 sm:p-4 ${compact ? "gap-2 lg:gap-3 lg:p-5" : "gap-3"}`}>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-3">
        <span>Daily macro plan</span><span className="text-accent">On target</span>
      </div>
      {MACROS.map((macro) => (
        <div key={macro.name}>
          <div className="mb-0.5 flex justify-between text-[11px] text-ink-2"><span>{macro.name}</span><span>{macro.amount}</span></div>
          <div className={`rounded-full bg-white/10 ${compact ? "h-1.5 lg:h-2" : "h-2"}`}>
            <motion.div
              className="h-full rounded-full bg-accent"
              style={{ width: macro.width, transformOrigin: "left" }}
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: play || reduced ? 1 : 0 }}
              transition={{ duration: 0.7, delay: play && !reduced ? macro.delay : 0 }}
            />
          </div>
        </div>
      ))}
      <motion.div {...appear(props, 0.55)} className="flex items-center justify-between gap-2 border-t border-hairline pt-2 text-[11px] text-ink-2">
        <span>Meal · rice &amp; tofu bowl</span><Check className="size-3.5 shrink-0 text-accent" />
      </motion.div>
      <motion.p {...appear(props, 0.75)} className="text-[10px] text-ink-3">Grocery list updated · tofu, rice, greens</motion.p>
    </div>
  );
}

function BuddyVisual(props: VisualProps) {
  const roomy = props.size === "wide";
  return (
    <div className={`flex h-full flex-col justify-center gap-3 p-4 sm:p-5 ${roomy ? "lg:gap-4 lg:px-10 lg:py-7" : ""}`}>
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink-3">
        <span className="size-1.5 rounded-full bg-accent" /> Your coach
      </div>
      <motion.div {...appear(props, 0.12)} className={`ml-auto max-w-[86%] rounded-xl rounded-br-sm border border-hairline bg-surface-raised px-3 py-2 text-xs leading-snug text-ink-2 ${roomy ? "lg:max-w-[72%] lg:px-4 lg:py-3 lg:text-sm" : ""}`}>
        Why does my squat stall at rep eight?
      </motion.div>
      <motion.div {...appear(props, 0.5)} className={`max-w-[92%] rounded-xl rounded-bl-sm border border-accent/25 bg-accent/10 px-3 py-2 text-xs leading-snug text-ink ${roomy ? "lg:max-w-[78%] lg:px-4 lg:py-3 lg:text-sm" : ""}`}>
        Try a lighter set and keep the same depth through every rep.
      </motion.div>
      <motion.div {...appear(props, 0.82)} className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-accent">
        <Sparkles className="size-3" /> Based on your training plan
      </motion.div>
    </div>
  );
}

const COMPLETE_DAYS = new Set([0, 1, 2, 4, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 20, 21, 22, 24, 25, 27]);

function HabitsVisual(props: VisualProps) {
  const roomy = props.size === "wide";
  return (
    <div className={`flex h-full flex-col justify-center p-4 sm:p-5 ${roomy ? "lg:px-8 lg:py-6" : ""}`}>
      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-3">
        <span>Last 4 weeks</span><span className="text-accent">12 day streak</span>
      </div>
      <motion.div {...appear(props, 0.12, 0)} className={`grid grid-cols-7 gap-1.5 ${roomy ? "lg:gap-2" : ""}`}>
        {Array.from({ length: 28 }, (_, day) => (
          <span
            key={day}
            className={`h-5 rounded-[4px] sm:h-6 ${roomy ? "lg:h-7" : ""} ${COMPLETE_DAYS.has(day) ? "bg-accent" : "bg-white/10"}`}
          />
        ))}
      </motion.div>
      <motion.div {...appear(props, 0.72)} className="mt-3 rounded-md border border-accent/25 bg-accent/10 px-2 py-1.5 text-[11px] leading-snug text-ink-2">
        Tomorrow looks busy. Plan a short session now.
      </motion.div>
    </div>
  );
}

function GymVisual(props: VisualProps) {
  const compact = props.size === "narrow";
  return (
    <div className={`flex h-full items-center gap-4 p-4 sm:gap-6 sm:p-6 ${compact ? "lg:flex-col lg:items-stretch lg:justify-center lg:gap-3 lg:p-5" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink-3">
          <span className="size-1.5 rounded-full bg-accent" /> Sensor feed
        </div>
        <p className={`display mt-3 text-xl text-ink ${compact ? "lg:mt-2" : ""}`}>Squat rack 02</p>
        <svg viewBox="0 0 250 70" preserveAspectRatio="none" className={`mt-3 h-16 w-full ${compact ? "lg:mt-1 lg:h-12" : ""}`} fill="none" aria-hidden>
          <path d="M0 58H250M0 32H250" stroke="#ffffff16" strokeDasharray="4 5" />
          <motion.path d="M2 48 L30 46 L58 23 L86 48 L115 45 L145 18 L176 47 L205 44 L248 45" stroke="#c3ff96" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...line(props, 0.1)} />
        </svg>
      </div>
      <motion.div {...appear(props, 0.85)} className={`flex w-[38%] max-w-36 flex-col items-center rounded-lg border border-accent/30 bg-accent/10 px-2 py-4 text-center ${compact ? "lg:w-full lg:max-w-none lg:flex-row lg:justify-between lg:px-3 lg:py-2 lg:text-left" : ""}`}>
        <span className="mb-2 flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink"><Check className="size-4" /></span>
        <span className="text-xs font-semibold text-accent">Free now</span>
        <span className="mt-1 text-[10px] leading-snug text-ink-3">Ready for your next set</span>
      </motion.div>
    </div>
  );
}

const RECO_ROUTE = "M 16 180 H 56 V 132 H 136 V 62 H 192 V 173 H 240 V 132";

const RECO_PINS = [
  { x: 56, y: 132, delay: 0.55, label: "02" },
  { x: 136, y: 62, delay: 0.9, label: "03" },
  { x: 192, y: 173, delay: 1.25, label: "04" },
];

const RECO_BLOCKS = [
  { x: 8, y: 8, w: 56, h: 28 },
  { x: 72, y: 8, w: 44, h: 28 },
  { x: 150, y: 8, w: 66, h: 28 },
  { x: 8, y: 100, w: 36, h: 24 },
  { x: 72, y: 76, w: 50, h: 48 },
  { x: 150, y: 100, w: 60, h: 56 },
  { x: 8, y: 186, w: 60, h: 20 },
  { x: 218, y: 186, w: 60, h: 20 },
  { x: 310, y: 186, w: 70, h: 20 },
  { x: 310, y: 100, w: 70, h: 56 },
];

const RECO_MINOR_V = [30, 84, 118, 160, 218, 244, 286, 330, 362];
const RECO_MINOR_H = [20, 44, 96, 118, 148, 198, 222];
const RECO_MAJOR_V = [56, 136, 192, 260];
const RECO_MAJOR_H = [62, 132, 173];

function RecommendationsVisual(props: VisualProps) {
  const { play, reduced, size } = props;
  const expansive = size === "full";
  const active = play || reduced;
  const flowing = play && !reduced;
  return (
    <div className={`relative h-full overflow-hidden bg-[#0e0e0e] ${expansive ? "" : ""}`}>
      {/* Realistic street map */}
      <svg
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden
      >
        <rect width="400" height="240" fill="#0e0e0e" />

        {/* city blocks */}
        <motion.g {...appear(props, 0.05, 0)}>
          {RECO_BLOCKS.map((b) => (
            <rect
              key={`${b.x}-${b.y}`}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx="3"
              fill="#ffffff"
              fillOpacity="0.045"
              stroke="#ffffff"
              strokeOpacity="0.07"
            />
          ))}
          {/* park */}
          <rect x="206" y="100" width="58" height="54" rx="7" fill="#ffffff" fillOpacity="0.06" stroke="#ffffff" strokeOpacity="0.1" />
          <circle cx="218" cy="116" r="3" fill="#c3ff96" opacity="0.28" />
          <circle cx="230" cy="124" r="2.4" fill="#c3ff96" opacity="0.22" />
          <circle cx="244" cy="114" r="3.4" fill="#c3ff96" opacity="0.25" />
          <circle cx="250" cy="132" r="2" fill="#c3ff96" opacity="0.2" />
        </motion.g>

        {/* minor streets + branches */}
        <motion.g {...appear(props, 0.15, 0)} stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1">
          {RECO_MINOR_V.map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="240" />
          ))}
          {RECO_MINOR_H.map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="400" y2={y} />
          ))}
          {/* branch stubs + cul-de-sacs */}
          <path d="M 244 96 h 26 M 330 132 v -22 M 84 148 v 24 M 30 198 h 22 M 362 62 v 30" />
          <circle cx="270" cy="96" r="2.4" />
          <circle cx="330" cy="110" r="2.4" />
          <circle cx="84" cy="172" r="2.4" />
        </motion.g>

        {/* diagonal avenue */}
        <motion.g {...appear(props, 0.22, 0)}>
          <path d="M -10 232 L 410 28" stroke="#000000" strokeOpacity="0.55" strokeWidth="8" strokeLinecap="round" />
          <path d="M -10 232 L 410 28" stroke="#cfcfcf" strokeWidth="3" strokeLinecap="round" />
          <path d="M -10 232 L 410 28" stroke="#0e0e0e" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="7 7" />
        </motion.g>

        {/* major white roads (casing + inner) */}
        <motion.g {...appear(props, 0.28, 0)}>
          {RECO_MAJOR_V.map((x) => (
            <g key={`mv${x}`}>
              <line x1={x} y1="0" x2={x} y2="240" stroke="#000000" strokeOpacity="0.55" strokeWidth="7" />
              <line x1={x} y1="0" x2={x} y2="240" stroke="#e2e2e2" strokeWidth="3" />
            </g>
          ))}
          {RECO_MAJOR_H.map((y) => (
            <g key={`mh${y}`}>
              <line x1="0" y1={y} x2="400" y2={y} stroke="#000000" strokeOpacity="0.55" strokeWidth="7" />
              <line x1="0" y1={y} x2="400" y2={y} stroke="#e2e2e2" strokeWidth="3" />
            </g>
          ))}
        </motion.g>

        {/* street labels */}
        <motion.g {...appear(props, 0.45, 0)} fill="#8a8a8a" fontSize="7" fontWeight="600" letterSpacing="1.5">
          <text x="62" y="55">MAPLE AVE</text>
          <text x="142" y="125">5TH ST</text>
          <text x="198" y="166">FOUNDRY RD</text>
          <text x="186" y="112" transform="rotate(-26 186 112)">RIVERSIDE AVE</text>
          <text x="208" y="146" fillOpacity="0.8">IRON PARK</text>
        </motion.g>

        {/* white navigation route */}
        <path
          d={RECO_ROUTE}
          stroke="#ffffff"
          strokeOpacity={active ? 0.16 : 0}
          strokeWidth={10}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "stroke-opacity 0.5s ease" }}
        />
        <motion.path
          d={RECO_ROUTE}
          stroke="#ffffff"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...line(props, 0.3)}
        />
        {flowing && (
          <motion.path
            d={RECO_ROUTE}
            stroke="#0e0e0e"
            strokeOpacity={0.65}
            strokeWidth={1.4}
            strokeDasharray="2 10"
            strokeLinecap="round"
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: -48 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
        )}
        {flowing && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0, 0] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "linear", times: [0, 0.1, 0.88, 0.97, 1] }}
          >
            <circle r="6" fill="#ffffff" opacity="0.25">
              <animateMotion dur="4.6s" repeatCount="indefinite" path={RECO_ROUTE} />
            </circle>
            <circle r="2.6" fill="#ffffff" stroke="#0e0e0e" strokeWidth="1">
              <animateMotion dur="4.6s" repeatCount="indefinite" path={RECO_ROUTE} />
            </circle>
          </motion.g>
        )}

        {/* start (you) */}
        <motion.g {...appear(props, 0.5, 0)} transform="translate(16 180)">
          <circle r="9" fill="#c3ff96" opacity="0.18" />
          <circle r="5.5" fill="#1c1c1c" stroke="#ffffff" strokeWidth="2" />
          <circle r="2" fill="#ffffff" />
        </motion.g>

        {/* ETA chip */}
        <motion.g {...appear(props, 1.4, 0)} transform="translate(164 80)">
          <rect x="-36" y="-10" width="72" height="17" rx="8.5" fill="#ffffff" />
          <text x="0" y="2" textAnchor="middle" fontSize="8" fontWeight="800" fill="#171717" letterSpacing="0.2">
            800 m · 6 min
          </text>
        </motion.g>

        {/* landmark pins */}
        {RECO_PINS.map((pin) => (
          <g key={pin.label} transform={`translate(${pin.x} ${pin.y})`}>
            <ellipse cx="0" cy="3.5" rx="10" ry="3" fill="#000000" opacity="0.5" />
            {flowing && (
              <motion.circle
                r="8.5"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.4"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: [0, 0.35, 0], scale: [0.6, 1, 2.2] }}
                transition={{ duration: 2.8, delay: pin.delay + 0.6, repeat: Infinity, ease: "easeOut", times: [0, 0.25, 1] }}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              />
            )}
            <motion.g
              initial={reduced ? false : { opacity: 0, scale: 0.4 }}
              animate={{ opacity: active ? 1 : 0, scale: active ? 1 : 0.4 }}
              transition={{ duration: 0.35, delay: flowing ? pin.delay : 0 }}
              style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
            >
              <circle r="8.5" fill="#101010" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="1.6" />
              <path
                d="M0 -20 C 5.5 -20 9 -16 9 -10.5 C 9 -4 0 1.5 0 1.5 C 0 1.5 -9 -4 -9 -10.5 C -9 -16 -5.5 -20 0 -20 Z"
                fill="#c3ff96"
                stroke="#101010"
                strokeWidth="1"
              />
              <circle cx="0" cy="-10.5" r="3.2" fill="#171717" />
              <g transform="translate(11 -22)">
                <rect width="17" height="12" rx="3.5" fill="#ffffff" />
                <text x="8.5" y="8.6" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#171717">
                  {pin.label}
                </text>
              </g>
            </motion.g>
          </g>
        ))}

        {/* destination */}
        <motion.g {...appear(props, 1.55, 0)} transform="translate(240 132)">
          <circle r="8" fill="#ffffff" />
          <circle r="8" fill="none" stroke="#101010" strokeOpacity="0.3" strokeWidth="1.5" />
          <circle r="3.2" fill="#171717" />
          <circle r="12.5" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" strokeDasharray="3 4" />
        </motion.g>
      </svg>

      {/* map chrome */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />
      <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
        <span className="text-[10px] uppercase tracking-widest text-white/80">Nearby matches</span>
        <span className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/50">
          <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Live map
        </span>
      </div>
      <div className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full border border-white/20 bg-black/50 text-[10px] font-bold text-white/80 backdrop-blur-sm sm:right-5 sm:top-5" aria-hidden>
        N<span className="text-accent">↑</span>
      </div>
      <div className="absolute bottom-4 left-4 flex items-center gap-2 sm:bottom-5 sm:left-5" aria-hidden>
        <span className="flex h-1.5 w-16 overflow-hidden rounded-full">
          <span className="h-full w-1/2 bg-white/90" />
          <span className="h-full w-1/2 bg-white/25" />
        </span>
        <span className="text-[9px] font-semibold text-white/60">500 m</span>
      </div>
      <div className="absolute bottom-4 right-4 hidden flex-col overflow-hidden rounded-md border border-white/20 bg-black/50 backdrop-blur-sm sm:bottom-5 sm:right-5" aria-hidden>
        <span className="flex h-7 w-7 items-center justify-center text-sm text-white/80">+</span>
        <span className="h-px bg-white/15" />
        <span className="flex h-7 w-7 items-center justify-center text-sm text-white/80">−</span>
      </div>

      <div className="relative h-full p-4 sm:p-5">
        <motion.div {...appear(props, 0.65)} className={`absolute inset-y-3 right-3 z-20 flex w-[48%] flex-col justify-center rounded-lg border border-accent/25 bg-surface/95 p-3 shadow-xl sm:right-4 sm:p-4 ${expansive ? "lg:w-[38%] lg:p-6" : ""}`}>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-accent">01 · best match</span>
          <span className="display mt-2 text-base leading-tight text-ink sm:text-lg">Strength ready</span>
          <span className="mt-1 text-[10px] leading-snug text-ink-3">Fits your plan and budget</span>
          <span className="mt-2 text-[9px] leading-snug text-ink-2">Strength · Budget · Rack</span>
        </motion.div>
      </div>
    </div>
  );
}

export function ModuleVisual({ kind, play, reduced, size }: VisualProps & { kind: ModuleKind }) {
  const props = { play, reduced, size };
  switch (kind) {
    case "trainer": return <TrainerVisual {...props} />;
    case "performance": return <PerformanceVisual {...props} />;
    case "diet": return <DietVisual {...props} />;
    case "buddy": return <BuddyVisual {...props} />;
    case "habits": return <HabitsVisual {...props} />;
    case "gym": return <GymVisual {...props} />;
    case "recommendations": return <RecommendationsVisual {...props} />;
  }
}
