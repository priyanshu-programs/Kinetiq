import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { useAuthStore } from "../store/authStore";
import { AuthCard, Field } from "./Login";

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
type FormValues = z.infer<typeof schema>;

export function Register() {
  const { register: registerUser, login } = useAuthStore();
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
      await registerUser(values.email, values.password);
      await login(values.email, values.password);
      navigate("/app");
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setServerError(
        status === 409
          ? "That email is already registered."
          : "Could not create the account. Please try again.",
      );
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="Start training smarter today.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Email" error={errors.email?.message}>
          <input type="email" autoComplete="email" className="auth-input" {...register("email")} />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="new-password"
            className="auth-input"
            {...register("password")}
          />
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message}>
          <input
            type="password"
            autoComplete="new-password"
            className="auth-input"
            {...register("confirm")}
          />
        </Field>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button type="submit" disabled={isSubmitting} className="auth-submit">
          {isSubmitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-dark">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
