import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-primary to-[hsl(210,100%,50%)] text-primary-foreground shadow-sm dark:from-[hsl(190,100%,45%)] dark:to-[hsl(210,100%,55%)] dark:shadow-[0_0_8px_rgba(var(--glow-primary),0.15)]",
        secondary:
          "border-transparent bg-secondary/80 text-secondary-foreground backdrop-blur-sm dark:bg-white/[0.06]",
        outline:
          "text-foreground border-foreground/10 dark:border-white/[0.08]",
        success:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:shadow-[0_0_10px_rgba(52,211,153,0.08)]",
        warning:
          "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-400 dark:shadow-[0_0_10px_rgba(251,191,36,0.08)]",
        holographic:
          "border-transparent text-foreground holographic dark:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
