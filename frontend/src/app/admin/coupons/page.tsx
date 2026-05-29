"use client"

import { useEffect, useState } from "react"
import { BadgePercent, RefreshCcw, Trash2 } from "lucide-react"

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
  discountValue: number
  validFrom: string
  validUntil: string
  usageLimit: number
  usageCount: number
  isActive: boolean
  includesPdf?: boolean
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    isActive: true,
    includesPdf: false,
  })

  const loadCoupons = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get("/coupons")
      setCoupons(res.data.data as Coupon[])
    } catch {
      setError("Unable to load coupons.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  const handleCreate = async () => {
    setFormError(null)
    setCreating(true)
    try {
      await api.post("/coupons", {
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        validFrom: new Date(form.validFrom).toISOString(),
        validUntil: new Date(form.validUntil).toISOString(),
        usageLimit: Number(form.usageLimit),
        isActive: form.isActive,
        includesPdf: form.includesPdf,
      })
      setForm({
        code: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        validFrom: "",
        validUntil: "",
        usageLimit: "",
        isActive: true,
        includesPdf: false,
      })
      await loadCoupons()
    } catch {
      setFormError("Unable to create coupon.")
    } finally {
      setCreating(false)
    }
  }

  const toggleCoupon = async (coupon: Coupon) => {
    try {
      await api.patch(`/coupons/${coupon.id}`, { isActive: !coupon.isActive })
      await loadCoupons()
    } catch {
      setError("Unable to update coupon status.")
    }
  }

  const deleteCoupon = async (coupon: Coupon) => {
    try {
      await api.delete(`/coupons/${coupon.id}`)
      await loadCoupons()
    } catch {
      setError("Unable to delete coupon.")
    }
  }

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
              value={form.code}
              onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Discount type</Label>
            <select
              id="type"
              value={form.discountType}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountType: event.target.value }))
              }
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm shadow-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Discount value</Label>
            <Input
              id="value"
              type="number"
              value={form.discountValue}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, discountValue: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="usage">Usage limit</Label>
            <Input
              id="usage"
              type="number"
              value={form.usageLimit}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, usageLimit: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validFrom">Valid from</Label>
            <Input
              id="validFrom"
              type="date"
              value={form.validFrom}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, validFrom: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validUntil">Valid until</Label>
            <Input
              id="validUntil"
              type="date"
              value={form.validUntil}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, validUntil: event.target.value }))
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
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
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
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, includesPdf: event.target.checked }))
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
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {displayCoupons.map((coupon, index) => (
            <div
              key={coupon?.id ?? index}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3"
            >
              {coupon ? (
                <div>
                  <p className="text-sm font-semibold">{coupon.code}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {coupon.discountType} {coupon.discountValue} - used {coupon.usageCount}/
                    {coupon.usageLimit}
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
                    <Button size="sm" variant="outline" onClick={() => toggleCoupon(coupon)}>
                      <RefreshCcw className="mr-1 size-3" /> Toggle
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCoupon(coupon)}>
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
