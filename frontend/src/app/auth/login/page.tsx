"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { ShieldCheck, Lock, Fingerprint } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import AuroraBackground from "@/components/aurora-background";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      router.push("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError(error.response?.data?.message ?? "Unable to sign in.");
        return;
      }
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }
      setFormError("Unable to sign in.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1fr] lg:items-center">
        <AuroraBackground />

        <section className="space-y-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary backdrop-blur-sm dark:border-[rgba(var(--glow-primary),0.2)] dark:bg-[rgba(var(--glow-primary),0.08)]">
            <Lock className="size-3" />
            Secure access
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl font-[family-name:var(--font-space-grotesk)]">
            <span className="gradient-text">Welcome back</span> to MultiHAT Academy
          </h1>
          <p className="text-muted-foreground">
            Sign in to access your purchases, quizzes, wallet balance, and certificates.
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 dark:bg-primary/10">
                <ShieldCheck className="size-3.5 text-primary" />
              </div>
              Token based access with automatic session refresh.
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 dark:bg-primary/10">
                <Fingerprint className="size-3.5 text-primary" />
              </div>
              End-to-end encrypted credentials.
            </div>
          </div>
        </section>

        <Card className="gradient-border animate-fade-in-up delay-200">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Use your email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@domain.com" {...register("email")} />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Minimum 8 characters" {...register("password")} />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {formError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive backdrop-blur-sm">
                  {formError}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                New here?{" "}
                <Link href="/auth/register" className="text-primary hover:underline">
                  Create an account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
