"use client"

import { useEffect, useState } from "react"
import { Receipt } from "lucide-react"

import api from "@/lib/api"
import { formatUsdFromBdt } from "@/lib/currency"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Order = {
  id: string
  amount: number | string
  status: string
  paymentMethod: string
  createdAt: string
  user: { id: string; email: string; name?: string; role: string }
  book: { id: string; title: string; slug: string }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadOrders = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await api.get("/orders", { params: { page: 1, limit: 50 } })
      const payload = res.data.data as { orders: Order[] }
      setOrders(payload.orders || [])
    } catch {
      setError("Unable to load orders.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const displayOrders: Array<Order | null> = loading
    ? Array.from({ length: 5 }).map(() => null)
    : orders

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
          Admin orders
        </h1>
        <p className="text-sm text-muted-foreground">Review all purchases and payment status.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Receipt className="size-5 text-primary" /> Orders
          </CardTitle>
          <CardDescription>Latest 50 orders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left">Book</th>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Method</th>
                  <th className="px-3 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {displayOrders.map((order, index) => (
                  <tr key={order?.id ?? index} className="border-b">
                    {order ? (
                      <>
                        <td className="px-3 py-3">
                          <p className="font-medium">{order.book.title}</p>
                          <p className="text-xs text-muted-foreground">{order.book.slug}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium">{order.user.name ?? "User"}</p>
                          <p className="text-xs text-muted-foreground">{order.user.email}</p>
                        </td>
                        <td className="px-3 py-3">{formatUsdFromBdt(order.amount)}</td>
                        <td className="px-3 py-3">
                          <Badge variant={order.status === "PAID" ? "success" : "secondary"}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">{order.paymentMethod}</td>
                        <td className="px-3 py-3">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3" colSpan={6}>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
