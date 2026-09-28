import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Logo } from "../../components/Logo";
import { buttonClass } from "../../components/ui";

const SECTIONS = [
  { href: "#modules", label: "Modules" },
  { href: "#how", label: "How it works" },
  { href: "#why-us", label: "Why Us?" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The overlay owns the viewport while open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Glassmorphism only kicks in once the hero has scrolled past.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 border-b transition-colors ${
          scrolled
            ? "border-hairline bg-canvas/80 backdrop-blur"
            : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-auto" />
            <span className="text-lg font-bold uppercase leading-none text-ink">Kinetiq</span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {SECTIONS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="text-sm font-medium uppercase text-ink-3 transition hover:text-accent"
              >
                {s.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={`${buttonClass("ghost", "sm")} hidden uppercase sm:inline-flex`}
            >
              Log in
            </Link>
            <Link to="/register" className={`${buttonClass("accent", "sm")} uppercase`}>
              Get started
            </Link>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="ml-1 text-xs font-medium uppercase text-ink-3 transition hover:text-accent md:hidden"
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-canvas-deep px-6 py-6 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <span className="display text-lg text-ink">Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2">
                <X className="h-5 w-5 text-ink-3" aria-hidden />
              </button>
            </div>
            <nav className="mt-10 flex flex-col gap-1">
              {SECTIONS.map((s, i) => (
                <motion.a
                  key={s.href}
                  href={s.href}
                  onClick={() => setOpen(false)}
                  className="display border-b border-hairline py-4 text-3xl text-ink transition hover:text-accent"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  {s.label}
                </motion.a>
              ))}
            </nav>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className={`${buttonClass("outline", "lg")} mt-8 w-full uppercase`}
            >
              Log in
            </Link>
            <Link
              to="/register"
              onClick={() => setOpen(false)}
              className={`${buttonClass("accent", "lg")} mt-3 w-full uppercase`}
            >
              Get started
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
