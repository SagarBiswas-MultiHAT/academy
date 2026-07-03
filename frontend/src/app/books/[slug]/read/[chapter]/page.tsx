"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  ChevronLeft,
  Copy,
  Check,
  Clock,
  Hash,
  List,
  Lock,
  AlertCircle,
  Info,
  Lightbulb,
  ShieldAlert,
  TriangleAlert,
  X,
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

type TocItem = {
  id: string;
  text: string;
  level: 1 | 2 | 3;
};

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function extractToc(content: string): TocItem[] {
  const lines = content.split("\n");
  const toc: TocItem[] = [];
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      const level = match[1].length as 1 | 2 | 3;
      const text = match[2].trim();
      toc.push({ id: slugify(text), text, level });
    }
  }
  return toc;
}

const CALLOUT_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; className: string; iconClass: string }
> = {
  note: {
    icon: Info,
    label: "Note",
    className: "bg-sky-500/8 dark:bg-sky-500/10 border-l-4 border-sky-400 dark:border-sky-500",
    iconClass: "text-sky-500 dark:text-sky-400",
  },
  important: {
    icon: AlertCircle,
    label: "Important",
    className: "bg-amber-500/8 dark:bg-amber-500/10 border-l-4 border-amber-400 dark:border-amber-500",
    iconClass: "text-amber-500 dark:text-amber-400",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    className: "bg-emerald-500/8 dark:bg-emerald-500/10 border-l-4 border-emerald-400 dark:border-emerald-500",
    iconClass: "text-emerald-500 dark:text-emerald-400",
  },
  critical: {
    icon: ShieldAlert,
    label: "Critical",
    className: "bg-red-500/8 dark:bg-red-500/10 border-l-4 border-red-500 dark:border-red-500",
    iconClass: "text-red-500 dark:text-red-400",
  },
  warning: {
    icon: TriangleAlert,
    label: "Warning",
    className: "bg-orange-500/8 dark:bg-orange-500/10 border-l-4 border-orange-400 dark:border-orange-500",
    iconClass: "text-orange-500 dark:text-orange-400",
  },
};

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
      <div className={`my-5 rounded-r-xl px-4 py-4 ${cfg.className}`} style={{ position: "relative" }}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`size-4 shrink-0 ${cfg.iconClass}`} />
          <span className={`text-xs font-bold uppercase tracking-widest ${cfg.iconClass}`}>
            {cfg.label}
          </span>
        </div>
        <div className="text-sm text-foreground/80 leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
          {children}
        </div>
      </div>
    );
  }
  return <div data-callout={calloutType}>{children}</div>;
};

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="group relative my-4 rounded-xl border border-border/40 bg-muted/60 dark:bg-muted/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-muted/40 dark:bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400/60" />
            <span className="size-2.5 rounded-full bg-amber-400/60" />
            <span className="size-2.5 rounded-full bg-emerald-400/60" />
          </div>
          {language && language !== "text" && (
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              {language}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50 opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              <span className="text-emerald-500">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="px-5 py-4 overflow-x-auto text-sm font-mono text-foreground/90 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const getMarkdownComponents = (bookSlug: string): Components => ({
  h1: ({ children }) => {
    const id = slugify(String(children ?? ""));
    return (
      <h2 id={id} className="group relative text-2xl font-bold mt-10 mb-4 font-[family-name:var(--font-space-grotesk)] tracking-tight text-foreground border-b border-border/40 pb-2 scroll-mt-20">
        <a href={`#${id}`} className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-primary/50 hover:text-primary" aria-label={`Link to section: ${children}`}>
          <Hash className="size-4" />
        </a>
        {children}
      </h2>
    );
  },
  h2: ({ children }) => {
    const id = slugify(String(children ?? ""));
    return (
      <h3 id={id} className="group relative text-xl font-semibold mt-8 mb-3 font-[family-name:var(--font-space-grotesk)] tracking-tight text-foreground scroll-mt-20">
        <a href={`#${id}`} className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-primary/50 hover:text-primary" aria-label={`Link to section: ${children}`}>
          <Hash className="size-3.5" />
        </a>
        {children}
      </h3>
    );
  },
  h3: ({ children }) => {
    const id = slugify(String(children ?? ""));
    return (
      <h4 id={id} className="group relative text-lg font-semibold mt-6 mb-2 text-foreground/90 scroll-mt-20">
        <a href={`#${id}`} className="absolute -left-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-primary/50 hover:text-primary" aria-label={`Link to section: ${children}`}>
          <Hash className="size-3" />
        </a>
        {children}
      </h4>
    );
  },
  h4: ({ children }) => {
    const text = String(children ?? "").toLowerCase();
    const isBeginner = text.includes("beginner") || text.includes("basic");
    const isIntermediate = text.includes("intermediate");
    const isAdvanced = text.includes("advanced") || text.includes("expert");
    const isCountry = text.includes("bangladesh") || text.includes("specific");
    const isSecurity = text.includes("security") || text.includes("audit");
    const style = isSecurity
      ? "border-rose-500/40 text-rose-600 dark:text-rose-400 bg-rose-500/5"
      : isBeginner
        ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
        : isIntermediate
          ? "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/5"
          : isAdvanced
            ? "border-violet-500/40 text-violet-600 dark:text-violet-400 bg-violet-500/5"
            : isCountry
              ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5"
              : "border-primary/40 text-primary bg-primary/5";
    return (
      <div className={`flex items-center gap-2 mt-6 mb-3 px-3 py-1.5 rounded-lg border w-fit ${style}`}>
        <span className="size-1.5 rounded-full bg-current opacity-70 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-widest">{children}</span>
      </div>
    );
  },
  p: ({ children }) => (
    <p className="text-base text-muted-foreground leading-relaxed mb-4 last:mb-0">{children}</p>
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
    const lang = className?.replace("language-", "");
    if (isBlock) {
      return <CodeBlock code={String(children).replace(/\n$/, "")} language={lang} />;
    }
    const text = String(children).trim();
    const isQuery =
      /^(site:|intitle:|inurl:|filetype:|ext:|cache:|related:|info:|intext:|allintitle:|allinanchor:|inanchor:|after:|before:|\?[a-zA-Z0-9_]+=)/.test(text) ||
      / OR | AND /.test(text) || / \| /.test(text) ||
      /\b(site:|intitle:|inurl:|filetype:|ext:|cache:|related:|info:|intext:|allintitle:|allinanchor:|inanchor:)/.test(text) ||
      /^"[^"]{2,}/.test(text);
    if (isQuery) {
      return (
        <code className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[0.85em] font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-muted text-foreground/90 text-[0.85em] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <div className="my-4">{children}</div>,
  ul: ({ children }) => (
    <ul className="my-3 ml-6 space-y-1 list-disc marker:text-primary/60">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 ml-6 space-y-1 list-decimal marker:text-primary/60">{children}</ol>
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
    <thead className="bg-primary/5 dark:bg-primary/8">{children}</thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border/30 [&>tr]:transition-colors [&>tr:hover]:bg-muted/30">{children}</tbody>
  ),
  th: ({ children, align }) => (
    <th className={`px-4 py-3 text-xs font-semibold text-primary uppercase tracking-wider whitespace-nowrap ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  ),
  td: ({ children, align }) => (
    <td className={`px-4 py-3 text-sm text-muted-foreground ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </td>
  ),
  hr: () => <Separator className="my-8" />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 decoration-primary/30 hover:decoration-primary transition-colors">
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }) => {
    let resolvedSrc = src;
    if (src && typeof src === "string" && src.startsWith("media/")) {
      resolvedSrc = `${api.defaults.baseURL}/books/${bookSlug}/${src}`;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={resolvedSrc} alt={alt} className="my-6 block mx-auto rounded-xl border border-border/40 shadow-sm max-w-full" {...props} />
    );
  },
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
        <div className={`px-6 py-3 rounded-xl text-sm font-medium text-center max-w-sm w-full ${isAccent ? "bg-primary/15 border border-primary/30 text-primary font-semibold" : "bg-background border border-border/50 text-foreground/80"}`}>
          {children}
        </div>
      );
    }
    if (className === "flowchart-arrow") {
      return (
        <div className="text-primary/50 text-lg leading-none py-1 select-none">&#9660;</div>
      );
    }
    return <div className={className} {...rest}>{children}</div>;
  },
});

