import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuthStore } from "../store/authStore";
import { Logo } from "../components/Logo";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

export function Login() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate("/app");
    } catch {
      setServerError("Incorrect email or password.");
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Log in to continue your fitness journey.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            className="auth-input"
            {...register("email")}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="current-password"
            className="auth-input"
            {...register("password")}
          />
        </Field>
        {serverError && <p className="text-sm text-hot">{serverError}</p>}
        <button type="submit" disabled={isSubmitting} className="auth-submit">
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-3">
        No account?{" "}
        <Link to="/register" className="font-semibold text-accent hover:underline">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}

// --- small shared building blocks (kept local; reused by Register) ---

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand panel — photo + typographic, matching the landing hero treatment. */}
      <aside className="relative hidden w-1/2 overflow-hidden border-r border-hairline lg:block">
        <picture aria-hidden className="absolute inset-0">
          <source
            type="image/webp"
            srcSet="/login-768.webp 768w, /login.webp 1122w"
            sizes="50vw"
          />
          <img
            src="/login.webp"
            alt=""
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-center"
          />
        </picture>
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(23,23,23,0.15) 0%, rgba(23,23,23,0.55) 55%, rgba(23,23,23,0.85) 75%, #171717 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(100% 70% at 30% 20%, rgba(195,255,150,0.12) 0%, rgba(23,23,23,0) 60%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-9 w-auto" />
            <span className="text-lg font-bold uppercase leading-none text-ink">Kinetiq</span>
          </Link>
          <div>
            <h2 className="display text-display-sm text-ink">
              Discipline over
              <br />
              <span className="text-accent">motivation</span>
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-ink-3">
              Seven modules, one account. Pose runs on-device — camera frames never
              leave your browser.
            </p>
          </div>
        </div>
      </aside>

      <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 text-xs text-ink-3 transition hover:text-accent lg:hidden"
          >
            <Logo className="h-7 w-auto" />
            <span className="font-bold uppercase">Kinetiq</span>
          </Link>
          <h1 className="display text-3xl leading-none text-ink">{title}</h1>
          <p className="mt-3 mb-8 text-sm text-ink-3">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-hot">{error}</span>}
    </label>
  );
}
