# Kenari Usage

Aplikasi desktop ringan untuk memantau **saldo, kuota, pemakaian, dan log request** dari API [Kenari](https://kenari.id) dalam satu tampilan.

Dibangun dengan **Tauri v2** (backend Rust + frontend TypeScript/Vite). Ringan, tanpa Electron, dan API key Anda tidak pernah meninggalkan mesin Anda kecuali untuk memanggil API Kenari.

## Fitur

- **Dashboard** — saldo, kuota plan (5 jam / mingguan / bulanan) sebagai tiga cincin, ringkasan pemakaian, grafik harian, tabel per model, dan log request yang bisa difilter.
- **Compact widget** — widget melayang kecil yang menampilkan pemakaian kuota mingguan; hover untuk detail, tahan & geser untuk memindahkan.
- **Penyimpanan key yang aman** — API key disimpan di OS keyring (Windows Credential Manager), bukan di file.
- **Auto-refresh** — interval dapat diatur.
- **Tema terang dan gelap** — mengikuti setelan tampilan sistem operasi.
- **CSP ketat** — font di-bundle lokal, tidak ada resource eksternal.

## Stack

| Lapisan | Teknologi |
| --- | --- |
| Shell desktop | Tauri v2 |
| Backend | Rust (`src-tauri/`) |
| Frontend | TypeScript + Vite 6 |
| Grafik | Chart.js |
| Font | Inter Variable, `@fontsource-variable` (self-hosted) |

Sistem desain (token, tipografi, radius, gerak, warna terang/gelap) dijelaskan di
[`design.md`](design.md).

## Prasyarat

- **Node.js** 18 atau lebih baru (disarankan 20+)
- **Rust** (stable) via [rustup](https://rustup.rs)
- **Dependensi sistem Tauri v2** — lihat [prasyarat Tauri](https://v2.tauri.app/start/prerequisites/)
- Target utama saat ini: **Windows** (penyimpanan key memakai fitur `windows-native` dari crate `keyring`)

## Menjalankan

```bash
# 1. Pasang dependensi frontend
npm install

# 2. Jalankan aplikasi lengkap (Vite + Tauri)
npm run tauri dev

# Atau hanya frontend di browser (tanpa fungsi Tauri)
npm run dev
```

## Build rilis

```bash
npm run build          # type-check + build frontend ke dist/
npm run tauri build    # bundel aplikasi desktop
```

Hasil build ada di `src-tauri/target/release/bundle/` (installer `.exe`/`.msi` di subfolder `nsis/` dan `msi/`).

## Merilis

Rilis dibuat otomatis oleh GitHub Actions (`.github/workflows/release.yml`) saat Anda push tag berawalan `v`.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Workflow membangun installer Windows dan mengunggahnya ke halaman **Releases** sebagai **draft**. Buka tab *Releases* di GitHub, tulis catatan rilis, lalu klik **Publish** agar bisa diunduh publik.

> Installer tidak ditandatangani (unsigned), jadi Windows SmartScreen akan menampilkan peringatan saat dipasang. Pengguna dapat memilih *More info → Run anyway*.

## Pengujian

```bash
npm test                          # unit test frontend (Vitest)
cd src-tauri && cargo test        # unit test Rust
cd src-tauri && cargo clippy      # lint Rust
```

## Menyiapkan API key

API key diambil dengan urutan prioritas berikut (lihat `src-tauri/src/config.rs`):

1. **Env var `KENARI_API_KEY`** — jika ada dan tidak kosong, ini yang dipakai.
2. **OS keyring** — key yang disimpan lewat halaman *Pengaturan* di aplikasi.

Cara paling mudah: buka aplikasi → **Pengaturan** → tempel key (diawali `kn-`) → **Simpan & validasi**. Key akan divalidasi ke Kenari sebelum disimpan.

Untuk pengembangan, salin `.env.example` menjadi `.env` dan isi `KENARI_API_KEY`. File `.env` sudah diabaikan git dan **tidak boleh di-commit**.

> Saldo dan kuota membutuhkan key *unrestricted*. Key *restricted* hanya dapat membaca usage miliknya sendiri; key *shared* tidak dapat membaca saldo, kuota, maupun usage (ditolak).

## Struktur proyek

```
index.html               Dashboard utama
compact.html             Widget compact
src/
  main.ts                Logika dashboard
  compact.ts             Logika widget compact
  kenari.ts              Binding ke command Tauri + tipe data
  format.ts              Helper format angka/mata uang
  html.ts                Helper escaping HTML + render baris kuota
  dom.ts                 Helper DOM bersama
  *.test.ts              Unit test (Vitest)
  tokens.css             Token desain (warna, spacing, radius)
  styles.css             Gaya dashboard
  compact.css            Gaya widget compact
src-tauri/
  src/lib.rs             Command Tauri, manajemen window
  src/api.rs             Klien HTTP ke Kenari + skema data
  src/config.rs          Resolusi & penyimpanan API key
  capabilities/          Izin Tauri (ACL)
  tauri.conf.json        Konfigurasi aplikasi + CSP
docs/
  kenari-api-reference.md  Referensi API Kenari (untuk developer/AI)
design.md                Sistem desain (dibaca sebelum mengubah UI)
```

## Referensi API

Ringkasan endpoint, penagihan, rate limit, dan keamanan key Kenari ada di [docs/kenari-api-reference.md](docs/kenari-api-reference.md). Dokumen itu untuk developer/AI yang menyentuh integrasi API.

## Keamanan

API key adalah kredensial sensitif. Repositori ini **tidak pernah** menyimpan rahasia; key disimpan di OS keyring. Untuk melaporkan masalah keamanan atau memahami kebijakan rahasia, baca [SECURITY.md](SECURITY.md).

## Kontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md). Jika Anda agen AI, baca [AGENTS.md](AGENTS.md) terlebih dahulu.

## Lisensi

[MIT](LICENSE) © 2026 Ridho DR
