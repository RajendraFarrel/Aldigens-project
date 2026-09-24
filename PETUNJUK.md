# 📘 Petunjuk Pengoperasian Project ALDIGENS

Dokumen ini menjelaskan cara menginstal, menjalankan, dan menggunakan sistem **Aldigens** — sebuah aplikasi manajemen penjualan & inventory.

---

## 1. Gambaran Umum Sistem

Aldigens terdiri dari **dua bagian** yang harus berjalan bersamaan:

| Bagian | Teknologi | Port Default | Folder |
|--------|-----------|--------------|--------|
| **Backend (API)** | Laravel 10 + Sanctum (PHP 8.1+) | `8000` | `backend-laravel/laravel/` |
| **Frontend (UI)** | React 19 + Vite 8 + Tailwind CSS 4 | `5173` | `frontend-react/` |

**Alur data:** Browser (React di port `5173`) → kirim request ke API (Laravel di port `8000`) → balik ke UI.

Konfigurasi alamat API disimpan di `frontend-react/.env`:
```
VITE_API_URL=http://127.0.0.1:8000/api
```

---

## 2. Modul / Fitur Aplikasi

| Modul | Halaman Frontend | Endpoint API Utama |
|-------|------------------|--------------------|
| Login | `Login.jsx` | `POST /api/login` |
| Dashboard | `Dashboard.jsx` | - |
| Quotation | `Quotation.jsx` | `/api/quotations` |
| Sales Order | `SalesOrder.jsx` | `/api/sales-orders` |
| Inventory | - | `/api/inventories`, `/api/inventories/scan/{part_number}` |
| Delivery Order | - | `/api/delivery-orders` |
| User Management | `UserManagement.jsx` | - |
| Radar Repeat Order | `RadarRepeatOrder.jsx` | - |

---

## 3. Prasyarat (Software yang Harus Terinstall)

- **PHP** versi 8.1 atau lebih baru
- **Composer** (manajer paket PHP)
- **Node.js** versi 18 atau lebih baru & **npm**
- **MySQL** (database default) — bisa juga SQLite untuk kemudahan
- **Git** (opsional)

Cek instalasi dengan perintah berikut:
```powershell
php -v
composer -V
node -v
npm -v
```

---

## 4. Instalasi Pertama Kali

> ⚠️ Folder `vendor/` (backend) dan `node_modules/` (frontend) belum ada, serta file `.env` backend juga belum dibuat. Langkah di bawah **wajib** dijalankan sekali saat pertama kali setup.

### 4.1. Setup Backend (Laravel)

Masuk ke folder backend:
```powershell
cd backend-laravel\laravel
```

**a. Install dependency PHP:**
```powershell
composer install
```

**b. Buat file konfigurasi `.env`:**
```powershell
Copy-Item .env.example .env
```

**c. Generate application key:**
```powershell
php artisan key:generate
```

**d. Konfigurasi database** — buka file `.env` dan sesuaikan bagian berikut:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=aldigens
DB_USERNAME=root
DB_PASSWORD=
```
> Buat dulu database kosong bernama `aldigens` di MySQL (bisa via phpMyAdmin/CLI).

**e. Jalankan migrasi database** (membuat semua tabel):
```powershell
php artisan migrate
```

### 4.2. Setup Frontend (React)

Buka **terminal baru**, lalu:
```powershell
cd frontend-react
npm install
```

---

## 5. Menjalankan Aplikasi (Rutin)

Jalankan **dua terminal secara bersamaan**.

### 🟢 Terminal 1 — Backend
```powershell
cd backend-laravel\laravel
php artisan serve
```
✅ Backend siap di: **http://127.0.0.1:8000**

Cek cepat apakah backend menyala — buka:
```
http://127.0.0.1:8000/api/ping
```
Jika muncul JSON `"Backend Laravel menyala..."`, berarti backend normal.

### 🔵 Terminal 2 — Frontend
```powershell
cd frontend-react
npm run dev
```
✅ Frontend siap di: **http://localhost:5173**

Buka browser ke **http://localhost:5173** dan login.

---
    
## 6. Ringkasan Perintah Harian

| Aksi | Perintah | Lokasi |
|------|----------|--------|
| Jalankan backend | `php artisan serve` | `backend-laravel/laravel` |
| Jalankan frontend | `npm run dev` | `frontend-react` |
| Build frontend (produksi) | `npm run build` | `frontend-react` |
| Preview hasil build | `npm run preview` | `frontend-react` |
| Cek lint frontend | `npm run lint` | `frontend-react` |
| Migrasi database | `php artisan migrate` | `backend-laravel/laravel` |
| Reset + isi ulang database | `php artisan migrate:fresh --seed` | `backend-laravel/laravel` |
| Bersihkan cache Laravel | `php artisan optimize:clear` | `backend-laravel/laravel` |
| Mode debug backend | tambahkan `--verbose` pada serve | `backend-laravel/laravel` |

---

## 7. Pemecahan Masalah (Troubleshooting)

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|----------------------|--------|
| Frontend error "Failed to fetch" / CORS | Backend belum jalan | Pastikan `php artisan serve` aktif di port 8000 |
| Halaman putih / data kosong | `VITE_API_URL` salah | Cek `frontend-react/.env`, harus `http://127.0.0.1:8000/api` |
| `Vite` tidak mengenali perubahan `.env` | Server perlu restart | Hentikan (`Ctrl+C`) lalu `npm run dev` ulang |
| Error koneksi database | Kredensial MySQL salah / database belum dibuat | Perbaiki `.env` & buat database `aldigens` |
| `Class not found` di Laravel | Dependency belum diinstall | Jalankan `composer install` lalu `php artisan optimize:clear` |
| Port8000 / 5173 terpakai | Aplikasi lain memakai port itu | Backend: `php artisan serve --port=8001` (sesuaikan `.env` frontend) |

### Opsi cepat tanpa MySQL (SQLite)
Jika tidak ingin mengonfigurasi MySQL:
1. Di `.env` ubah menjadi:
   ```env
   DB_CONNECTION=sqlite
   ```
2. Buat file database kosong: `backend-laravel/laravel/database/database.sqlite`
3. Jalankan: `php artisan migrate`

---

## 8. Struktur Folder

```
Aldigens-project/
├── PETUNJUK.md              ← dokumen ini
├── backend-laravel/
│   └── laravel/             ← API Laravel (backend)
│       ├── app/Http/Controllers/
│       ├── database/migrations/
│       ├── routes/api.php
│       └── .env.example
└── frontend-react/          ← UI React (frontend)
    ├── src/pages/           ← halaman aplikasi
    ├── src/components/      ← komponen (Sidebar, dll)
    ├── .env                 ← alamat API backend
    └── package.json
```

---

## 9. Alur Kerja Pengembangan (Development Flow)

1. Jalankan backend (`php artisan serve`) dan frontend (`npm run dev`).
2. Edit kode — Frontend otomatis hot-reload (HMR).
3. Jika mengubah route/controller Laravel, cukup refresh browser (server auto-reload).
4. Jika mengubah struktur database, buat migration baru lalu `php artisan migrate`.
5. Sebelum commit, jalankan `npm run lint` untuk memastikan kode frontend bersih.

---

*Terakhir diperbarui: dokumen ini dibuat untuk mempermudah onboarding & operasional harian project Aldigens.*
