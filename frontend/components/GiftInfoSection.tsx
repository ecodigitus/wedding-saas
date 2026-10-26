"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import type { TemplateTheme } from "./InvitationView";

export type GiftAccount = {
  label: string;
  accountName: string | null | undefined;
  accountNumber: string | null | undefined;
  accountHolder: string | null | undefined;
};

// Dua rekening boleh berlabel sama (mis. dua rekening "Bank Mandiri" milik
// masing-masing mempelai) — nomor rekening yang membedakan.
const accountId = (a: GiftAccount) => `${a.label}-${a.accountNumber ?? ""}`;

/** Amplop Digital (UW-09, Premium, opsi 1: info statis tanpa upload QRIS).
 * Komponen client terpisah (bukan bagian InvitationView langsung) karena
 * butuh interaktivitas salin-ke-clipboard — pola yang sama dengan
 * LazyMapEmbed, InvitationView sendiri tetap server component. */
export function GiftInfoSection({
  accounts,
  theme,
  variant = "card",
  logoUrl,
}: {
  accounts: GiftAccount[];
  theme: TemplateTheme;
  /** "canva": teks polos tengah (judul bank sekali per kelompok, nomor tebal) — tampilan situs Canva acuan. */
  variant?: "card" | "canva";
  /** Logo bank (varian "canva") — ditampilkan di atas keterangan rekening. */
  logoUrl?: string;
}) {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  async function handleCopy(account: GiftAccount) {
    if (!account.accountNumber) return;
    const ok = await copyToClipboard(account.accountNumber);
    if (ok) {
      setCopiedLabel(accountId(account));
      setTimeout(() => setCopiedLabel((l) => (l === accountId(account) ? null : l)), 2000);
    } else {
      window.prompt("Gagal auto-copy, salin manual nomornya:", account.accountNumber);
    }
  }

  if (variant === "canva") {
    return (
      <div className="flex w-full flex-col items-center gap-1 text-center">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL dinamis dari owner (link eksternal).
          <img src={logoUrl} alt="Logo bank" loading="lazy" className="mb-5 h-auto w-[36%] rounded-lg" />
        )}
        <p className="mb-3 italic leading-snug">
          Kirimkan hadiah terbaik Anda ke
          <br />
          Nomor Rekening di bawah ini
        </p>
        {accounts.map((account, i) => (
          <div key={accountId(account)} className="flex flex-col items-center gap-1">
            {(i === 0 || accounts[i - 1].label !== account.label) && (
              <p className="mt-2 italic">{account.label}</p>
            )}
            <p className="mt-2 font-sans text-lg font-bold">{account.accountNumber}</p>
            {account.accountHolder && (
              <p className="font-sans text-base font-bold">A.n {account.accountHolder.toUpperCase()}</p>
            )}
            {account.accountNumber && (
              <button
                type="button"
                onClick={() => handleCopy(account)}
                className={`inline-flex items-center gap-1 text-sm underline ${theme.accent}`}
                aria-label={`Salin nomor ${account.label}`}
              >
                <Copy size={13} />
                {copiedLabel === accountId(account) ? "Tersalin!" : "Salin"}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {accounts.map((account) => (
        <div
          key={accountId(account)}
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
            theme.mode === "dark" ? "border-white/20" : "border-black/10"
          }`}
        >
          <div>
            <p className={`text-xs uppercase tracking-widest ${theme.muted}`}>{account.label}</p>
            <p className="text-lg font-medium">{account.accountNumber}</p>
            {account.accountHolder && <p className="text-sm">a.n. {account.accountHolder}</p>}
          </div>
          {account.accountNumber && (
            <button
              type="button"
              onClick={() => handleCopy(account)}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm underline ${theme.accent}`}
              aria-label={`Salin nomor ${account.label}`}
            >
              <Copy size={14} />
              {copiedLabel === accountId(account) ? "Tersalin!" : "Salin"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
