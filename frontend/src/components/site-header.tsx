"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/books", label: "Books" },
  { href: "/dashboard", label: "Dashboard" },
]

export default function SiteHeader() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-9 w-9">
            <Image
              src="/brandLogoLight.png"
              alt="MultiHAT Academy logo"
              fill
              sizes="36px"
              className="object-contain dark:hidden"
              priority
            />
            <Image
              src="/brandLogoDark.png"
              alt="MultiHAT Academy logo"
              fill
              sizes="36px"
              className="object-contain hidden dark:block"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight">
              MultiHAT Academy
            </p>
            <p className="text-xs text-muted-foreground">Cybersecurity e-books</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground",
                pathname === item.href && "text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Button asChild variant="outline" size="icon" className="sm:hidden">
                <Link href="/dashboard" aria-label="Open dashboard">
                  <LayoutDashboard className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="hidden sm:inline-flex">
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
              <Button variant="ghost" onClick={logout} className="hidden sm:inline-flex">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="icon" className="sm:hidden">
                <Link href="/auth/login" aria-label="Sign in">
                  <User className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link href="/auth/register">Create account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
