"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, BookOpen, ShieldCheck, Sparkles, Zap, Award, Globe } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatUsd, formatUsdFromBdt, GOOGLE_DORKS_BASE_PRICE_USD } from "@/lib/currency";
import AuroraBackground from "@/components/aurora-background";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type ChapterMeta = {
  index: number;
  title: string;
  isFree: boolean;
};

type Book = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | string;
  chapterMetadata?: ChapterMeta[];
};

const formatPrice = (value: number | string) => {
  return formatUsdFromBdt(value);
};

export default function Home() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get("/books", { params: { page: 1, limit: 3 } })
      .then((res) => {
        if (!active) return;
        const payload = res.data.data as { books: Book[] };
        setBooks(payload.books || []);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load featured books right now.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredBooks: Array<Book | null> = loading
    ? Array.from({ length: 3 }).map(() => null)
    : books;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* ═══ Hero Section ═══ */}
        <section className="relative overflow-hidden">
          <AuroraBackground />
          <div className="absolute inset-0 -z-10 cyber-grid opacity-30" />

          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-28">
            <div className="space-y-6 animate-fade-in-up">
              <Badge variant="holographic" className="px-3 py-1 text-xs uppercase tracking-[0.2em]">
                <Sparkles className="mr-1.5 size-3" />
                Premium e-book library
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl font-[family-name:var(--font-space-grotesk)]">
                <span className="gradient-text">Master real-world skills</span>
                <br />
                <span className="text-foreground">with verified credentials.</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                MultiHAT Academy delivers focused e-books, practical quizzes, and certificates that can be verified anywhere.
                Build a track record you can share with employers and clients.
              </p>
              <div className="flex flex-wrap gap-3 animate-fade-in-up delay-200">
                <Button asChild size="lg">
                  <Link href="/books">
                    Explore books <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
                {user ? (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/dashboard">Open dashboard</Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="lg">
                    <Link href="/auth/register">Create account</Link>
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground animate-fade-in-up delay-300">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 dark:bg-primary/15">
                    <ShieldCheck className="size-3.5 text-primary" />
                  </div>
                  Certificate verification
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 dark:bg-primary/15">
                    <BadgeCheck className="size-3.5 text-primary" />
                  </div>
                  Practical quizzes
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-full bg-primary/10 dark:bg-primary/15">
                    <Sparkles className="size-3.5 text-primary" />
                  </div>
                  Premium content
                </div>
              </div>
            </div>

            <Card className="border-0 gradient-border hover-lift animate-fade-in-up delay-300 bg-gradient-to-br from-background via-background to-primary/5 dark:from-card dark:via-card dark:to-[rgba(var(--glow-primary),0.05)]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="size-4 text-primary" />
                  What you get
                </CardTitle>
                <CardDescription>Everything you need to certify your learning.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { text: "Focused e-books across cybersecurity, programming, and more", icon: BookOpen },
                  { text: "Completion quizzes and instant results", icon: Award },
                  { text: "Wallet and referral rewards for consistent learning", icon: Globe },
                ].map((item) => (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="mt-0.5 flex items-center justify-center size-5 rounded-full bg-primary/10 dark:bg-primary/15 shrink-0">
                      <item.icon className="size-3 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Starting from</p>
                  <p className="text-lg font-semibold gradient-text-static">{formatUsd(GOOGLE_DORKS_BASE_PRICE_USD)}</p>
                </div>
                <Button asChild variant="secondary">
                  <Link href="/books">Browse catalog</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* ═══ Featured Books ═══ */}
        <section className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex items-center justify-between gap-6 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-semibold font-[family-name:var(--font-space-grotesk)]">
                Featured books
              </h2>
              <p className="text-sm text-muted-foreground">Start with the best curated titles from MultiHAT Academy.</p>
            </div>
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/books">View all</Link>
            </Button>
          </div>
          <Separator className="my-6" />

          {error ? (
            <Card>
              <CardHeader>
                <CardTitle>Featured books unavailable</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {featuredBooks.map((book, index) => (
                <Card key={book?.id ?? index} className={`h-full hover-lift animate-fade-in-up delay-${(index + 1) * 100}`}>
                  <CardHeader>
                    {book ? (
                      <>
                        <CardTitle className="text-lg">{book.title}</CardTitle>
                        <CardDescription className="line-clamp-3">
                          {book.description}
                        </CardDescription>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    {book ? (
                      <>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <BookOpen className="size-4" />
                          {book.chapterMetadata?.length ?? 0} chapters
                        </div>
                        <Badge>{formatPrice(book.price)}</Badge>
                      </>
                    ) : (
                      <>
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16" />
                      </>
                    )}
                  </CardContent>
                  <CardFooter className="justify-between">
                    {book ? (
                      <>
                        <Button asChild size="sm" variant="secondary">
                          <Link href="/books">View catalog</Link>
                        </Button>
                        <Button asChild size="sm">
                          <Link href={`/books/${book.slug}`}>See details</Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-8 w-24" />
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ═══ Features Section ═══ */}
        <section className="mx-auto max-w-7xl px-6 pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Verified certificates",
                description: "Share proof of completion with a public verification link.",
                icon: ShieldCheck,
                glowClass: "dark:hover:shadow-[0_0_30px_rgba(var(--glow-primary),0.08)]",
              },
              {
                title: "Built for practice",
                description: "Focused quizzes validate learning and reveal gaps fast.",
                icon: Sparkles,
                glowClass: "dark:hover:shadow-[0_0_30px_rgba(var(--glow-accent),0.08)]",
              },
              {
                title: "Career focused",
                description: "Showcase your progress with purchase history and results.",
                icon: BadgeCheck,
                glowClass: "dark:hover:shadow-[0_0_30px_rgba(var(--glow-success),0.08)]",
              },
            ].map((feature, index) => (
              <Card key={feature.title} className={`hover-lift animate-fade-in-up delay-${(index + 1) * 100} ${feature.glowClass}`}>
                <CardHeader>
                  <div className="mb-2 flex items-center justify-center size-10 rounded-xl bg-primary/10 dark:bg-primary/10">
                    <feature.icon className="size-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
