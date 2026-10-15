# Contributing

Terima kasih ingin berkontribusi ke Kenari Usage. Panduan ini singkat dan praktis.

> **Agen AI:** baca juga [AGENTS.md](AGENTS.md) — ada aturan keamanan yang wajib dipatuhi.

## Menyiapkan lingkungan

Lihat bagian **Prasyarat** dan **Menjalankan** di [README.md](README.md). Ringkasnya:

```bash
npm install
npm run tauri dev
```

## Alur kontribusi

1. Buat branch dari `main` dengan nama deskriptif, misalnya `fix/compact-drag` atau `feat/export-csv`.
2. Lakukan perubahan kecil dan fokus — satu perubahan = satu tujuan.
3. Jalankan verifikasi (di bawah) sampai hijau.
4. Buat commit dengan pesan yang jelas (lihat konvensi).
5. Buka pull request dan jelaskan **apa** dan **mengapa**.

## Konvensi commit

Pakai gaya ringkas berbasis tipe:

```
feat: tambah filter vendor di log
fix: cegah widget compact keluar layar
docs: perjelas cara set API key
chore: perbarui dependensi
```

Tulis pesan dalam Bahasa Indonesia atau Inggris, yang penting konsisten dan jelas. **Jangan pernah menuliskan rahasia apa pun di pesan commit.**

## Verifikasi sebelum PR

```bash
npm run build                        # type-check + build frontend
cd src-tauri && cargo check          # cek kompilasi Rust
```

Jika Anda mengubah UI, pastikan tetap sesuai `design.md`.

## Yang perlu diperhatikan

- **Keamanan lebih dulu.** Jangan memperluas izin Tauri atau melonggarkan CSP tanpa alasan kuat. Jangan pernah men-commit `.env` atau kredensial.
- **Ikuti gaya sekitar.** Jangan menambah dependensi tanpa alasan.
- **Perbarui dokumentasi** bila perilaku berubah.
- **Jangan menyertakan artefak build** (`dist/`, `node_modules/`, `src-tauri/target/`).

## Melaporkan bug

Buka issue dengan langkah reproduksi dan versi aplikasi. Untuk masalah **keamanan**, ikuti [SECURITY.md](SECURITY.md) — jangan buka issue publik.

## Lisensi kontribusi

Dengan berkontribusi, Anda menyetujui bahwa kontribusi Anda dilisensikan di bawah [MIT License](LICENSE).
