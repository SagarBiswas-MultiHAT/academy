"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { BadgeCheck, ShieldAlert, ShieldCheck } from "lucide-react";

import api from "@/lib/api";
import AuroraBackground from "@/components/aurora-background";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type VerificationResult = {
  valid: boolean;
  holderName: string;
  courseTitle: string;
  issueDate: string;
  certificateId: string;
};

export default function VerifyPage({ params: paramsPromise }: { params: Promise<{ certID: string }> }) {
  const params = use(paramsPromise);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get(`/certificates/verify/${params.certID}`)
      .then((res) => {
        if (!active) return;
        setResult(res.data.data as VerificationResult);
      })
      .catch(() => {
        if (!active) return;
        setError("Certificate not found or invalid.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.certID]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="relative mx-auto max-w-4xl px-6 py-12">
        <AuroraBackground />

        <div className="space-y-3 animate-fade-in-up">
          <Badge variant="holographic">
            <ShieldCheck className="mr-1 size-3" />
            Certificate verification
          </Badge>
          <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
            <span className="gradient-text">Verify a certificate</span>
          </h1>
          <p className="text-muted-foreground">Confirm authenticity of MultiHAT Academy credentials.</p>
        </div>

        <Separator className="my-6" />

        {loading ? (
          <Card className="animate-fade-in-up delay-200">
            <CardHeader>
              <CardTitle>Checking certificate</CardTitle>
              <CardDescription>Validating the certificate record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ) : error || !result ? (
          <Card className="animate-fade-in-up delay-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-amber-500" /> Verification failed
              </CardTitle>
              <CardDescription>{error ?? "Certificate unavailable."}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/books">Explore training</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="gradient-border animate-fade-in-up delay-200 dark:animate-glow-pulse">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="flex items-center justify-center size-8 rounded-full bg-emerald-500/10">
                  <BadgeCheck className="size-5 text-emerald-500" />
                </div>
                Certificate valid
              </CardTitle>
              <CardDescription>Confirmed by MultiHAT Academy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Holder</p>
                <p className="text-lg font-semibold gradient-text-static">{result.holderName}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Course</p>
                <p className="text-lg font-semibold">{result.courseTitle}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/30 dark:bg-white/[0.03] p-3 border border-foreground/[0.04] dark:border-white/[0.04]">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Issued</p>
                  <p className="text-sm font-medium">
                    {new Date(result.issueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 dark:bg-white/[0.03] p-3 border border-foreground/[0.04] dark:border-white/[0.04]">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Certificate ID</p>
                  <p className="text-sm font-medium break-all">{result.certificateId}</p>
                </div>
              </div>
            </CardContent>
            <CardContent className="flex flex-wrap gap-3">
              <Badge variant="success">Status: {result.valid ? "Valid" : "Invalid"}</Badge>
              <Button asChild variant="outline">
                <Link href="/books">Start a course</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
