"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Award } from "lucide-react";

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

const TOP_UP_FLAG = "walletTopUpPending";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const tranId = searchParams.get("id") || "";

  const isWalletTopUp = useMemo(() => tranId.startsWith("TOPUP-"), [tranId]);

  useEffect(() => {
    if (!isWalletTopUp || typeof window === "undefined") return;

    window.localStorage.setItem(TOP_UP_FLAG, tranId);
  }, [isWalletTopUp, tranId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <Card className="gradient-border animate-scale-in dark:animate-glow-pulse text-center">
          <CardHeader className="items-center">
            <div className="mb-3 flex items-center justify-center size-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 animate-scale-in">
              <CheckCircle2 className="size-8 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl">
              <span className="gradient-text">Payment successful!</span>
            </CardTitle>
            <CardDescription>
              {isWalletTopUp
                ? "Your wallet top-up has been confirmed. The balance will refresh on the wallet page once the gateway callback is processed."
                : "Your payment has been confirmed. The book is now available in your dashboard."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href={isWalletTopUp ? "/dashboard/wallet" : "/dashboard"}>
                <Award className="mr-2 size-4" />
                {isWalletTopUp ? "Open wallet" : "Go to dashboard"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/books">Continue browsing</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <SiteHeader />
          <main className="mx-auto max-w-4xl px-6 py-16">
            <Card className="gradient-border animate-scale-in dark:animate-glow-pulse text-center">
              <CardHeader className="items-center">
                <div className="mb-3 flex items-center justify-center size-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 animate-scale-in">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                </div>
                <CardTitle className="text-2xl">
                  <span className="gradient-text">Payment successful!</span>
                </CardTitle>
                <CardDescription>Loading your confirmation...</CardDescription>
              </CardHeader>
            </Card>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}