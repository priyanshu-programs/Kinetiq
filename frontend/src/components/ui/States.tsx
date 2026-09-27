import type { ReactNode } from "react";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-ink-3">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-hairline-strong border-t-accent"
      />
      {label}
    </div>
  );
}

export function ErrorState({ children }: { children: ReactNode }) {
  return <p className="py-12 text-center text-sm text-hot">{children}</p>;
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="display text-xl text-ink-2">{title}</p>
      {children && <p className="max-w-sm text-sm text-ink-3">{children}</p>}
      {action}
    </div>
  );
}
