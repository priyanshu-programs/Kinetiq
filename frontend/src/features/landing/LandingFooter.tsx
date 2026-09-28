import type { CSSProperties } from "react";
import { ArrowCta } from "../../components/ui";

/** Small "+" marks centered exactly on each corner of the hairline frame. */
function CornerPluses() {
  const corners = [
    { h: "left", v: "top" },
    { h: "right", v: "top" },
    { h: "left", v: "bottom" },
    { h: "right", v: "bottom" },
  ] as const;
  return (
    <>
      {corners.map(({ h, v }) => {
        const style: CSSProperties = {
          [h]: 0,
          [v]: 0,
          transform: `translate(${h === "left" ? "-50%" : "50%"}, ${v === "top" ? "-50%" : "50%"})`,
        };
        return (
          <span key={`${h}-${v}`} aria-hidden className="pointer-events-none absolute" style={style}>
            <span className="absolute left-1/2 top-1/2 h-px w-[11px] -translate-x-1/2 -translate-y-1/2 bg-ink/80" />
            <span className="absolute left-1/2 top-1/2 h-[11px] w-px -translate-x-1/2 -translate-y-1/2 bg-ink/80" />
          </span>
        );
      })}
    </>
  );
}

/** Small T-marks where dividers meet the top/bottom frame edge (inside). */
function EdgeTicks() {
  const t = "pointer-events-none absolute hidden h-px w-[11px] -translate-x-1/2 bg-ink/80 md:block";
  return (
    <>
      {/* top edge, at the two divider lines (1/3 and 2/3) */}
      <span aria-hidden className={`${t} left-1/3 top-0`} />
      <span aria-hidden className={`${t} left-2/3 top-0`} />
      {/* bottom edge */}
      <span aria-hidden className={`${t} bottom-0 left-1/3`} />
      <span aria-hidden className={`${t} bottom-0 left-2/3`} />
    </>
  );
}

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer id="start" className="bg-canvas-deep">
      <div className="mx-auto max-w-content px-4 pb-6 pt-10 sm:px-8">
        {/* Top 3-column frame */}
        <div className="relative border border-hairline">
          <CornerPluses />
          <EdgeTicks />

          <div className="grid divide-y divide-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
            {/* CONTACT */}
            <div className="relative flex min-h-[320px] flex-col p-8 sm:p-10">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-ink-2">
                Contact
              </h3>
              <div className="mt-16 flex flex-col gap-1 text-sm text-ink">
                <a href="mailto:hello@kinetiq.fit" className="transition hover:text-accent">
                  hello@kinetiq.fit
                </a>
                <a href="mailto:hello@kinetiq.fit" className="transition hover:text-accent">
                  Get in touch
                </a>
              </div>
              <div className="mt-auto pt-16 text-sm leading-relaxed text-ink-2">
                <p>Kinetiq Vision powers</p>
                <p>every training module</p>
                <a
                  href="#modules"
                  className="mt-3 inline-flex items-center gap-1 text-ink transition hover:text-accent"
                >
                  Learn more <span aria-hidden className="text-accent">↗</span>
                </a>
              </div>
            </div>

            {/* CONNECT */}
            <div className="relative flex min-h-[320px] flex-col p-8 sm:p-10">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-ink-2">
                Connect
              </h3>
              <nav className="mt-16 flex flex-col gap-1 text-sm text-ink">
                <a href="#" className="w-fit transition hover:text-accent">
                  Instagram
                </a>
                <a href="#" className="w-fit transition hover:text-accent">
                  LinkedIn
                </a>
              </nav>
            </div>

            {/* START — CTA instead of subscribe */}
            <div className="relative flex min-h-[320px] flex-col p-8 sm:p-10">
              <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-ink-2">
                Start
              </h3>
              <div className="mt-16">
                <ArrowCta to="/register">Create your account</ArrowCta>
              </div>
            </div>
          </div>
        </div>

        {/* Giant wordmark */}
        <div className="relative mt-2 overflow-hidden border border-hairline py-4 md:py-6">
          <CornerPluses />
          <h2 aria-hidden="true" className="w-[104%] -translate-x-[2%] select-none whitespace-nowrap text-center font-sans text-[clamp(5rem,23vw,23rem)] font-extrabold uppercase leading-[0.8] tracking-[-0.045em] text-accent">
            KINETIQ
          </h2>
          <span className="sr-only">Kinetiq</span>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 text-xs text-ink-3">
          <p>©{year} Kinetiq</p>
          <a href="#privacy" className="transition hover:text-accent">
            Privacy Policy
          </a>
          <a href="#top" className="inline-flex items-center gap-1 transition hover:text-accent">
            Back to top <span aria-hidden>↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
