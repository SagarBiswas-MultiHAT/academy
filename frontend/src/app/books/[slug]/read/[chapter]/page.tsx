"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, Lock } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

import api from "@/lib/api";
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

type ChapterData = {
  bookTitle: string;
  bookSlug: string;
  chapter: { index: number; title: string; isFree: boolean };
  content: string;
  totalChapters: number;
};

// Custom renderers to ensure proper styling regardless of tailwind prose config
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="text-2xl font-bold mt-10 mb-4 font-[family-name:var(--font-space-grotesk)] tracking-tight text-foreground border-b border-border/40 pb-2">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="text-xl font-semibold mt-8 mb-3 font-[family-name:var(--font-space-grotesk)] tracking-tight text-foreground">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="text-lg font-semibold mt-6 mb-2 text-foreground/90">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-base text-muted-foreground leading-relaxed mb-4">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/80">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-4 border-primary/50 bg-primary/5 dark:bg-primary/10 rounded-r-lg px-4 py-3 text-sm text-foreground/80">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <pre className="my-4 rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/40 px-5 py-4 overflow-x-auto text-sm font-mono text-foreground/90">
          <code>{children}</code>
        </pre>
      );
    }
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  ul: ({ children }) => (
    <ul className="my-3 ml-6 space-y-1 list-disc marker:text-primary/60">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-6 space-y-1 list-decimal marker:text-primary/60">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-muted-foreground leading-relaxed pl-1">{children}</li>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border border-border/40 shadow-sm">
      <table className="min-w-full divide-y divide-border/40">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border/30">{children}</tbody>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground whitespace-nowrap">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-sm text-muted-foreground">{children}</td>
  ),
  hr: () => <Separator className="my-8" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline underline-offset-4"
    >
      {children}
    </a>
  ),
};

export default function ChapterReaderPage({
  params,
}: {
  params: { slug: string; chapter: string };
}) {
  const [data, setData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const chapterIndex = Number(params.chapter);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get(`/books/${params.slug}/chapters/${params.chapter}`)
      .then((res) => {
        if (!active) return;
        setData(res.data.data as ChapterData);
      })
      .catch((err) => {
        if (!active) return;
        const status = err?.response?.status;
        if (status === 403) {
          setError("This chapter requires a purchase to access. Unlock the full book to continue reading.");
        } else if (status === 404) {
          setError("Chapter not found.");
        } else {
          setError("Unable to load chapter content right now.");
        }
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => { active = false; };
  }, [params.slug, params.chapter]);

  const hasPrev = chapterIndex > 1;
  const hasNext = data ? chapterIndex < data.totalChapters : false;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8 animate-fade-in-up">
          <Link href="/books" className="hover:text-foreground transition-colors">Books</Link>
          <span className="opacity-40">/</span>
          <Link href={`/books/${params.slug}`} className="hover:text-foreground transition-colors truncate max-w-[200px]">
            {data?.bookTitle ?? "Book"}
          </Link>
          <span className="opacity-40">/</span>
          <span className="text-foreground font-medium">
            Chapter {chapterIndex}
          </span>
        </nav>

        {error ? (
          <Card className="animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="size-5 text-destructive" />
                Chapter locked
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button asChild variant="secondary">
                <Link href={`/books/${params.slug}`}>
                  <ChevronLeft className="mr-1 size-4" />Back to book
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/books/${params.slug}`}>Unlock full book</Link>
              </Button>
            </CardContent>
          </Card>

        ) : loading ? (
          <div className="space-y-6 animate-fade-in-up">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-5 w-24" />
            <Separator />
            <div className="space-y-3 mt-6">
              {Array.from({ length: 14 }).map((_, i) => (
                <Skeleton key={i} className="h-4" style={{ width: `${55 + (i % 4) * 12}%` }} />
              ))}
            </div>
          </div>

        ) : data ? (
          <article className="animate-fade-in-up">
            {/* Chapter header */}
            <div className="space-y-3 mb-8">
              <Badge variant="holographic">
                <BookOpen className="mr-1 size-3" />
                Chapter {data.chapter.index} of {data.totalChapters}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl font-[family-name:var(--font-space-grotesk)]">
                <span className="gradient-text">{data.chapter.title}</span>
              </h1>
              {data.chapter.isFree && <Badge variant="success">Free preview</Badge>}
            </div>

            <Separator className="mb-10" />

            {/* Markdown content */}
            <div className="space-y-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {data.content}
              </ReactMarkdown>
            </div>

            {/* Chapter navigation */}
            <Separator className="my-10" />
            <div className="flex items-center justify-between">
              {hasPrev ? (
                <Button asChild variant="outline">
                  <Link href={`/books/${data.bookSlug}/read/${chapterIndex - 1}`}>
                    <ArrowLeft className="mr-2 size-4" />Previous chapter
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href={`/books/${data.bookSlug}`}>
                    <ChevronLeft className="mr-2 size-4" />Back to book
                  </Link>
                </Button>
              )}
              {hasNext ? (
                <Button asChild>
                  <Link href={`/books/${data.bookSlug}/read/${chapterIndex + 1}`}>
                    Next chapter<ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link href={`/books/${data.bookSlug}`}>Finish reading</Link>
                </Button>
              )}
            </div>
          </article>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
