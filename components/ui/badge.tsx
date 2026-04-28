import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-violet-600 text-white hover:bg-violet-700",
      secondary: "bg-zinc-700 text-zinc-300 hover:bg-zinc-600",
      destructive: "bg-red-600 text-white hover:bg-red-700",
      outline: "text-zinc-300 border border-zinc-600 bg-zinc-900 hover:bg-zinc-800",
      success: "bg-green-600 text-white hover:bg-green-700",
      warning: "bg-amber-600 text-white hover:bg-amber-700",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
