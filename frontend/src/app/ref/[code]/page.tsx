"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReferralPage({ params: paramsPromise }: { params: Promise<{ code: string }> }) {
  const params = use(paramsPromise);
  const router = useRouter();

  useEffect(() => {
    if (params.code) {
      localStorage.setItem("referralCode", params.code);
      router.replace(`/auth/register?ref=${params.code}`);
    }
  }, [params.code, router]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Redirecting</CardTitle>
            <CardDescription>Preparing your referral sign-up.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.replace(`/auth/register?ref=${params.code}`)}>
              Continue to registration
            </Button>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}
