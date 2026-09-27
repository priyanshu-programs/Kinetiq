import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export type PoseStatus = "idle" | "loading" | "running" | "denied" | "error";

export type FrameHandler = (
  landmarks: NormalizedLandmark[] | null,
  timestampMs: number,
) => void;

interface UsePoseLandmarker {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: PoseStatus;
  error: string | null;
  fps: number;
  start: () => Promise<void>;
  stop: () => void;
}

let landmarkerPromise: Promise<PoseLandmarker> | null = null;

/** Load the pose model once and reuse it across mounts. */
async function getLandmarker(): Promise<PoseLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_PATH, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    })().catch((err) => {
      landmarkerPromise = null; // allow a retry after a failure
      throw err;
    });
  }
  return landmarkerPromise;
}

export function usePoseLandmarker(onFrame: FrameHandler): UsePoseLandmarker {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const lastFpsTsRef = useRef(0);

  // Keep the latest handler without restarting the loop.
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const [status, setStatus] = useState<PoseStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    lastVideoTimeRef.current = -1;
    setStatus("idle");
    setFps(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("loading");
    let landmarker: PoseLandmarker;
    try {
      landmarker = await getLandmarker();
    } catch {
      setError("Could not load the pose model. Check your connection and retry.");
      setStatus("error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch {
      setError("Camera access was denied. Enable it in your browser to continue.");
      setStatus("denied");
      return;
    }
    streamRef.current = stream;

    const video = videoRef.current;
    if (!video) {
      stop();
      return;
    }
    video.srcObject = stream;
    await video.play();
    setStatus("running");

    const loop = () => {
      const v = videoRef.current;
      if (!v || streamRef.current === null) return;
      const now = performance.now();
      if (v.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = v.currentTime;
        const result = landmarker.detectForVideo(v, now);
        const poses = result.landmarks;
        onFrameRef.current(poses.length > 0 ? poses[0] : null, now);

        const dt = now - lastFpsTsRef.current;
        if (dt > 0) setFps(Math.round(1000 / dt));
        lastFpsTsRef.current = now;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [stop]);

  // Stop the camera if the component unmounts mid-session.
  useEffect(() => stop, [stop]);

  return { videoRef, status, error, fps, start, stop };
}
