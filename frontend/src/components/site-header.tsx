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
    <header className="sticky top-0 z-50 border-b border-foreground/[0.05] dark:border-white/[0.05]"
      style={{
        background: "var(--header-bg)",
        backdropFilter: "blur(20px) saturate(1.2)",
        WebkitBackdropFilter: "blur(20px) saturate(1.2)",
      }}
    >
      {/* Gradient glow line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--glow-primary),0.2)] to-transparent" />

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative h-9 w-9 transition-transform duration-300 group-hover:scale-105">
            {/* Subtle glow behind logo */}
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-lg opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:bg-primary/20" />
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
          <div className="leading-tight min-w-0">
            <p className="text-base font-semibold tracking-tight">
              MultiHAT Academy
            </p>
            <p className="text-xs text-muted-foreground hidden sm:block">Learn. Certify. Showcase.</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative py-1 transition-colors duration-200 hover:text-foreground",
                pathname === item.href && "text-foreground",
                /* Neon underline on hover */
                "after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:rounded-full after:transition-all after:duration-300",
                "after:bg-gradient-to-r after:from-primary after:to-[hsl(var(--ring))]",
                "hover:after:w-full",
                pathname === item.href && "after:w-full after:shadow-[0_0_8px_rgba(var(--glow-primary),0.3)]"
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
              {user.role === "ADMIN" && (
                <Button asChild variant="outline" className="hidden sm:inline-flex border-emerald-500/30 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400/20 dark:hover:border-emerald-400/40 dark:hover:shadow-[0_0_12px_rgba(52,211,153,0.1)]">
                  <Link href="/admin">Admin console</Link>
                </Button>
              )}
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
