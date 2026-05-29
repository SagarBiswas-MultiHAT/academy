"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, CreditCard, PackageCheck, TrendingUp, ArrowRight } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type Wallet = {
  balanceBdt: number | string;
  lifetimeEarned: number | string;
  lifetimeSpent: number | string;
};

type Order = {
  id: string;
  amount: number | string;
  status: string;
  createdAt: string;
  canDownloadPdf?: boolean;
  pdfFilename?: string | null;
  book: { title: string; slug: string; hasPremiumPdf?: boolean; requiresGatewayPayment?: boolean };
};

type Certificate = {
  certificateId: string;
  courseTitle: string;
  issueDate: string;
};

const formatCurrency = (value: number | string) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "BDT 0.00";
  return `BDT ${amount.toFixed(2)}`;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

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
      api.get("/orders/my"),
      api.get("/certificates/my"),
    ])
      .then(([walletRes, ordersRes, certRes]) => {
        if (!active) return;
        setWallet(walletRes.data.data as Wallet);
        setOrders(ordersRes.data.data as Order[]);
        setCertificates(certRes.data.data as Certificate[]);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load your dashboard data.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const paidOrders = useMemo(
    () => orders.filter((order) => order.status === "PAID"),
    [orders]
  );

  const handlePdfDownload = async (order: Order) => {
    try {
      setDownloadingOrderId(order.id);
      const response = await api.get(`/orders/${order.id}/pdf`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = order.pdfFilename || "Google_Dorks_Complete_OSINT_Handbook_Licensed.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingOrderId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading dashboard</CardTitle>
              <CardDescription>Preparing your workspace.</CardDescription>
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
              <CardTitle>Sign in to view your dashboard</CardTitle>
              <CardDescription>Access purchases, wallet balance, and certificates.</CardDescription>
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
              <span className="gradient-text">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              Welcome back{user.name ? `, ${user.name}` : ""}. Track your learning progress and rewards.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {user.role === "ADMIN" && (
              <Button asChild variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400/20 dark:hover:border-emerald-400/40 dark:hover:shadow-[0_0_12px_rgba(52,211,153,0.1)]">
                <Link href="/admin">Admin console</Link>
              </Button>
            )}
            <Button asChild variant="outline">
              <Link href="/dashboard/wallet">Manage wallet</Link>
            </Button>
            <Button asChild>
              <Link href="/books">Browse books</Link>
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Dashboard unavailable</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Wallet Balance */}
            <Card className="hover-lift animate-fade-in-up border-t-2 border-t-primary/40 dark:border-t-[rgba(var(--glow-primary),0.4)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                    <CreditCard className="size-4 text-primary" />
                  </div>
                  Wallet balance
                </CardTitle>
                <CardDescription>Available for purchases and top-ups.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-semibold gradient-text-static">
                      {wallet ? formatCurrency(wallet.balanceBdt) : "BDT --"}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      Earned {wallet ? formatCurrency(wallet.lifetimeEarned) : "BDT --"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Spent {wallet ? formatCurrency(wallet.lifetimeSpent) : "BDT --"}
                    </p>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild variant="secondary">
                  <Link href="/dashboard/wallet">Top up wallet</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Purchased Items */}
            <Card className="hover-lift animate-fade-in-up delay-100 border-t-2 border-t-violet-500/30 dark:border-t-violet-400/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-violet-500/10">
                    <PackageCheck className="size-4 text-violet-500 dark:text-violet-400" />
                  </div>
                  Purchased items
                </CardTitle>
                <CardDescription>Books you already own.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={`order-skeleton-${index}`} className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    ))}
                  </div>
                ) : paidOrders.length ? (
                  paidOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="space-y-2 rounded-lg border border-border/40 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{order.book.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="success">Owned</Badge>
                      </div>
                      {order.canDownloadPdf && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handlePdfDownload(order)}
                          disabled={downloadingOrderId === order.id}
                        >
                          {downloadingOrderId === order.id ? "Preparing PDF..." : "Download PDF"}
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No purchases yet.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/books">
                    Find a new book <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Certificates */}
            <Card className="hover-lift animate-fade-in-up delay-200 border-t-2 border-t-emerald-500/30 dark:border-t-emerald-400/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10">
                    <Award className="size-4 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  Certificates
                </CardTitle>
                <CardDescription>Your latest verified credentials.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={`cert-skeleton-${index}`} className="space-y-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    ))}
                  </div>
                ) : certificates.length ? (
                  certificates.slice(0, 3).map((cert) => (
                    <div key={cert.certificateId} className="space-y-1 text-sm">
                      <p className="font-medium">{cert.courseTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        Issued {new Date(cert.issueDate).toLocaleDateString()}
                      </p>
                      <Link
                        href={`/verify/${cert.certificateId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View verification link
                      </Link>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No certificates yet.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild variant="secondary">
                  <Link href="/books">Earn a certificate</Link>
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
