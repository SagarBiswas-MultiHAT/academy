"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, History, Wallet, TrendingUp, TrendingDown } from "lucide-react";

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

const txTypeColors: Record<string, string> = {
  TOPUP: "text-emerald-500 dark:text-emerald-400",
  PURCHASE: "text-rose-500 dark:text-rose-400",
  REFERRAL_CREDIT: "text-violet-500 dark:text-violet-400",
  SHOWCASE_CREDIT: "text-cyan-500 dark:text-cyan-400",
};

const TOP_UP_FLAG = "walletTopUpPending";

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);

  const confirmPendingTopUp = async () => {
    if (typeof window === "undefined") return false;

    const pendingTranId = window.localStorage.getItem(TOP_UP_FLAG);
    if (!pendingTranId) return false;

    try {
      const response = await api.post("/wallet/topup/confirm", { tranId: pendingTranId });
      const status = String(response.data?.data?.status || "").toUpperCase();
      return status === "CONFIRMED" || status === "ALREADY_CONFIRMED";
    } catch {
      return false;
    }
  };

  const loadWalletData = async () => {
    const [balanceRes, transactionsRes] = await Promise.all([
      api.get("/wallet/balance"),
      api.get("/wallet/transactions", { params: { page: 1, limit: 20 } }),
    ]);

    setBalance(balanceRes.data.data as WalletBalance);
    const payload = transactionsRes.data.data as { transactions: WalletTransaction[] };
    setTransactions(payload.transactions || []);

    return balanceRes.data.data as WalletBalance;
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const confirmed = await confirmPendingTopUp();
        const currentBalance = await loadWalletData();

        if (!active) return;

        const hasPendingTopUp = typeof window !== "undefined" && Boolean(window.localStorage.getItem(TOP_UP_FLAG));
        const balanceAmount = Number(currentBalance.balanceBdt);

        if ((confirmed || hasPendingTopUp) && Number.isFinite(balanceAmount) && balanceAmount > 0) {
          window.localStorage.removeItem(TOP_UP_FLAG);
        }
      } catch {
        if (!active) return;
        setError("Unable to load wallet data right now.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const refreshOnFocus = () => {
      confirmPendingTopUp()
        .then((confirmed) => {
          if (confirmed) {
            window.localStorage.removeItem(TOP_UP_FLAG);
          }
          return loadWalletData();
        })
        .catch(() => undefined);
    };

    const refreshInterval = window.setInterval(() => {
      const hasPendingTopUp = window.localStorage.getItem(TOP_UP_FLAG);
      if (!hasPendingTopUp) return;

      confirmPendingTopUp()
        .then((confirmed) => {
          if (confirmed) {
            window.localStorage.removeItem(TOP_UP_FLAG);
          }
          return loadWalletData();
        })
        .then((currentBalance) => {
          const balanceAmount = Number(currentBalance.balanceBdt);
          if (Number.isFinite(balanceAmount) && balanceAmount > 0) {
            window.localStorage.removeItem(TOP_UP_FLAG);
          }
        })
        .catch(() => undefined);
    }, 4000);

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
      window.clearInterval(refreshInterval);
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
        <main className="mx-auto max-w-7xl px-6 py-12">
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
        <main className="mx-auto max-w-7xl px-6 py-12">
          <Card className="gradient-border">
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

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
              <span className="gradient-text">Wallet</span>
            </h1>
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
              {/* Balance Card */}
              <Card className="hover-lift animate-fade-in-up border-t-2 border-t-primary/40 dark:border-t-[rgba(var(--glow-primary),0.4)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                      <Wallet className="size-4 text-primary" />
                    </div>
                    Current balance
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
                      <div className="text-3xl font-semibold gradient-text-static">
                        {balance ? formatCurrency(balance.balanceBdt) : "BDT --"}
                      </div>
                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-lg bg-emerald-500/5 dark:bg-emerald-500/5 p-3 border border-emerald-500/10">
                          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1">
                            <TrendingUp className="size-3 text-emerald-500" />
                            Lifetime earned
                          </p>
                          <p className="text-base font-medium text-foreground">
                            {balance ? formatCurrency(balance.lifetimeEarned) : "BDT --"}
                          </p>
                        </div>
                        <div className="rounded-lg bg-rose-500/5 dark:bg-rose-500/5 p-3 border border-rose-500/10">
                          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1">
                            <TrendingDown className="size-3 text-rose-500" />
                            Lifetime spent
                          </p>
                          <p className="text-base font-medium text-foreground">
                            {balance ? formatCurrency(balance.lifetimeSpent) : "BDT --"}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Top Up Card */}
              <Card className="hover-lift animate-fade-in-up delay-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                      <ArrowUpRight className="size-4 text-primary" />
                    </div>
                    Top up via aamarPay
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
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive backdrop-blur-sm">
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

            {/* Transactions */}
            <Card className="animate-fade-in-up delay-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                    <History className="size-4 text-primary" />
                  </div>
                  Transaction history
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
                    <div key={item.id} className="flex items-center justify-between text-sm rounded-lg p-2 -mx-2 hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString()} ·{" "}
                          <span className={txTypeColors[item.type] || "text-muted-foreground"}>
                            {item.type.replace(/_/g, " ")}
                          </span>
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
