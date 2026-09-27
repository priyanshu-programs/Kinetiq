const WORDS = [
  "Count every rep",
  "Fix your form",
  "Track the streak",
  "Train smarter",
];

export function Ticker() {
  // Rendered twice so the -50% marquee keyframe loops seamlessly.
  const strip = [...WORDS, ...WORDS];

  return (
    <div className="overflow-hidden border-y border-hairline bg-surface py-5">
      <div className="flex w-max animate-marquee items-center gap-10 pr-10">
        {strip.map((word, i) => (
          <div key={i} className="flex shrink-0 items-center gap-10">
            <span className="display text-2xl text-ink-2 sm:text-3xl">{word}</span>
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
          </div>
        ))}
      </div>
    </div>
  );
}
