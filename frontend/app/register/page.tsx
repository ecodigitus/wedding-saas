"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button, Input } from "@/components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, fullName || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal daftar. Coba lagi ya.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-8 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <h1 className="font-heading text-2xl font-semibold text-primary-dark">
          Yuk buat undangan impianmu
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Gratis untuk mulai, publish dalam hitungan menit.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Input
            label="Nama kamu"
            name="full_name"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? "Memproses..." : "Daftar"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-primary-dark">
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
