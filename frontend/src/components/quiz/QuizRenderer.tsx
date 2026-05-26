"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
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
      <Card className={`border-2 ${isPass ? 'border-emerald-500' : 'border-rose-500'} max-w-xl mx-auto shadow-lg`}>
        <CardHeader className="text-center">
          {isPass
            ? <ShieldCheck className="h-16 w-16 text-emerald-500 animate-bounce mx-auto" />
            : <AlertTriangle className="h-16 w-16 text-rose-500 mx-auto" />}
          <CardTitle className="text-2xl font-bold">
            {isPass ? 'Certification Earned!' : 'Quiz Attempt Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-lg">Score: <strong className="text-2xl">{result.score}</strong> / {result.total} ({Math.round((result.score / result.total) * 100)}%)</p>
          <p className="text-muted-foreground">
            {isPass ? 'Your verifiable credential has been minted and emailed to you.' : 'You need ≥70% to pass. Review the material and try again.'}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          {isPass
            ? <Button asChild className="bg-emerald-600 hover:bg-emerald-700"><a href={`/verify/${result.certId}`}>View Certificate</a></Button>
            : <Button onClick={() => setResult(null)} className="bg-rose-600 hover:bg-rose-700"><RefreshCw className="h-4 w-4 mr-2" /> Try Again</Button>}
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {questions.map((q, idx) => (
        <Card key={q.id} className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader><CardTitle className="text-lg">Q{idx + 1}: {q.prompt}</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {q.options.map((opt) => (
              <button key={opt} onClick={() => handleSelect(q.id, opt)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${answers[q.id] === opt ? 'border-primary bg-primary/10 font-medium' : 'border-muted hover:border-gray-400'}`}>
                {opt}
              </button>
            ))}
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSubmit} disabled={loading} className="w-48 font-bold shadow">
          {loading ? 'Submitting...' : 'Submit Answers'}
        </Button>
      </div>
    </div>
  );
}
