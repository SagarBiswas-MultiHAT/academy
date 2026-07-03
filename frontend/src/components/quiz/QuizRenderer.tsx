"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  LayoutDashboard,
  Megaphone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface Question {
  id: string;
  prompt: string;
  options: string[];
}

interface QuizResult {
  score: number;
  total: number;
  outcome: "PASS" | "FAIL";
  certId?: string;
}

export default function QuizRenderer({ bookSlug, questions }: { bookSlug: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const answeredCount = Object.keys(answers).length;

  const handleSelect = (questionId: string, option: string) => {
    setAnswers((previous) => ({ ...previous, [questionId]: option }));
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (answeredCount < questions.length) {
      setFormError("Answer every question before submitting.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/quizzes/${bookSlug}/submit`, { selectedAnswers: answers });
      setResult(response.data.data);
      setFormError(null);
    } catch {
      setFormError("Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const isPass = result.outcome === "PASS";
    const percentage = Math.round((result.score / Math.max(result.total, 1)) * 100);

    return (
      <Card className={`mx-auto max-w-xl gradient-border ${isPass ? "dark:animate-glow-pulse" : ""}`}>
        <CardHeader className="pb-2 text-center">
          {isPass ? (
            <div className="mx-auto mb-3 flex size-20 animate-scale-in items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/15">
              <ShieldCheck className="size-10 text-emerald-500" />
            </div>
          ) : (
            <div className="mx-auto mb-3 flex size-20 animate-scale-in items-center justify-center rounded-full bg-rose-500/10 dark:bg-rose-500/15">
              <AlertTriangle className="size-10 text-rose-500" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {isPass ? <span className="gradient-text">Certification earned</span> : "Quiz attempt failed"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center animate-fade-in-up delay-200">
          <p className="text-lg">
            Score: <strong className="text-2xl gradient-text-static">{result.score}</strong> / {result.total} ({percentage}%)
          </p>
          <p className="text-muted-foreground">
            {isPass
              ? "Your verifiable credential has been issued and emailed to you."
              : "You need at least 70% to pass. Review the material and try again."}
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-center gap-3">
          {isPass ? (
            <>
              <Button asChild className="dark:shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                <Link href={`/verify/${result.certId}`}>
                  <Award className="mr-2 size-4" />
                  View certificate
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/showcase">
                  <Megaphone className="mr-2 size-4" />
                  Share showcase
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 size-4" />
                  Dashboard
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setResult(null)} variant="destructive">
                <RefreshCw className="mr-2 size-4" />
                Try again
              </Button>
              <Button asChild variant="outline">
                <Link href={`/books/${bookSlug}/read/1`}>
                  <BookOpen className="mr-2 size-4" />
                  Review chapters
                </Link>
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              Answered {answeredCount} of {questions.length}
            </p>
            <p className="text-xs text-muted-foreground">Submit when every question has a selected answer.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/books/${bookSlug}/read/1`}>
              <BookOpen className="mr-1.5 size-3.5" />
              Review chapters
            </Link>
          </Button>
        </CardContent>
      </Card>

      {questions.map((question, index) => (
        <Card key={question.id} className="hover-lift animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {index + 1}
              </div>
              <span>{question.prompt}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {question.options.map((option) => {
              const isSelected = answers[question.id] === option;

              return (
                <button
                  key={option}
                  onClick={() => handleSelect(question.id, option)}
                  className={`w-full rounded-lg border p-3 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-primary/50 bg-primary/10 font-medium dark:border-[rgba(var(--glow-primary),0.4)] dark:bg-[rgba(var(--glow-primary),0.08)] dark:shadow-[0_0_10px_rgba(var(--glow-primary),0.08)]"
                      : "border-foreground/[0.06] hover:border-foreground/[0.15] hover:bg-muted/30 dark:border-white/[0.06] dark:hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-5 items-center justify-center rounded-full border transition-all ${
                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="size-3" />}
                    </div>
                    {option}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end pt-4 animate-fade-in-up" style={{ animationDelay: `${questions.length * 100}ms` }}>
        <div className="w-full space-y-3 sm:w-auto">
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button onClick={handleSubmit} disabled={loading} size="lg" className="w-full font-bold sm:w-48">
            {loading ? "Submitting..." : "Submit answers"}
          </Button>
        </div>
      </div>
    </div>
  );
}
