"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, BookOpen, ShieldCheck, Sparkles } from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
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
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "BDT 0.00";
  return `BDT ${amount.toFixed(2)}`;
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
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 cyber-grid opacity-40" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/25 via-transparent to-transparent" />

          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="px-3 py-1 text-xs uppercase tracking-[0.2em]">
                Premium cybersecurity library
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl font-[family-name:var(--font-space-grotesk)]">
                Learn OSINT and cybersecurity with verified credentials.
              </h1>
              <p className="text-lg text-muted-foreground">
                MultiHAT Academy delivers focused e-books, practical quizzes, and certificates that can be verified anywhere.
                Build a track record you can share with employers and clients.
              </p>
              <div className="flex flex-wrap gap-3">
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
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Certificate verification
                </div>
                <div className="flex items-center gap-2">
                  <BadgeCheck className="size-4 text-primary" />
                  Practical quizzes
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  Premium content
                </div>
              </div>
            </div>

            <Card className="border border-primary/20 bg-gradient-to-br from-background via-background to-primary/10 shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">What you get</CardTitle>
                <CardDescription>Everything you need to certify your learning.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  "OSINT focused e-books with free previews",
                  "Completion quizzes and instant results",
                  "Wallet and referral rewards for consistent learning",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-sm text-muted-foreground">{item}</p>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Starting from</p>
                  <p className="text-lg font-semibold">BDT 10.00</p>
                </div>
                <Button asChild variant="secondary">
                  <Link href="/books">Browse catalog</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex items-center justify-between gap-6">
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
                <Card key={book?.id ?? index} className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">{book ? book.title : "Loading title"}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {book ? book.description : "Loading description"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="size-4" />
                      {book?.chapterMetadata?.length ?? 0} chapters
                    </div>
                    <Badge>{book ? formatPrice(book.price) : "BDT --"}</Badge>
                  </CardContent>
                  <CardFooter className="justify-between">
                    <Button asChild size="sm" variant="secondary">
                      <Link href="/books">View catalog</Link>
                    </Button>
                    {book ? (
                      <Button asChild size="sm">
                        <Link href={`/books/${book.slug}`}>See details</Link>
                      </Button>
                    ) : (
                      <Button size="sm" disabled>
                        Loading
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Verified certificates",
                description: "Share proof of completion with a public verification link.",
                icon: ShieldCheck,
              },
              {
                title: "Built for practice",
                description: "Focused quizzes validate learning and reveal gaps fast.",
                icon: Sparkles,
              },
              {
                title: "Career focused",
                description: "Showcase your progress with purchase history and results.",
                icon: BadgeCheck,
              },
            ].map((feature) => (
              <Card key={feature.title} className="bg-muted/30">
                <CardHeader>
                  <feature.icon className="size-6 text-primary" />
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