function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", updateProgress, { passive: true });
    return () => window.removeEventListener("scroll", updateProgress);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5" style={{ background: "transparent" }}>
      <div
        className="h-full transition-all duration-150 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, var(--gradient-start), var(--gradient-mid), var(--gradient-end))",
          boxShadow: "0 0 8px rgba(var(--glow-primary), 0.4)",
        }}
      />
    </div>
  );
}

function TableOfContents({ toc, activeId }: { toc: TocItem[]; activeId: string }) {
  const [open, setOpen] = useState(false);

  if (toc.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle table of contents"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center size-11 rounded-full border border-border/40 transition-all duration-300 hover:scale-105"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: open
            ? "0 0 20px rgba(var(--glow-primary), 0.2), 0 4px 20px rgba(0,0,0,0.15)"
            : "0 4px 20px rgba(0,0,0,0.1)",
        }}
      >
        {open ? <X className="size-4 text-foreground/70" /> : <List className="size-4 text-foreground/70" />}
      </button>

      <div
        className={`fixed bottom-20 right-6 z-50 w-72 rounded-2xl border border-border/40 shadow-xl transition-all duration-300 ${open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"}`}
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
          <List className="size-3.5 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-foreground/70">Contents</span>
        </div>
        <nav className="max-h-72 overflow-y-auto py-2 px-2">
          {toc.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={() => setOpen(false)}
              className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 ${
                item.level === 1 ? "font-medium" : item.level === 2 ? "ml-3 text-[0.82rem]" : "ml-6 text-[0.78rem]"
              } ${activeId === item.id ? "bg-muted/50 text-foreground" : "text-foreground/70 hover:bg-muted/50 hover:text-foreground"}`}
            >
              {item.level > 1 && (
                <span className={`mt-[5px] shrink-0 ${item.level === 2 ? "size-1.5" : "size-1"} rounded-full ${activeId === item.id ? "bg-foreground/70" : "bg-muted-foreground/40"}`} />
              )}
              <span className="leading-snug">{item.text}</span>
            </a>
          ))}
        </nav>
      </div>
    </>
  );
}

function ChapterNavCard({
  direction,
  href,
  label,
  eyebrow,
  icon: Icon,
}: {
  direction: "prev" | "next";
  href: string;
  label: string;
  eyebrow?: string;
  icon?: React.ElementType;
}) {
  const isPrev = direction === "prev";
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-5 py-4 rounded-xl border border-border/40 bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${isPrev ? "flex-row" : "flex-row-reverse text-right"}`}
    >
      <div className={`flex items-center justify-center size-8 rounded-lg bg-primary/10 shrink-0 transition-transform duration-200 ${isPrev ? "group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`}>
        {isPrev ? <ArrowLeft className="size-4 text-primary" /> : <ArrowRight className="size-4 text-primary" />}
      </div>
      <div className="min-w-0">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">
          {eyebrow ?? (isPrev ? "Previous" : "Next")}
        </p>
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground leading-tight truncate">
          {Icon && <Icon className="size-3.5 text-primary" />}
          {label}
        </p>
      </div>
    </Link>
  );
}

