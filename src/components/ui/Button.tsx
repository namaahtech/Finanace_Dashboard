import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "xs" | "sm" | "md" | "lg";
  loading?: boolean;
}

const variants = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm border border-slate-900",
  secondary: "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm",
  outline: "bg-transparent text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900",
  danger: "bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100",
  ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900",
};

const sizes = {
  xs: "px-2 py-1 text-[10px] tracking-wide",
  sm: "px-3 py-1.5 text-xs tracking-wide",
  md: "px-5 py-2.5 text-xs font-semibold tracking-wide",
  lg: "px-8 py-3.5 text-sm font-semibold tracking-wide",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
