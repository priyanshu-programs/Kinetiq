import { defineConfig, devices } from "@playwright/test";

// Golden-path E2E. Spins up the real backend (uvicorn) and the Vite dev server,
// then drives a browser through register -> dashboard -> chat -> performance.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Build the throwaway schema before serving.
      command:
        ".venv\\Scripts\\python.exe -m alembic upgrade head && " +
        ".venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: "http://localhost:8000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        // Its own throwaway database, so E2E never writes to the dev data.
        DATABASE_URL: "sqlite:///./e2e.db",
        DATABASE_URL_UNPOOLED: "",
        // The golden path asserts the "AI offline" badge, so make the fallback
        // true by construction rather than dependent on an absent .env key.
        OPENROUTER_API_KEY: "",
        JWT_SECRET: "e2e-only-secret",
        APP_ENV: "local",
      },
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
