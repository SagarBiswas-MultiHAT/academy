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

      <div className="border-b border-emerald-500/10 dark:border-emerald-400/10"
        style={{
          background: "linear-gradient(to bottom, rgba(52, 211, 153, 0.03), transparent)",
        }}
      >
        {/* Emerald gradient glow line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Admin console
            </p>
            <p className="text-xs text-muted-foreground">Manage books, coupons, orders, and users.</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400/15 dark:hover:border-emerald-400/30 dark:hover:shadow-[0_0_8px_rgba(52,211,153,0.08)]">
              <Link href="/admin/books">Books</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400/15 dark:hover:border-emerald-400/30 dark:hover:shadow-[0_0_8px_rgba(52,211,153,0.08)]">
              <Link href="/admin/coupons">Coupons</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400/15 dark:hover:border-emerald-400/30 dark:hover:shadow-[0_0_8px_rgba(52,211,153,0.08)]">
              <Link href="/admin/orders">Orders</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-emerald-500/20 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400/15 dark:hover:border-emerald-400/30 dark:hover:shadow-[0_0_8px_rgba(52,211,153,0.08)]">
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
