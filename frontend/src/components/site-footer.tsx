import Image from "next/image"
import Link from "next/link"

import { Separator } from "@/components/ui/separator"

export default function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
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
              Premium cybersecurity books, verified certificates, and a community built for practical security work.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Explore</p>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <Link href="/books" className="hover:text-foreground">Books</Link>
              <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-semibold">Access</p>
            <div className="flex flex-col gap-2 text-muted-foreground">
              <Link href="/auth/login" className="hover:text-foreground">Sign in</Link>
              <Link href="/auth/register" className="hover:text-foreground">Create account</Link>
              <Link href="/dashboard/wallet" className="hover:text-foreground">Wallet</Link>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Copyright 2026 MultiHAT Academy. All rights reserved.</p>
          <p>Built for ethical OSINT and cybersecurity learning.</p>
        </div>
      </div>
    </footer>
  )
}
