"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Link2, Share2, Users, Copy, Check, ArrowRight } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type ReferralCode = {
  referralCode?: string | null;
  referralLink?: string | null;
};

type ReferralStats = {
  total: number;
  pending: number;
  qualified: number;
  credited: number;
  totalEarned: number;
};

export default function ReferralsPage() {
  const { user, loading: authLoading } = useAuth();
  const [code, setCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let active = true;
    setError(null);
    setLoading(true);
    Promise.all([api.get("/referrals/code"), api.get("/referrals/stats")])
      .then(([codeRes, statsRes]) => {
        if (!active) return;
        setCode(codeRes.data.data as ReferralCode);
        setStats(statsRes.data.data as ReferralStats);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load referral data.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const shareLink =
    code?.referralLink ??
    (code?.referralCode
      ? `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/ref/${code.referralCode}`
      : "");

  const handleCopy = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading referrals</CardTitle>
              <CardDescription>Preparing your referral dashboard.</CardDescription>
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
              <CardTitle>Sign in to access referrals</CardTitle>
              <CardDescription>Share your referral link and track rewards.</CardDescription>
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
              <span className="gradient-text">Referrals</span>
            </h1>
            <p className="text-muted-foreground">Invite peers and earn wallet rewards.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>

        <Separator className="my-6" />

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Referrals unavailable</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              {/* Referral Link Card */}
              <Card className="hover-lift animate-fade-in-up border-t-2 border-t-primary/40 dark:border-t-[rgba(var(--glow-primary),0.4)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                      <Link2 className="size-4 text-primary" />
                    </div>
                    Your referral link
                  </CardTitle>
                  <CardDescription>Share this link to earn BDT rewards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-full" />
                      <div className="flex flex-wrap gap-3">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-6 w-28" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <Input value={shareLink || ""} readOnly className="font-mono text-xs" />
                        <Button onClick={handleCopy} disabled={!shareLink} variant="outline" size="icon" className="shrink-0">
                          {copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button onClick={handleCopy} disabled={!shareLink} variant="secondary" size="sm">
                          {copied ? "Copied!" : "Copy link"}
                        </Button>
                        <Badge variant="holographic">
                          Code: {code?.referralCode ?? "Generating"}
                        </Badge>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* How It Works Card */}
              <Card className="hover-lift animate-fade-in-up delay-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                      <Share2 className="size-4 text-primary" />
                    </div>
                    How it works
                  </CardTitle>
                  <CardDescription>Rewards trigger once referrals qualify.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { step: "1", text: "Share your referral link." },
                    { step: "2", text: "Referred users spend at least BDT 500." },
                    { step: "3", text: "You earn BDT 100 per credited referral." },
                  ].map((item) => (
                    <div key={item.step} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0 dark:bg-[rgba(var(--glow-primary),0.1)]">
                        {item.step}
                      </div>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Stats Card */}
            <Card className="animate-fade-in-up delay-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                    <Users className="size-4 text-primary" />
                  </div>
                  Referral stats
                </CardTitle>
                <CardDescription>Live performance snapshot.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`ref-skeleton-${index}`} className="space-y-2">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      { label: "Total referrals", value: stats?.total ?? 0, color: "text-foreground" },
                      { label: "Credited", value: stats?.credited ?? 0, color: "text-emerald-500 dark:text-emerald-400" },
                      { label: "Qualified", value: stats?.qualified ?? 0, color: "text-violet-500 dark:text-violet-400" },
                      { label: "Pending", value: stats?.pending ?? 0, color: "text-amber-500 dark:text-amber-400" },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-lg bg-muted/30 dark:bg-white/[0.03] p-3 border border-foreground/[0.04] dark:border-white/[0.04]">
                        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">{stat.label}</p>
                        <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Badge variant="success">Earned: BDT {stats?.totalEarned ?? 0}</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/wallet">
                    View wallet <ArrowRight className="ml-1 size-3.5" />
                  </Link>
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
