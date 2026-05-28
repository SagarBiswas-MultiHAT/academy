import Link from "next/link";
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

export default function PaymentSuccessPage() {
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
            <CardDescription>Your payment has been confirmed. The book is now available in your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/dashboard">
                <Award className="mr-2 size-4" />
                Go to dashboard
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
