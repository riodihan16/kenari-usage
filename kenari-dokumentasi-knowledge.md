# Kenari — Knowledge Base Dokumentasi Teknis

> **Tujuan:** referensi teknis terstruktur untuk developer dan AI coding agent yang menggunakan Kenari API. Dokumen ini merangkum konsep, alur integrasi, keluarga endpoint, penagihan, error, keamanan, dan integrasi produk Kenari dalam satu file Markdown berbahasa Indonesia.
>
> **Sumber primer:** https://kenari.id/docs, https://kenari.id/llms-full.txt, https://kenari.id/llms.txt, dan https://kenari.id/openapi.json  
> **Tanggal peninjauan:** 10 Oktober 2026.  
> **Penting:** katalog model, harga, limit, dan produk dapat berubah. File ini adalah knowledge/reference guide, bukan salinan verbatim setiap baris dari dokumentasi upstream. Untuk field dan schema yang sangat spesifik, OpenAPI dan halaman dokumentasi langsung tetap menjadi sumber otoritatif.

---

## Daftar isi

1. [Gambaran umum](#1-gambaran-umum)
2. [Konsep dan istilah](#2-konsep-dan-istilah)
3. [Base URL, autentikasi, dan keamanan key](#3-base-url-autentikasi-dan-keamanan-key)
4. [Mulai cepat](#4-mulai-cepat)
5. [Katalog model, kemampuan, dan harga](#5-katalog-model-kemampuan-dan-harga)
6. [API percakapan](#6-api-percakapan)
7. [Function calling dan server tools](#7-function-calling-dan-server-tools)
8. [Structured output, reasoning, streaming, dan caching](#8-structured-output-reasoning-streaming-dan-caching)
9. [Gambar, dokumen, dan input multimodal](#9-gambar-dokumen-dan-input-multimodal)
10. [Endpoint khusus: embeddings sampai video](#10-endpoint-khusus-embeddings-sampai-video)
11. [Web search, page fetch, dan X search](#11-web-search-page-fetch-dan-x-search)
12. [Model gratis, PAYG, langganan, dan billing](#12-model-gratis-payg-langganan-dan-billing)
13. [BYOK dan routing](#13-byok-dan-routing)
14. [Rate limits dan kuota](#14-rate-limits-dan-kuota)
15. [API akun, saldo, kuota, dan usage](#15-api-akun-saldo-kuota-dan-usage)
16. [Error dan troubleshooting](#16-error-dan-troubleshooting)
17. [Integrasi coding agent dan CLI](#17-integrasi-coding-agent-dan-cli)
18. [Server MCP](#18-server-mcp)
19. [Domain](#19-domain)
20. [Pods](#20-pods)
21. [Media kit](#21-media-kit)
22. [Pola implementasi yang direkomendasikan](#22-pola-implementasi-yang-direkomendasikan)
23. [Indeks seluruh halaman resmi](#23-indeks-seluruh-halaman-resmi)
24. [Sumber daya mesin dan API schema](#24-sumber-daya-mesin-dan-api-schema)

---

## 1. Gambaran umum

Kenari adalah **gateway untuk model AI**. Satu akun dan satu API key Kenari dapat digunakan untuk mengakses berbagai model dan provider melalui API yang kompatibel dengan format populer. Kenari menangani perutean ke provider upstream, pencatatan penggunaan, serta billing dalam Rupiah.

Kapabilitas inti:

- **API chat lintas provider:** OpenAI Chat Completions, Anthropic Messages, dan OpenAI Responses.
- **Model katalog:** model chat dan jenis model lain disajikan dari katalog yang terus diperbarui.
- **Billing Rupiah:** pemakaian bisa berasal dari saldo prabayar PAYG, kuota langganan, kupon/alokasi, model gratis, atau key provider sendiri melalui BYOK.
- **Fallback:** named route dapat mencoba beberapa model secara berurutan.
- **Tools:** model dapat menjalankan function calling yang disediakan aplikasi atau menggunakan server tools Kenari seperti web search, fetch halaman, pencarian X, dan waktu.
- **API selain chat:** embeddings, rerank, moderation, pembuatan/edit gambar, text-to-speech, transkripsi audio, musik, video, OCR, System One, dan pencarian web/X.
- **Integrasi agent:** dokumentasi mesin, OpenAPI, MCP, Kenari CLI, Claude Code, dan Codex.
- **Produk lain di dashboard:** pengelolaan domain dan container aplikasi bernama Pods.

Kenari bukan berarti semua model selalu memiliki kemampuan sama. Kemampuan seperti tool calling, reasoning, input gambar/video, jenis output, context length, dan protocol dideskripsikan per model. Selalu periksa katalog live sebelum memilih model.

---

## 2. Konsep dan istilah

| Istilah | Makna praktis |
|---|---|
| **API key Kenari** | Kredensial dengan awalan `kn-`. Satu key dapat dipakai untuk semua model dan format API yang diizinkan. |
| **Base URL** | Alamat API yang dipakai SDK/client. Perbedaan path `/v1` penting untuk menghindari request ke `/v1/v1`. |
| **PAYG** | *Pay as you go*: request berbayar diambil dari saldo prabayar mengikuti penggunaan dan harga katalog. |
| **Model `:free`** | Model yang tidak memotong saldo untuk panggilan free-tier, tetapi tunduk pada limit per menit/per hari dan kuota lain yang berlaku. |
| **BYOK** | *Bring Your Own Key*: menambahkan key provider sendiri ke Kenari. Request yang benar-benar dilayani dengan key tersebut dicatat sebagai BYOK dan tidak dikenakan biaya token Kenari. Biaya/aturan provider asal tetap perlu diperhatikan. |
| **Route** | Nama konfigurasi model berurutan. Kenari mencoba langkah berikutnya ketika suatu langkah gagal. Client cukup mengirim nama route pada field `model`. |
| **Server tool** | Tool yang dieksekusi oleh layanan Kenari, lalu hasilnya dikirim kembali ke model agar model menghasilkan jawaban akhir. |
| **Shared key** | Key terbatas yang dapat dibagikan ke pengguna lain tanpa memberikan akses ke data akun pemilik. Pemakaian tetap memakai saldo/plan pemilik dan dapat dibatasi model, masa berlaku, serta budget. |
| **Restricted key** | API key yang aksesnya dibatasi oleh expiry, model scope, kemampuan berbayar, spend cap, atau token cap. |
| **Micro-Rupiah** | Satuan internal untuk nilai uang di beberapa response API. `1 Rupiah = 1.000.000 micro-Rupiah`. Jangan membaca nilai integer tersebut langsung sebagai Rupiah. |
| **MCP** | Model Context Protocol; memungkinkan agent yang kompatibel mengakses dokumentasi, katalog model, informasi akun terbatas, dan tool pencarian melalui server Kenari. |
| **PAYG balance vs plan quota** | Saldo dan kuota langganan adalah sumber pendanaan berbeda. Chat yang tercakup plan dapat menggunakan kuota plan, sedangkan sejumlah endpoint non-chat selalu menagih saldo. |

---

## 3. Base URL, autentikasi, dan keamanan key

### 3.1 Base URL yang benar

| Jenis client | Base URL | Catatan |
|---|---|---|
| OpenAI SDK, OpenAI-compatible client, Codex | `https://kenari.id/v1` | Biasanya endpoint ditambahkan SDK, misalnya `/chat/completions` atau `/responses`. |
| Anthropic SDK dan Claude Code | `https://kenari.id` | Client Anthropic menambahkan `/v1/messages`; jangan isi base URL dengan `/v1` karena bisa menjadi `/v1/v1/messages`. |
| Endpoint khusus Kenari yang dijelaskan sebagai URL lengkap | `https://kenari.id/v1/...` | Ikuti path spesifik pada dokumentasi endpoint. |
| Server MCP | `https://kenari.id/mcp` | Transport Streamable HTTP; bukan endpoint chat biasa. |

### 3.2 Membuat API key

1. Login ke dashboard Kenari.
2. Buka **API Keys**.
3. Pilih **Create API Key**; label bersifat opsional tetapi disarankan untuk menandai aplikasi atau perangkat.
4. Salin key tepat setelah dibuat. Kenari hanya menampilkan key lengkap satu kali.
5. Simpan di secret manager atau environment variable.

Jika key hilang, key lama tidak dapat ditampilkan kembali. Buat key baru atau gunakan fitur **Rotate key** untuk menerbitkan key baru sekaligus mencabut yang lama.

### 3.3 Header autentikasi

Format umum untuk OpenAI-compatible API:

```http
Authorization: Bearer kn-...
Content-Type: application/json
```

Anthropic client juga dapat memakai:

```http
x-api-key: kn-...
anthropic-version: 2023-06-01
Content-Type: application/json
```

Pada `x-api-key`, kirim key mentah, **tanpa** awalan `Bearer`. Jika request mengirim kedua header, `Authorization` yang diprioritaskan.

### 3.4 Environment variable

```bash
export KENARI_API_KEY='kn-...'
```

Jangan memasukkan key nyata ke repository, log, source frontend, screenshot, prompt, atau issue publik. Hindari mencetak nilai environment ketika debugging; cukup cek apakah nilai sudah tersedia:

```bash
test -n "$KENARI_API_KEY" && echo "API key tersedia" || echo "API key belum diset"
```

### 3.5 Pengaturan pembatasan key

Pengaturan lanjutan yang dijelaskan dokumentasi meliputi:

- **Expiry:** key bisa tidak kedaluwarsa, berlaku sejumlah hari, atau sampai tanggal tertentu.
- **Model scope:** semua model atau hanya model pilihan. Request ke model di luar scope akan ditolak.
- **Paid capabilities:** hak penggunaan fitur tertentu seperti OCR/document reading, web search/page fetching, atau X search.
- **Spend cap:** batas nilai Rupiah pada harga katalog untuk key tersebut.
- **Token cap:** total token prompt dan completion yang dapat dipakai pada shared key.

Keterbatasan penting:

- Named route tidak dapat dipakai oleh key yang memiliki model scope, spend cap, atau token cap.
- Key dengan spend cap tidak dapat memakai model BYOK melalui `byok/...`; dokumentasi merekomendasikan token cap untuk membatasi BYOK karena pemakaian BYOK tercatat Rp 0 pada sisi Kenari.
- Restricted key hanya dapat melihat pemakaiannya sendiri di endpoint usage dan tidak dapat membaca saldo/kuota akun secara penuh.
- Shared key tidak dapat mengakses saldo, kuota, dan usage pemilik.
- Jika key dicabut, key tidak dapat diaktifkan kembali. Request selanjutnya dengan key itu akan ditolak.
- Suspensi akun menghentikan key pada akun tersebut; membuat key baru tidak menyelesaikan masalah suspensi.

### 3.6 Shared API key

Shared key dibuat dari fitur **Share**. Pemilik dapat mengatur daftar model, expiry (dokumentasi menyebut 1–90 hari), spend cap, token cap, note, dan paid capabilities. Penggunaan key akan memakai saldo atau plan pemilik. Cabut share untuk menghentikan akses.

Shared key bukan akses ke akun: endpoint saldo, kuota, usage, serta tool akun terkait melalui MCP ditolak. Shared key juga tidak dapat menggunakan named route maupun menggunakan ulang dokumen yang sebelumnya dibaca dan dibayar oleh key lain.

### 3.7 Memanggil dari browser

API `/v1` mendukung CORS dan dapat dipanggil langsung dari JavaScript browser. Namun key yang dikirim ke browser dapat dibaca siapa pun melalui developer tools. Pola ini hanya layak untuk prototipe, tool lokal, atau penggunaan pribadi. Untuk aplikasi web produksi, simpan key di backend atau gunakan shared key dengan batas yang sesuai.

---

## 4. Mulai cepat

### 4.1 Request pertama dengan cURL

Contoh menggunakan model gratis yang disebut dalam dokumentasi. ID model gratis bisa berubah, jadi ambil daftar terbaru dari endpoint katalog bila model contoh tidak lagi tersedia.

```bash
curl https://kenari.id/v1/chat/completions \
  -H "Authorization: Bearer $KENARI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "step-3-7-flash:free",
    "messages": [{"role": "user", "content": "Halo!"}]
  }'
```

Respons Chat Completions mengikuti bentuk OpenAI. Isi teks jawaban umumnya tersedia pada `choices[0].message.content`.

### 4.2 Python dengan OpenAI SDK

```bash
pip install openai
```

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://kenari.id/v1",
    api_key=os.environ["KENARI_API_KEY"],
)

response = client.chat.completions.create(
    model="step-3-7-flash:free",
    messages=[{"role": "user", "content": "Halo!"}],
)
print(response.choices[0].message.content)
```

### 4.3 JavaScript dengan OpenAI SDK

```bash
npm install openai
```

```js
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://kenari.id/v1",
  apiKey: process.env.KENARI_API_KEY,
});

const response = await client.chat.completions.create({
  model: "step-3-7-flash:free",
  messages: [{ role: "user", content: "Halo!" }],
});
console.log(response.choices[0].message.content);
```

### 4.4 Cara mendapatkan model free terbaru

```bash
curl -s https://kenari.id/v1/models \
  | jq -r '.data[] | select(.pricing.free) | .id'
```

`GET /v1/models` adalah endpoint `/v1` yang bisa diakses tanpa API key.

### 4.5 Sebelum memakai model berbayar

Top up saldo pada halaman **Balance**. Dokumentasi menyebut top up melalui QRIS mulai Rp 1.000. Pastikan saldo/plan mencukupi; sistem dapat melakukan estimasi atau reservasi biaya sebelum provider menyelesaikan pekerjaan.

---

## 5. Katalog model, kemampuan, dan harga

### 5.1 Endpoint katalog

```http
GET https://kenari.id/v1/models
GET https://kenari.id/v1/models?modality=rerank
```

Katalog mengembalikan struktur bergaya OpenAI (`object: list`, `data: [...]`) dan metadata model. Metadata dapat mencakup:

- `id`: ID model yang dipakai pada request.
- `name`, `owned_by`: nama/provider yang diketahui Kenari.
- `context_length`: panjang konteks.
- `max_output_tokens`: batas output jika tersedia.
- `modalities`: jenis input dan output yang didukung, misalnya text/image/video.
- `endpoints`: jenis endpoint yang dapat dipakai.
- `protocols`: protokol API yang tersedia, misalnya OpenAI Chat, OpenAI Responses, atau Anthropic Messages.
- `reasoning`, opsi/toggle reasoning jika model menyediakannya.
- `tool_call`: apakah model tercatat mendukung function calling.
- `pricing`: harga dan informasi free-tier.
- Metadata tambahan lain sesuai model/provider.

Jangan menganggap semua field selalu ada, atau semua model mendukung seluruh fitur. Misalnya model chat, image-generation, rerank, moderation, embedding, transcription, dan video memakai endpoint yang berbeda.

### 5.2 Filter model berdasarkan kemampuan

Model dengan dukungan tool calling dapat dicari dengan:

```bash
curl -s https://kenari.id/v1/models \
  | jq -r '.data[] | select(.tool_call == true) | .id'
```

Model dengan kemampuan tertentu harus dipilih berdasarkan metadata terkini, bukan dari nama model semata. Tidak semua model khusus muncul di panggilan katalog tanpa filter: dokumentasi menyebut embedding, rerank, moderation, dan System One tidak selalu tercantum pada `GET /v1/models` biasa. Gunakan filter `?modality=` dan panduan endpoint spesifik jika perlu.

### 5.3 Harga dan perubahan katalog

Harga disajikan dalam Rupiah pada katalog. Harga/ID berubah sewaktu-waktu. Gunakan endpoint model dan endpoint harga publik untuk mendapatkan nilai terbaru; jangan menyimpan harga katalog permanen di kode.

Endpoint yang disebut sebagai publik:

- `GET /v1/models`
- `GET /api/public/pricing`
- `GET /openapi.json`

### 5.4 Memilih model

Sebelum dipakai di production, periksa setidaknya:

1. ID model benar dan masih ada.
2. Endpoint yang sesuai tersedia.
3. Context length cukup untuk prompt dan history.
4. Batas output cukup untuk jawaban yang diharapkan.
5. Model mendukung tool calling jika aplikasi menggunakan tools.
6. Modalitas input dan output sesuai (gambar, audio, video, teks, dan sebagainya).
7. Harga dan sumber billing sesuai budget.
8. Reasoning/caching/structured output tersedia jika diperlukan.

---

## 6. API percakapan

Kenari menyediakan tiga format utama untuk percakapan. Pilih sesuai SDK dan tool yang dipakai, bukan dengan mencampur body dari satu format ke format lainnya.

### 6.1 OpenAI Chat Completions

**Endpoint:**

```http
POST https://kenari.id/v1/chat/completions
```

**Request minimal:**

```json
{
  "model": "step-3-7-flash:free",
  "messages": [
    {"role": "system", "content": "Jawab ringkas dan akurat."},
    {"role": "user", "content": "Jelaskan REST API."}
  ]
}
```

Konsep field utama:

- `model`: ID model live atau nama route yang didefinisikan pengguna.
- `messages`: percakapan berbentuk array; role umumnya `system`, `developer`, `user`, `assistant`, atau `tool` sesuai format yang dipakai.
- `temperature`, `top_p`, token output, stop dan parameter sampling lain mengikuti kemampuan endpoint/model. Periksa referensi resmi untuk daftar serta batas field lengkap.
- `stream`: aktifkan streaming jika client ingin menerima potongan jawaban.
- `tools` dan `tool_choice`: untuk function calling atau server tool.
- `response_format`: untuk output terstruktur/JSON jika tersedia.
- `reasoning_effort`: untuk mengatur tingkat upaya reasoning pada model yang mendukungnya.

**Respons:** berstruktur OpenAI, dengan `id`, `object`, `model`, `choices`, dan bisa menyertakan `usage`. Isi teks normal ada di `choices[0].message.content`. Untuk function calling, model dapat memberi `tool_calls` dan `finish_reason: "tool_calls"`; itu berarti aplikasi perlu menjalankan tool lalu mengirim hasilnya kembali.

### 6.2 Anthropic Messages

**Endpoint lengkap:**

```http
POST https://kenari.id/v1/messages
```

**Konfigurasi SDK:** base URL `https://kenari.id` tanpa `/v1`; SDK Anthropic menambahkan `/v1/messages` sendiri.

Contoh dengan Python:

```python
import os
import anthropic

client = anthropic.Anthropic(
    base_url="https://kenari.id",
    api_key=os.environ["KENARI_API_KEY"],
)

message = client.messages.create(
    model="step-3-7-flash:free",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Halo!"}],
)
print("".join(block.text for block in message.content if block.type == "text"))
```

Messages menggunakan bentuk request Anthropic seperti `max_tokens` dan array `content` yang dapat berisi blok teks, gambar, dokumen, `tool_use`, atau `tool_result`. Pemanggilan tool pada format ini berbeda dari OpenAI Chat Completions; ikuti format Messages.

### 6.3 OpenAI Responses

**Endpoint:**

```http
POST https://kenari.id/v1/responses
```

Responses adalah format berbeda dari Chat Completions. Codex modern menggunakannya sebagai wire format menurut panduan Kenari. Item percakapan dapat berupa message, function call, dan function output. Untuk function call, field penting mencakup `type: "function_call"`, `call_id`, `name`, dan `arguments` (JSON dalam bentuk string). Hasil tool dikirim kembali melalui item `function_call_output` yang memiliki `call_id` cocok dan `output`.

Gunakan dokumentasi Responses untuk skema lengkap item input/output, parameter, event streaming, dan batas kompatibilitas. Jangan menyalin struktur body Chat Completions begitu saja ke Responses.

### 6.4 Memilih format API

| Kebutuhan | Pilihan umum |
|---|---|
| Aplikasi existing memakai OpenAI SDK biasa | Chat Completions (`/v1/chat/completions`) |
| Integrasi native Anthropic / Claude Code | Messages (`/v1/messages`, base URL SDK tanpa `/v1`) |
| Codex dan client yang mengharapkan Responses | Responses (`/v1/responses`) |
| Operasi seperti image/audio/video/rerank/embedding | Endpoint khusus sesuai tugas |

---

## 7. Function calling dan server tools

### 7.1 Function calling yang didefinisikan aplikasi

Function calling memungkinkan model meminta aplikasi menjalankan operasi tertentu, misalnya mencari order, membaca data bisnis, atau menghitung sesuatu. Model tidak mengeksekusi kode lokal secara langsung: model mengembalikan nama fungsi dan argumen, aplikasi memvalidasi lalu menjalankan kode, kemudian hasilnya dikirim kembali ke model.

Loop standar Chat Completions:

1. Kirim `messages` dan array `tools` beserta nama, deskripsi, serta JSON Schema untuk `parameters`.
2. Jika respons berisi `tool_calls`, parse `function.arguments` (nilai ini adalah **string JSON**).
3. Validasi argumen dan jalankan fungsi yang sesuai di aplikasi.
4. Tambahkan pesan assistant yang berisi `tool_calls` dan satu pesan `role: "tool"` per pemanggilan, lengkap dengan `tool_call_id` yang cocok.
5. Kirim ulang seluruh percakapan agar model memproses hasil tool dan menghasilkan jawaban.
6. Batasi jumlah putaran tool agar model tidak masuk loop tanpa akhir.

Contoh definisi tool ringkas:

```json
{
  "type": "function",
  "function": {
    "name": "lookup_order",
    "description": "Cari status order berdasarkan nomor order.",
    "parameters": {
      "type": "object",
      "properties": {"order_id": {"type": "string"}},
      "required": ["order_id"]
    }
  }
}
```

Jangan langsung mengeksekusi argumen dari model tanpa validasi. Terapkan allowlist fungsi, validasi skema, otorisasi pengguna, logging, dan batas eksekusi.

### 7.2 Format tool di Anthropic Messages

Di Messages, tiap tool didefinisikan memakai `name`, `description`, dan `input_schema`. Model menjawab dengan blok `tool_use` dan `stop_reason: "tool_use"`. Aplikasi menjalankan tool, kemudian mengirim hasil melalui blok `tool_result` di pesan `user` berikutnya.

### 7.3 Format tool di Responses

Responses memakai item function call dan function output. Gunakan `call_id` yang sama untuk menghubungkan call dengan output. Lihat referensi Responses agar item dikirim dengan urutan dan bentuk yang benar.

### 7.4 Server tools Kenari

Kenari menyediakan tool yang bisa dijalankan server untuk request model:

| Nama tool | Fungsi | Billing yang disebut dokumentasi |
|---|---|---|
| `kenari:web_search` | Cari web; hasil berisi judul, URL, dan snippet. | Per pencarian |
| `kenari:web_fetch` | Ambil satu halaman web dan berikan kontennya ke model. | Per fetch |
| `kenari:x_search` | Cari post live di X dan berikan ringkasan beserta sumber. | Per pencarian |
| `kenari:datetime` | Berikan tanggal/waktu saat ini kepada model. | Gratis |

Model harus mendukung function calling. Katalog menandai kemampuan tersebut menggunakan `tool_call: true`. Server tools tidak memerlukan kemampuan search native bawaan model; model cukup mampu melakukan tool calling.

Kenari menjalankan tools bertipe `kenari:` dan meneruskan function tools milik aplikasi. Hindari memberi nama function milik aplikasi sama dengan nama tool server yang aktif (contohnya `web_search`, `web_fetch`, `x_search`, `datetime`) agar tidak bentrok.

---

## 8. Structured output, reasoning, streaming, dan caching

### 8.1 Structured output

Structured output membatasi atau mengarahkan respons agar sesuai bentuk data seperti JSON. Pada Chat Completions, dokumentasi mengarahkan ke field `response_format`; penggunaan spesifik mengikuti skema endpoint dan dukungan model.

Prinsip pemakaian:

- Pilih model dan format yang mendukung output terstruktur.
- Berikan schema yang sederhana dan eksplisit.
- Tetap validasi JSON/schema di aplikasi; hasil model tidak boleh dianggap valid tanpa pemeriksaan.
- Tangani kasus refusal, hasil kosong, atau output yang tidak lolos schema.
- Jika membutuhkan function call untuk mengambil tindakan, gunakan `tools`; structured output bukan pengganti otorisasi ataupun eksekusi tool.

Referensi: https://kenari.id/docs/structured-output

### 8.2 Reasoning

Sejumlah model expose kemampuan reasoning. Pada Chat Completions, dokumentasi menjelaskan `reasoning_effort` dengan nilai yang bisa mencakup `none`, `minimal`, `low`, `medium`, `high`, `xhigh`, atau `max`, bergantung dukungan provider/model. Katalog dapat mencatat `reasoning`, `reasoning_options`, dan `reasoning_toggle`.

Aturan praktis:

- Periksa dukungan dan pilihan yang tersedia di metadata model terkini.
- Jangan mengirim level yang tidak didukung model.
- Effort tinggi dapat meningkatkan kualitas pada tugas sulit, tetapi dapat menambah latensi atau biaya.
- Jangan bergantung pada format reasoning internal yang tidak dijamin oleh protokol.

Referensi: https://kenari.id/docs/reasoning

### 8.3 Streaming

Aktifkan streaming sesuai API format yang digunakan. Pada format yang memakai SSE, client membaca event/frame bertahap. Responses stream memakai baris `event:` dan `data:`; event memiliki `type` dan `sequence_number`. Pada tool calls, aplikasi perlu menangani event yang terkait function call dengan benar, bukan hanya menyatukan teks.

Hal yang perlu ditangani:

- Connection timeout dan disconnect.
- Error event yang muncul setelah stream sudah dimulai.
- Chunk teks yang belum lengkap saat diterima.
- Akhir stream / finish reason dan penggunaan token.
- Tool call yang disampaikan melalui event stream.

Jangan berasumsi setiap error berbentuk JSON; sebagian response error adalah teks biasa. Referensi: https://kenari.id/docs/streaming

### 8.4 Prompt caching

Prompt caching bergantung dukungan provider/model dan perilaku provider. Jangan menganggap prompt otomatis di-cache. Cache entry dapat kedaluwarsa mengikuti aturan provider; request pertama untuk prompt adalah cache miss, dan hit baru mungkin terjadi pada request berikutnya. Cek informasi usage/cache dari response untuk mengetahui apakah cache benar-benar digunakan. Jangan membuat alur logika yang mensyaratkan cache hit.

Referensi: https://kenari.id/docs/prompt-caching

---

## 9. Gambar, dokumen, dan input multimodal

### 9.1 Gambar sebagai input

Kirim gambar dengan bentuk content part yang didukung API format dan model yang dipilih. Model harus mendukung modalitas gambar pada metadata katalog. Periksa halaman resmi untuk bentuk data URL, encoding, ukuran, dan content part yang diharapkan oleh masing-masing protokol.

Referensi: https://kenari.id/docs/vision

### 9.2 PDF/dokumen pada request chat

Dokumen PDF dapat dilampirkan pada request chat standar untuk model yang kompatibel. Kenari membaca dokumen sebelum request diteruskan ke model: teks dari halaman yang memiliki text layer dapat diekstrak, sedangkan halaman tanpa text layer (misalnya halaman scan/gambar) dapat diberikan sebagai gambar. Urutan halaman dipertahankan.

Format content part Chat Completions yang dijelaskan dokumentasi:

```json
{
  "type": "file",
  "file": {
    "filename": "invoice.pdf",
    "file_data": "data:application/pdf;base64,<BASE64_CONTENT>"
  }
}
```

`file_data` harus berupa data URL dengan media type dan konten base64. Data URL tanpa media type seperti `data:;base64,...` ditolak. URL HTTP biasa tidak diambil; klien perlu mengirim isi file itu sendiri. Satu request dapat memuat beberapa dokumen.

Default document reading masuk ke perhitungan token input biasa; tidak ada biaya tambahan tersendiri untuk tahap pembacaan default. Token tetap mengikuti sumber billing model (misalnya plan yang mencakup model). Request Responses tidak menerima dokumen menurut halaman dokumentasi yang diperiksa. Untuk Messages, gunakan blok `document` dengan sumber PDF base64.

### 9.3 OCR

Jika dokumen membutuhkan OCR sungguhan—misalnya tulisan tangan atau scan yang buruk—pilih engine `ocr` atau gunakan endpoint OCR. OCR ditagih per halaman dari saldo dan tidak termasuk langganan chat. Restricted key perlu izin **Document reading** untuk OCR, tetapi masih dapat menggunakan cara pembacaan dokumen default selama model diizinkan.

### 9.4 Menangani dokumen dengan cermat

- Perhatikan ukuran request dan batas payload API.
- Untuk file lokal, encode file ke base64 dan sertakan media type yang akurat.
- Jangan mengirim URL file yang mengharapkan Kenari mengambilnya secara otomatis bila dokumentasi endpoint meminta base64 langsung.
- Hasil ekstraksi teks dan interpretasi model dapat salah; validasi angka, nomor invoice, tanggal, atau nilai penting terhadap dokumen asli.
- Jika memproses dokumen privat, pertimbangkan hak akses key, retensi, dan data sensitif.

Referensi: https://kenari.id/docs/documents

---

## 10. Endpoint khusus: embeddings sampai video

API non-chat memakai endpoint dan satuan billing sendiri. Jangan mengirim model image/audio/video ke endpoint chat biasa. Katalog model biasa juga belum tentu memunculkan seluruh model khusus; gunakan filter modalitas atau instruksi di halaman endpoint.

### 10.1 Ringkasan endpoint

| Fungsi | Endpoint | Metode | Tujuan |
|---|---|---|---|
| Daftar model | `/v1/models` | GET | Model dan metadata live; publik. |
| Chat completions | `/v1/chat/completions` | POST | Chat format OpenAI. |
| Anthropic Messages | `/v1/messages` | POST | Chat format Anthropic. |
| Responses | `/v1/responses` | POST | API Responses format OpenAI. |
| Embeddings | `/v1/embeddings` | POST | Mengubah teks menjadi vector embedding. |
| Rerank | `/v1/rerank` | POST | Mengurutkan dokumen berdasarkan relevansi terhadap query. |
| Moderation | `/v1/moderations` | POST | Klasifikasi/moderasi input teks. |
| Image generation | `/v1/images/generations` | POST | Membuat gambar dari prompt. |
| Image editing | `/v1/images/edits` | POST | Mengedit gambar sumber dengan instruksi. |
| Text-to-speech | `/v1/audio/speech` | POST | Menghasilkan audio dari teks. |
| Audio transcription | `/v1/audio/transcriptions` | POST | Mengubah audio menjadi teks. |
| Music generation | `/v1/music/generations` | POST | Membuat lagu/audio musik. |
| Video generation | `/v1/videos/generations` | POST | Membuat job pembuatan video secara asinkron. |
| Video extension | `/v1/videos/extensions` | POST | Melanjutkan klip yang sudah ada dari frame terakhir. |
| Status video job | `/v1/videos/{id}` | GET | Memeriksa status rendering. |
| Konten video | `/v1/videos/{id}/content` | GET | Mengunduh konten video selesai. |
| OCR | `/v1/ocr` | POST | OCR dokumen/halaman. |
| System One | `/v1/systemone` | POST | Endpoint khusus System One. |
| Web search | `/v1/web/search` | POST | Pencarian web. |
| Page fetch | `/v1/web/fetch` | POST | Mengambil teks satu halaman publik. |
| X search | `/v1/x/search` | POST | Pencarian post X. |
| Saldo | `/v1/account/balance` | GET | Membaca saldo yang tersedia. |
| Kuota | `/v1/account/quota` | GET | Membaca kuota plan dan reset. |
| Usage summary | `/v1/usage` | GET | Ringkasan penggunaan. |
| Usage daily | `/v1/usage/daily` | GET | Deret penggunaan harian. |
| Usage log | `/v1/usage/log` | GET | Log per request/pemakaian. |

Untuk field request/response yang wajib dan semua schema versi terbaru, gunakan OpenAPI resmi: https://kenari.id/openapi.json.

### 10.2 Embeddings

**Endpoint:** `POST /v1/embeddings`

Embeddings mengubah satu atau beberapa input teks menjadi vector numerik yang dapat dipakai untuk semantic search, retrieval-augmented generation (RAG), clustering, atau pencarian kemiripan. Response mengikuti bentuk OpenAI list dengan `data[]`; setiap item punya `index` dan `embedding`. `usage` hanya muncul jika provider melaporkan token count.

Jangan mengasumsikan ukuran vector sama di semua model. Simpan informasi model yang dipakai untuk membuat index, dan buat ulang vector bila mengganti model/dimensi agar index konsisten.

Referensi: https://kenari.id/docs/embeddings

### 10.3 Rerank

**Endpoint:** `POST /v1/rerank`

Rerank menerima `model`, `query`, dan daftar `documents`; `top_n` dapat digunakan untuk membatasi jumlah hasil. Response berisi array `results` dengan `index` dari dokumen asal dan `relevance_score`. Urutan hasil menunjukkan ranking relevansi, bukan urutan input semula.

Pola umum: ambil kandidat menggunakan lexical/vector search, lalu kirim kandidat ke rerank agar hasil paling relevan berada di atas. Gunakan ID model yang dikembalikan katalog dengan filter `modality=rerank`.

Referensi: https://kenari.id/docs/rerank

### 10.4 Moderation

**Endpoint:** `POST /v1/moderations`

Request memakai `model` moderation dan `input`, berupa satu string atau array string. Dokumentasi menyebut maksimal 2.048 teks per request dan total teks sampai 1 MiB. Tiap hasil memuat `flagged`, `categories`, dan `category_scores`; response diselaraskan dengan nama kategori standar OpenAI.

Moderation adalah sinyal bantuan untuk kebijakan aplikasi, bukan pengganti penilaian risiko, pemeriksaan konteks, atau proses banding. Gunakan model yang memang tercatat sebagai moderation.

Referensi: https://kenari.id/docs/moderation

### 10.5 Image generation dan editing

Endpoint:

```http
POST /v1/images/generations
POST /v1/images/edits
```

Generation menerima model, prompt, serta parameter keluaran yang didukung model (contohnya `n` dan `size`). Editing menerima satu atau lebih file gambar dan instruksi editing. Tidak setiap model menerima parameter yang sama; periksa katalog dan halaman gambar.

Contoh konseptual untuk generation:

```bash
curl https://kenari.id/v1/images/generations \
  -H "Authorization: Bearer $KENARI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<MODEL_IMAGE_LIVE>",
    "prompt": "A red panda writing code on a laptop",
    "n": 1,
    "size": "1024x1024"
  }' \
  --max-time 300 --output response.json
```

Response dapat berisi `b64_json` atau URL/data URL tergantung model/format. Simpan hasil dengan decoding/base64 atau alur yang sesuai; jangan menganggap semua model mengembalikan jenis payload yang sama. Untuk image model, siapkan timeout yang lebih panjang.

Referensi: https://kenari.id/docs/images

### 10.6 Text-to-speech

**Endpoint:** `POST /v1/audio/speech`

Mengubah teks menjadi audio. Endpoint kompatibel dengan OpenAI Audio Speech, sehingga SDK OpenAI dapat digunakan dengan base URL Kenari. Hanya model TTS yang valid di endpoint ini; model lain dapat menghasilkan `400`.

Dokumentasi menjelaskan billing berdasarkan setiap 1.000 karakter input, dibulatkan ke atas. Biaya dapat direservasi saat request diterima dan dilepas jika audio tidak berhasil diberikan. Parameter voice/format berbeda mengikuti model; lihat daftar kemampuan dan halaman TTS.

Referensi: https://kenari.id/docs/audio-speech

### 10.7 Transkripsi audio

**Endpoint:** `POST /v1/audio/transcriptions`

Mengubah berkas audio menjadi teks. Response JSON dapat memuat `text`, `task`, `language`, `duration`, `segments`, dan token/metadata lain jika model menyediakannya. Mode `text` menghasilkan body transcript teks biasa, bukan JSON. Dokumentasi menyebut `srt` dan `vtt` tidak didukung dan akan kembali ke response JSON default.

Billing dijelaskan per detik audio, dibulatkan ke atas; estimasi durasi dari ukuran file dapat membuat request ditolak karena saldo tidak cukup meskipun audio terasa singkat.

Referensi: https://kenari.id/docs/audio-transcriptions

### 10.8 Musik

**Endpoint:** `POST /v1/music/generations`

Membuat musik/lagu. Proses dapat berlangsung cukup lama: dokumentasi menyebut banyak lagu memerlukan sekitar 2–3 menit, lagu lebih panjang dapat memerlukan lebih lama, dan gateway menunggu sampai 15 menit sebelum menyerah. Atur client timeout minimal 5 menit; 15 menit lebih aman untuk pekerjaan panjang.

Billing dijelaskan flat per lagu, tidak bergantung panjang lagu; generation yang gagal tidak dikenakan biaya. Request dapat menghasilkan lagu dari `lyrics` atau instrumental dari `prompt` dengan `instrumental: true`; response JSON membawa audio base64 (misalnya `data[0].b64_json`) yang perlu didecode menjadi berkas audio. Gunakan model dengan endpoint music dan jangan memakai timeout pendek seperti 30–60 detik tanpa alasan.

Referensi: https://kenari.id/docs/music

### 10.9 Video

**Endpoint utama:** `POST /v1/videos/generations` dan `POST /v1/videos/extensions`

Video generation berjalan sebagai job asinkron. Setelah POST membuat job, simpan ID lalu polling:

- `GET /v1/videos/{id}` untuk status.
- `GET /v1/videos/{id}/content` untuk mengunduh hasil selesai.

Status yang dijelaskan dokumentasi:

| Status | Arti |
|---|---|
| `rendering` | Masih berjalan; polling lagi setelah beberapa detik. |
| `done` | Video siap; `url` menunjukkan link download. |
| `failed` | Rendering gagal; biaya dikembalikan. |
| `expired` | Job tidak selesai tepat waktu; biaya dikembalikan. |

HTTP `429` atau `503` ketika polling dianggap kegagalan HTTP sementara, bukan berarti job gagal; tunggu lalu polling ulang. Hanya akun pembuat job yang dapat membaca job tersebut. Hindari loop polling rapat dan gunakan backoff yang wajar.

Referensi: https://kenari.id/docs/video

### 10.10 OCR

**Endpoint:** `POST /v1/ocr`

Untuk membaca teks dari halaman/dokumen dengan OCR. Endpoint menggunakan JSON dan membutuhkan header `Content-Type: application/json`. OCR ditagih per halaman dari saldo dan terpisah dari billing chat/plan. Gunakan saat pembacaan dokumen default tidak memadai.

Referensi: https://kenari.id/docs/ocr

### 10.11 System One

**Endpoint:** `POST /v1/systemone`

Endpoint khusus ini tidak memiliki method SDK standar pada contoh dokumentasi; gunakan HTTP langsung. Request menggunakan `model`, `state`, dan `questions` dengan struktur pertanyaan sesuai skema System One. Contoh dokumentasi menggunakan tipe pertanyaan `noul` dan `instructions`. ID model System One diambil dari referensi/metadata khusus, bukan diasumsikan tersedia dalam daftar model chat biasa.

Referensi: https://kenari.id/docs/system-one

---

## 11. Web search, page fetch, dan X search

Ketiga endpoint berikut membutuhkan API key dan dapat dipakai langsung dari aplikasi tanpa model chat berada di loop.

### 11.1 Web search

```http
POST https://kenari.id/v1/web/search
```

Request:

```json
{"query": "latest stable Rust release", "max_results": 5}
```

- `query`: wajib, tidak boleh kosong.
- `max_results`: opsional, default 5. Dokumentasi menyebut hasil efektif dibatasi ke rentang 1–10; nilai negatif atau terlalu besar yang gagal parsing dapat menghasilkan `422` teks biasa.
- Response berisi `results[]` dengan `title`, `url`, `content`, serta `id` dan `cost_micro_idr`.

### 11.2 Web fetch

```http
POST https://kenari.id/v1/web/fetch
```

Request:

```json
{"url": "https://example.com/public-article"}
```

URL wajib memakai `http://` atau `https://` dan mengarah ke host publik. Alamat private/internal ditolak untuk menghindari akses ke jaringan privat. Response memuat `title`, `content` teks biasa, `links`, `id`, dan `cost_micro_idr`.

### 11.3 X search

```http
POST https://kenari.id/v1/x/search
```

Request dapat menyertakan `query` dan objek opsional `x_search_filter`. Field filter yang dijelaskan meliputi:

- `allowed_x_handles` (maksimum 20 akun; tanpa `@`).
- `excluded_x_handles` (maksimum 20; tidak dapat digunakan bersamaan dengan `allowed_x_handles`).
- `from_date` dan `to_date` dalam `YYYY-MM-DD`; tanggal akhir tidak boleh sebelum tanggal awal.
- `enable_image_understanding` dan `enable_video_understanding` untuk pemahaman media di post.

Response berisi `answer`, `citations[]` dengan URL dan title sumber X, `id`, serta `cost_micro_idr`.

### 11.4 Billing dan akses

Setiap panggilan sukses dikenai biaya flat terpisah dari token kecuali jika ditanggung allowance plan yang sesuai. Panggilan gagal tidak dikenai biaya menurut dokumentasi. Web search/fetch dan X search memiliki paid capabilities berbeda untuk restricted key: aktifkan izin yang sesuai saat membuat key. Untuk X search, dokumentasi menyatakan billing ditarik dari saldo, sementara web search/fetch dapat tercakup plan tertentu.

Referensi: https://kenari.id/docs/web-search

---

## 12. Model gratis, PAYG, langganan, dan billing

### 12.1 PAYG

PAYG menggunakan saldo Rupiah prabayar. Penggunaan yang memenuhi kondisi billing akan diukur dan dibebankan berdasarkan harga model dan unit endpoint. Top up saldo dilakukan dari dashboard; dokumentasi menyebut QRIS mulai Rp 1.000.

### 12.2 Model gratis

Model dengan ID berakhiran `:free` tidak memotong saldo. Namun model gratis memiliki limit per menit dan kuota harian, dan limit provider/akun tetap dapat berlaku. Kuota model gratis disebut reset pukul 00:00 UTC pada dokumentasi; konversi ke waktu Indonesia perlu memperhatikan zona waktu.

Untuk menemukan model gratis secara dinamis:

```bash
curl -s https://kenari.id/v1/models \
  | jq -r '.data[] | select(.pricing.free) | .id'
```

Builtin route `kenari-free` juga dijelaskan sebagai route read-only yang memilih model gratis secara acak dan mencoba model lain saat model pilihan gagal. Route ini tidak dapat diedit atau dihapus.

### 12.3 Paket langganan

Langganan bisa menyediakan kuota untuk model chat yang tercakup dalam plan dan memiliki jendela kuota (misalnya jendela mingguan/bulanan sesuai plan). Informasi plan dan reset dapat diperiksa dari endpoint kuota. Nama plan, harga, kuota, model yang tercakup, dan aturan allowance merupakan informasi live; ambil dari dashboard atau endpoint publik yang relevan.

Dua pengaturan saat kuota plan habis yang dijelaskan dokumentasi:

- **Keep using your balance:** request dapat berlanjut dan dibayar dari saldo PAYG, tunduk pada PAYG spend limit.
- **Switch to free models:** jika PAYG balance fallback dimatikan, request yang eligible dapat diteruskan ke model gratis.
- Jika saldo continuation dan free fallback sama-sama nonaktif, request dapat ditolak dengan `429` dan kode `plan_limit_reached` sampai jendela reset atau pengaturan diubah.

### 12.4 Endpoint yang tidak ditanggung plan chat

Dokumentasi secara eksplisit menyebut plan chat tidak mencakup endpoint berikut; semuanya dibayar dari saldo:

- Image generation/editing.
- Text-to-speech, transcription, music, dan video.
- Embeddings, rerank, moderation, dan System One.
- OCR, termasuk engine `ocr` pada document reading.

Dokumen PDF yang dilampirkan ke request chat dan dibaca menggunakan cara default adalah token input biasa, sehingga dapat tercakup oleh plan yang mencakup model chat tersebut. OCR sungguhan tetap ditagih per halaman dari saldo.

### 12.5 Reservasi, pemakaian, dan pengembalian

Beberapa endpoint melakukan reservasi berdasarkan perkiraan biaya/durasi sebelum hasil selesai. Saldo yang terlihat tersedia perlu cukup untuk reservasi itu. Jika operasi gagal dan dokumentasi endpoint menyebut refund/release, biaya akan dilepaskan/dikembalikan sesuai aturan endpoint. Jangan menyimpulkan semua error selalu gratis; periksa bagian billing pada endpoint yang dipakai.

### 12.6 Kupon dan referral

Kode dapat memberikan diskon plan, trial, bonus top-up, saldo atau akses plan. Kode referral menghubungkan dua akun dan dapat memberikan cashback dari pengeluaran berbayar sesuai ketentuan. Ketentuan, validitas, batas, dan masa berlaku mengikuti dashboard serta halaman kode/referral.

Referensi:
- https://kenari.id/docs/billing
- https://kenari.id/docs/free-models
- https://kenari.id/docs/subscriptions
- https://kenari.id/docs/codes-referral

---

## 13. BYOK dan routing

### 13.1 BYOK (Bring Your Own Key)

BYOK memungkinkan pemilik akun mendaftarkan key provider sendiri lalu menggunakan provider tersebut melalui Kenari. Trafik yang benar-benar dilayani dengan key BYOK dicatat sebagai `byok` dan pemakaian tokennya tidak mengambil saldo Kenari. Namun ini bukan berarti provider upstream gratis; tagihan/kuota/provider agreement milik sendiri tetap relevan.

Pola model BYOK yang terlihat di dokumentasi menggunakan format:

```text
byok/<provider>/<model>
```

Format salah dapat menghasilkan `byok_malformed_model_id`. Pastikan provider dan model sesuai konfigurasi dashboard.

Hal yang perlu diperiksa:

- Provider key valid dan masih memiliki kuota/kredit.
- ID model sesuai format dan provider.
- Request diarahkan ke model/provider BYOK yang benar.
- Spend cap bukan mekanisme yang cocok untuk membatasi BYOK; token cap lebih tepat menurut dokumentasi karena cost Kenari pada BYOK nol.
- Pemakaian BYOK tetap harus dicatat/diobservasi agar biaya di provider asli tidak terlewat.

### 13.2 Route dan fallback

Route adalah daftar model yang dicoba dalam urutan tertentu. Bila satu langkah gagal, Kenari melanjutkan ke langkah berikutnya sesuai konfigurasi route. Client hanya mengirim nama route sebagai nilai `model`, misalnya:

```json
{
  "model": "cheap-first",
  "messages": [{"role": "user", "content": "Halo!"}]
}
```

Nama `cheap-first` di atas hanya contoh route buatan pengguna, bukan jaminan route bawaan tersedia. Route dapat diubah urutan atau backup-nya tanpa perlu mengubah kode client.

Aturan penting:

- Named route tidak tersedia untuk key yang memiliki model scope, spend cap, atau token cap.
- Shared key juga tidak dapat menggunakan named routes.
- Kenari punya route built-in `kenari-free` yang bersifat read-only dan tidak dapat dihapus.
- Tentukan urutan route sesuai prioritas: biaya, kecepatan, kualitas, dan ketersediaan. Jangan memilih route termurah tanpa mempertimbangkan kemampuan model.
- Catat model yang akhirnya melayani request jika observability aplikasi membutuhkannya.

Referensi: https://kenari.id/docs/byok dan https://kenari.id/docs/routing

---

## 14. Rate limits dan kuota

HTTP `429` tidak selalu berarti satu penyebab tunggal. Kode error `code` membantu membedakan limit yang terpicu, contohnya:

- `rate_limit_exceeded`: dapat terkait limit akun per menit, batas pembacaan usage, limit pembuatan per-tool key, burst request gratis, budget token model gratis, atau concurrency musik.
- `free_quota_rpm`: limit request-per-minute pada model gratis.
- `free_quota_daily`: kuota harian model gratis habis; dokumentasi menyebut reset 00:00 UTC.
- `plan_limit_reached`: jendela kuota plan habis dan fallback PAYG/free tidak diaktifkan.
- `upstream_error`: provider upstream membatasi request atau mengalami masalah.

Panduan umum:

1. Baca status HTTP, `error.code`, pesan, dan header `Retry-After` bila ada.
2. Jika `Retry-After` tersedia, tunggu sesuai nilainya. Jika tidak, gunakan exponential backoff dengan jitter.
3. Untuk limit model gratis, kurangi frekuensi/concurrency, pindah model free lain, atau tunggu reset.
4. Untuk limit plan, cek endpoint kuota dan konfigurasi fallback.
5. Untuk masalah provider, retry secara terbatas atau gunakan route dengan fallback.
6. Hindari request paralel berlebihan, terutama pada endpoint dengan limit concurrency.

Jangan retry tanpa batas untuk error 4xx yang tidak sementara. Gunakan idempotency/penanganan duplikasi pada aplikasi jika request dapat menyebabkan biaya atau side effect.

Referensi: https://kenari.id/docs/rate-limits

---

## 15. API akun, saldo, kuota, dan usage

Endpoint read-only akun berguna untuk mencegah job panjang gagal di tengah jalan, membuat dashboard biaya, dan mengawasi budget agent. Pembacaan akun disebut gratis, namun hak akses bergantung jenis key.

### 15.1 Ringkasan kemampuan berdasarkan key

| Jenis key | Baca saldo | Baca kuota | Baca usage |
|---|---|---|---|
| Key unrestricted | Seluruh akun | Seluruh akun | Seluruh akun |
| Restricted key | Ditolak | Ditolak | Usage key itu sendiri |
| Shared key | Ditolak | Ditolak | Ditolak |

### 15.2 Saldo

```http
GET /v1/account/balance
```

Contoh:

```bash
curl https://kenari.id/v1/account/balance \
  -H "Authorization: Bearer $KENARI_API_KEY"
```

Dokumentasi menggunakan field seperti `available_micro_idr`; konversi ke Rupiah dengan membagi nilai micro-Rupiah oleh `1_000_000`. Gunakan saldo tersedia (bukan sekadar total top-up historis) untuk keputusan apakah job dapat dijalankan.

### 15.3 Kuota akun

```http
GET /v1/account/quota
```

Response dapat memuat plan, jendela kuota, `used_rp`, `remaining_rp`, dan `resets_at`; detail bergantung akun. Waktu reset dikembalikan dengan timestamp RFC 3339/UTC. Jangan mengasumsikan nama atau jumlah jendela sama di setiap plan.

### 15.4 Usage

```http
GET /v1/usage
GET /v1/usage/daily
GET /v1/usage/log
```

Ketiganya memakai query parameter dan tidak memakai request body. Parameter yang dijelaskan mencakup:

- `start`, `end`: batas waktu Unix dalam detik; batas bersifat inklusif. `end` di masa depan dianggap waktu sekarang.
- Parameter range/pagination/filter lain tersedia sesuai endpoint; periksa halaman Usage untuk schema lengkap.
- Parameter tidak dikenal diabaikan; jika parameter diulang, nilai pertama dipakai menurut dokumentasi.

`GET /v1/usage` mengembalikan ringkasan per model dan jenis billing, disortir menurut pengeluaran, dan menyertakan baris `total`. `GET /v1/usage/daily` memberikan deret harian; `/v1/usage/log` memberikan data level request/log.

Jenis `billing_kind` yang disebut dokumentasi:

| Nilai | Arti |
|---|---|
| `payg` | Dibayar dari saldo PAYG. |
| `plan` | Tercakup kuota plan. |
| `coupon` | Tercakup kupon. |
| `token_alloc` | Tercakup alokasi token. |
| `free` | Model gratis. |
| `byok` | Dilayani dengan key provider sendiri. |

Nilai uang memakai micro-Rupiah. `cost_micro_idr` adalah nilai yang diambil dari saldo; nilainya 0 untuk plan/coupon/free/BYOK yang tidak dibayar dari saldo Kenari. `catalog_micro_idr` menunjukkan nilai setara harga katalog untuk memahami nilai pemakaian yang ditanggung sumber lain.

Rate limit khusus endpoint usage yang disebut dokumentasi: lebih dari 60 request usage per menit dapat menghasilkan `429 rate_limit_exceeded`; tidak selalu ada `Retry-After` untuk error ini. Jendela usage/daily juga dibatasi, termasuk batas sampai 366 hari pada beberapa query.

Referensi:
- https://kenari.id/docs/account
- https://kenari.id/docs/account-balance
- https://kenari.id/docs/account-quota
- https://kenari.id/docs/usage

---

## 16. Error dan troubleshooting

### 16.1 Error umum

| HTTP | Kode/gejala | Makna umum | Langkah perbaikan |
|---|---|---|---|
| `400` | `model_not_found` | ID model tidak ada di katalog dan bukan route valid. | Ambil model ID terbaru dari `/v1/models`. |
| `400` | `bad_request` | Field invalid, model tidak cocok dengan endpoint, key capability/scope tidak mengizinkan request, atau bentuk request salah. | Baca `message`, `param`, dan referensi endpoint. Gunakan model jenis endpoint yang benar. |
| `400` | `context_length_exceeded` | Prompt terlalu panjang untuk context model. | Kurangi history/input atau pilih model dengan konteks lebih besar. |
| `400` | `byok_malformed_model_id` | ID BYOK tidak berformat `byok/<provider>/<model>`. | Perbaiki prefix/provider/model. |
| `401` | `missing authorization` / `invalid key` atau body teks biasa | Key tidak dikirim, typo, terpotong, tidak diawali `kn-`, expired/dicabut, atau akun ditangguhkan. | Periksa environment variable tanpa mencetak key, kemudian buat/rotasi key bila perlu. |
| `402` | `insufficient_balance` | Saldo tidak cukup atau sumber billing yang diperlukan tidak tersedia. | Gunakan model `:free`, isi saldo, atau periksa pemakaian plan dan batas. |
| `403` | `shared_key_not_allowed`, `restricted_key_not_allowed`, kode akses lain | Key tidak memiliki otorisasi untuk endpoint atau data akun. | Gunakan key yang sesuai atau ubah scope/capability dengan sengaja. |
| `405` | Method/path salah | Sering karena base URL memiliki `/v1/v1` atau `/v1` hilang. | OpenAI: `https://kenari.id/v1`; Anthropic SDK: `https://kenari.id`. |
| `408` | Request body timeout | Body tidak terkirim lengkap dalam batas waktu. | Coba kirim ulang dan periksa upload/request body. |
| `413` | Request body too large | Ukuran body melewati batas gateway (dokumentasi menyebut 32 MiB untuk response/error terkait endpoint tersebut). | Kurangi ukuran payload atau gunakan alur yang direkomendasikan endpoint. |
| `415` | Content-Type missing/wrong | Biasanya endpoint JSON tidak menerima `Content-Type: application/json`. | Tambahkan header. |
| `422` | Failed to deserialize/parse | Ada field wajib hilang, tipe salah, atau body tidak valid. | Validasi JSON dan schema sebelum request. |
| `429` | Beragam kode limit | Rate limit, free quota, plan quota, atau provider limit. | Tangani berdasarkan `code` dan `Retry-After` jika tersedia. |
| `500` | `internal_error` | Kegagalan internal. | Retry terbatas dan sertakan request ID bila menghubungi support. |
| `503` | `all_providers_failed`, `upstream_error` | Tidak ada provider yang berhasil menangani request atau provider bermasalah. | Retry dengan backoff atau pakai fallback/route jika sesuai. |

Tabel di atas ringkasan; tidak semua kode berlaku pada setiap endpoint. Error JSON umumnya memiliki `error.message`, `error.type`, `error.param`, dan `error.code`, tetapi dokumentasi secara eksplisit menyebut sejumlah error (termasuk autentikasi dan parsing tertentu) memakai body teks biasa.

### 16.2 Checklist debugging

1. Pastikan URL endpoint tidak salah format dan tidak menggandakan `/v1`.
2. Pastikan header key sesuai format client.
3. Verifikasi model ID melalui katalog live.
4. Pastikan model memiliki endpoint/modalitas yang tepat.
5. Pastikan body JSON valid dan semua field wajib terisi.
6. Cek saldo, kuota plan, key scope/capability, dan free-tier limit.
7. Baca kode error—jangan hanya membaca status HTTP.
8. Simpan header `x-request-id` atau `request-id` dari response untuk keperluan support.
9. Pada streaming, tangani error event di stream; jangan hanya memeriksa status awal.
10. Lakukan retry hanya pada kasus yang layak diulang dan dengan backoff.

Referensi: https://kenari.id/docs/errors

---

## 17. Integrasi coding agent dan CLI

### 17.1 Claude Code langsung melalui Kenari

Claude Code menggunakan Anthropic API format. Dokumentasi menyarankan model yang mendukung tool calling; periksa `tool_call: true` pada katalog.

Contoh environment variable:

```bash
export KENARI_API_KEY='kn-...'
export ANTHROPIC_BASE_URL='https://kenari.id'
export ANTHROPIC_AUTH_TOKEN="$KENARI_API_KEY"
export ANTHROPIC_MODEL='step-3-7-flash:free'
```

`ANTHROPIC_API_KEY` juga dapat digunakan sebagai alternatif `ANTHROPIC_AUTH_TOKEN`. `ANTHROPIC_BASE_URL` tidak boleh memiliki `/v1` di ujungnya. Untuk persist, masukkan env ke shell profile atau blok `env` di settings Claude Code—lindungi file konfigurasi tersebut.

Claude Code dapat membuat request latar belakang ke model default kecil. Jika model default itu tidak tersedia pada katalog Kenari, panduan menyarankan menyetel `ANTHROPIC_DEFAULT_HAIKU_MODEL` ke model yang ada di katalog.

### 17.2 Codex

Codex modern menggunakan Responses API. Contoh konfigurasi `~/.codex/config.toml`:

```toml
model = "step-3-7-flash:free"
model_provider = "kenari"

[model_providers.kenari]
name = "kenari"
base_url = "https://kenari.id/v1"
wire_api = "responses"
env_key = "KENARI_API_KEY"
requires_openai_auth = false
```

Lalu set key di shell:

```bash
export KENARI_API_KEY='kn-...'
```

Alternatif yang dijelaskan dokumentasi: simpan melalui `codex login --with-api-key`, dengan `requires_openai_auth = true` dan tanpa `env_key`. Perintah contoh membaca key dari stdin:

```bash
printenv KENARI_API_KEY | codex login --with-api-key
```

Jangan menaruh API key pada file yang di-commit. `base_url` harus persis `https://kenari.id/v1`; `wire_api` harus `responses` untuk versi Codex yang hanya menerima Responses.

### 17.3 Kenari CLI

Paket CLI resmi:

```bash
npm install -g @kenarihq/cli
kenari login
```

CLI membutuhkan Node.js 18+ dan tool yang akan dijalankan (mis. Claude Code, Codex, atau Grok Build) harus sudah terpasang. CLI tidak memasang tool target untukmu. `kenari login` membuka browser untuk menyetujui login dan menyimpan key baru. Pada server tanpa browser, dokumentasi mendukung `kenari login --api-key`; key dibaca melalui prompt atau stdin, bukan dengan menuliskannya sebagai argumen command.

Perintah upgrade/diagnostic yang dijelaskan:

```bash
kenari update
kenari update --check
```

Model berprefix `kenari/` diarahkan ke Kenari oleh wrapper dan tidak fallback ke provider native. Untuk Codex dan Grok, model tanpa prefix tetap memakai provider native. Pada Claude Code, pemilihan model per-role/alias dan request sampingan memiliki aturan khusus. Baca panduan CLI untuk pemetaan role yang tepat.

### 17.4 Integrasi umum

Halaman Integrations adalah titik mulai untuk menghubungkan Kenari dengan client/produk lain. Prinsip umumnya:

- Pastikan client mendukung format endpoint yang dipilih.
- Samakan base URL dan wire/protocol dengan client.
- Pilih model ID live yang mendukung tools jika agen memerlukan tool execution.
- Tes dengan model `:free` terlebih dahulu.
- Cek apakah client membuat background/side requests untuk model default selain model utama.
- Gunakan restricted key jika client pihak ketiga tidak membutuhkan seluruh akses akun.

Referensi:
- https://kenari.id/docs/integrations
- https://kenari.id/docs/claude-code
- https://kenari.id/docs/codex
- https://kenari.id/docs/cli

---

## 18. Server MCP

Endpoint MCP Kenari:

```text
https://kenari.id/mcp
```

Transport yang dijelaskan adalah **Streamable HTTP**. Client mengirim pesan JSON-RPC 2.0 dengan `POST` dan menerima satu response JSON. Tidak ada server-initiated stream; `GET /mcp` menghasilkan `405`.

Fungsi server MCP mencakup:

- Mencari/membaca dokumentasi Kenari.
- Membaca katalog model live.
- Mengakses informasi akun (dengan API key yang cocok dan izin yang dibutuhkan).
- Menjalankan web search, page fetch, serta X search.

Dua tool dokumentasi dapat dipakai tanpa key; tool lainnya membutuhkan key. Shared key/restricted key memiliki batas akses dan tidak boleh dianggap mempunyai kemampuan yang sama dengan key unrestricted.

Contoh koneksi Claude Code:

```bash
claude mcp add --transport http kenari https://kenari.id/mcp \
  --header "Authorization: Bearer $KENARI_API_KEY"
```

Jika hanya ingin memakai tool publik untuk dokumentasi, header dapat dihilangkan seperti dijelaskan di panduan MCP. Perintah di atas menyimpan konfigurasi ke client; jangan mengekspos key dari shell atau konfigurasi yang dibagikan.

Referensi: https://kenari.id/docs/mcp

---

## 19. Domain

Kenari memiliki bagian dashboard untuk mencari, mendaftarkan, mengelola DNS, memperpanjang, dan mentransfer domain ke registrar lain. Pembayaran domain memakai saldo prabayar Kenari yang sama dengan AI Gateway.

### 19.1 Registrasi

Alur umum dokumentasi:

1. Cari nama domain; daftar hasil menunjukkan ekstensi yang tersedia/terdaftar dan harga tahunan.
2. Pilih **Register** untuk ekstensi yang diinginkan.
3. Isi konfigurasi registrasi, periode, serta WHOIS protection jika ekstensi mendukung.
4. Isi informasi registrant/kontak, lalu periksa konfirmasi dan bayar.
5. Status awal dapat berupa `Processing` sampai registrar selesai; setelah sukses status menjadi `Active`.

Jika saldo tidak mencukupi, top up terlebih dahulu. Jika registrar menolak registrasi, biaya dikembalikan. Jika harga berubah sebelum konfirmasi akhir, dashboard meminta persetujuan kembali sebelum pembayaran.

### 19.2 WHOIS dan pengelolaan

WHOIS protection menyembunyikan data registrant dari publik, gratis untuk ekstensi yang mendukung; dokumentasi menyebut ekstensi `.id` tidak mendukung opsi itu. Dengan menyetujui registrasi, data registrant dapat dipublikasikan sesuai kebijakan ekstensi/registrar yang berlaku.

Dashboard menyediakan pengelolaan domain termasuk DNS, renewal, status expired/redemption, dan transfer keluar. Bila tidak diperpanjang tepat waktu, domain dapat masuk masa redemption dengan biaya restore, lalu akhirnya dihapus dan dapat didaftarkan kembali pihak lain.

### 19.3 Transfer keluar

Dokumentasi menjelaskan alur umum: nonaktifkan Transfer lock, tampilkan dan salin Authorization/EPP code (kode tidak disimpan; reset membuat kode baru), lalu berikan kode pada registrar baru. Registrar lock menjadi lapisan pencegahan tambahan. Transfer masuk ke Kenari tidak tersedia langsung melalui dashboard; panduan menyarankan menghubungi Help/ticket.

Referensi: https://kenari.id/docs/domains

---

## 20. Pods

Pod adalah container aplikasi siap pakai yang berjalan di infrastruktur Kenari—misalnya AI agent atau tool workflow—dengan alamatnya sendiri, tanpa pengguna perlu mengelola server dasar. Nama dan tier aplikasi tersedia pada katalog dashboard. Dokumentasi memberi contoh aplikasi seperti Hermes Agent, WhatsApp Gateway, n8n, dan OpenClaw; katalog aktual bisa berubah.

### 20.1 Pembuatan dan tier

Alur umumnya:

1. Pilih **Create Pod**.
2. Pilih aplikasi dari katalog.
3. Pilih tier CPU, RAM, dan disk yang sesuai serta memenuhi minimum app.
4. Isi environment variables yang diminta aplikasi.
5. Konfirmasi pembuatan dan tunggu status provisioning/active.

Tier menunjukkan biaya untuk periode 30 hari. Ketersediaan kapasitas server dapat menyebabkan tier tertentu tidak tersedia saat itu. Jika aplikasi tidak ada di katalog, halaman create menyediakan cara meminta aplikasi melalui Help.

### 20.2 Billing, grace period, dan suspensi

Pod ditagih setiap 30 hari dari saldo Kenari. Jika renewal gagal karena saldo kurang, status dan masa tenggang mengikuti state pada dashboard. Top up dapat mengaktifkan pod kembali pada proses billing berikutnya. Dokumentasi menyebut pod yang tetap suspended selama 2 hari dihapus; secara keseluruhan jarak dari renewal yang terlewat sampai penghapusan disebut 3 hari. Data yang telah terhapus tidak dapat dipulihkan.

Menghapus pod secara manual bersifat permanen. Waktu berbayar tersisa umumnya hangus, kecuali dalam lima menit pertama ketika dokumentasi menyatakan refund penuh.

### 20.3 URL, console, dan password

Setiap pod memiliki URL berbentuk:

```text
https://pod-<name>.kenari.id
```

Nama host dipilih oleh Kenari dan tetap; rename di dashboard hanya mengganti label. Akses dapat melalui **Open Console** atau URL langsung menggunakan Pod password. Password yang di-reset hanya ditampilkan sekali dan reset akan mengeluarkan sesi yang menggunakan password lama. Beberapa app memiliki login internal tambahan setelah login Kenari.

### 20.4 Environment dan persistent storage

Environment variables dapat diubah dari halaman pod. Menyimpan perubahan akan membuat ulang container dan me-restart app; layanan bisa tidak tersedia sebentar, tetapi folder `/data` sebagai persistent storage tetap disimpan. Untuk field rahasia, membiarkan field kosong mempertahankan nilai lama; secret tersimpan tidak ditampilkan kembali. `POD_DOMAIN`, `POD_URL`, dan `POD_SCHEME` diatur Kenari dan tidak dapat diubah. Jika app tidak dapat mulai setelah update environment, sistem mencoba kembali ke konfigurasi sebelumnya yang bekerja.

Pod dapat memiliki operasi upgrade tier, update versi aplikasi, restart, serta delete. Update app melakukan snapshot data sebelum restart dan rollback bila versi baru gagal berjalan sesuai panduan.

Referensi: https://kenari.id/docs/pods

---

## 21. Media kit

Halaman Media kit berada dalam katalog dokumentasi produk. Gunakan sebagai sumber resmi untuk aset/penjelasan brand ketika membuat konten atau integrasi yang menyebut Kenari. Untuk logo, penggunaan merek, dan aset terbaru, buka halaman aslinya karena aset dan ketentuan dapat berubah.

Referensi: https://kenari.id/docs/media-kit

---

## 22. Pola implementasi yang direkomendasikan

Bagian ini merangkum praktik rekayasa yang konsisten dengan batasan dan kemampuan yang dijelaskan dokumentasi.

### 22.1 Simpan konfigurasi di satu tempat

Contoh environment:

```env
KENARI_API_KEY=kn-...
KENARI_BASE_URL=https://kenari.id/v1
KENARI_CHAT_MODEL=<MODEL_CHAT_LIVE>
```

Untuk Anthropic SDK/Claude Code, jangan memakai `KENARI_BASE_URL` yang ditambahkan `/v1` secara membabi buta; gunakan base URL khusus `https://kenari.id` sesuai integrasi tersebut.

### 22.2 Pilih model saat runtime

Jika aplikasi memerlukan kemampuan tertentu, ambil daftar model live lalu filter berdasarkan metadata. Jangan hanya memeriksa substring nama model. Cache katalog sementara boleh dilakukan, namun harus ada strategi refresh dan fallback jika model hilang.

### 22.3 Validasi biaya sebelum job besar

- Cek saldo dan/atau kuota sebelum batch panjang.
- Batasi panjang prompt, jumlah dokumen, jumlah hasil, dan concurrency.
- Pahami unit billing per endpoint: token chat, karakter TTS, detik audio transcription, per lagu, per halaman OCR, atau flat fee search sesuai aturan endpoint.
- Simpan usage response/request ID untuk rekonsiliasi biaya.
- Jangan mengandalkan free-tier sebagai resource tanpa batas.

### 22.4 Terapkan timeout sesuai jenis workload

- Chat biasa: timeout sesuai UX dan batas model.
- Image generation: siapkan waktu lebih panjang.
- Musik: panduan menyebut timeout 5–15 menit.
- Video: gunakan job ID dan polling, bukan menahan koneksi untuk seluruh workflow jika endpoint dirancang asinkron.
- Upload dokumen besar: pastikan waktu upload dan batas ukuran payload memadai.

### 22.5 Resilience

- Retry error sementara seperti rate limit/provider failures secara terbatas.
- Gunakan `Retry-After` jika ada; selain itu gunakan exponential backoff dan jitter.
- Jangan retry permanen pada `400` karena body salah atau model tidak ada, `401` karena key salah, dan `403` karena izin kurang tanpa memperbaiki penyebab.
- Untuk route, bedakan error upstream dengan masalah validasi request yang akan tetap terjadi pada model fallback.
- Rekam request ID (`x-request-id` atau `request-id`) pada log tanpa mencatat key.

### 22.6 Keamanan function calling

Model yang meminta tool bukan bukti bahwa tindakan tersebut sudah boleh dilakukan. Aplikasi wajib:

- Memvalidasi nama tool dan argumen.
- Memastikan user berhak menjalankan aksi.
- Memisahkan tool read-only dari tool yang mengubah/menghapus data.
- Meminta konfirmasi untuk aksi berisiko.
- Menetapkan timeout, rate limit, dan batas jumlah loop.
- Menyensor data sensitif sebelum mengirim result tool kembali ke model.

### 22.7 Gunakan key dengan least privilege

Buat key per aplikasi/per lingkungan, beri label, batas model dan paid capabilities yang minimal, expiry bila sesuai, serta cap yang sesuai. Jangan berbagi key unrestricted ke frontend atau agent yang tidak sepenuhnya tepercaya.

---

## 23. Indeks seluruh halaman resmi

Tautan berikut mencakup halaman yang muncul pada navigasi dokumentasi Kenari saat peninjauan. Ini memungkinkan pembaca lompat ke spesifikasi asli dari topik ringkas dalam file ini.

### Mulai dan panduan

- [Dokumentasi utama](https://kenari.id/docs)
- [Mulai cepat](https://kenari.id/docs/quickstart)
- [Autentikasi & API key](https://kenari.id/docs/authentication)
- [Function calling](https://kenari.id/docs/function-calling)
- [Output terstruktur](https://kenari.id/docs/structured-output)
- [Gambar & berkas sebagai input](https://kenari.id/docs/vision)
- [Baca dokumen](https://kenari.id/docs/documents)
- [Streaming](https://kenari.id/docs/streaming)
- [Penalaran / Reasoning](https://kenari.id/docs/reasoning)
- [Prompt caching](https://kenari.id/docs/prompt-caching)
- [Server tools](https://kenari.id/docs/server-tools)
- [Routing & rute](https://kenari.id/docs/routing)
- [BYOK](https://kenari.id/docs/byok)
- [Batas laju / Rate limits](https://kenari.id/docs/rate-limits)

### Referensi API

- [Chat completions](https://kenari.id/docs/chat)
- [Messages](https://kenari.id/docs/messages)
- [Responses](https://kenari.id/docs/responses)
- [Model & harga](https://kenari.id/docs/models)
- [Embeddings](https://kenari.id/docs/embeddings)
- [Rerank](https://kenari.id/docs/rerank)
- [Moderasi](https://kenari.id/docs/moderations)
- [Gambar](https://kenari.id/docs/images)
- [Text to speech](https://kenari.id/docs/audio-speech)
- [Transkripsi audio](https://kenari.id/docs/audio-transcriptions)
- [Musik](https://kenari.id/docs/music)
- [Video](https://kenari.id/docs/video)
- [OCR](https://kenari.id/docs/ocr)
- [System One](https://kenari.id/docs/systemone)
- [Pencarian web & X](https://kenari.id/docs/web-search)
- [Error](https://kenari.id/docs/errors)

### Akun dan penagihan

- [Ringkasan akun](https://kenari.id/docs/account)
- [Saldo akun](https://kenari.id/docs/account-balance)
- [Kuota akun](https://kenari.id/docs/account-quota)
- [Key per tool](https://kenari.id/docs/account-keys)
- [Pemakaian / Usage](https://kenari.id/docs/usage)
- [Cara penagihan](https://kenari.id/docs/billing)
- [Model gratis](https://kenari.id/docs/free-models)
- [Langganan](https://kenari.id/docs/subscriptions)
- [Kode & referral](https://kenari.id/docs/codes-referral)

### Integrasi dan produk lain

- [Ringkasan integrasi](https://kenari.id/docs/integrations)
- [Claude Code](https://kenari.id/docs/claude-code)
- [Codex](https://kenari.id/docs/codex)
- [CLI Kenari](https://kenari.id/docs/cli)
- [Server MCP](https://kenari.id/docs/mcp)
- [Dokumentasi untuk agen AI](https://kenari.id/docs/agent-docs)
- [Domain](https://kenari.id/docs/domains)
- [Pods](https://kenari.id/docs/pods)
- [Media kit](https://kenari.id/docs/media-kit)

---

## 24. Sumber daya mesin dan API schema

### 24.1 Full reference dan Markdown

- **Referensi penuh satu file:** https://kenari.id/llms-full.txt
- **Indeks untuk AI agent:** https://kenari.id/llms.txt
- **Dokumentasi dalam satu Markdown:** https://kenari.id/docs.md
- **Markdown per halaman:** tambahkan `.md` ke URL halaman dokumentasi, misalnya `https://kenari.id/en/docs/chat.md`.

Dokumentasi menyatakan berkas Markdown dan `llms-full.txt` dihasilkan dari halaman bahasa Inggris; URL dokumentasi non-Inggris dapat menyajikan konten Inggris yang sama ketika memakai format Markdown.

### 24.2 OpenAPI

- **OpenAPI 3.1:** https://kenari.id/openapi.json

Spesifikasi ini ditujukan untuk endpoint API `/v1`, termasuk schema request/response, bentuk error, dan skema bearer key `kn-`. Gunakan untuk membuat client generator, mengimpor ke Postman/API explorer, memeriksa tipe field, dan melakukan validasi kontrak API. Endpoint produk dashboard tertentu atau produk non-`/v1` tidak harus tercakup dalam OpenAPI tersebut.

### 24.3 Katalog model live

```bash
curl https://kenari.id/v1/models
```

Model dan harga adalah data yang berubah. Jangan menyalin ID/harga dari knowledge file ke konfigurasi jangka panjang tanpa pemeriksaan ulang. Jika membuat aplikasi, tambahkan proses pemilihan model atau konfigurasi admin yang dapat diperbarui tanpa deploy ulang.

---

## Catatan penutup

File ini sengaja menyatukan pengetahuan dari halaman-halaman dokumentasi utama ke format yang mudah dibaca manusia maupun AI agent. Untuk implementasi yang sensitif terhadap kontrak API—terutama parameter model khusus, struktur streaming, request multipart, skema tiap endpoint, serta limit harga terbaru—selalu cocokkan dengan halaman resmi dan `openapi.json` sebelum deploy.
