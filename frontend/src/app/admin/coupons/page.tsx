"use client"

import { useEffect, useState } from "react"
import { BadgePercent, Copy, RefreshCcw, Trash2 } from "lucide-react"

import api from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

type Coupon = {
  id: string
  code: string
  discountType: "PERCENTAGE" | "FIXED"
  discountValue: number | string // Prisma Decimal serialises as string
  validFrom: string
  validUntil: string
  usageLimit: number
  usageCount: number
  isActive: boolean
  includesPdf?: boolean
}

const INITIAL_FORM = {
  code: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  validFrom: "",
  validUntil: "",
  usageLimit: "",
  isActive: true,
  includesPdf: false,
}

/** Extract a human-readable error message from an Axios error */
function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: unknown } } }).response
    const msg = res?.data?.message
    if (Array.isArray(msg)) return msg.join("; ")
    if (typeof msg === "string") return msg
  }
  return "An unexpected error occurred."
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const [form, setForm] = useState(INITIAL_FORM)

  const loadCoupons = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get("/coupons")
      setCoupons(res.data.data as Coupon[])
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  /** Client-side validation — returns an error string or null */
  const validate = (): string | null => {
    if (!form.code.trim()) return "Coupon code is required."
    if (form.discountValue === "" || Number(form.discountValue) < 0)
      return "Discount value must be 0 or greater."
    if (form.discountType === "PERCENTAGE" && Number(form.discountValue) > 100)
      return "Percentage discount cannot exceed 100."
    if (!form.usageLimit || parseInt(form.usageLimit, 10) < 1)
      return "Usage limit must be at least 1."
    if (!form.validFrom) return "Valid from date is required."
    if (!form.validUntil) return "Valid until date is required."
    if (new Date(form.validFrom) >= new Date(form.validUntil))
      return "Valid until must be after valid from."
    return null
  }

  const handleCreate = async () => {
    setFormError(null)
    const validationError = validate()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setCreating(true)
    try {
      await api.post("/coupons", {
        code: form.code.trim().toUpperCase(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
        usageLimit: parseInt(form.usageLimit, 10),
        isActive: form.isActive,
        includesPdf: form.includesPdf,
      })
      setForm(INITIAL_FORM)
      await loadCoupons()
    } catch (err) {
      setFormError(extractErrorMessage(err))
    } finally {
      setCreating(false)
    }
  }

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      await api.patch(`/coupons/${coupon.id}`, { isActive: !coupon.isActive })
      await loadCoupons()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  const deleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return
    try {
      await api.delete(`/coupons/${coupon.id}`)
      await loadCoupons()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

  const displayCoupons: Array<Coupon | null> = loading
    ? Array.from({ length: 3 }).map(() => null)
    : coupons

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
          Admin coupons
        </h1>
        <p className="text-sm text-muted-foreground">
          Create and manage discount codes.
        </p>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BadgePercent className="size-5 text-primary" /> Create coupon
          </CardTitle>
          <CardDescription>Set coupon limits and validity window.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              placeholder="e.g. MULTIHAT.DEV"
              value={form.code}
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Discount type</Label>
            <select
              id="type"
              value={form.discountType}
              onChange={(e) =>
                setForm((p) => ({ ...p, discountType: e.target.value }))
              }
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">
              Discount value{" "}
              <span className="text-muted-foreground text-xs">
                {form.discountType === "PERCENTAGE" ? "(0–100)" : "(BDT)"}
              </span>
            </Label>
            <Input
              id="value"
              type="number"
              min={0}
              max={form.discountType === "PERCENTAGE" ? 100 : undefined}
              step={form.discountType === "PERCENTAGE" ? 1 : 0.01}
              placeholder={form.discountType === "PERCENTAGE" ? "100" : "50.00"}
              value={form.discountValue}
              onChange={(e) =>
                setForm((p) => ({ ...p, discountValue: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usage">Usage limit</Label>
            <Input
              id="usage"
              type="number"
              min={1}
              step={1}
              placeholder="5"
              value={form.usageLimit}
              onChange={(e) =>
                setForm((p) => ({ ...p, usageLimit: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validFrom">Valid from</Label>
            <Input
              id="validFrom"
              type="date"
              value={form.validFrom}
              onChange={(e) =>
                setForm((p) => ({ ...p, validFrom: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid until</Label>
            <Input
              id="validUntil"
              type="date"
              value={form.validUntil}
              min={form.validFrom || undefined}
              onChange={(e) =>
                setForm((p) => ({ ...p, validUntil: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center gap-6 md:col-span-2 pt-2">
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isActive: e.target.checked }))
                }
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="includesPdf"
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={form.includesPdf}
                onChange={(e) =>
                  setForm((p) => ({ ...p, includesPdf: e.target.checked }))
                }
              />
              <Label htmlFor="includesPdf">Includes printable PDF add-on</Label>
            </div>
          </div>
        </CardContent>
        {formError && (
          <CardContent>
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          </CardContent>
        )}
        <CardFooter className="justify-end">
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? "Creating..." : "Create coupon"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active coupons</CardTitle>
          <CardDescription>Manage coupon status and usage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive flex items-center justify-between gap-2">
              <span>{error}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={loadCoupons}
                className="shrink-0 h-auto p-1 text-xs"
              >
                Retry
              </Button>
            </div>
          )}
          {!loading && !error && coupons.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No coupons yet. Create one above.
            </p>
          )}
          {displayCoupons.map((coupon, index) => (
            <div
              key={coupon?.id ?? index}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3"
            >
              {coupon ? (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold font-mono tracking-wide">
                      {coupon.code}
                    </p>
                    <button
                      onClick={() => copyCouponCode(coupon.code)}
                      title="Copy code"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Copy className="size-3" />
                    </button>
                    {copied === coupon.code && (
                      <span className="text-[10px] text-emerald-500 font-medium">
                        Copied!
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {coupon.discountType === "PERCENTAGE"
                      ? `${Number(coupon.discountValue)}% off`
                      : `৳${Number(coupon.discountValue).toFixed(2)} off`}
                    {" · "}used {coupon.usageCount}/{coupon.usageLimit}
                    {" · "}until {formatDate(coupon.validUntil)}
                    {coupon.includesPdf && (
                      <span className="ml-2 inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px]">
                        + PDF Included
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {coupon ? (
                  <>
                    <Badge variant={coupon.isActive ? "success" : "secondary"}>
                      {coupon.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleCoupon(coupon)}
                    >
                      <RefreshCcw className="mr-1 size-3" /> Toggle
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCoupon(coupon)}
                    >
                      <Trash2 className="mr-1 size-3" /> Delete
                    </Button>
                  </>
                ) : (
                  <Skeleton className="h-8 w-24" />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}