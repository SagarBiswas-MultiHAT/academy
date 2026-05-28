import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-muted/60",
        "dark:bg-white/[0.06]",
        "relative overflow-hidden",
        "after:absolute after:inset-0",
        "after:bg-gradient-to-r after:from-transparent after:via-white/[0.08] after:to-transparent",
        "after:animate-shimmer after:bg-[length:200%_100%]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
