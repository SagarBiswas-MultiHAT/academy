"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Award, BookOpen, CreditCard, Download, PackageCheck, TrendingUp, ArrowRight, Users } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatUsdFromBdt } from "@/lib/currency";
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

type ReferralStats = {
  total: number;
  pending: number;
  qualified: number;
  credited: number;
  totalEarned: number;
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [referrals, setReferrals] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState<string | null>(null);

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
      api.get("/referrals/stats"),
    ])
      .then(([walletRes, ordersRes, certRes, refRes]) => {
        if (!active) return;
        setWallet(walletRes.data.data as Wallet);
        setOrders(ordersRes.data.data as Order[]);
        setCertificates(certRes.data.data as Certificate[]);
        setReferrals(refRes.data.data as ReferralStats);
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

  const certificateByCourseTitle = useMemo(() => {
    const entries = certificates.map((cert) => [cert.courseTitle.trim().toLowerCase(), cert] as const);
    return new Map(entries);
  }, [certificates]);

  const nextCertificationOrder = useMemo(
    () => paidOrders.find((order) => !certificateByCourseTitle.has(order.book.title.trim().toLowerCase())),
    [certificateByCourseTitle, paidOrders]
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

  const handleCertificateDownload = async (certificate: Certificate) => {
    try {
      setDownloadingCertificateId(certificate.certificateId);
      const response = await api.get(`/certificates/${certificate.certificateId}/pdf`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `multihat-certificate-${certificate.certificateId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingCertificateId(null);
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
            {nextCertificationOrder && (
              <Button asChild variant="secondary">
                <Link href={`/quiz/${nextCertificationOrder.book.slug}`}>
                  <Award className="mr-2 size-4" />
                  Continue certification
                </Link>
              </Button>
            )}
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
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
                      {wallet ? formatUsdFromBdt(wallet.balanceBdt) : "$ --"}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="size-3.5 text-emerald-500" />
                      Earned {wallet ? formatUsdFromBdt(wallet.lifetimeEarned) : "$ --"}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Spent {wallet ? formatUsdFromBdt(wallet.lifetimeSpent) : "$ --"}
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
                <CardDescription>Books you own and certification actions.</CardDescription>
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
                  paidOrders.slice(0, 3).map((order) => {
                    const certificate = certificateByCourseTitle.get(order.book.title.trim().toLowerCase());
                    return (
                      <div
                        key={order.id}
                        className="space-y-3 rounded-lg border border-border/40 p-3 text-sm transition-all hover:bg-muted/50 hover:border-primary/50 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{order.book.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Purchased {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={certificate ? "success" : "secondary"}>
                            {certificate ? "Certified" : "Owned"}
                          </Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/books/${order.book.slug}/read/1`}>
                              <BookOpen className="mr-1.5 size-3.5" />
                              Read
                            </Link>
                          </Button>
                          {certificate ? (
                            <Button asChild size="sm">
                              <Link href={`/verify/${certificate.certificateId}`}>
                                <Award className="mr-1.5 size-3.5" />
                                Certificate
                              </Link>
                            </Button>
                          ) : (
                            <Button asChild size="sm">
                              <Link href={`/quiz/${order.book.slug}`}>
                                <Award className="mr-1.5 size-3.5" />
                                Take quiz
                              </Link>
                            </Button>
                          )}
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
                    );
                  })
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
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleCertificateDownload(cert)}
                          disabled={downloadingCertificateId === cert.certificateId}
                        >
                          <Download className="mr-1.5 size-3.5" />
                          {downloadingCertificateId === cert.certificateId ? "Preparing..." : "Download PDF"}
                        </Button>
                      </div>
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

            {/* Referrals */}
            <Card className="hover-lift animate-fade-in-up delay-300 border-t-2 border-t-blue-500/30 dark:border-t-blue-400/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-blue-500/10">
                    <Users className="size-4 text-blue-500 dark:text-blue-400" />
                  </div>
                  Referrals
                </CardTitle>
                <CardDescription>Invite friends and earn rewards.</CardDescription>
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
                      {referrals ? formatUsdFromBdt(referrals.totalEarned) : "$ --"}
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="size-3.5 text-blue-500" />
                      {referrals?.total || 0} Total Invites
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {referrals?.credited || 0} Successful conversions
                    </p>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild variant="secondary">
                  <Link href="/dashboard/referrals">View referral hub</Link>
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
