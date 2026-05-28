import Link from "next/link";
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

export default function PaymentFailPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-6 py-16">
        <Card className="animate-scale-in text-center">
          <CardHeader className="items-center">
            <div className="mb-3 flex items-center justify-center size-16 rounded-full bg-amber-500/10 dark:bg-amber-500/15 animate-scale-in">
              <AlertTriangle className="size-8 text-amber-500" />
            </div>
            <CardTitle className="text-2xl">Payment failed</CardTitle>
            <CardDescription>Your payment did not complete. Please try again or use a different method.</CardDescription>
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
