# Security Policy

## Melaporkan kerentanan

Jika Anda menemukan masalah keamanan, **jangan** membukanya sebagai issue publik. Laporkan secara privat melalui salah satu kanal:

- GitHub **Private vulnerability reporting** pada tab *Security* repositori ini, atau
- Email ke **ridho.d.ramadhan@gmail.com**

Sertakan: deskripsi masalah, langkah reproduksi, dampak yang mungkin, dan versi aplikasi. Kami berusaha menanggapi dalam beberapa hari.

## Kebijakan rahasia

Repositori ini **tidak pernah** menyimpan rahasia.

- **API key tidak ada di dalam repo.** Key disimpan di OS keyring (Windows Credential Manager) melalui crate `keyring`, atau dibaca dari env var `KENARI_API_KEY` saat pengembangan.
- **Key tidak pernah dicatat.** Backend tidak menulis key ke log, output, atau pesan error. Bila ditampilkan di UI, key selalu di-mask (`config::mask_key`).
- **`.env` diabaikan git.** Lihat `.gitignore`; hanya `.env.example` yang boleh ter-commit dan hanya berisi placeholder.
- Jika Anda tidak sengaja men-commit rahasia: **anggap key tersebut bocor**. Segera cabut/rotasi key di dashboard Kenari, lalu bersihkan riwayat git. Menghapus di commit berikutnya saja **tidak cukup**.

## Model ancaman singkat

Aplikasi ini berjalan lokal dan hanya berkomunikasi dengan `https://kenari.id`. Yang dilindungi:

| Aset | Perlindungan |
| --- | --- |
| API key pengguna | OS keyring; tidak masuk repo; di-mask saat ditampilkan |
| Data pemakaian | Hanya dikirim ke Kenari; tidak ada telemetri pihak ketiga |
| Konten webview | CSP ketat di `tauri.conf.json`; font di-bundle lokal |
| Permukaan izin | ACL Tauri minimal (lihat `src-tauri/capabilities/default.json`) |

Yang **bukan** lingkup: keamanan perangkat pengguna itu sendiri, dan keamanan infrastruktur Kenari (laporkan langsung ke Kenari).

## Praktik aman saat berkontribusi

- Jangan pernah menempelkan key asli ke issue, PR, atau pesan commit — gunakan `kn-...`.
- Jangan menguji dengan kredensial orang lain.
- Ikuti aturan keamanan di [AGENTS.md](AGENTS.md).
