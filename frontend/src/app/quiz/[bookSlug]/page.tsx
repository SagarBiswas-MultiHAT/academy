"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import QuizRenderer from "@/components/quiz/QuizRenderer";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export default function QuizPage({ params }: { params: { bookSlug: string } }) {
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
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading quiz</CardTitle>
              <CardDescription>Preparing your assessment.</CardDescription>
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
              <CardTitle>Sign in to take the quiz</CardTitle>
              <CardDescription>Access quizzes after purchasing the book.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/auth/login">Sign in</Link>
              </Button>
            </CardContent>
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
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-500" /> Quiz access unavailable
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/books">Browse books</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/books/${params.bookSlug}`}>View book details</Link>
              </Button>
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

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-primary">
            Certification quiz
          </div>
          <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
            {payload?.bookTitle ?? "Quiz"}
          </h1>
          <p className="text-muted-foreground">Score 70 percent or higher to earn your certificate.</p>
        </div>

        <Separator className="my-6" />

        {loading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading questions</CardTitle>
              <CardDescription>Preparing your quiz.</CardDescription>
            </CardHeader>
          </Card>
        ) : payload ? (
          <QuizRenderer bookSlug={params.bookSlug} questions={payload.questions} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Quiz unavailable</CardTitle>
              <CardDescription>Please try again later.</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
          <BadgeCheck className="size-4 text-primary" />
          Results appear immediately after submission.
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
