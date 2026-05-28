import Link from "next/link"
import { BookOpen, Tag, ShoppingBag, Users, ArrowRight } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AdminIndexPage() {
  const items = [
    {
      title: "Books",
      description: "Create, edit, and manage chapter metadata.",
      href: "/admin/books",
      icon: BookOpen,
    },
    {
      title: "Coupons",
      description: "Create discount codes and manage validity.",
      href: "/admin/coupons",
      icon: Tag,
    },
    {
      title: "Orders",
      description: "Review all purchases and payment status.",
      href: "/admin/orders",
      icon: ShoppingBag,
    },
    {
      title: "Users",
      description: "View accounts and update user roles.",
      href: "/admin/users",
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-3xl font-semibold font-[family-name:var(--font-space-grotesk)]">
          <span className="gradient-text">Admin overview</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Select a workspace to manage the platform.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <Card
            key={item.title}
            className="flex h-full flex-col justify-between hover-lift animate-fade-in-up border-t-2 border-t-emerald-500/20 dark:border-t-emerald-400/20 dark:hover:shadow-[0_0_20px_rgba(52,211,153,0.06)]"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-center size-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10">
                <item.icon className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
              <Button asChild size="sm" className="w-fit bg-gradient-to-r from-emerald-600 to-emerald-500 dark:from-emerald-500 dark:to-emerald-400 text-white dark:text-emerald-950 hover:brightness-110 dark:shadow-[0_0_10px_rgba(52,211,153,0.15)]">
                <Link href={item.href}>
                  Open <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
