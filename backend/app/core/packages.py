"""Katalog paket per-acara & add-on berbayar terpisah.

Mengganti model Lite/Premium per-akun (dibeli sekali, berlaku untuk semua
event akun itu) dengan 3 paket per-acara dibedakan dari kapasitas tamu,
sesuai pitch deck "Sistem QR Wedding" (Ecodigitus). Fitur inti (Kelola Tamu,
QR Check-in) sama di semua paket — pembedanya cuma kapasitas tamu & harga.

Amplop Digital (UW-09), Musik Latar/Galeri/Countdown (UW-11), dan Selfie
Check-in (BT-03) TIDAK termasuk paket inti — tetap add-on berbayar terpisah
(keputusan eksplisit pemilik produk, bukan dibundling gratis).

Harga add-on: placeholder Rp100.000 flat — pitch deck tidak menyebutkan
angka spesifik, sama seperti `premium_price_idr` sebelumnya, ini asumsi awal
yang belum divalidasi survei. Gampang diubah, cukup edit dict ini.
"""

PACKAGE_CATALOG: dict[str, dict] = {
    "intimate": {"label": "Intimate", "max_guests": 200, "price_idr": 399_000},
    "celebration": {"label": "Celebration", "max_guests": 600, "price_idr": 699_000},
    "grand": {"label": "Grand", "max_guests": 1_200, "price_idr": 1_099_000},
}

ADDON_CATALOG: dict[str, dict] = {
    "amplop_digital": {"label": "Amplop Digital", "price_idr": 100_000},
    "musik_galeri_countdown": {"label": "Musik Latar, Galeri & Countdown", "price_idr": 100_000},
    "selfie_checkin": {"label": "Selfie Check-in", "price_idr": 100_000},
}
