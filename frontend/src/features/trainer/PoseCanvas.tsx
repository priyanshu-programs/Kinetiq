import { useEffect, useRef } from "react";
import { PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";

import { pose } from "../../lib/chartTheme";

interface PoseCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: NormalizedLandmark[] | null;
}

/** Webcam feed with a mirrored skeleton overlay drawn from pose landmarks. */
export function PoseCanvas({ videoRef, landmarks }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    if (!landmarks) return;

    // Mirror x to match the CSS-mirrored video.
    const px = (lm: NormalizedLandmark) => (1 - lm.x) * width;
    const py = (lm: NormalizedLandmark) => lm.y * height;

    ctx.strokeStyle = pose.bone;
    ctx.lineWidth = 3;
    for (const { start, end } of PoseLandmarker.POSE_CONNECTIONS) {
      const a = landmarks[start];
      const b = landmarks[end];
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(px(a), py(a));
      ctx.lineTo(px(b), py(b));
      ctx.stroke();
    }

    ctx.fillStyle = pose.joint; // white joint dots
    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(px(lm), py(lm), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [landmarks]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-black">
      <video
        ref={videoRef}
        className="w-full -scale-x-100"
        playsInline
        muted
        width={640}
        height={480}
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
