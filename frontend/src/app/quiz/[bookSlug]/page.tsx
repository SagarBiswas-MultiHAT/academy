"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, Award } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import QuizRenderer from "@/components/quiz/QuizRenderer";
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

type Question = {
  id: string;
  prompt: string;
  options: string[];
};

type QuizPayload = {
  bookTitle: string;
  questions: Question[];
};

export default function QuizPage({ params: paramsPromise }: { params: Promise<{ bookSlug: string }> }) {
  const params = use(paramsPromise);
  const { user, loading: authLoading } = useAuth();
  const [payload, setPayload] = useState<QuizPayload | null>(null);
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
    api
      .get(`/quizzes/${params.bookSlug}/questions`)
      .then((res) => {
        if (!active) return;
        setPayload(res.data.data as QuizPayload);
      })
      .catch(() => {
        if (!active) return;
        setError("You need to purchase this book before taking the quiz.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.bookSlug, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <Card><CardHeader><CardTitle>Loading quiz</CardTitle><CardDescription>Preparing your assessment.</CardDescription></CardHeader></Card>
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
          <Card className="gradient-border"><CardHeader><CardTitle>Sign in to take the quiz</CardTitle><CardDescription>Access quizzes after purchasing the book.</CardDescription></CardHeader>
            <CardContent><Button asChild><Link href="/auth/login">Sign in</Link></Button></CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="size-5 text-amber-500" /> Quiz access unavailable</CardTitle><CardDescription>{error}</CardDescription></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild><Link href="/books">Browse books</Link></Button>
              <Button asChild variant="outline"><Link href={`/books/${params.bookSlug}`}>View book details</Link></Button>
            </CardContent>
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
        <div className="space-y-2 animate-fade-in-up">
          <Badge variant="holographic">
            <Award className="mr-1 size-3" />
            Certification quiz
          </Badge>
          <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
            <span className="gradient-text">{payload?.bookTitle ?? "Quiz"}</span>
          </h1>
          <p className="text-muted-foreground">Score 70 percent or higher to earn your certificate.</p>
        </div>

        <Separator className="my-6" />

        {loading ? (
          <Card>
            <CardHeader><CardTitle>Loading questions</CardTitle><CardDescription>Preparing your quiz.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`quiz-skeleton-${index}`} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : payload ? (
          <QuizRenderer bookSlug={params.bookSlug} questions={payload.questions} />
        ) : (
          <Card><CardHeader><CardTitle>Quiz unavailable</CardTitle><CardDescription>Please try again later.</CardDescription></CardHeader></Card>
        )}

        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground animate-fade-in-up delay-300">
          <BadgeCheck className="size-4 text-primary" />
          Results appear immediately after submission.
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
