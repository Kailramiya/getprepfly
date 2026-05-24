import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
        secondary: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
        success: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
        warning: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
        destructive: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
        outline: "border border-gray-300 text-gray-700 dark:border-slate-600 dark:text-slate-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
