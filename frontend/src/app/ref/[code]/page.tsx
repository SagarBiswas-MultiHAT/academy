"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Referral landing page: /ref/[code]
 *
 * 1. Stores the referral code in a secure first-party cookie (30 day expiry)
 *    so it survives navigation even if the user doesn't register immediately.
 * 2. Redirects to /auth/register?ref=CODE so the form is pre-filled.
 * 3. Shows a manual "Continue" button as a fallback for browsers with JS
 *    router issues.
 */
export default function ReferralLandingPage({
  params: paramsPromise,
}: {
  params: Promise<{ code: string }>;
}) {
  const params = use(paramsPromise);
  const router = useRouter();

  useEffect(() => {
    if (!params.code) return;

    // Sanitise: only allow alphanumeric + dash + underscore codes
    const safeCode = params.code.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (!safeCode) {
      router.replace("/auth/register");
      return;
    }

    // Persist in a first-party cookie (30 days, accessible to JS for pre-fill)
    document.cookie = [
      `referralCode=${safeCode}`,
      "max-age=2592000",
      "path=/",
      "SameSite=Lax",
    ].join("; ");

    router.replace(`/auth/register?ref=${safeCode}`);
  }, [params.code, router]);

  const safeCode = params.code?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Setting up your referral&hellip;</CardTitle>
            <CardDescription>
              You were invited by a friend. Your referral reward will be applied
              automatically when you create an account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() =>
                router.replace(
                  safeCode ? `/auth/register?ref=${safeCode}` : "/auth/register"
                )
              }
            >
              Continue to registration
            </Button>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
