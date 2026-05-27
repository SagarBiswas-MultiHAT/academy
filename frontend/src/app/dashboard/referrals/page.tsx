"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Link2, Share2, Users } from "lucide-react";

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
        <main className="mx-auto max-w-6xl px-6 py-12">
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
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Card>
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

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">Referrals</h1>
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
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Link2 className="size-5 text-primary" /> Your referral link
                  </CardTitle>
                  <CardDescription>Share this link to earn BDT rewards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={shareLink || ""} readOnly />
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleCopy} disabled={!shareLink}>
                      {copied ? "Copied" : "Copy link"}
                    </Button>
                    <Badge variant="secondary">
                      Code: {code?.referralCode ?? "Generating"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Share2 className="size-5 text-primary" /> How it works
                  </CardTitle>
                  <CardDescription>Rewards trigger once referrals qualify.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>1. Share your referral link.</p>
                  <p>2. Referred users spend at least BDT 500.</p>
                  <p>3. You earn BDT 100 per credited referral.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="size-5 text-primary" /> Referral stats
                </CardTitle>
                <CardDescription>Live performance snapshot.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading stats...</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Total referrals</p>
                      <p className="text-2xl font-semibold">{stats?.total ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Credited</p>
                      <p className="text-2xl font-semibold">{stats?.credited ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Qualified</p>
                      <p className="text-2xl font-semibold">{stats?.qualified ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Pending</p>
                      <p className="text-2xl font-semibold">{stats?.pending ?? 0}</p>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Badge variant="success">Earned: BDT {stats?.totalEarned ?? 0}</Badge>
                <Button asChild variant="outline">
                  <Link href="/dashboard/wallet">View wallet</Link>
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
