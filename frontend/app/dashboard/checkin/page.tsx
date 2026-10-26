"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, QrCode } from "lucide-react";
import { useMyEvent } from "@/lib/use-my-event";
import { ApiError, checkInGuest, listGuests, uploadCheckInSelfie } from "@/lib/api";
import type { CheckInResult, Guest } from "@/lib/types";
import { Button, buttonClasses, Card } from "@/components/ui";
import Link from "next/link";

const SCAN_COOLDOWN_MS = 3000;

export default function CheckInPage() {
  const { event } = useMyEvent();
  // Ganti isPremium (tier akun) — paket sekarang melekat ke EVENT, bukan akun.
  const hasPackage = event?.package != null;
  const hasSelfieAddon = event?.addons?.includes("selfie_checkin") ?? false;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastScannedRef = useRef<{ token: string; at: number } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  // BT-03 — token tamu yang lagi ditampilkan hasilnya, disimpan terpisah
  // dari lastScannedRef (yang bisa berubah kalau QR lain kebetulan ke-scan
  // di background) supaya "Ambil Foto" selalu ke tamu yang benar.
  const [checkedInToken, setCheckedInToken] = useState<string | null>(null);
  const [selfieUploading, setSelfieUploading] = useState(false);
  const [selfieUploaded, setSelfieUploaded] = useState(false);
  const [selfieError, setSelfieError] = useState<string | null>(null);
  // BT-05 — counter kehadiran real-time. Roster diambil sekali di awal untuk
  // tahu totalnya, lalu setiap scan sukses meng-update entry tamu yang
  // bersangkutan secara lokal (bukan re-fetch semua) supaya counter naik
  // instan tanpa round-trip tambahan ke server.
  const [guests, setGuests] = useState<Guest[]>([]);

  useEffect(() => {
    if (!event || !hasPackage) return;
    let ignore = false;
    listGuests(event.id).then((data) => {
      if (!ignore) setGuests(data);
    });
    return () => {
      ignore = true;
    };
  }, [event, hasPackage]);

  async function handleScanned(token: string) {
    const last = lastScannedRef.current;
    const now = Date.now();
    if (last && last.token === token && now - last.at < SCAN_COOLDOWN_MS) return;
    lastScannedRef.current = { token, at: now };

    // QR registrasi tingkat-acara (RG-06, Mode Registrasi-Saja) payload-nya
    // URL PENUH ke `/r/{slug}` — beda dari QR tamu (BT-02) yang payload-nya
    // invite_token murni. Petugas bisa saja keliru men-scan QR itu di
    // gerbang check-in (mis. QR yang dicetak di undangan kertas) — dicek di
    // sisi client dulu, supaya pesannya jelas ("ini QR pendaftaran, bukan
    // QR tamu") daripada round-trip ke backend yang cuma akan bilang
    // "tamu tidak ditemukan" (menyesatkan, seolah tamu belum terdaftar).
    if (/^https?:\/\//i.test(token)) {
      setError("Ini QR pendaftaran/undangan, bukan QR tamu — arahkan kamera ke QR pribadi milik tamu ya.");
      setResult(null);
      setCheckedInToken(null);
      return;
    }

    try {
      const res = await checkInGuest(token);
      setResult(res);
      setCheckedInToken(token);
      setSelfieUploaded(false);
      setSelfieError(null);
      setError(null);
      setGuests((prev) => prev.map((g) => (g.id === res.id ? { ...g, checked_in_at: res.checked_in_at } : g)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal check-in tamu ini.");
      setResult(null);
      setCheckedInToken(null);
    }
  }

  async function handleTakeSelfie() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!checkedInToken || !video || !canvas) return;
    setSelfieError(null);
    setSelfieUploading(true);
    try {
      // Frame BARU di saat tombol diklik (bukan frame QR-scan yang lama) —
      // staff biasanya arahkan ulang kamera ke wajah tamu setelah scan sukses.
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Kamera tidak bisa diambil gambarnya di browser ini.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Gagal mengambil foto dari kamera.");

      const res = await uploadCheckInSelfie(checkedInToken, blob);
      setGuests((prev) => prev.map((g) => (g.id === res.id ? { ...g, has_selfie: true } : g)));
      setSelfieUploaded(true);
    } catch (err) {
      setSelfieError(err instanceof ApiError ? err.message : "Gagal upload foto selfie.");
    } finally {
      setSelfieUploading(false);
    }
  }

  useEffect(() => {
    if (!hasPackage) return;
    let stream: MediaStream | null = null;
    let rafId: number;
    let stopped = false;

    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        // Efek ini bisa cleanup lalu jalan ulang sebelum getUserMedia selesai
        // (mis. React Strict Mode double-invoke, atau navigasi cepat) — kalau
        // sudah di-cleanup duluan, buang stream ini, jangan diproses lagi
        // (mencegah setCameraError palsu dari closure basi & stream bocor).
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (stopped) return;
        setScanning(true);
        tick();
      } catch {
        if (!stopped) {
          setCameraError(
            "Tidak bisa akses kamera. Pastikan browser diizinkan akses kamera, dan buka halaman ini lewat HTTPS/localhost kalau kameranya tidak muncul."
          );
        }
      }
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) handleScanned(code.data);
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [hasPackage]);

  if (!hasPackage) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <QrCode size={28} strokeWidth={1.5} className="text-[var(--color-text-secondary)]" />
        <h1 className="font-heading text-2xl font-semibold text-primary-dark">
          QR Check-in perlu paket aktif
        </h1>
        <p className="max-w-md text-sm text-[var(--color-text-secondary)]">
          Scan QR tamu di venue untuk check-in — beli paket dulu untuk mengaktifkan fitur ini.
        </p>
        <Link href="/dashboard/billing" className={buttonClasses("primary")}>
          Lihat Paket
        </Link>
      </Card>
    );
  }

  const checkedInCount = guests.filter((g) => g.checked_in_at).length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold text-primary-dark">QR Check-in</h1>
      <p className="text-sm text-[var(--color-text-secondary)]">
        Arahkan kamera ke QR yang ditunjukkan tamu saat kedatangan.
      </p>

      {guests.length > 0 && (
        <p className="text-sm font-medium text-[var(--color-text-primary)]" aria-live="polite">
          {checkedInCount} dari {guests.length} tamu sudah check-in
        </p>
      )}

      <Card className="overflow-hidden">
        <div className="relative aspect-square w-full max-w-sm mx-auto bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </Card>

      {cameraError && <p className="text-sm text-danger">{cameraError}</p>}
      {!cameraError && !scanning && (
        <p className="text-sm text-[var(--color-text-secondary)]">Menyalakan kamera...</p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {result && (
        <Card
          className={`flex flex-col items-center gap-3 p-4 text-center ${
            result.already_checked_in ? "border-warning bg-warning/5" : "border-success bg-success/5"
          }`}
        >
          <div>
            <p className="font-medium text-[var(--color-text-primary)]">{result.name}</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {result.already_checked_in
                ? `Sudah check-in sebelumnya, pukul ${new Date(result.checked_in_at).toLocaleTimeString("id-ID")}`
                : `Berhasil check-in, pukul ${new Date(result.checked_in_at).toLocaleTimeString("id-ID")}`}
            </p>
          </div>

          {/* Selfie Check-in (BT-03, add-on berbayar) — reuse kamera yang sama.
              Tombol cuma tampil kalau event sudah punya add-on ini, supaya
              tidak menampilkan aksi yang pasti ditolak backend (402). */}
          {hasSelfieAddon &&
            (selfieUploaded ? (
              <p className="text-sm text-success">Foto selfie tersimpan.</p>
            ) : (
              <Button variant="secondary" onClick={handleTakeSelfie} disabled={selfieUploading}>
                <Camera size={16} />
                {selfieUploading ? "Mengupload..." : "Ambil Foto"}
              </Button>
            ))}
          {selfieError && <p className="text-sm text-danger">{selfieError}</p>}
        </Card>
      )}
    </div>
  );
}
