"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, ShieldCheck, Wallet } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";

type Book = {
  id: string;
  title: string;
  slug: string;
  description: string;
  price: number | string;
};

type WalletBalance = {
  balanceBdt: number | string;
};

const formatCurrency = (value: number | string) => {
  const amount = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(amount)) return "BDT 0.00";
  return `BDT ${amount.toFixed(2)}`;
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
        paymentMethod,
        couponCode: couponCode || undefined,
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
        <main className="mx-auto max-w-6xl px-6 py-12">
          <Card>
            <CardHeader>
              <CardTitle>Loading checkout</CardTitle>
              <CardDescription>Preparing your order.</CardDescription>
            </CardHeader>
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
        <main className="mx-auto max-w-6xl px-6 py-12">
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
  const walletInsufficient = paymentMethod === "WALLET" && walletBalance < numericPrice;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">Checkout</h1>
            <p className="text-muted-foreground">Confirm your purchase and select payment method.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/books">Back to catalog</Link>
          </Button>
        </div>

        <Separator className="my-6" />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">Order summary</CardTitle>
              <CardDescription>Review your selection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-lg font-semibold">{book.title}</p>
                <p className="text-sm text-muted-foreground">{book.description}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price</span>
                <span className="text-lg font-semibold">{formatCurrency(book.price)}</span>
              </div>
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
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {checkoutError}
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <Badge variant="secondary">Certificate included</Badge>
              <Badge variant="success">Lifetime access</Badge>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Payment method</CardTitle>
              <CardDescription>Choose how you want to pay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={paymentMethod === "GATEWAY" ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => setPaymentMethod("GATEWAY")}
                >
                  <CreditCard className="size-4" /> aamarPay gateway
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "WALLET" ? "default" : "outline"}
                  className="justify-start gap-2"
                  onClick={() => setPaymentMethod("WALLET")}
                >
                  <Wallet className="size-4" /> Wallet balance
                </Button>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" /> Secure payment processing
                </div>
                <div>
                  Wallet balance: {wallet ? formatCurrency(wallet.balanceBdt) : "BDT --"}
                </div>
                {walletInsufficient && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
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
