"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { ArrowRight, Award, BookOpen, Lock, ShieldCheck, Sparkles, Crown } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatUsd, formatUsdFromBdt, GOOGLE_DORKS_PRINTABLE_ADDON_USD } from "@/lib/currency";
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
  chapterMetadata: ChapterMeta[];
  hasPremiumPdf?: boolean;
  requiresGatewayPayment?: boolean;
  isOwned?: boolean;
  ownsPdf?: boolean;
};

const formatPrice = (value: number | string) => {
  return formatUsdFromBdt(value);
};

export default function BookDetailPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = use(paramsPromise);
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get(`/books/${params.slug}`)
      .then((res) => {
        if (!active) return;
        setBook(res.data.data as Book);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load this book right now.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.slug]);

  const { freeChapters, paidChapters } = useMemo(() => {
    const chapters = book?.chapterMetadata ?? [];
    return {
      freeChapters: chapters.filter((chapter) => chapter.isFree),
      paidChapters: chapters.filter((chapter) => !chapter.isFree),
    };
  }, [book]);

  const isLoading = loading && !book;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-12">
        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Book unavailable</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
            <section className="space-y-6 animate-fade-in-up">
              <div className="space-y-3">
                <Badge variant="holographic">
                  <BookOpen className="mr-1 size-3" />
                  E-Book
                </Badge>
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl font-[family-name:var(--font-space-grotesk)]">
                      <span className="gradient-text">{book?.title}</span>
                    </h1>
                    <p className="text-muted-foreground">
                      {book?.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {book?.hasPremiumPdf && <Badge variant="secondary">Printable PDF add-on: {formatUsd(GOOGLE_DORKS_PRINTABLE_ADDON_USD)}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <BookOpen className="size-4" />
                      {book?.chapterMetadata?.length ?? 0} chapters
                    </div>
                  </>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Free chapters</h2>
                  <Badge variant="success">Preview available</Badge>
                </div>
                <div className="grid gap-3">
                  {isLoading
                    ? Array.from({ length: 3 }).map((_, index) => (
                        <Card key={`free-skeleton-${index}`} size="sm">
                          <CardContent className="flex items-center justify-between">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-40" />
                          </CardContent>
                        </Card>
                      ))
                    : freeChapters.map((chapter) => (
                        <Link key={chapter.index} href={`/books/${params.slug}/read/${chapter.index}`}>
                          <Card size="sm" className="hover-lift cursor-pointer border-l-2 border-l-primary/40 dark:border-l-[rgba(var(--glow-primary),0.4)] transition-all hover:border-l-primary">
                            <CardContent className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">Chapter {chapter.index}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{chapter.title}</p>
                                <ArrowRight className="size-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                  {freeChapters.length === 0 && !loading && (
                    <p className="text-sm text-muted-foreground">No free preview chapters available.</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Premium chapters</h2>
                  <Badge variant={book?.isOwned ? "success" : "warning"}>
                    {book?.isOwned ? <BookOpen className="mr-1 size-3" /> : <Lock className="mr-1 size-3" />}
                    {book?.isOwned ? "Unlocked" : "Locked"}
                  </Badge>
                </div>
                <div className="relative">
                  <div className={`grid gap-3 ${!book?.isOwned ? "blur-sm" : ""}`}>
                    {isLoading
                      ? Array.from({ length: 3 }).map((_, index) => (
                          <Card key={`paid-skeleton-${index}`} size="sm">
                            <CardContent className="flex items-center justify-between">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-40" />
                            </CardContent>
                          </Card>
                        ))
                      : paidChapters.map((chapter) => (
                          book?.isOwned ? (
                            <Link key={chapter.index} href={`/books/${params.slug}/read/${chapter.index}`}>
                              <Card size="sm" className="hover-lift cursor-pointer border-l-2 border-l-primary/40 dark:border-l-[rgba(var(--glow-primary),0.4)] transition-all hover:border-l-primary">
                                <CardContent className="flex items-center justify-between">
                                  <p className="text-sm text-muted-foreground">Chapter {chapter.index}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{chapter.title}</p>
                                    <ArrowRight className="size-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ) : (
                            <Card key={chapter.index} size="sm">
                              <CardContent className="flex items-center justify-between">
                                <p className="text-sm">Chapter {chapter.index}</p>
                                <p className="text-sm font-medium">{chapter.title}</p>
                              </CardContent>
                            </Card>
                          )
                        ))}
                    {paidChapters.length === 0 && !loading && (
                      <Card size="sm">
                        <CardContent className="text-sm text-muted-foreground">
                          No premium chapters listed yet.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {!book?.isOwned && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full border border-primary/20 bg-background/90 backdrop-blur-md px-4 py-2 text-sm font-medium shadow-lg dark:bg-card/90 dark:border-[rgba(var(--glow-primary),0.2)] dark:shadow-[0_0_20px_rgba(var(--glow-primary),0.1)]">
                        <Lock className="inline mr-1.5 size-3.5" />
                        Unlock to reveal full chapters
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <aside className="space-y-6 animate-fade-in-up delay-200">
              <Card className={`gradient-border dark:animate-glow-pulse ${book?.isOwned ? 'border-primary/50 dark:border-[rgba(var(--glow-primary),0.5)]' : ''}`}>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {book?.isOwned ? (
                      <>
                        <ShieldCheck className="size-5 text-primary" />
                        You own this book
                      </>
                    ) : (
                      <>
                        <Crown className="size-5 text-primary" />
                        Get full access
                      </>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {book?.isOwned 
                      ? "You have full access to all chapters and features."
                      : `Includes certificate, quiz access, and the ${formatPrice(book?.price ?? 0)} web edition. Printable PDF is available separately as a ${formatUsd(GOOGLE_DORKS_PRINTABLE_ADDON_USD)} add-on.`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-8 w-32" />
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  ) : (
                    <>
                      {!book?.isOwned && (
                        <div className="text-3xl font-semibold gradient-text-static">
                          {book ? formatPrice(book.price) : "$ --"}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-center size-6 rounded-full bg-primary/10">
                          <ShieldCheck className="size-3.5 text-primary" />
                        </div>
                        Verified certificate included
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-center size-6 rounded-full bg-primary/10">
                          {book?.isOwned ? <BookOpen className="size-3.5 text-primary" /> : <Lock className="size-3.5 text-primary" />}
                        </div>
                        Lifetime access {book?.isOwned ? "granted" : "after purchase"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center justify-center size-6 rounded-full bg-primary/10">
                          <Sparkles className="size-3.5 text-primary" />
                        </div>
                        Quiz + certification flow
                      </div>
                      {book?.hasPremiumPdf && !book?.isOwned && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center justify-center size-6 rounded-full bg-primary/10">
                            <BookOpen className="size-3.5 text-primary" />
                          </div>
                          Printable PDF add-on available separately for {formatUsd(GOOGLE_DORKS_PRINTABLE_ADDON_USD)}
                        </div>
                      )}
                      {book?.hasPremiumPdf && book?.isOwned && book?.ownsPdf && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center justify-center size-6 rounded-full bg-primary/10">
                            <BookOpen className="size-3.5 text-primary" />
                          </div>
                          Printable PDF included
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  {book ? (
                    book.isOwned ? (
                      <>
                        <Button asChild size="lg" className="w-full">
                          <Link href={`/quiz/${book.slug}`}>
                            <Award className="mr-2 size-4" />
                            Take certification quiz
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="w-full">
                          <Link href={`/books/${book.slug}/read/1`}>
                            <BookOpen className="mr-2 size-4" />
                            Continue reading
                          </Link>
                        </Button>
                      </>
                    ) : (
                      <Button asChild size="lg" className="w-full">
                        <Link href={`/checkout/${book.id}`}>Unlock full book</Link>
                      </Button>
                    )
                  ) : (
                    <Skeleton className="h-10 w-full" />
                  )}
                  {!user && (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/auth/login">Sign in to purchase</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>

              {book?.isOwned && book?.hasPremiumPdf && !book?.ownsPdf && (
                <Card className="border-primary/20 bg-primary/5 animate-fade-in-up delay-300">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      Printable PDF Add-on
                    </CardTitle>
                    <CardDescription>
                      Upgrade your access with a high-quality, printable PDF version of the handbook for offline reading.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold text-primary">
                      {formatUsd(GOOGLE_DORKS_PRINTABLE_ADDON_USD)}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link href={`/checkout/${book.id}?addon=pdf`}>Unlock Printable PDF</Link>
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
