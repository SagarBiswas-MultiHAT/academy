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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="size-6 text-amber-500" /> Payment failed
            </CardTitle>
            <CardDescription>Your payment did not complete. Please try again.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
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
