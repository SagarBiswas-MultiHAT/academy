"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, ShieldCheck, Wallet, Crown } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

type Book = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | string;
  hasPremiumPdf?: boolean;
  requiresGatewayPayment?: boolean;
};

type WalletBalance = {
  balanceBdt: number | string;
};

const formatCurrency = (value: number | string) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "BDT 0.00";
  return `BDT ${amount.toFixed(2)}`;
};

const formatBookPrice = (value: number | string) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "$0.00";
  return `$${amount.toFixed(2)}`;
};

export default function CheckoutPage({ params }: { params: { bookId: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"GATEWAY" | "WALLET">("GATEWAY");
  const [couponCode, setCouponCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [includePrintablePdf, setIncludePrintablePdf] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get("/books", { params: { page: 1, limit: 100 } })
      .then((res) => {
        if (!active) return;
        const payload = res.data.data as { books: Book[] };
        const found = payload.books?.find((item) => item.id === params.bookId);
        if (!found) {
          setError("Book not found.");
        } else {
          setBook(found);
          if (found.requiresGatewayPayment) {
            setPaymentMethod("GATEWAY");
          }
        }
      })
      .catch(() => {
        if (!active) return;
        setError("Unable to load this book.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [params.bookId]);

  useEffect(() => {
    if (!user) return;
    api
      .get("/wallet/balance")
      .then((res) => setWallet(res.data.data as WalletBalance))
      .catch(() => setWallet(null));
  }, [user]);

  useEffect(() => {
    if (book?.hasPremiumPdf && includePrintablePdf) {
      setPaymentMethod("GATEWAY");
    }
  }, [book?.hasPremiumPdf, includePrintablePdf]);

  const numericPrice = useMemo(() => {
    if (!book) return 0;
    const price = typeof book.price === "string" ? Number(book.price) : book.price;
    return Number.isFinite(price) ? price : 0;
  }, [book]);

  const handleCheckout = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }
    if (!book) return;

    setCheckoutError(null);
    setProcessing(true);
    try {
      const res = await api.post("/orders", {
        bookId: book.id,
        paymentMethod: selectedPaymentMethod,
        couponCode: couponCode || undefined,
        includePrintablePdf,
      });

      const payload = res.data.data as { paymentUrl?: string; status?: string };
      if (payload.paymentUrl) {
        window.location.href = payload.paymentUrl;
        return;
      }
      if (payload.status === "PAID") {
        router.push("/payment/success");
        return;
      }
      router.push("/payment/fail");
    } catch {
      setCheckoutError("Unable to complete checkout. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading checkout</CardTitle>
              <CardDescription>Preparing your order.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Checkout unavailable</CardTitle>
              <CardDescription>{error ?? "Book not found."}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/books">Back to catalog</Link>
              </Button>
            </CardFooter>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const walletBalance = wallet ? Number(wallet.balanceBdt) : 0;
  const gatewayOnly = Boolean(book.hasPremiumPdf && includePrintablePdf);
  const selectedPaymentMethod = gatewayOnly ? "GATEWAY" : paymentMethod;
  const addOnPrice = book.hasPremiumPdf ? 5 : 0;
  const totalPrice = numericPrice + (includePrintablePdf && book.hasPremiumPdf ? addOnPrice : 0);
  const walletInsufficient = selectedPaymentMethod === "WALLET" && walletBalance < totalPrice;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between animate-fade-in-up">
          <div>
            <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
              <span className="gradient-text">Checkout</span>
            </h1>
            <p className="text-muted-foreground">Confirm your purchase and select payment method.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/books">Back to catalog</Link>
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="gradient-border animate-fade-in-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Crown className="size-5 text-primary" />
                Order summary
              </CardTitle>
              <CardDescription>Review your selection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-semibold">{book.title}</p>
                <p className="text-sm text-muted-foreground">{book.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {book.hasPremiumPdf && <Badge variant="secondary">Printable PDF add-on: $5</Badge>}
                {gatewayOnly && <Badge variant="warning">Gateway only for PDF add-on</Badge>}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Package price</span>
                <span className="text-xl font-semibold gradient-text-static">{formatBookPrice(book.price)}</span>
              </div>
              {book.hasPremiumPdf && (
                <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={includePrintablePdf}
                    onChange={(event) => setIncludePrintablePdf(event.target.checked)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span className="space-y-1">
                    <span className="block font-medium">Add printable PDF</span>
                    <span className="block text-muted-foreground">Include the licensed buyer PDF for an additional $5.00.</span>
                  </span>
                </label>
              )}
              {book.hasPremiumPdf && (
                <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Web package</span>
                    <span className="font-medium">{formatBookPrice(book.price)}</span>
                  </div>
                  {includePrintablePdf && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Printable PDF add-on</span>
                      <span className="font-medium">$5.00</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-border/60 pt-2">
                    <span className="font-medium">Total</span>
                    <span className="text-base font-semibold">{formatBookPrice(totalPrice)}</span>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="coupon">Coupon code</Label>
                <Input
                  id="coupon"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              {checkoutError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive backdrop-blur-sm">
                  {checkoutError}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <Badge variant="secondary">Certificate included</Badge>
              <Badge variant="success">Lifetime access</Badge>
            </CardFooter>
          </Card>

          <Card className="animate-fade-in-up delay-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="size-5 text-primary" />
                Payment method
              </CardTitle>
              <CardDescription>Choose how you want to pay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("GATEWAY")}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all duration-200 ${
                    paymentMethod === "GATEWAY"
                      ? "border-primary/50 bg-primary/10 font-medium dark:border-[rgba(var(--glow-primary),0.4)] dark:bg-[rgba(var(--glow-primary),0.08)] dark:shadow-[0_0_10px_rgba(var(--glow-primary),0.08)]"
                      : "border-foreground/[0.06] dark:border-white/[0.06] hover:border-foreground/[0.15] dark:hover:border-white/[0.12]"
                  }`}
                >
                  <CreditCard className="size-4" /> aamarPay gateway
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("WALLET")}
                  disabled={gatewayOnly}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all duration-200 ${
                    gatewayOnly
                      ? "cursor-not-allowed border-foreground/[0.06] bg-muted/40 text-muted-foreground opacity-70"
                      : paymentMethod === "WALLET"
                        ? "border-primary/50 bg-primary/10 font-medium dark:border-[rgba(var(--glow-primary),0.4)] dark:bg-[rgba(var(--glow-primary),0.08)] dark:shadow-[0_0_10px_rgba(var(--glow-primary),0.08)]"
                        : "border-foreground/[0.06] dark:border-white/[0.06] hover:border-foreground/[0.15] dark:hover:border-white/[0.12]"
                  }`}
                >
                  <Wallet className="size-4" /> Wallet balance
                </button>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-6 rounded-full bg-primary/10">
                    <ShieldCheck className="size-3.5 text-primary" />
                  </div>
                  Secure payment processing
                </div>
                <div>
                  Wallet balance: {wallet ? formatCurrency(wallet.balanceBdt) : "BDT --"}
                </div>
                {gatewayOnly && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    Wallet checkout is disabled while the printable PDF add-on is selected. Gateway payment keeps the add-on traceable and unlocks the dashboard PDF button.
                  </div>
                )}
                {walletInsufficient && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                    Wallet balance is lower than the book price. Top up or use gateway.
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={processing || walletInsufficient}
              >
                {processing ? "Processing..." : "Complete purchase"}
              </Button>
              {!user && (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/login">Sign in to continue</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
