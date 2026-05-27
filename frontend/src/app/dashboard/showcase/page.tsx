"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, Globe, Send, XCircle } from "lucide-react";

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

const formatCurrency = (value: number | string) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "BDT 0.00";
  return `BDT ${amount.toFixed(2)}`;
};

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
      VERIFIED: { label: "Verified", icon: CheckCircle2, variant: "success" as const },
      PENDING: { label: "Pending", icon: Clock, variant: "secondary" as const },
      REJECTED: { label: "Rejected", icon: XCircle, variant: "warning" as const },
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
        <main className="mx-auto max-w-6xl px-6 py-12">
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
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Card>
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

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">Showcase rewards</h1>
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
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Send className="size-5 text-primary" /> Submit a showcase post
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
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
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
                  />
                </div>
                {formError && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Badge variant="secondary">Verification after 10 days</Badge>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit post"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="size-5 text-primary" /> Your submissions
                </CardTitle>
                <CardDescription>Track verification status and rewards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading submissions...</p>
                ) : showcases.length ? (
                  showcases.slice(0, 6).map((item) => {
                    const meta = statusMeta[item.status] ?? statusMeta.PENDING;
                    const Icon = meta.icon;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{item.certificate.courseTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.platform} - verify after {new Date(item.verifyAfter).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-primary" />
                          <Badge variant={meta.variant}>{meta.label}</Badge>
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
                  Potential rewards: {formatCurrency(
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
