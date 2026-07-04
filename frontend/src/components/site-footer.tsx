"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/lib/auth-context"

export default function SiteFooter() {
  const { user } = useAuth()
  const pathname = usePathname()

  /** Returns null (hides the link) when the user is already on that page */
  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    if (pathname === href) return null
    return (
      <Link href={href} className="transition-colors duration-200 hover:text-foreground">
        {children}
      </Link>
    )
  }

  return (
    <footer className="relative border-t border-foreground/[0.05] dark:border-white/[0.05]">
      {/* Top gradient glow line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[rgba(var(--glow-primary),0.15)] to-transparent" />

      {/* Subtle aurora gradient in background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute bottom-0 left-1/4 h-1/2 w-1/2 opacity-30 dark:opacity-20"
          style={{
            background: "radial-gradient(ellipse at center, var(--aurora-1) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9">
                <Image
                  src="/brandLogoLight.png"
                  alt="MultiHAT Academy logo"
                  fill
                  sizes="36px"
                  className="object-contain dark:hidden"
                />
                <Image
                  src="/brandLogoDark.png"
                  alt="MultiHAT Academy logo"
                  fill
                  sizes="36px"
                  className="object-contain hidden dark:block"
                />
              </div>
              <div>
                <p className="text-sm font-semibold">MultiHAT Academy</p>
                <p className="text-xs text-muted-foreground">Learn. Certify. Showcase.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Premium e-books across cybersecurity, programming, and more — with verified certificates and a community built for practical learning.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Explore</p>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <NavLink href="/books">Books</NavLink>
              <NavLink href="/dashboard">Dashboard</NavLink>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">{user ? "Account" : "Access"}</p>
            <div className="flex flex-col gap-2 text-muted-foreground">
              {user ? (
                <>
                  <NavLink href="/dashboard/wallet">Wallet</NavLink>
                  <NavLink href="/dashboard/referrals">Referrals</NavLink>
                  <NavLink href="/dashboard/showcase">Showcase rewards</NavLink>
                </>
              ) : (
                <>
                  <NavLink href="/auth/login">Sign in</NavLink>
                  <NavLink href="/auth/register">Create account</NavLink>
                  <NavLink href="/dashboard/wallet">Wallet</NavLink>
                </>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 MultiHAT Academy. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Built for learners who want real skills and verified proof.
          </p>
        </div>
      </div>
    </footer>
  )
}
