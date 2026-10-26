/**
 * `navigator.clipboard` cuma ada di secure context (HTTPS atau localhost).
 * Staging saat ini masih diakses lewat HTTP (belum ada domain/TLS), jadi
 * Clipboard API tidak tersedia sama sekali di browser tamu — perlu fallback
 * lewat `execCommand("copy")` (masih didukung browser meski deprecated).
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // lanjut ke fallback di bawah
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
