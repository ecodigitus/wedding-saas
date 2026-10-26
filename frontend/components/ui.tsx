import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

// Komponen dasar sesuai styleguide.v2.md §5 — Button, Input, Card, Badge, EmptyState.

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const BUTTON_VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary:
    "border border-border bg-surface text-[var(--color-text-primary)] hover:bg-background",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "bg-transparent text-primary hover:bg-primary/10",
};

/** Dipakai juga untuk styling elemen non-<button> (mis. <Link> yang tampil sebagai CTA). */
export function buttonClasses(variant: ButtonVariant = "primary", className = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_VARIANT_CLASSES[variant]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant };

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, className)} {...props} />;
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
        {label}
      </label>
      <input
        id={inputId}
        className={`min-h-11 rounded-lg border border-border bg-surface px-3 py-2 text-base text-[var(--color-text-primary)] focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string };

export function Textarea({ label, error, id, className = "", ...props }: TextareaProps) {
  const inputId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-[var(--color-text-primary)]">
        {label}
      </label>
      <textarea
        id={inputId}
        className={`rounded-lg border border-border bg-surface px-3 py-2 text-base text-[var(--color-text-primary)] focus:border-primary focus:ring-2 focus:ring-primary/20 ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08)] ${className}`}
      {...props}
    />
  );
}

// "menunggu" baru bermakna sejak Kelola Tamu (UW-08, Fase 2) ada — roster
// tamu memungkinkan rekonsiliasi "diundang tapi belum jawab" (styleguide.v2 §5.4).
export type BadgeStatus = "hadir" | "tidak_hadir" | "menunggu";

const BADGE_CLASSES: Record<BadgeStatus, string> = {
  hadir: "bg-success/10 text-success",
  tidak_hadir: "bg-danger/10 text-danger",
  menunggu: "bg-[var(--color-border)] text-[var(--color-text-secondary)]",
};

const BADGE_LABEL: Record<BadgeStatus, string> = {
  hadir: "Hadir",
  tidak_hadir: "Tidak Hadir",
  menunggu: "Menunggu",
};

export function StatusBadge({ status }: { status: BadgeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${BADGE_CLASSES[status]}`}
    >
      {BADGE_LABEL[status]}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      {icon && <div className="text-[var(--color-text-secondary)]">{icon}</div>}
      <p className="font-medium text-[var(--color-text-primary)]">{title}</p>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}
