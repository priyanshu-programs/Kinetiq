import { motion } from "framer-motion";

import { ArrowCta, buttonClass } from "../../components/ui";
import TechText from "../../components/ui/TechText";

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-end overflow-hidden pt-24">
      {/* Hero photo, with a low-key radial wash + floor scrim layered on top for depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url(/desktop-hero.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 75% 15%, rgba(195,255,150,0.10) 0%, rgba(23,23,23,0) 55%), radial-gradient(90% 60% at 10% 90%, rgba(255,34,68,0.07) 0%, rgba(23,23,23,0) 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{ background: "linear-gradient(180deg, rgba(23,23,23,0) 0%, #171717 100%)" }}
      />

      <motion.div
        className="relative mx-auto w-full max-w-content px-4 pb-20 sm:px-8"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.1 }}
      >
        <motion.h1
          variants={rise}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="display max-w-5xl text-display-lg text-ink"
        >
          <span className="sr-only">Discipline over motivation</span>
          <span aria-hidden="true">
            <TechText inline text="DISCIPLINE OVER" fontWeight={400} letterSpacing={0}
              color="#ffffff" accentColor="#c3ff96" reveal="letter" sweepDelay={1} specks={15}
              labels selection draggable dashLength={3} dashGap={3}
              strokeWidth={1.25} speed={0.55} />
            <br />
            <TechText inline text="MOTIVATION" fontWeight={400} letterSpacing={0}
              color="#c3ff96" accentColor="#c3ff96" reveal="letter" sweepDelay={1} specks={15}
              labels labelPosition="below" selection draggable dashLength={3} dashGap={3}
              strokeWidth={1.25} speed={0.55} />
          </span>
        </motion.h1>

        <motion.p
          variants={rise}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-xl text-base leading-relaxed text-ink-2"
        >
          Your camera counts the reps and checks your form. Your coach answers at
          2am. Your plan adapts every week. Seven modules, one account, entirely
          in one application.
        </motion.p>

        <motion.div
          variants={rise}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <ArrowCta to="/register">Start training</ArrowCta>
          <a href="#modules" className={buttonClass("outline", "lg")}>
            See the modules
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
