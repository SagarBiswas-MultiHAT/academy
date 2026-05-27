import Link from "next/link"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminIndexPage() {
  const items = [
    {
      title: "Books",
      description: "Create, edit, and manage chapter metadata.",
      href: "/admin/books",
    },
    {
      title: "Coupons",
      description: "Create discount codes and manage validity.",
      href: "/admin/coupons",
    },
    {
      title: "Orders",
      description: "Review all purchases and payment status.",
      href: "/admin/orders",
    },
    {
      title: "Users",
      description: "View accounts and update user roles.",
      href: "/admin/users",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
          Admin overview
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a workspace to manage the platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Card key={item.title} className="flex h-full flex-col justify-between">
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
              <Button asChild size="sm" className="w-fit">
                <Link href={item.href}>Open</Link>
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
