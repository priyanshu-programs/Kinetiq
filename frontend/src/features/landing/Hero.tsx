import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonClass } from "../../components/ui";

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export function Hero() {
  return (
    <section className="relative flex min-h-[92vh] items-end overflow-hidden pt-24">
      {/* Depth without photography: low-key radial wash + a floor scrim,
          mirroring the reference's gradient-over-image treatment. */}
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
        <motion.p
          variants={rise}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="display text-xs text-accent"
        >
          [ AI fitness assistant ]
        </motion.p>

        <motion.h1
          variants={rise}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="display mt-5 max-w-5xl text-display-lg text-ink"
        >
          Discipline over
          <br />
          <span className="text-accent">motivation</span>
        </motion.h1>

        <motion.p
          variants={rise}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 max-w-xl text-base leading-relaxed text-ink-2"
        >
          Your camera counts the reps and checks your form. Your coach answers at
          2am. Your plan adapts every week. Seven modules, one account, entirely
          in the browser.
        </motion.p>

        <motion.div
          variants={rise}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 flex flex-wrap items-center gap-3"
        >
          <Link to="/register" className={buttonClass("accent", "lg")}>
            Start training <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <a href="#modules" className={buttonClass("outline", "lg")}>
            See the modules
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
