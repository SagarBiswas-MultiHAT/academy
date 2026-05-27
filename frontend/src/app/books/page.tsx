"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";

import api from "@/lib/api";
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
import { Input } from "@/components/ui/input";
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
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "BDT 0.00";
  return `BDT ${amount.toFixed(2)}`;
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    setLoading(true);
    api
      .get("/books", { params: { page: 1, limit: 24 } })
      .then((res) => {
        if (!active) return;
        const payload = res.data.data as { books: Book[] };
        setBooks(payload.books || []);
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load the catalog right now.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    if (!query.trim()) return books;
    const term = query.toLowerCase();
    return books.filter((book) => book.title.toLowerCase().includes(term));
  }, [books, query]);

  const displayBooks: Array<Book | null> = loading
    ? Array.from({ length: 6 }).map(() => null)
    : filteredBooks;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">Book catalog</h1>
            <p className="text-muted-foreground">
              Browse e-books across cybersecurity, programming, and more — with free previews and certificate-ready quizzes.
            </p>
          </div>
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search books"
              className="pl-9"
            />
          </div>
        </div>

        <Separator className="my-6" />

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Catalog unavailable</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayBooks.map((book, index) => (
              <Card key={book?.id ?? index} className="h-full">
                <CardHeader>
                  {book ? (
                    <>
                      <CardTitle>{book.title}</CardTitle>
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
                      <Button asChild variant="secondary" size="sm">
                        <Link href="/auth/login">Start learning</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/books/${book.slug}`}>View details</Link>
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
      </main>

      <SiteFooter />
    </div>
  );
}
