import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { LuLoader2 } from "react-icons/lu";

export const ButtonM = ({
  children,
  variant = "primary",
  loading = false,
  className = "",
  disabled = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
  children: ReactNode;
}) => {
  const base =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all";
  const variants: Record<"primary" | "ghost" | "danger", string> = {
    primary:
      "bg-primary text-sand shadow-[0_10px_30px_rgba(163,13,13,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(163,13,13,0.35)]",
    ghost: "border border-plum/10 text-plum hover:bg-plum/10",
    danger:
      "bg-plum text-sand hover:-translate-y-0.5 shadow-[0_10px_30px_rgba(88,43,57,0.3)]",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <LuLoader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
};
