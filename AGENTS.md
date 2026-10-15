# AGENTS.md

Panduan untuk agen AI (dan kontributor) yang bekerja di repositori ini. Baca ini **sebelum** mengubah apa pun.

## Ringkasan proyek

**Kenari Usage** — aplikasi desktop Tauri v2 untuk memantau saldo, kuota, dan pemakaian API Kenari.

- Frontend: TypeScript + Vite (`src/`, `index.html`, `compact.html`)
- Backend: Rust (`src-tauri/src/`)
- Komunikasi: frontend memanggil command Rust via `invoke()`; Rust yang menyimpan API key dan memanggil `kenari.id`.

## Perintah penting

| Perintah | Fungsi |
| --- | --- |
| `npm install` | Pasang dependensi frontend |
| `npm run dev` | Vite dev server (frontend saja, tanpa Tauri) |
| `npm run tauri dev` | Jalankan aplikasi lengkap |
| `npm run build` | Type-check (`tsc --noEmit`) + build frontend |
| `npm test` | Jalankan unit test frontend (Vitest) |
| `npm run tauri build` | Bundel aplikasi rilis |
| `cargo test` | (di `src-tauri/`) Jalankan unit test Rust |
| `cargo check` | (di `src-tauri/`) Cek kompilasi Rust |

> **Catatan lingkungan:** `cargo` mungkin tidak ada di PATH. Di Windows biasanya di `~/.cargo/bin`. Tambahkan ke PATH sebelum menjalankan perintah Rust.

## Aturan keamanan (WAJIB)

Ini aturan yang tidak bisa dinegosiasikan:

1. **Jangan pernah men-commit rahasia.** Tidak ada API key, token, password, atau kredensial apa pun di kode, dokumentasi, komentar, atau pesan commit. Gunakan placeholder seperti `kn-...` bila perlu contoh.
2. **Jangan pernah menulis API key ke log, output konsol, pesan error, atau file.** Key hanya boleh melewati OS keyring (`src-tauri/src/config.rs`) atau env var. Saat ditampilkan, selalu lewat `config::mask_key`.
3. **Jangan pernah men-echo, mencetak, atau membaca isi `.env`** dan mengirimkannya ke mana pun.
4. **Jangan memperluas izin Tauri tanpa alasan kuat.** `src-tauri/capabilities/default.json` sengaja minimal (`core:event:allow-listen` + `core:window:allow-start-dragging`). Jika fitur baru butuh izin tambahan, tambahkan **hanya izin spesifik** yang dipakai, dan jelaskan alasannya. Jangan kembali ke `core:default`.
5. **Jangan melonggarkan CSP** di `src-tauri/tauri.conf.json` tanpa alasan. Font di-bundle lokal justru agar CSP tetap ketat.
6. **Jangan memakai kredensial asli untuk menguji.** Jika butuh menguji pemanggilan API, gunakan key milik Anda sendiri di keyring lokal, dan jangan pernah menuliskan hasilnya ke repo.

## Batasan perubahan

- **`design.md` adalah sumber kebenaran untuk UI.** Baca sebelum mengubah tampilan; jangan regenerasi gaya per-window. Perluas `design.md` bila sistem desain perlu tumbuh.
- **Jangan mengubah `src-tauri/gen/`** — itu hasil generate. `src-tauri/gen/schemas/` di-ignore git.
- **Jangan meng-commit `node_modules/`, `dist/`, atau `src-tauri/target/`.**
- **Jangan menghapus atau menimpa pekerjaan yang belum Anda pahami.** Kalau ada file atau perubahan yang tidak Anda kenali, tanyakan dulu.
- **Jangan menambah dependensi** tanpa alasan jelas. Pertahankan jejak dependensi tetap kecil.

## Gaya kode

- TypeScript: strict mode aktif. Hindari `any`. Ikuti gaya file di sekitarnya.
- Rust: ikuti `cargo fmt` dan peringatan `cargo clippy`.
- Komentar dan teks UI berbahasa Indonesia; nama variabel/fungsi berbahasa Inggris.
- Pesan error untuk pengguna ditulis dalam Bahasa Indonesia yang jelas (lihat `src-tauri/src/api.rs`).

## Sebelum menyatakan selesai

Jalankan dan pastikan hijau:

```bash
npm run build        # type-check + build frontend
npm test             # unit test frontend (Vitest)
cd src-tauri && cargo test
```

Lalu periksa ulang:

- [ ] Tidak ada rahasia yang ikut ter-commit (`git diff --staged`).
- [ ] Izin Tauri tidak diperluas tanpa alasan.
- [ ] CSP tidak dilonggarkan.
- [ ] `README.md`/`design.md` diperbarui bila perilaku berubah.
