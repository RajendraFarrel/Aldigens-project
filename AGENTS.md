# Panduan Agent AI — Proyek Aldigens

Dokumen ini adalah titik awal orientasi untuk agent AI yang bekerja di repository Aldigens. Tujuannya memberi peta sistem dan daftar sumber yang perlu dibaca sesuai tugas—bukan menggantikan implementasi atau mengharuskan pembacaan seluruh repository.

> **Prinsip kerja:** gunakan panduan ini untuk menemukan sumber relevan, lalu verifikasi perilaku sebenarnya di kode sebelum menyimpulkan atau mengubah sesuatu. Route, controller, migration, dan pemanggil API aktual lebih otoritatif daripada dokumentasi yang mungkin tertinggal.

## Ringkasan proyek

Aldigens adalah aplikasi internal untuk proses bisnis dan operasional PT. Aldigens Putera Persada. Implementasi repository terdiri dari dua aplikasi utama:

| Bagian | Teknologi | Lokasi | Tanggung jawab |
|---|---|---|---|
| Frontend | React, Vite, Axios, Tailwind CSS | `frontend-react/` | Tampilan, halaman modul, navigasi dan pemanggilan API |
| Backend | Laravel 10, PHP 8.1+, Sanctum | `backend-laravel/laravel/` | REST API, autentikasi, aturan bisnis dan akses database |
| Database | Laravel migrations; konfigurasi koneksi di `.env` backend | `backend-laravel/laravel/database/` | Skema dan data aplikasi; proyek mendukung konfigurasi MySQL/SQLite |

Alur umum: browser → frontend React → Laravel API (`/api/...`) → database → respons API → UI. Untuk development lokal, panduan operasional menyebut frontend di `http://localhost:5173` dan backend di `http://127.0.0.1:8000`.

Frontend mengambil base URL dari `VITE_API_URL`, dengan fallback kode ke `http://127.0.0.1:8000/api`. Konfigurasi lingkungan bersifat lokal; jangan menyalin, menampilkan, atau meng-commit kredensial maupun token.

## Peta fitur

Navigasi saat ini mencakup kelompok fitur berikut (daftar aktual ada di `frontend-react/src/config/menus.js` dan implementasi pemetaan halaman di `frontend-react/src/App.jsx`):

- Pembelian dan penjualan: PR, PO, penerimaan barang, quotation, SO, DO, invoice, retur, pembayaran/penerimaan.
- Inventory dan gudang: produk/part number, stok, transaksi, penerimaan/pengeluaran/transfer, stock opname, pemindaian barcode, laporan.
- Manufaktur: BOM, work order, material release, produksi, hasil produk.
- Akuntansi: chart of accounts, jurnal/voucher, buku besar, neraca saldo, penyesuaian, laporan keuangan.
- Master data dan operasional: customer, supplier, SPK, karyawan, penjadwalan, commissioning/BAST.
- Pengguna dan pemantauan: akses menu/role, network monitoring, security status, activity log.

Nama menu bukan jaminan bahwa seluruh prosesnya diimplementasikan dengan cara yang sama. Telusuri halaman, fungsi service, route dan controller untuk fitur yang sedang dikerjakan.

## Titik masuk kode

### Frontend

- `frontend-react/src/main.jsx` — bootstrap React dan `ThemeProvider`.
- `frontend-react/src/App.jsx` — autentikasi UI, state tab aktif, judul, dan pemetaan menu ke komponen halaman. Navigasi utama berbasis `activeTab`, bukan router URL.
- `frontend-react/src/config/menus.js` — sumber daftar grup/menu dan aturan menu yang diizinkan berdasarkan user/role.
- `frontend-react/src/components/Sidebar.jsx` — navigasi samping.
- `frontend-react/src/pages/` — halaman fitur; modul akuntansi berada di `src/pages/accounting/`.
- `frontend-react/src/services/api.js` — Axios client utama, base URL, token Bearer, penanganan 401, dan fungsi API yang dipakai sejumlah fitur.
- `frontend-react/src/services/accountingApi.js` — service khusus akuntansi; mulai dari sini untuk menelusuri API akuntansi.
- `frontend-react/src/context/ThemeContext.jsx` — state tema.

### Backend

- `backend-laravel/laravel/routes/api.php` — daftar endpoint dan middleware; titik awal untuk menemukan controller/API suatu fitur.
- `backend-laravel/laravel/app/Http/Controllers/` — validasi dan alur bisnis HTTP. Controller API tertentu dikelompokkan di `Controllers/Api/`.
- `backend-laravel/laravel/app/Models/` — model Eloquent dan relasi data.
- `backend-laravel/laravel/app/Services/` — logika domain yang digunakan ulang, misalnya layanan stok inventory.
- `backend-laravel/laravel/database/migrations/` — sumber skema database berurutan; buat migration baru untuk perubahan skema, jangan mengandalkan edit database manual.
- `backend-laravel/laravel/database/seeders/` dan `database/factories/` — data awal/pengujian.
- `backend-laravel/laravel/tests/` — pengujian PHPUnit; cek feature test terkait sebelum dan sesudah perubahan backend.
- `backend-laravel/laravel/config/` — konfigurasi Laravel, termasuk database, auth, CORS, dan Sanctum.

