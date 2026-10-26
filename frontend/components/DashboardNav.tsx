"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./ui";

const LINKS = [
  { href: "/dashboard/editor", label: "Editor Undangan" },
  { href: "/dashboard/rsvp", label: "RSVP" },
  { href: "/dashboard/guestbook", label: "Buku Tamu" },
  { href: "/dashboard/guests", label: "Kelola Tamu" },
  { href: "/dashboard/checkin", label: "QR Check-in" },
  { href: "/dashboard/billing", label: "Billing" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="font-heading text-lg font-semibold text-primary-dark">
          Wedding SaaS
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pathname?.startsWith(link.href)
                  ? "bg-primary/10 text-primary-dark"
                  : "text-[var(--color-text-secondary)] hover:bg-background"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--color-text-secondary)] sm:inline">
            {user?.email}
          </span>
          <Button variant="secondary" onClick={() => logout()}>
            <LogOut size={16} />
            Keluar
          </Button>
        </div>
      </div>
    </header>
  );
}
