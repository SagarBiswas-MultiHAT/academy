"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

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

const REASON_MESSAGES: Record<string, string> = {
  "missing-transaction": "No transaction ID was provided. Please retry your purchase.",
  "unverified": "We could not verify this transaction with the payment gateway. If money was deducted, it will be refunded automatically.",
  "not-successful": "The payment gateway reported that this transaction was not successful.",
  "user-not-found": "We could not find an account associated with this payment.",
  "order-not-found": "We could not locate an order for this transaction.",
  "amount_mismatch": "The paid amount does not match the order total. Please contact support.",
  "failed": "Your payment did not complete. Please try again or use a different payment method.",
  "cancelled": "You cancelled the payment. No charges were made.",
};

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "failed";
  const tranId = searchParams.get("id") || "";

  const message = useMemo(
    () => REASON_MESSAGES[reason] ?? REASON_MESSAGES.failed,
    [reason],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <Card className="animate-scale-in text-center">
          <CardHeader className="items-center">
            <div className="mb-3 flex items-center justify-center size-16 rounded-full bg-amber-500/10 dark:bg-amber-500/15 animate-scale-in">
              <AlertTriangle className="size-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">
              {reason === "cancelled" ? "Payment cancelled" : "Payment failed"}
            </CardTitle>
            <CardDescription>{message}</CardDescription>
            {tranId && (
              <p className="mt-2 text-xs text-muted-foreground font-mono">
                Ref: {tranId}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/books">Return to catalog</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard/wallet">Top up wallet</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <SiteFooter />
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground">
          <SiteHeader />
          <main className="mx-auto max-w-4xl px-6 py-16">
            <Card className="animate-scale-in text-center">
              <CardHeader className="items-center">
                <div className="mb-3 flex items-center justify-center size-16 rounded-full bg-amber-500/10 dark:bg-amber-500/15">
                  <AlertTriangle className="size-8 text-amber-500" />
                </div>
                <CardTitle className="text-2xl">Processing...</CardTitle>
                <CardDescription>Checking payment status...</CardDescription>
              </CardHeader>
            </Card>
          </main>
          <SiteFooter />
        </div>
      }
    >
      <PaymentFailContent />
    </Suspense>
  );
}
