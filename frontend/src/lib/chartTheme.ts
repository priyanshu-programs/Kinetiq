/**
 * Single source of truth for chart + canvas colors.
 *
 * These hexes were previously hard-coded and duplicated across Admin.tsx,
 * PerformancePage.tsx, DietPage.tsx, IotPage.tsx and PoseCanvas.tsx, which is
 * why re-theming for dark required touching five files.
 */
export const chart = {
  accent: "#c3ff96",
  grid: "#ffffff1a",
  axis: "#aaaaaa",
  /** Macro series: protein / carbs / fat. Tuned for contrast on #171717. */
  series: ["#c3ff96", "#7cc4ff", "#ffb366"] as const,
} as const;

/** Recharts <Tooltip> needs inline style objects, not classNames. */
export const tooltipStyle = {
  contentStyle: {
    background: "#232323",
    border: "1px solid #ffffff1a",
    borderRadius: 10,
    color: "#ffffff",
    fontSize: 12,
  },
  labelStyle: { color: "#aaaaaa" },
  itemStyle: { color: "#ffffff" },
} as const;

/** Risk / status ramp, shared by the habits gauge and status pills. */
export const status = {
  good: "#c3ff96",
  warn: "#ffb366",
  bad: "#ff2244",
} as const;

/** Pose skeleton drawn on a 2D canvas in PoseCanvas.tsx. */
export const pose = {
  bone: chart.accent,
  joint: "#ffffff",
} as const;
