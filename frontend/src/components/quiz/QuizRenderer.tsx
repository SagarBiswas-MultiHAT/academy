"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Award } from 'lucide-react';
import api from '@/lib/api';

interface Question { id: string; prompt: string; options: string[]; }
interface QuizResult { score: number; total: number; outcome: 'PASS' | 'FAIL'; certId?: string; }

export default function QuizRenderer({ bookSlug, questions }: { bookSlug: string; questions: Question[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const handleSelect = (qId: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert('Please answer all questions before submitting.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post(`/quizzes/${bookSlug}/submit`, { selectedAnswers: answers });
      setResult(res.data.data);
    } catch { alert('Submission error. Please try again.'); }
    finally { setLoading(false); }
  };

  if (result) {
    const isPass = result.outcome === 'PASS';
    return (
      <Card className={`max-w-xl mx-auto gradient-border ${isPass ? 'dark:animate-glow-pulse' : ''}`}>
        <CardHeader className="text-center pb-2">
          {isPass ? (
            <div className="mx-auto mb-3 flex items-center justify-center size-20 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 animate-scale-in">
              <ShieldCheck className="size-10 text-emerald-500" />
            </div>
          ) : (
            <div className="mx-auto mb-3 flex items-center justify-center size-20 rounded-full bg-rose-500/10 dark:bg-rose-500/15 animate-scale-in">
              <AlertTriangle className="size-10 text-rose-500" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {isPass ? (
              <span className="gradient-text">Certification Earned!</span>
            ) : (
              'Quiz Attempt Failed'
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 animate-fade-in-up delay-200">
          <p className="text-lg">
            Score: <strong className="text-2xl gradient-text-static">{result.score}</strong> / {result.total} ({Math.round((result.score / result.total) * 100)}%)
          </p>
          <p className="text-muted-foreground">
            {isPass ? 'Your verifiable credential has been minted and emailed to you.' : 'You need ≥70% to pass. Review the material and try again.'}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          {isPass ? (
            <Button asChild className="dark:shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              <a href={`/verify/${result.certId}`}>
                <Award className="mr-2 size-4" />
                View Certificate
              </a>
            </Button>
          ) : (
            <Button onClick={() => setResult(null)} variant="destructive">
              <RefreshCw className="mr-2 size-4" />
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {questions.map((q, idx) => (
        <Card key={q.id} className="hover-lift animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {idx + 1}
              </div>
              <span>{q.prompt}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {q.options.map((opt) => {
              const isSelected = answers[q.id] === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleSelect(q.id, opt)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                    isSelected
                      ? 'border-primary/50 bg-primary/10 font-medium dark:border-[rgba(var(--glow-primary),0.4)] dark:bg-[rgba(var(--glow-primary),0.08)] dark:shadow-[0_0_10px_rgba(var(--glow-primary),0.08)]'
                      : 'border-foreground/[0.06] dark:border-white/[0.06] hover:border-foreground/[0.15] dark:hover:border-white/[0.12] hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center size-5 rounded-full border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    }`}>
                      {isSelected && <CheckCircle2 className="size-3" />}
                    </div>
                    {opt}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end pt-4 animate-fade-in-up" style={{ animationDelay: `${questions.length * 100}ms` }}>
        <Button onClick={handleSubmit} disabled={loading} size="lg" className="w-48 font-bold">
          {loading ? 'Submitting...' : 'Submit Answers'}
        </Button>
      </div>
    </div>
  );
}
