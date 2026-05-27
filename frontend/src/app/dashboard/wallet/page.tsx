"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, History, Wallet } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type WalletBalance = {
  balanceBdt: number | string;
  lifetimeEarned: number | string;
  lifetimeSpent: number | string;
};

type WalletTransaction = {
  id: string;
  type: string;
  amount: number | string;
  description: string;
  createdAt: string;
  referenceId?: string | null;
};

const formatCurrency = (value: number | string) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "BDT 0.00";
  return `BDT ${amount.toFixed(2)}`;
};

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    setError(null);
    setLoading(true);
    Promise.all([
      api.get("/wallet/balance"),
      api.get("/wallet/transactions", { params: { page: 1, limit: 20 } }),
    ])
      .then(([balanceRes, transactionsRes]) => {
        if (!active) return;
        setBalance(balanceRes.data.data as WalletBalance);
        const payload = transactionsRes.data.data as { transactions: WalletTransaction[] };
        setTransactions(payload.transactions || []);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load wallet data right now.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleTopUp = async () => {
    setTopUpError(null);
    const amount = Number(topUpAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setTopUpError("Enter a valid top-up amount.");
      return;
    }

    setTopUpLoading(true);
    try {
      const res = await api.post("/wallet/topup", { amountBdt: amount });
      const payload = res.data.data as { paymentUrl: string };
      if (payload.paymentUrl) {
        window.location.href = payload.paymentUrl;
      } else {
        setTopUpError("Payment link not available. Please try again.");
      }
    } catch {
      setTopUpError("Unable to start top-up. Please try again.");
    } finally {
      setTopUpLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading wallet</CardTitle>
              <CardDescription>Preparing your balances and transactions.</CardDescription>
            </CardHeader>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Sign in to access your wallet</CardTitle>
              <CardDescription>Top up and track spending after you sign in.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">Wallet</h1>
            <p className="text-muted-foreground">Use wallet balance for instant purchases and rewards.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/books">Browse books</Link>
          </Button>
        </div>

        <Separator className="my-6" />

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Wallet unavailable</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="size-5 text-primary" /> Current balance
                  </CardTitle>
                  <CardDescription>Your available wallet funds.</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-32" />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-3xl font-semibold">
                        {balance ? formatCurrency(balance.balanceBdt) : "BDT --"}
                      </div>
                      <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.15em]">Lifetime earned</p>
                          <p className="text-base font-medium text-foreground">
                            {balance ? formatCurrency(balance.lifetimeEarned) : "BDT --"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.15em]">Lifetime spent</p>
                          <p className="text-base font-medium text-foreground">
                            {balance ? formatCurrency(balance.lifetimeSpent) : "BDT --"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ArrowUpRight className="size-5 text-primary" /> Top up via aamarPay
                  </CardTitle>
                  <CardDescription>Instantly add funds to your wallet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Top-up amount (BDT)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      value={topUpAmount}
                      onChange={(event) => setTopUpAmount(event.target.value)}
                      placeholder="500"
                    />
                  </div>
                  {topUpError && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {topUpError}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="justify-between">
                  <Badge variant="secondary">Gateway payment</Badge>
                  <Button onClick={handleTopUp} disabled={topUpLoading}>
                    {topUpLoading ? "Redirecting..." : "Proceed to payment"}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="size-5 text-primary" /> Transaction history
                </CardTitle>
                <CardDescription>Recent wallet activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`tx-skeleton-${index}`} className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    ))}
                  </div>
                ) : transactions.length ? (
                  transactions.slice(0, 8).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()} - {item.type}
                        </p>
                      </div>
                      <Badge variant="secondary">{formatCurrency(item.amount)}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/dashboard">Back to dashboard</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