## Pola sistem yang perlu diketahui

- Endpoint `POST /api/login` dan `GET /api/ping` didefinisikan sebagai route publik. Sebagian besar endpoint API lainnya dikelompokkan dengan middleware `auth:sanctum` di `routes/api.php`.
- Client API frontend mengambil `auth_token` dari `localStorage` dan mengirimkannya sebagai `Authorization: Bearer ...`. Respons 401 membersihkan token/user dan memicu event logout.
- Akses menu di frontend dihitung di `src/config/menus.js`; ini adalah kontrol navigasi UI, bukan pengganti otorisasi server. Untuk perubahan keamanan, periksa middleware/policy/validasi backend juga.
- Tab aktif dan identitas login disimpan di `localStorage` (`aldigens_active_tab`, `auth_token`, `auth_user`). Hati-hati mengubah perilaku sesi/logout agar state terkait dibersihkan konsisten.
- Sebagian operasi memiliki efek lintas modul: misalnya route persetujuan DO mengarah ke `DeliveryOrderController::approve` dan keterangan kode menyatakan stok inventory berkurang otomatis. Periksa transaksi database dan tes terkait sebelum mengubah alur stok.
- Frontend punya service khusus akuntansi selain client umum; jangan mengasumsikan seluruh halaman memanggil API hanya melalui satu file service.

## Orientasi cepat berdasarkan jenis tugas

| Jika tugas menyangkut… | Mulai dari… | Lanjutkan ke… |
|---|---|---|
| Halaman/menu frontend | `src/App.jsx`, `src/config/menus.js` | halaman terkait, `Sidebar.jsx`, service yang dipanggil |
| Request/API frontend | `src/services/api.js` atau `accountingApi.js` | penggunaan fungsi service di halaman dan route backend |
| Endpoint/backend | `routes/api.php` | controller, service, model, migration dan test terkait |
| Skema/data | migration terkait | model, controller/service, seeder dan test |
| Login/akses | `src/pages/Login.jsx`, `src/App.jsx` | `AuthController`, route middleware, role/menu access |
| Inventory/stok | route inventory | `InventoryWarehouseController`, `InventoryStockService`, model/migration serta test |
| Akuntansi | halaman di `src/pages/accounting/` | `accountingApi.js`, route `/accounting/...`, controller laporan/voucher, model dan migration |
| Bug/regresi | gejala dan alur UI aktual | request jaringan → route → controller/service → DB; jalankan tes/lint/build yang relevan |

Tidak perlu membuka semua file sekaligus. Ikuti satu alur fitur secara vertikal dari UI sampai persistence dan test.

## Perintah development dan verifikasi

Jalankan perintah dari folder aplikasi yang sesuai:

```powershell
# Frontend: dari frontend-react/
npm run dev
npm run lint
npm run build

# Backend: dari backend-laravel/laravel/
php artisan serve
php artisan route:list --path=api
php artisan test
php artisan migrate
```

Backend dan frontend berjalan terpisah. Sebelum menyimpulkan masalah UI, pastikan base URL dan backend tersedia; endpoint pengecekan publik adalah `GET /api/ping`. Sebelum migrasi yang berpotensi mengubah data, periksa isi migration dan lingkungan database aktif. Jangan menjalankan `migrate:fresh` pada data yang perlu dipertahankan.

## Panduan perubahan untuk agent

1. Tentukan alur dan dampak perubahan; cari route, komponen, controller, dan test yang relevan saja.
2. Jaga kontrak API (URL, metode, payload, status, dan bentuk respons) antara frontend dan backend.
3. Untuk perubahan data, gunakan migration dan pertahankan relasi/integritas transaksi. Perhatikan efek samping seperti perubahan stok atau status dokumen.
4. Untuk perubahan menu/akses, periksa definisi menu, pemetaan halaman, UI, serta penegakan otorisasi backend.
5. Tambahkan/perbarui tes yang sesuai; jalankan tes, lint, atau build relevan dan laporkan bila ada yang tidak dapat dijalankan.
6. Jangan mengubah file environment, log, probe/debug, output build, atau dependency/vendor yang tidak terkait dengan permintaan.
7. Hindari mengasumsikan bahwa README template, nama file, komentar lama, atau dokumen setup selalu mencerminkan perilaku implementasi terkini.

## Dokumen dan keterbatasannya

- `PETUNJUK.md` — panduan setup, menjalankan aplikasi, dan troubleshooting lokal. Berguna untuk prasyarat/perintah, tetapi rincian modulnya bisa lebih ringkas atau tertinggal dibanding route dan kode aktual.
- `frontend-react/README.md` — masih berupa README template React + Vite; bukan dokumentasi domain Aldigens.
- `package.json` di root — hanya memuat beberapa dependency; script frontend ada di `frontend-react/package.json`, sedangkan dependency/script backend dikelola oleh `backend-laravel/laravel/composer.json` dan Artisan.

Jika ada konflik, verifikasi kode aktif dan konfigurasi aplikasi yang relevan, lalu perbarui dokumentasi hanya bila diminta atau memang bagian dari tugas.
