import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.guest import Guest
    from app.models.guestbook import GuestbookEntry
    from app.models.rsvp import RSVP
    from app.models.user import User


class Event(Base):
    """Satu undangan pernikahan. Fase 1: 1 akun = 1 event aktif (dibatasi di
    endpoint, bukan di skema) — skema mendukung 1 akun ke banyak event agar
    kasus WO multi-klien (Fase 5) tidak butuh migrasi ulang (PRD.v2 Bagian 5).
    """

    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    partner1_name: Mapped[str] = mapped_column(String(150), nullable=False)
    partner2_name: Mapped[str] = mapped_column(String(150), nullable=False)

    # Info tambahan mempelai (template Burgundy Royal: "Putra/Putri dari ..." &
    # akun Instagram). Opsional & SENGAJA publik — tampil apa adanya di halaman
    # undangan, jadi tidak dienkripsi (alasan sama dengan Amplop Digital).
    partner1_parents: Mapped[str | None] = mapped_column(String(255), nullable=True)
    partner2_parents: Mapped[str | None] = mapped_column(String(255), nullable=True)
    partner1_instagram: Mapped[str | None] = mapped_column(String(30), nullable=True)
    partner2_instagram: Mapped[str | None] = mapped_column(String(30), nullable=True)

    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    # Akad & resepsi disimpan terpisah — UW-03 minta jadwal akad/resepsi,
    # dan keduanya lazim beda waktu (kadang beda lokasi juga).
    waktu_akad: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    waktu_resepsi: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lokasi: Mapped[str] = mapped_column(Text, nullable=False)
    maps_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    dress_code: Mapped[str | None] = mapped_column(String(255), nullable=True)

    template_id: Mapped[str] = mapped_column(String(50), nullable=False, default="klasik")
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Mode Registrasi-Saja (RG-01): "full" | "registration_only".
    #   "full"              — perilaku sejak Fase 1, `/{slug}` merender template
    #                         undangan lengkap.
    #   "registration_only" — undangan utamanya dibuat DI LUAR platform (vendor
    #                         lain / undangan cetak); kita cuma menyediakan
    #                         halaman registrasi `/r/{slug}`, dan `/{slug}`
    #                         dialihkan ke situ.
    # BEDA dari `package`/`addons` di bawah: kolom ini SENGAJA boleh ada di
    # `EventUpdate` dan diubah owner langsung — memilih mode tidak membuka
    # kapabilitas berbayar apa pun, cuma menentukan halaman publik mana yang
    # disajikan. Nilai yang diterima dibatasi `Literal` di schema (bukan
    # free-string seperti `template_id`) karena nilainya menentukan
    # percabangan logika, bukan cuma lookup palet yang punya fallback.
    mode: Mapped[str] = mapped_column(String(20), nullable=False, default="full")

    # Paket per-acara (ganti model Lite/Premium per-akun lama) — "intimate" |
    # "celebration" | "grand" | None. SENGAJA tidak ada di EventUpdate schema
    # sama sekali (OWASP A01) — cuma diubah dari webhook Xendit setelah
    # pembayaran terverifikasi (lihat routes/billing.py), tidak pernah dari
    # request user langsung, supaya tidak bisa di-PATCH gratis jadi "grand".
    package: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Add-on berbayar terpisah dari paket inti: "amplop_digital",
    # "musik_galeri_countdown", "selfie_checkin" — lihat app/core/packages.py.
    # Sama seperti package: cuma diisi dari webhook, tidak dari EventUpdate.
    addons: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    # Amplop Digital (UW-09, add-on berbayar) — opsi 1: cuma info transfer statis,
    # tanpa upload gambar QRIS (belum ada infrastruktur upload di Fase 1-3).
    # Tidak dienkripsi (beda dari Guest.name/RSVP.guest_name) karena data ini
    # SENGAJA ditampilkan publik di halaman undangan — enkripsi di sini
    # tidak menambah kerahasiaan apa pun (sama alasannya dengan buku tamu).
    bank_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bank_account_holder: Mapped[str | None] = mapped_column(String(150), nullable=True)
    ewallet_name: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ewallet_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ewallet_account_holder: Mapped[str | None] = mapped_column(String(150), nullable=True)

    # UW-11 (add-on berbayar): musik latar, galeri foto/video, countdown timer.
    # music_url & gallery_urls lewat URL eksternal (owner upload sendiri ke
    # Drive/Imgur/dsb) — sama seperti keputusan Amplop Digital, belum ada
    # infrastruktur upload S3 di codebase ini.
    music_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # JSON (bukan Postgres ARRAY) — portable ke SQLite yang dipakai test
    # suite (tests/conftest.py); kita cuma pernah baca/tulis list utuh, tidak
    # pernah query ke dalam elemen-nya, jadi tidak butuh tipe array asli.
    gallery_urls: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    # show_countdown disimpan (bukan dihitung dari status add-on saat baca)
    # supaya halaman publik tidak perlu tahu add-on owner sama sekali — pola
    # yang sama dengan field Amplop Digital (gate di WRITE, apa adanya di READ).
    show_countdown: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Gambar desain khusus (template Burgundy Royal): peta slot -> URL gambar
    # (hero, amplop, bingkai berpotret, dst — lihat THEME_ASSET_KEYS di
    # schemas/event.py). Lewat URL eksternal karena belum ada infrastruktur
    # upload; sengaja bisa dihapus/diganti kapan saja (mis. setelah acara).
    theme_assets: Mapped[dict[str, str] | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="events")
    guests: Mapped[list["Guest"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    rsvps: Mapped[list["RSVP"]] = relationship(back_populates="event", cascade="all, delete-orphan")
    guestbook_entries: Mapped[list["GuestbookEntry"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
