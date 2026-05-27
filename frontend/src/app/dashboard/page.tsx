"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, CreditCard, PackageCheck } from "lucide-react";

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
  book: { title: string; slug: string };
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-6 py-12">
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
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Card>
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

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back{user.name ? `, ${user.name}` : ""}. Track your learning progress and rewards.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
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
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="size-5 text-primary" /> Wallet balance
                </CardTitle>
                <CardDescription>Available for purchases and top-ups.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">
                  {wallet ? formatCurrency(wallet.balanceBdt) : "BDT --"}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Lifetime earned {wallet ? formatCurrency(wallet.lifetimeEarned) : "BDT --"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Lifetime spent {wallet ? formatCurrency(wallet.lifetimeSpent) : "BDT --"}
                </p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="secondary">
                  <Link href="/dashboard/wallet">Top up wallet</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PackageCheck className="size-5 text-primary" /> Purchased items
                </CardTitle>
                <CardDescription>Books you already own.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading purchases...</p>
                ) : paidOrders.length ? (
                  paidOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium">{order.book.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">Owned</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No purchases yet.</p>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  <Link href="/books">Find a new book</Link>
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="size-5 text-primary" /> Certificates
                </CardTitle>
                <CardDescription>Your latest verified credentials.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading certificates...</p>
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
