"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Globe, Send, XCircle, Award } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type Certificate = {
  certificateId: string;
  courseTitle: string;
  issueDate: string;
};

type ShowcaseStatus = "PENDING" | "VERIFIED" | "REJECTED";

type Showcase = {
  id: string;
  platform: string;
  status: ShowcaseStatus;
  rewardAmount: number | string;
  submittedAt: string;
  verifyAfter: string;
  certificate: {
    certificateId: string;
    courseTitle: string;
  };
};

const platforms = [
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "TWITTER", label: "Twitter" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "INSTAGRAM", label: "Instagram" },
];

export default function ShowcasePage() {
  const { user, loading: authLoading } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [certificateId, setCertificateId] = useState("");
  const [platform, setPlatform] = useState(platforms[0].value);
  const [postUrl, setPostUrl] = useState("");

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [certRes, showcaseRes] = await Promise.all([
        api.get("/certificates/my"),
        api.get("/showcases/my"),
      ]);
      setCertificates(certRes.data.data as Certificate[]);
      setShowcases(showcaseRes.data.data as Showcase[]);
      if (!certificateId && certRes.data.data?.length) {
        setCertificateId(certRes.data.data[0].certificateId);
      }
    } catch {
      setError("Unable to load showcase data.");
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user, loadData]);

  const statusMeta = useMemo(() => {
    return {
      VERIFIED: { label: "Verified", icon: CheckCircle2, badgeVariant: "success" as const, color: "text-emerald-500 dark:text-emerald-400" },
      PENDING: { label: "Pending", icon: Clock, badgeVariant: "secondary" as const, color: "text-amber-500 dark:text-amber-400" },
      REJECTED: { label: "Rejected", icon: XCircle, badgeVariant: "warning" as const, color: "text-rose-500 dark:text-rose-400" },
    };
  }, []);

  const handleSubmit = async () => {
    setFormError(null);
    if (!certificateId) {
      setFormError("Select a certificate.");
      return;
    }
    if (!postUrl.trim()) {
      setFormError("Provide a valid post URL.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/showcases/submit", { certificateId, platform, postUrl });
      setPostUrl("");
      await loadData();
    } catch {
      setFormError("Unable to submit showcase. Check your details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading showcases</CardTitle>
              <CardDescription>Preparing your showcase workspace.</CardDescription>
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
              <CardTitle>Sign in to submit showcases</CardTitle>
              <CardDescription>Share your achievements and earn rewards.</CardDescription>
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
              <span className="gradient-text">Showcase rewards</span>
            </h1>
            <p className="text-muted-foreground">Submit social posts to earn wallet credit after verification.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>

        <Separator className="my-6" />

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Showcase unavailable</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Submit Form */}
            <Card className="hover-lift animate-fade-in-up border-t-2 border-t-primary/40 dark:border-t-[rgba(var(--glow-primary),0.4)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                    <Send className="size-4 text-primary" />
                  </div>
                  Submit a showcase post
                </CardTitle>
                <CardDescription>One reward per platform for each certificate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="certificate">Certificate</Label>
                  <select
                    id="certificate"
                    value={certificateId}
                    onChange={(event) => setCertificateId(event.target.value)}
                    disabled={loading || certificates.length === 0}
                    className="flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm shadow-sm shadow-black/5 backdrop-blur-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:bg-white/[0.04] dark:border-white/[0.08]"
                  >
                    {certificates.map((cert) => (
                      <option key={cert.certificateId} value={cert.certificateId}>
                        {cert.courseTitle}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platform">Platform</Label>
                  <select
                    id="platform"
                    value={platform}
                    onChange={(event) => setPlatform(event.target.value)}
                    disabled={loading}
                    className="flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm shadow-sm shadow-black/5 backdrop-blur-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:bg-white/[0.04] dark:border-white/[0.08]"
                  >
                    {platforms.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postUrl">Post URL</Label>
                  <Input
                    id="postUrl"
                    type="url"
                    placeholder="https://"
                    value={postUrl}
                    onChange={(event) => setPostUrl(event.target.value)}
                    disabled={loading}
                  />
                </div>
                {formError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive backdrop-blur-sm">
                    {formError}
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Badge variant="secondary">Verification after 10 days</Badge>
                <Button onClick={handleSubmit} disabled={submitting || loading || certificates.length === 0}>
                  {submitting ? "Submitting..." : "Submit post"}
                </Button>
              </CardFooter>
            </Card>

            {/* Submissions */}
            <Card className="animate-fade-in-up delay-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10">
                    <Globe className="size-4 text-primary" />
                  </div>
                  Your submissions
                </CardTitle>
                <CardDescription>Track verification status and rewards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={`showcase-skeleton-${index}`} className="space-y-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    ))}
                  </div>
                ) : showcases.length ? (
                  showcases.slice(0, 6).map((item) => {
                    const meta = statusMeta[item.status] ?? statusMeta.PENDING;
                    const Icon = meta.icon;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm rounded-lg p-2 -mx-2 hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium">{item.certificate.courseTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.platform} · verify after {new Date(item.verifyAfter).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon className={`size-4 ${meta.color}`} />
                          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No showcase submissions yet.</p>
                )}
              </CardContent>
              <CardFooter>
                <Badge variant="success">
                  <Award className="mr-1 size-3" />
                  Potential rewards: {formatUsdFromBdt(
                    showcases.reduce((sum, item) => sum + Number(item.rewardAmount), 0)
                  )}
                </Badge>
              </CardFooter>
            </Card>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
