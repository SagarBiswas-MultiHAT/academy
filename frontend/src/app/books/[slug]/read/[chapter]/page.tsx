"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  Lock,
  Clock,
  AlertCircle,
  Info,
  Lightbulb,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
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

/** Estimate reading time from markdown content */
function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** Callout icon/color map for typed blockquotes */
const CALLOUT_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; className: string; iconClass: string }
> = {
  note: {
    icon: Info,
    label: "Note",
    className:
      "bg-sky-500/8 dark:bg-sky-500/10 border-l-4 border-sky-400 dark:border-sky-500",
    iconClass: "text-sky-500 dark:text-sky-400",
  },
  important: {
    icon: AlertCircle,
    label: "Important",
    className:
      "bg-amber-500/8 dark:bg-amber-500/10 border-l-4 border-amber-400 dark:border-amber-500",
    iconClass: "text-amber-500 dark:text-amber-400",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    className:
      "bg-emerald-500/8 dark:bg-emerald-500/10 border-l-4 border-emerald-400 dark:border-emerald-500",
    iconClass: "text-emerald-500 dark:text-emerald-400",
  },
  critical: {
    icon: ShieldAlert,
    label: "Critical",
    className:
      "bg-red-500/8 dark:bg-red-500/10 border-l-4 border-red-500 dark:border-red-500",
    iconClass: "text-red-500 dark:text-red-400",
  },
  warning: {
    icon: TriangleAlert,
    label: "Warning",
    className:
      "bg-orange-500/8 dark:bg-orange-500/10 border-l-4 border-orange-400 dark:border-orange-500",
    iconClass: "text-orange-500 dark:text-orange-400",
  },
};

/** Detect data-callout attribute on a div and render as typed callout */
const CalloutDiv = ({
  "data-callout": calloutType,
  children,
}: {
  "data-callout"?: string;
  children?: React.ReactNode;
}) => {
  if (calloutType && CALLOUT_CONFIG[calloutType]) {
    const cfg = CALLOUT_CONFIG[calloutType];
    const Icon = cfg.icon;
    return (
      <div
        className={`my-5 rounded-r-xl px-4 py-4 ${cfg.className}`}
        style={{ position: "relative" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`size-4 shrink-0 ${cfg.iconClass}`} />
          <span
            className={`text-xs font-bold uppercase tracking-widest ${cfg.iconClass}`}
          >
            {cfg.label}
          </span>
        </div>
        <div className="text-sm text-foreground/80 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
          {children}
        </div>
      </div>
    );
  }
  // Plain div (e.g. flowchart-container) — pass through
  return <div data-callout={calloutType}>{children}</div>;
};

// Custom renderers
const getMarkdownComponents = (bookSlug: string): Components => ({
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
    <p className="text-base text-muted-foreground leading-relaxed mb-4 last:mb-0">
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
    <blockquote className="my-4 border-l-4 border-primary/40 bg-primary/5 dark:bg-primary/8 rounded-r-xl px-4 py-3 text-sm text-foreground/80 [&>p]:mb-1 [&>p:last-child]:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <pre className="rounded-xl bg-muted/60 dark:bg-muted/30 border border-border/40 px-5 py-4 overflow-x-auto text-sm font-mono text-foreground/90">
          <code>{children}</code>
        </pre>
      );
    }
    // Inline code — detect if it looks like a search query
    const text = String(children).trim();
    const isQuery =
      /^(site:|intitle:|inurl:|filetype:|ext:|cache:|related:|info:|intext:|allintitle:)/.test(
        text
      );
    if (isQuery) {
      return (
        <code className="px-2 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-muted text-foreground/90 text-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <div className="my-4">{children}</div>,
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
  th: ({ children, align }) => (
    <th
      className={`px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap ${align === "center"
        ? "text-center"
        : align === "right"
          ? "text-right"
          : "text-left"
        }`}
    >
      {children}
    </th>
  ),
  td: ({ children, align }) => (
    <td
      className={`px-4 py-3 text-sm text-muted-foreground ${align === "center"
        ? "text-center"
        : align === "right"
          ? "text-right"
          : "text-left"
        }`}
    >
      {children}
    </td>
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
  img: ({ src, alt, ...props }) => {
    let resolvedSrc = src;
    if (src && src.startsWith("media/")) {
      resolvedSrc = `${api.defaults.baseURL}/books/${bookSlug}/${src}`;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={alt}
        className="my-6 rounded-xl border border-border/40 shadow-sm max-w-full"
        {...props}
      />
    );
  },
  // Handle div elements (callouts, flowcharts)
  div: (props) => {
    const { "data-callout": calloutType, className, children, ...rest } = props as {
      "data-callout"?: string;
      className?: string;
      children?: React.ReactNode;
      [key: string]: unknown;
    };

    if (calloutType) {
      return <CalloutDiv data-callout={calloutType}>{children}</CalloutDiv>;
    }

    if (className === "flowchart-container") {
      return (
        <div className="my-8 flex flex-col items-center gap-0 py-6 px-4 rounded-2xl bg-muted/30 dark:bg-muted/20 border border-border/30">
          {children}
        </div>
      );
    }

    if (className?.includes("flowchart-step")) {
      const isAccent = className.includes("--accent");
      return (
        <div
          className={`px-6 py-3 rounded-xl text-sm font-medium text-center max-w-sm w-full ${isAccent
            ? "bg-primary/15 border border-primary/30 text-primary font-semibold"
            : "bg-background border border-border/50 text-foreground/80"
            }`}
        >
          {children}
        </div>
      );
    }

    if (className === "flowchart-arrow") {
      return (
        <div className="text-primary/50 text-lg leading-none py-1 select-none">
          ▼
        </div>
      );
    }

    return <div className={className} {...rest}>{children}</div>;
  },
});

/** Reading progress bar component */
function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5"
      style={{ background: "transparent" }}
    >
      <div
        className="h-full transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, var(--gradient-start), var(--gradient-mid), var(--gradient-end))",
        }}
      />
    </div>
  );
}

