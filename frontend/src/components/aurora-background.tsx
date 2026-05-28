"use client"

/**
 * AuroraBackground — CSS-only animated aurora gradient backdrop.
 * 
 * Renders three animated radial gradient blobs that drift slowly,
 * creating a mesmerizing, bioluminescent atmosphere. 
 * Uses only CSS — zero JS animation overhead.
 */
export default function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Primary aurora blob — cyan/teal */}
      <div
        className="absolute -left-1/4 -top-1/4 h-[140%] w-[140%] animate-aurora-drift"
        style={{
          background: "radial-gradient(ellipse at 30% 40%, var(--aurora-1) 0%, transparent 55%)",
          backgroundSize: "200% 200%",
        }}
      />
      {/* Secondary aurora blob — violet */}
      <div
        className="absolute -right-1/4 -top-1/3 h-[130%] w-[130%]"
        style={{
          background: "radial-gradient(ellipse at 70% 30%, var(--aurora-2) 0%, transparent 50%)",
          backgroundSize: "200% 200%",
          animation: "aurora-drift 25s ease-in-out infinite reverse",
        }}
      />
      {/* Tertiary aurora blob — magenta */}
      <div
        className="absolute -bottom-1/4 left-1/4 h-[120%] w-[120%]"
        style={{
          background: "radial-gradient(ellipse at 50% 70%, var(--aurora-3) 0%, transparent 50%)",
          backgroundSize: "200% 200%",
          animation: "aurora-drift 30s ease-in-out infinite",
        }}
      />
      {/* Subtle noise overlay for texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}