export default function ChapterReaderPage({
  params: paramsPromise,
}: {
  params: Promise<{ slug: string; chapter: string }>;
}) {
  const params = use(paramsPromise);
  const [data, setData] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string>("");
  const articleRef = useRef<HTMLElement>(null);

  const chapterIndex = Number(params.chapter);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
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

  useEffect(() => {
    if (!data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      { rootMargin: "-20% 0% -70% 0%", threshold: 0 }
    );
    const headings = articleRef.current?.querySelectorAll("h2[id], h3[id], h4[id]");
    headings?.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [data]);

  const hasPrev = chapterIndex > 1;
  const hasNext = data ? chapterIndex < data.totalChapters : false;
  const readingTime = data ? estimateReadingTime(data.content) : null;
  const toc = data ? extractToc(data.content) : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ReadingProgressBar />
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8 animate-fade-in-up">
          <Link href="/books" className="hover:text-foreground transition-colors">Books</Link>
          <span className="opacity-40">/</span>
          <Link href={`/books/${params.slug}`} className="hover:text-foreground transition-colors truncate max-w-[200px]">
            {data?.bookTitle ?? "Book"}
          </Link>
          <span className="opacity-40">/</span>
          <span className="text-foreground font-medium">Chapter {chapterIndex}</span>
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
            <div className="flex gap-3 px-6 pb-6">
              <Button asChild variant="secondary">
                <Link href={`/books/${params.slug}`}>
                  <ChevronLeft className="mr-1 size-4" />Back to book
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/books/${params.slug}`}>Unlock full book</Link>
              </Button>
            </div>
          </Card>
        ) : loading ? (
          <div className="space-y-6 animate-fade-in-up max-w-3xl">
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
          <article ref={articleRef} className="animate-fade-in-up">
            {/* Chapter Header Card */}
            <div className="mb-10 p-6 sm:p-8 rounded-2xl border border-border/40 bg-card/50 relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(ellipse at 0% 0%, rgba(var(--glow-primary), 0.06) 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(var(--glow-accent), 0.05) 0%, transparent 60%)",
                }}
              />
              <div className="relative flex flex-col gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="holographic">
                    <BookOpen className="mr-1 size-3" />
                    Chapter {data.chapter.index} of {data.totalChapters}
                  </Badge>
                  {data.chapter.isFree && <Badge variant="success">Free preview</Badge>}
                  {readingTime && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      {readingTime} min read
                    </span>
                  )}
                </div>

                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl font-[family-name:var(--font-space-grotesk)]">
                  <span className="gradient-text">{data.chapter.title}</span>
                </h1>

                <Link
                  href={`/books/${data.bookSlug}`}
                  className="self-start flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors group"
                >
                  <ChevronLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                  Back to {data.bookTitle}
                </Link>
              </div>
            </div>

            <Separator className="mb-8" />

            {/* Prose Content */}
            <div>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={getMarkdownComponents(data.bookSlug)}
              >
                {data.content}
              </ReactMarkdown>
            </div>

            {/* Bottom Navigation */}
            <Separator className="my-10" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hasPrev ? (
                <ChapterNavCard direction="prev" href={`/books/${data.bookSlug}/read/${chapterIndex - 1}`} label={`Chapter ${chapterIndex - 1}`} />
              ) : (
                <ChapterNavCard direction="prev" href={`/books/${data.bookSlug}`} label="Back to book" />
              )}
              {hasNext ? (
                <ChapterNavCard direction="next" href={`/books/${data.bookSlug}/read/${chapterIndex + 1}`} label={`Chapter ${chapterIndex + 1}`} />
              ) : (
                <ChapterNavCard
                  direction="next"
                  href={`/quiz/${data.bookSlug}`}
                  label="Take certification quiz"
                  eyebrow="Certification"
                  icon={Award}
                />
              )}
            </div>
          </article>
        ) : null}
      </main>

      {data && <TableOfContents toc={toc} activeId={activeId} />}

      <SiteFooter />
    </div>
  );
}
