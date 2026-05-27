"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import axios from "axios";
import { Sparkles } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const registerSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  referralCode: z.string().optional(),
});

type RegisterValues = z.infer<typeof registerSchema>;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const referralFromQuery = searchParams.get("ref") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      referralCode: referralFromQuery,
    },
  });

  const onSubmit = async (values: RegisterValues) => {
    setFormError(null);
    try {
      await registerUser(values.name, values.email, values.password, values.referralCode || undefined);
      router.push("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError(error.response?.data?.message ?? "Unable to create your account.");
        return;
      }
      if (error instanceof Error) {
        setFormError(error.message);
        return;
      }
      setFormError("Unable to create your account.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1fr_1fr] lg:items-center">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            Create account
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl font-[family-name:var(--font-space-grotesk)]">
            Build your cybersecurity track record
          </h1>
          <p className="text-muted-foreground">
            Join MultiHAT Academy to access premium learning, verified certificates, and wallet rewards.
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            Referral rewards apply automatically when a code is present.
          </div>
        </section>

        <Card className="border-border/70 bg-muted/20">
          <CardHeader>
            <CardTitle className="text-2xl">Create account</CardTitle>
            <CardDescription>Get started with your name, email, and password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="Your name" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>

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

              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral code (optional)</Label>
                <Input id="referralCode" placeholder="MULTIHAT-REF" {...register("referralCode")} />
              </div>

              {formError && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {formError}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating account..." : "Create account"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/auth/login" className="text-primary hover:underline">
                  Sign in
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <SiteHeader />
          <main className="mx-auto max-w-4xl px-6 py-16">
            <Card>
              <CardHeader>
                <CardTitle>Loading registration</CardTitle>
                <CardDescription>Preparing your sign-up form.</CardDescription>
              </CardHeader>
            </Card>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
