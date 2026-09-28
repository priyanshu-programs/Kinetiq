import { useEffect, useRef, useState } from "react";

interface LatticeLoaderProps {
  status?: "working" | "done" | "error";
  label?: string;
  doneLabel?: string;
  errorLabel?: string;
  pattern?: "orbit";
  grid?: number;
  shape?: "round" | "square";
  doneColor?: string;
  errorColor?: string;
  cellSize?: number;
  gap?: number;
  fontSize?: number;
  step?: number;
  idleOpacity?: number;
  glow?: boolean;
  glowColor?: string;
  showTimer?: boolean;
}

function buildOrbitSequence(n: number): number[] {
  // Clockwise perimeter indices for an n×n grid
  const seq: number[] = [];
  if (n === 1) return [0];
  // top row left→right
  for (let c = 0; c < n; c++) seq.push(c);
  // right col top+1→bottom
  for (let r = 1; r < n; r++) seq.push(r * n + (n - 1));
  // bottom row right-1→left
  for (let c = n - 2; c >= 0; c--) seq.push((n - 1) * n + c);
  // left col bottom-1→top
  for (let r = n - 2; r >= 1; r--) seq.push(r * n);
  return seq;
}

export function LatticeLoader({
  status = "working",
  label = "Thinking",
  doneLabel = "Done in",
  errorLabel = "Failed after",
  pattern: _pattern = "orbit",
  grid = 3,
  shape = "round",
  doneColor = "#22c55e",
  errorColor = "#ef4444",
  cellSize = 6,
  gap = 2,
  fontSize = 14,
  step = 90,
  idleOpacity = 0.15,
  glow = false,
  glowColor = "",
  showTimer = false,
}: LatticeLoaderProps) {
  const orbitSeq = useRef(buildOrbitSequence(grid));
  const [activeSeqIdx, setActiveSeqIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();
    setElapsed(0);
    setActiveSeqIdx(0);
  }, [status]);

  // Orbit animation
  useEffect(() => {
    if (status !== "working") return;
    const id = setInterval(() => {
      setActiveSeqIdx((i) => (i + 1) % orbitSeq.current.length);
    }, step);
    return () => clearInterval(id);
  }, [status, step]);

  // Timer
  useEffect(() => {
    if (!showTimer) return;
    if (status !== "working") return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 500);
    return () => clearInterval(id);
  }, [status, showTimer]);

  const activeCellIdx =
    status === "working" ? orbitSeq.current[activeSeqIdx] : -1;

  const finalElapsed =
    status !== "working"
      ? elapsed || Math.floor((Date.now() - startTime.current) / 1000)
      : elapsed;

  function cellColor(idx: number) {
    if (status === "done") return doneColor;
    if (status === "error") return errorColor;
    return idx === activeCellIdx ? "#ffffff" : `rgba(255,255,255,${idleOpacity})`;
  }

  function cellBoxShadow(idx: number) {
    if (!glow || !glowColor) return undefined;
    if (status === "working" && idx === activeCellIdx)
      return `0 0 6px 2px ${glowColor}`;
    if (status === "done") return `0 0 4px 1px ${doneColor}`;
    return undefined;
  }

  const textColor =
    status === "done" ? doneColor : status === "error" ? errorColor : "#9ca3af";

  const displayLabel =
    status === "done"
      ? showTimer
        ? `${doneLabel} ${finalElapsed}s`
        : doneLabel
      : status === "error"
        ? showTimer
          ? `${errorLabel} ${finalElapsed}s`
          : errorLabel
        : showTimer
          ? `${label} ${elapsed}s`
          : label;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${grid}, ${cellSize}px)`,
          gap: `${gap}px`,
        }}
      >
        {Array.from({ length: grid * grid }, (_, idx) => (
          <div
            key={idx}
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: shape === "round" ? "50%" : 2,
              backgroundColor: cellColor(idx),
              boxShadow: cellBoxShadow(idx),
              transition: status === "working" ? "background-color 60ms" : "background-color 300ms",
            }}
          />
        ))}
      </div>
      <span style={{ fontSize, color: textColor, lineHeight: 1 }}>
        {displayLabel}
      </span>
    </div>
  );
}
