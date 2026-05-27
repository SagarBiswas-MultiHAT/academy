import Link from "next/link"

import { requireAdmin } from "@/lib/admin-guard"
import SiteFooter from "@/components/site-footer"
import SiteHeader from "@/components/site-header"
import { Button } from "@/components/ui/button"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold">Admin console</p>
            <p className="text-xs text-muted-foreground">Manage books, coupons, orders, and users.</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/books">Books</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/coupons">Coupons</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/orders">Orders</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin/users">Users</Link>
            </Button>
          </nav>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>

      <SiteFooter />
    </div>
  )
}