export default function ChapterReaderPage({
  params,
}: {
  params: { slug: string; chapter: string };
}) {
  const [data, setData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const articleRef = useRef<HTMLElement>(null);

  const chapterIndex = Number(params.chapter);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    // Scroll to top on chapter change
    window.scrollTo({ top: 0, behavior: "smooth" });

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
          setError(
            "This chapter requires a purchase to access. Unlock the full book to continue reading."
          );
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

    return () => {
      active = false;
    };
  }, [params.slug, params.chapter]);

  const hasPrev = chapterIndex > 1;
  const hasNext = data ? chapterIndex < data.totalChapters : false;
  const readingTime = data ? estimateReadingTime(data.content) : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ReadingProgressBar />
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8 animate-fade-in-up">
          <Link href="/books" className="hover:text-foreground transition-colors">
            Books
          </Link>
          <span className="opacity-40">/</span>
          <Link
            href={`/books/${params.slug}`}
            className="hover:text-foreground transition-colors truncate max-w-[200px]"
          >
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
                <Skeleton
                  key={i}
                  className="h-4"
                  style={{ width: `${55 + (i % 4) * 12}%` }}
                />
              ))}
            </div>
          </div>
        ) : data ? (
          <article ref={articleRef} className="animate-fade-in-up">
            {/* Chapter header */}
            <div className="flex flex-col gap-6 mb-10">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="holographic">
                  <BookOpen className="mr-1 size-3" />
                  Chapter {data.chapter.index} of {data.totalChapters}
                </Badge>
                {data.chapter.isFree && (
                  <Badge variant="success">Free preview</Badge>
                )}
                {readingTime && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {readingTime} min read
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl font-[family-name:var(--font-space-grotesk)]">
                <span className="gradient-text">{data.chapter.title}</span>
              </h1>
            </div>

            <Separator className="mb-10" />

            {/* Markdown content */}
            <div
              className="prose-reader"
              style={{ "--reader-max": "100%" } as React.CSSProperties}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={getMarkdownComponents(data.bookSlug)}
              >
                {data.content}
              </ReactMarkdown>
            </div>

            {/* Chapter navigation */}
            <Separator className="my-10" />
            <div className="flex items-center justify-between">
              {hasPrev ? (
                <Button asChild variant="outline">
                  <Link
                    href={`/books/${data.bookSlug}/read/${chapterIndex - 1}`}
                  >
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
                  <Link
                    href={`/books/${data.bookSlug}/read/${chapterIndex + 1}`}
                  >
                    Next chapter
                    <ArrowRight className="ml-2 size-4" />
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
