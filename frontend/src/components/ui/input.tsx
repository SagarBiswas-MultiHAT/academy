import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm",
          "shadow-sm shadow-black/5 backdrop-blur-sm",
          "placeholder:text-muted-foreground/60",
          "transition-all duration-300 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:border-primary/40",
          "dark:bg-white/[0.04] dark:border-white/[0.08] dark:shadow-none",
          "dark:focus-visible:ring-[rgba(var(--glow-primary),0.3)] dark:focus-visible:border-[rgba(var(--glow-primary),0.4)]",
          "dark:focus-visible:shadow-[0_0_15px_rgba(var(--glow-primary),0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
