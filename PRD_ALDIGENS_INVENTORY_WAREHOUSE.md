# PRD — Pengembangan Sistem Inventory & Warehouse ALDIGENS

> **Dokumen instruksi implementasi untuk AI Agent**
>
> Tujuan dokumen ini adalah menjadi sumber instruksi utama bagi AI Agent yang akan melakukan perubahan pada project existing ALDIGENS. AI Agent wajib mempertahankan fitur yang masih valid dan melakukan pengembangan secara bertahap, bukan melakukan rewrite total.

---

## 1. Metadata

- **Nama sistem:** ALDIGENS Inventory & Warehouse Management System
- **Jenis:** Web Application
- **Frontend existing:** React + Vite
- **Backend existing:** Laravel API + Sanctum
- **Database:** Database existing project
- **Sumber master data awal:** `PARTNUMBER_APP.xlsx`
- **Fokus utama:** Inventory, Warehouse, stok, barang masuk/keluar, Part Number, barcode, master data, laporan.
- **Bahasa UI:** Bahasa Indonesia secara konsisten.

---

# 2. Tujuan Project

Sistem dikembangkan untuk mengurangi proses manual dalam pengelolaan:

- Part Number
- Data customer
- Data internal
- Data supplier
- Stok barang
- Barang masuk
- Barang keluar
- Warehouse
- Mutasi stok
- Barcode
- Pembelian
- Penjualan
- Produksi
- Return/Warranty
- Laporan
- Import/Export Excel
- Preview, Print, dan PDF
- Approval dan histori aktivitas

Konsep target:

```text
MASTER DATA
     |
     v
TRANSAKSI
     |
     v
WAREHOUSE
     |
     v
INVENTORY CORE
     |
     +----> STOK OTOMATIS
     |
     +----> MUTASI
     |
     +----> BARCODE
     |
     +----> LAPORAN
     |
     +----> EXCEL / PDF / PRINT
```

---

# 3. Prinsip Utama

## 3.1 Inventory adalah pusat stok

Warehouse merupakan bagian dari Inventory.

Struktur:

```text
INVENTORY
├── Data Item / Part Number
├── Warehouse
│   ├── Penerimaan Barang
│   ├── Pengeluaran Barang
│   ├── Transfer Lokasi
│   └── Stock Opname
├── Stok & Mutasi
├── Minimum / Maximum Stok
├── Scanner Barcode
├── Generate Barcode
└── Laporan Inventory
```

## 3.2 Satu sumber stok

Project existing memiliki lebih dari satu representasi stok. AI Agent WAJIB mengaudit dan membuat satu sumber kebenaran untuk stok.

Jangan sampai:

```text
Inventory = 100
Product = 95
```

Target:

```text
STOK SISTEM = SATU NILAI YANG KONSISTEN
```

Inventory transaction menjadi histori perubahan stok.

## 3.3 Semua perubahan stok melewati satu Stock/Inventory Service

Jangan membuat logika stok terpisah di setiap modul.

Contoh:

```text
PO
 -> Receive Item
 -> Inventory Stock Service
 -> Inventory Transaction
```

```text
DO
 -> Warehouse Issue
 -> Inventory Stock Service
 -> Inventory Transaction
```

```text
Production
 -> Component Consumption
 -> Inventory Stock Service
 -> Inventory Transaction
```

---

# 4. Kondisi Project Existing

AI Agent harus:

1. Menggunakan project existing.
2. Tidak membuat project baru.
3. Tidak mengganti React.
4. Tidak mengganti Laravel.
5. Tidak menghapus database existing.
6. Tidak menghapus data existing.
7. Tidak melakukan rewrite total.
8. Reuse component, controller, model, migration, API, dan logic existing jika masih relevan.
9. Melakukan backup sebelum perubahan database besar.
10. Menguji fitur existing setelah perubahan.

Project existing sudah memiliki modul yang berhubungan dengan:

- Dashboard
- Quotation
- Purchase Order
- Sales Order
- Delivery Order
- Invoice
- Product/Item
- Inventory
- Inventory Transaction
- Barcode Scanner
- Inventory Report
- User Management

Backend existing juga sudah memiliki konsep transaksi:

```text
MASUK
KELUAR
```

dengan histori:

```text
stock_before
quantity
stock_after
user
transaction_time
notes
```

Logika ini harus dipertahankan dan dikembangkan.

---

# 5. Struktur Sidebar Target

Sidebar final:

```text
DASHBOARD UTAMA

SISTEM PO
├── Penawaran (Quotation)
├── Purchase Order (PO)
├── Sales Order (SO)
├── Delivery Order (DO)
└── Invoice

INVENTORY
├── Data Item / Part Number
├── Warehouse
│   ├── Penerimaan Barang
│   ├── Pengeluaran Barang
│   ├── Transfer Lokasi
│   └── Stock Opname
├── Stok & Mutasi
├── Minimum / Maximum Stok
├── Scanner Barcode
├── Generate Barcode
└── Laporan Inventory

MASTER DATA
├── Customer
├── Internal
└── Supplier

PEMBELIAN
├── Purchase Request (PR)
├── Purchase Order (PO)
├── Receive Item
└── Return Supplier

PENJUALAN
├── Penawaran
├── Bill of Quantity (BOQ)
├── Sales Order
├── Delivery Order
├── Warranty / Return
└── Invoice

PRODUKSI
└── Bill of Material (BOM)

LAPORAN
└── Pusat Laporan

APPROVAL & HISTORY
├── Approval
└── Riwayat Penghapusan

PENGATURAN
└── Pengaturan Sistem
```

Catatan:
- Warehouse harus berada di dalam Inventory.
- Jangan membuat Warehouse sebagai top-level menu terpisah.
- Struktur menu boleh disesuaikan dengan routing existing selama fungsi akhirnya sama.
- Hak akses menu harus mengikuti role user.

---

# 6. Dashboard Utama

Dashboard harus menampilkan ringkasan Inventory dan operasional.

## KPI

Minimal:

- Total Item
- Total Stok
- Barang Masuk Hari Ini
- Barang Keluar Hari Ini
- Stok Minimum
- Stok Habis
- Jumlah Customer
- Jumlah Supplier

## Grafik

Minimal:

- Barang masuk
- Barang keluar
- Mutasi stok
- Top item berdasarkan transaksi
- Item dengan stok minimum

## Tabel

### Transaksi Terbaru

Kolom:

```text
Tanggal
Jenis
Part Number
Item
Quantity
User
Dokumen
Status
```

### Alert Stok

Kolom:

```text
Part Number
Item
Stok
Min Stock
Max Stock
Status
```

Status:

```text
AMAN
MINIMUM
KRITIS
HABIS
```

---

# 7. Master Data — Part Number

Part Number adalah identitas bisnis utama item.

Project tidak boleh lagi bergantung pada Product Code sebagai identitas utama.

Gunakan:

```text
PART NUMBER
```

sebagai identifier bisnis.

## Struktur minimal item

```text
id
part_number
customer_id
item_description
item_type
unit
minimum_stock
maximum_stock
barcode
status
created_at
updated_at
```

Field opsional sesuai kebutuhan existing:

```text
internal_part_number
selling_price
purchase_price
specification
truck_non_truck
```

Jangan menambahkan field tanpa kebutuhan.

---

# 8. Sumber Data Excel

Gunakan:

```text
PARTNUMBER_APP.xlsx
```

sebagai sumber awal Master Part Number Customer.

Sheet yang tersedia:

```text
ALL CUSTOMER
UNITED TRACTORS
KOBEXINDO
CBC
BINA PERTIWI
HYUNDAI
SANY
```

Data utama yang harus diperlakukan sebagai master:

```text
Customer
Part Number
Item Description
```

Pada sheet tertentu terdapat:

```text
Harga Jual
```

Jangan memperlakukan Excel master tersebut sebagai database transaksi.

Jangan mengarang data yang tidak tersedia.

---

# 9. Import Excel

Fitur:

```text
Import Excel
```

Alur:

```text
Upload Excel
 -> Validasi
 -> Preview
 -> Tampilkan valid/error/duplicate
 -> Konfirmasi
 -> Import Database
 -> Summary hasil import
```

Validasi minimal:

- Part Number kosong
- Duplicate Part Number
- Customer tidak ditemukan
- Satuan tidak valid
- Quantity bukan angka jika kolom quantity digunakan
- Format file salah
- Header tidak sesuai

Duplicate harus mempunyai pilihan/aturan yang jelas:

```text
UPDATE
atau
SKIP
```

Jangan langsung memasukkan data tanpa preview.

---

# 10. Export Excel

Fitur:

```text
Export Excel
```

Minimal tersedia untuk:

- Master Part Number
- Customer
- Supplier
- Inventory
- Stok
- Mutasi
- Barang Masuk
- Barang Keluar
- Stock Opname
- Laporan

---

# 11. Master Customer

Minimal:

```text
id
customer_code
customer_name
address
phone
email
status
created_at
updated_at
```

Data awal customer berasal dari Excel jika tersedia.

Data tidak boleh di-hard-code di frontend.

---

# 12. Master Internal

Minimal mendukung:

```text
Internal Part Number
Nama/Description
Kategori
Satuan
Spesifikasi
Barcode
Status
```

Jangan membuat kode produk baru apabila Part Number sudah tersedia.

---

# 13. Master Supplier

Minimal:

```text
id
supplier_code
supplier_name
address
phone
email
status
```

Digunakan oleh:

- Purchase Request
- Purchase Order
- Receive Item
- Return Supplier

---

# 14. Item Type

Minimal:

```text
BAHAN / COMPONENT
PRODUK JADI
PRODUKSI
```

Contoh:

```text
Kabel Orange -> BAHAN / COMPONENT
Kabel Putih -> BAHAN / COMPONENT
Harness hasil rakitan -> PRODUK JADI
```

---

# 15. Satuan

Minimal:

```text
PCS
METER
LOT
```

Sistem harus memungkinkan penambahan satuan jika diperlukan.

---

# 16. Warehouse

Warehouse berada di dalam Inventory.

Fitur:

```text
Penerimaan Barang
Pengeluaran Barang
Transfer Lokasi
Stock Opname
```

---

# 17. Penerimaan Barang

Mencatat barang masuk secara fisik.

Field minimal:

```text
Nomor Dokumen
Tanggal
Supplier / Sumber
Part Number
Item
Quantity
Satuan
Warehouse
Lokasi
Keterangan
Creator
```

Setelah berhasil:

```text
STOK + QUANTITY
```

Penerimaan harus membuat Inventory Transaction.

---

# 18. Pengeluaran Barang

Sumber barang keluar dapat berupa:

```text
Sales Order
Delivery Order
Produksi
Internal Request
Manual Warehouse Issue
```

Field minimal:

```text
Nomor Dokumen
Tanggal
Sumber / Tujuan
Part Number
Item
Quantity
Satuan
Warehouse
Lokasi
Keterangan
Creator
```

Setelah berhasil:

```text
STOK - QUANTITY
```

Sistem harus menolak transaksi jika quantity lebih besar dari stok tersedia, kecuali ada aturan bisnis khusus yang memang mengizinkan negative stock. Default: negative stock DILARANG.

---

# 19. Transfer Lokasi

Transfer tidak mengubah total stok.

Contoh:

```text
Warehouse A / Rak A01 / Qty 20
        |
        v
Warehouse A / Rak B03 / Qty 20
```

Total stok tetap 20.

Jika antar-warehouse:

```text
Warehouse A -> Warehouse B
```

total stok sistem tetap sama, hanya distribusi lokasi berubah.

Transfer harus mempunyai histori.

---

# 20. Stock Opname

Bandingkan:

```text
Stok Sistem
vs
Stok Fisik
```

Kolom:

```text
Part Number
Item
Warehouse
Lokasi
Stok Sistem
Stok Fisik
Selisih
Keterangan
```

Jika ada selisih:

```text
Stock Adjustment
```

harus tercatat sebagai transaksi.

Jangan mengubah angka stok tanpa histori.

---

# 21. Stok & Mutasi

Semua perubahan stok harus dicatat.

Kolom minimal:

```text
Tanggal
Nomor Dokumen
Part Number
Item
Jenis Transaksi
Quantity
Stock Before
Stock After
Warehouse
Lokasi
User
Keterangan
```

Jenis transaksi minimal:

```text
MASUK
KELUAR
TRANSFER
ADJUSTMENT
PRODUKSI MASUK
PRODUKSI KELUAR
RETURN
```

---

# 22. Aturan Perhitungan Stok

## Barang Masuk

```text
Stock Before = 100
Quantity = 20
Type = MASUK
Stock After = 120
```

## Barang Keluar

```text
Stock Before = 120
Quantity = 30
Type = KELUAR
Stock After = 90
```

## Transfer

```text
Source Stock - Quantity
Destination Stock + Quantity
```

Total stok sistem tetap.

---

# 23. Inventory Stock Service

Semua modul yang mengubah stok WAJIB menggunakan satu service/function.

Contoh:

```text
Receive Item
 -> Inventory Stock Service
 -> Inventory Transaction
```

```text
DO / Warehouse Issue
 -> Inventory Stock Service
 -> Inventory Transaction
```

```text
Production
 -> Inventory Stock Service
 -> Inventory Transaction
```

Jangan membuat logic stock update terpisah di setiap controller.

---

# 24. Atomic Stock Transaction

Gunakan database transaction.

Urutan:

```text
BEGIN TRANSACTION
1. Lock item/stock record
2. Validasi item
3. Validasi quantity
4. Validasi stock
5. Ambil stock_before
6. Hitung stock_after
7. Update stock
8. Insert inventory transaction
9. Insert reference document
10. Commit
```

Jika salah satu gagal:

```text
ROLLBACK
```

Tidak boleh terjadi:

```text
Stock berubah
tetapi Inventory Transaction gagal tersimpan.
```

---

# 25. Purchase Request (PR)

Tambah:

```text
Purchase Request
```

PR digunakan untuk permintaan kebutuhan.

Minimal:

```text
Nomor PR
Tanggal
Requester
Jenis PR
Supplier/Target Supplier
Item
Part Number
Quantity
Satuan
Keterangan
Status
Creator
Approver
```

Status:

```text
DRAFT
WAITING APPROVAL
APPROVED
REJECTED
COMPLETED
```

---

# 26. Purchase Order

Alur:

```text
PR
 -> Approval
 -> PO
 -> Receive Item
 -> Inventory
```

PO tidak langsung mengubah stok.

Yang mengubah stok adalah:

```text
Receive Item
```

---

# 27. Receive Item

Contoh:

```text
PO = 100 PCS
Receive = 60 PCS
Inventory = +60 PCS
```

Jika penerimaan berikutnya:

```text
40 PCS
```

total diterima:

```text
100 PCS
```

Receive Item harus menyimpan hubungan dengan PO jika tersedia.

---

# 28. Return Supplier

Alur:

```text
Receive Item
 -> Return Supplier
 -> Inventory -
```

Return harus mereferensikan Receive Item/PO jika tersedia.

---

# 29. Penjualan

Pertahankan:

```text
Quotation
BOQ
SO
DO
Invoice
Warranty / Return
```

Alur:

```text
CUSTOMER
 -> QUOTATION
 -> BOQ
 -> SO
 -> DO
 -> WAREHOUSE
 -> INVENTORY -
 -> INVOICE
```

Invoice tidak mengurangi stok.

Barang keluar/DO/pengeluaran yang mengurangi stok.

---

# 30. Bill of Quantity (BOQ)

Minimal:

```text
Nomor BOQ
Customer
Tanggal
Part Number
Description
Quantity
Unit
Keterangan
```

BOQ dapat menjadi referensi kebutuhan sebelum Sales Order.

---

# 31. Warranty / Return Customer

Alur:

```text
Customer Return
 -> Barang diterima
 -> Inspection
 -> Warranty/Return
```

Jika usable:

```text
Inventory +
```

Jika rusak:

```text
Quarantine / Damaged
```

Barang rusak tidak boleh langsung masuk available stock.

---

# 32. Produksi

Tambahkan:

```text
Bill of Material (BOM)
```

Contoh:

```text
PRODUK JADI:
HARNESS A

BOM:
Kabel Orange
Kabel Putih
Connector
Terminal
```

Saat produksi:

```text
Bahan
 -> Inventory -

Produksi selesai
 -> Produk Jadi
 -> Inventory +
```

---

# 33. Barcode

Barcode adalah identifier untuk scanning, bukan pengganti Part Number.

Contoh:

```text
Kabel Orange
PN: CAB-ORANGE
Barcode: 100000001
```

```text
Kabel Putih
PN: CAB-WHITE
Barcode: 100000002
```

---

# 34. Barcode Produk Jadi

Barcode produk jadi harus berbeda dari barcode bahan.

Contoh:

```text
Kabel Orange -> Barcode A
Kabel Putih  -> Barcode B
Connector    -> Barcode C

       |
       v
    PRODUKSI
       |
       v
   Harness A
       |
       v
   Barcode D
```

Barcode D adalah barcode produk jadi.

---

# 35. Scanner Barcode

Scanner harus:

1. Scan barcode.
2. Mencari item.
3. Menampilkan Part Number.
4. Menampilkan description.
5. Menampilkan stock.
6. Menampilkan unit.
7. Menampilkan warehouse/location.
8. Memilih transaksi.
9. Input quantity.
10. Menyimpan transaksi.

Contoh:

```text
SCAN
 -> Barcode ditemukan
 -> PN-001
 -> Kabel Orange
 -> Stock: 100 METER
 -> MASUK / KELUAR
 -> Quantity
 -> Simpan
 -> Stock otomatis berubah
```

---

# 36. Generate Barcode

Alur:

```text
Pilih Item
 -> Generate Barcode
 -> Preview
 -> Print
 -> Save PDF
```

Dapat digunakan untuk:

- Component
- Bahan
- Produk Jadi
- Produksi

---

# 37. Laporan Inventory

Minimal:

## Laporan Stok

```text
Part Number
Item
Warehouse
Location
Unit
Current Stock
Min Stock
Max Stock
Status
```

## Laporan Mutasi

```text
Tanggal
PN
Item
Type
Qty
Before
After
User
Dokumen
```

Tambahkan:

- Laporan Barang Masuk
- Laporan Barang Keluar
- Laporan Stock Opname
- Laporan Stok Minimum
- Laporan Produk Jadi
- Laporan Produksi jika diperlukan

---

# 38. Preview / Print / PDF

Dokumen yang relevan harus menyediakan:

```text
Preview
Print
Save as PDF
```

Minimal:

- Quotation
- BOQ
- PO
- SO
- DO
- Invoice
- PR
- Receive Item
- Return
- Stock Opname
- Stock Report
- Inventory Report
- Barcode Label

Tombol harus hanya ditampilkan jika relevan.

---

# 39. Creator & Approval

Dokumen penting harus menyimpan:

```text
Creator
Created At
Approver
Approved At
Status
```

Approval status minimal:

```text
DRAFT
WAITING APPROVAL
APPROVED
REJECTED
```

---

# 40. Role User

Minimal:

```text
Administrator
Supervisor
Admin
```

## Administrator

Akses:

- Semua modul
- User
- Role
- Hak akses
- Master data
- Approval
- Laporan

## Supervisor

Akses:

- Inventory
- Warehouse
- Transaksi
- Approval
- Laporan
- Master data sesuai kebutuhan

## Admin

Akses:

- Input transaksi
- Inventory
- Warehouse
- Barcode
- Master data sesuai kebutuhan
- Laporan

Hak akses harus configurable.

---

# 41. Riwayat Penghapusan

Data penting tidak boleh hard delete tanpa histori.

Simpan:

```text
Data / Document
User
Tanggal
Alasan
```

Contoh:

```text
PO-00012
Dihapus oleh: Admin
Tanggal: ...
Alasan: Salah input
```

---

# 42. Bahasa Sistem

Gunakan Bahasa Indonesia secara konsisten.

Istilah utama:

```text
Part Number
Item
Customer
Supplier
Internal
Inventory
Warehouse
Penerimaan Barang
Pengeluaran Barang
Transfer Lokasi
Stock Opname
Stok
Mutasi
Penawaran
Purchase Order
Sales Order
Delivery Order
Invoice
Produksi
Bill of Material
Bill of Quantity
```

Hindari penggunaan istilah yang sama untuk arti berbeda.

---

# 43. Istilah Bisnis Khusus

Jika istilah ini diperlukan dalam data perusahaan, pertahankan:

```text
WEARING HARNESS = keseluruhan
WEAR = satuan
WEARING = pengkabelan
```

Spesifikasi dapat membedakan:

```text
TRUCK
NON-TRUCK
```

Jangan mengubah definisi istilah bisnis tersebut tanpa instruksi.

---

# 44. Reference Document

Inventory Transaction harus mempunyai referensi dokumen bila tersedia:

```text
reference_type
reference_id
reference_number
```

Contoh:

```text
DO
DO-000123
```

```text
RECEIVE
RCV-000021
```

```text
PRODUCTION
PROD-000004
```

Tujuannya agar setiap perubahan stok dapat dilacak ke dokumen asal.

---

# 45. Database Design Target

AI Agent WAJIB melakukan audit schema existing sebelum membuat tabel baru.

Entitas minimal yang harus tersedia atau dipetakan ke tabel existing:

```text
users
customers
suppliers
items/products
warehouses
warehouse_locations
inventory_transactions

purchase_requests
purchase_request_items

purchase_orders
purchase_order_items

receive_items
receive_item_items

supplier_returns

quotations
quotation_items

boqs
boq_items

sales_orders
sales_order_items

delivery_orders
delivery_order_items

customer_returns

boms
bom_items

productions
production_items

barcode_records
deletion_histories
```

Tidak wajib membuat tabel baru jika schema existing sudah dapat memenuhi fungsi.

Prioritas:

```text
REUSE EXISTING > MODIFY EXISTING > CREATE NEW
```

---

# 46. Migration Rules

AI Agent:

1. Jangan menghapus migration lama.
2. Jangan menghapus data existing.
3. Buat migration baru untuk perubahan.
4. Backup database.
5. Jalankan migration.
6. Test endpoint existing.
7. Test frontend existing.
8. Test fitur baru.
9. Baru lanjut phase berikutnya.

---

# 47. UI/UX

Pertahankan style project existing.

Gunakan:

- Clean
- Modern
- Professional
- Responsive
- Blue / White / Gray
- Rounded card
- Table
- Modal
- Badge status
- Confirmation dialog
- Empty state
- Loading state
- Error state

Jangan melakukan redesign total jika tidak diperlukan.

---

# 48. Data Item UI

Tabel minimal:

```text
No
Part Number
Customer
Description
Jenis Item
Unit
Stock
Min
Max
Barcode
Status
Action
```

Action:

```text
Detail
Edit
Barcode
History
```

---

# 49. Warehouse UI

Dashboard Warehouse minimal:

```text
Total Barang Masuk
Total Barang Keluar
Transfer Hari Ini
Stock Opname
```

Card:

```text
Penerimaan Barang
Pengeluaran Barang
Transfer Lokasi
Stock Opname
```

---

# 50. Barcode UI

Dua fungsi:

```text
Scanner Barcode
Generate Barcode
```

Scanner:

```text
Camera
 -> Scan
 -> Item Detail
 -> Transaction
```

Generator:

```text
Select Item
 -> Generate
 -> Preview
 -> Print / PDF
```

---

# 51. Dashboard Stock Alert

Gunakan aturan:

```text
stock > maximum
    -> OVERSTOCK

stock <= maximum dan stock > minimum
    -> AMAN

stock <= minimum dan stock > 0
    -> MINIMUM / KRITIS

stock = 0
    -> HABIS
```

Nama status dapat disesuaikan dengan istilah UI, tetapi aturan harus konsisten.

---

# 52. Alur Besar Pembelian

```text
Purchase Request
      |
      v
Approval
      |
      v
Purchase Order
      |
      v
Receive Item
      |
      v
Warehouse
      |
      v
Inventory
      |
      v
Stock +
```

Return:

```text
Receive Item
      |
      v
Return Supplier
      |
      v
Inventory
      |
      v
Stock -
```

---

# 53. Alur Besar Penjualan

```text
Customer
   |
   v
Quotation
   |
   v
BOQ
   |
   v
SO
   |
   v
DO
   |
   v
Warehouse
   |
   v
Inventory
   |
   v
Stock -
   |
   v
Invoice
```

Return:

```text
Customer
   |
   v
Warranty / Return
   |
   v
Inspection
   |
   +----> Usable -> Inventory +
   |
   +----> Damaged -> Quarantine
```

---

# 54. Alur Produksi

```text
BOM
 |
 v
Component
 |
 v
Warehouse
 |
 v
Inventory -
 |
 v
PRODUKSI
 |
 v
Produk Jadi
 |
 v
Generate Barcode Baru
 |
 v
Inventory +
```

---

# 55. Acceptance Criteria

## Master Data

- [ ] Part Number dapat dibuat.
- [ ] Part Number dapat diedit.
- [ ] Customer dapat dikaitkan.
- [ ] Internal dapat dikelola.
- [ ] Supplier dapat dikelola.
- [ ] Excel dapat diimport.
- [ ] Duplicate dapat dideteksi.

## Inventory

- [ ] Item mempunyai Part Number.
- [ ] Stok mempunyai satu sumber kebenaran.
- [ ] Barang masuk menambah stok.
- [ ] Barang keluar mengurangi stok.
- [ ] Stok tidak boleh negatif secara default.
- [ ] Semua mutasi tercatat.
- [ ] Min Stock tersedia.
- [ ] Max Stock tersedia.

## Warehouse

- [ ] Penerimaan Barang tersedia.
- [ ] Pengeluaran Barang tersedia.
- [ ] Transfer Lokasi tersedia.
- [ ] Stock Opname tersedia.
- [ ] Warehouse dan lokasi dapat dicatat.

## Barcode

- [ ] Barcode dapat dibuat.
- [ ] Barcode dapat discan.
- [ ] Barcode mengarah ke item yang benar.
- [ ] Component mempunyai barcode.
- [ ] Produk jadi mempunyai barcode berbeda.

## Produksi

- [ ] BOM tersedia.
- [ ] Component dapat didefinisikan.
- [ ] Produksi mengurangi component.
- [ ] Produksi menambah produk jadi.
- [ ] Produk jadi mempunyai barcode baru.

## Pembelian

- [ ] PR tersedia.
- [ ] PO tersedia.
- [ ] Receive Item tersedia.
- [ ] Receive Item menambah stok.
- [ ] Return Supplier mengurangi stok.

## Penjualan

- [ ] Quotation tersedia.
- [ ] BOQ tersedia.
- [ ] SO tersedia.
- [ ] DO tersedia.
- [ ] DO/pengeluaran mengurangi stok.
- [ ] Invoice tersedia.
- [ ] Warranty/Return tersedia.

## Reporting

- [ ] Stok dapat dilihat.
- [ ] Mutasi dapat dilihat.
- [ ] Barang masuk dapat dilihat.
- [ ] Barang keluar dapat dilihat.
- [ ] Stock Opname dapat dilihat.
- [ ] Export Excel tersedia.
- [ ] Preview tersedia.
- [ ] Print tersedia.
- [ ] PDF tersedia.

## Security

- [ ] Administrator tersedia.
- [ ] Supervisor tersedia.
- [ ] Admin tersedia.
- [ ] Menu access tersedia.
- [ ] Creator tersimpan.
- [ ] Approval tersedia.
- [ ] Delete history tersedia.

---

# 56. Urutan Implementasi Wajib

AI Agent jangan mengerjakan semuanya sekaligus.

## PHASE 1 — Audit

```text
Audit project
 -> Audit frontend
 -> Audit backend
 -> Audit database
 -> Audit API
 -> Audit Inventory
 -> Audit Barcode
 -> Audit stock logic
```

Output phase:

- daftar file terkait;
- daftar tabel terkait;
- daftar API terkait;
- daftar konflik schema;
- daftar fitur existing yang dapat direuse;
- rencana migration.

Jangan melakukan perubahan besar sebelum audit selesai.

---

## PHASE 2 — Inventory Core

```text
Part Number
 -> Item
 -> Stock
 -> Inventory Transaction
```

Target:

> satu sumber stok yang konsisten.

---

## PHASE 3 — Warehouse

Implement:

```text
Penerimaan
Pengeluaran
Transfer
Stock Opname
```

---

## PHASE 4 — Master Data

Implement:

```text
Customer
Internal
Supplier
```

---

## PHASE 5 — Excel

Implement:

```text
Import
Export
Validation
Preview
Template
```

---

## PHASE 6 — Barcode

Implement:

```text
Generate
Scan
Component Barcode
Finished Goods Barcode
```

---

## PHASE 7 — Pembelian

Implement:

```text
PR
PO
Receive Item
Return Supplier
```

---

## PHASE 8 — Penjualan

Implement:

```text
Quotation
BOQ
SO
DO
Warranty / Return
Invoice
```

---

## PHASE 9 — Produksi

Implement:

```text
BOM
Production
Component Consumption
Finished Goods
New Barcode
```

---

## PHASE 10 — Reporting

Implement:

```text
Dashboard
Reports
Excel
Preview
Print
PDF
```

---

## PHASE 11 — Approval & Security

Implement:

```text
Creator
Approval
Role
Menu Access
Delete History
```

---

# 57. Aturan Pengembangan untuk AI Agent

## DILARANG

- Membuat project baru.
- Rewrite total.
- Mengganti framework.
- Menghapus fitur existing yang masih valid.
- Menghapus data existing.
- Membuat database stok kedua.
- Membuat logic stok berbeda-beda.
- Hard-code customer.
- Hard-code Part Number.
- Menghapus Product Code langsung sebelum migrasi aman.
- Mengubah isi Excel secara sembarangan.
- Membuat barcode component dan finished good sama.
- Mengubah stok tanpa Inventory Transaction.
- Mengubah stok langsung dari frontend.
- Menyelesaikan fitur hanya pada UI tanpa backend/database.
- Menyatakan fitur selesai jika belum diuji end-to-end.

## WAJIB

- Audit existing code.
- Reuse existing functionality.
- Backup database.
- Buat migration baru.
- Validasi input.
- Gunakan database transaction.
- Gunakan satu Stock Service.
- Catat semua perubahan stok.
- Simpan reference document.
- Test API.
- Test frontend.
- Test regression.
- Pertahankan data existing.
- Gunakan Part Number sebagai identifier bisnis utama.

---

# 58. Definition of Done

Sebuah fitur hanya boleh dianggap DONE jika:

```text
UI
 |
 v
API
 |
 v
DATABASE
 |
 v
VALIDATION
 |
 v
BUSINESS LOGIC
 |
 v
TRANSACTION
 |
 v
HISTORY
 |
 v
REPORT
```

sudah berjalan sesuai kebutuhan.

Contoh Penerimaan Barang:

```text
Form
 -> Submit
 -> API
 -> Validasi PN
 -> Validasi Quantity
 -> Update Stock
 -> Create Inventory Transaction
 -> Create Receive Record
 -> Update Dashboard
 -> Muncul di History
 -> Bisa Preview
 -> Bisa Print
 -> Bisa PDF
```

---

# 59. Target Akhir

```text
                         ALDIGENS
                    INVENTORY SYSTEM
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
    MASTER DATA        TRANSAKSI          WAREHOUSE
        |                  |                  |
        v                  v                  v
    PART NUMBER        PEMBELIAN         BARANG MASUK
    CUSTOMER           PENJUALAN         BARANG KELUAR
    INTERNAL            PRODUKSI          TRANSFER
    SUPPLIER            RETURN            STOCK OPNAME
        |                  |                  |
        +------------------+------------------+
                           |
                           v
                    INVENTORY CORE
                           |
             +-------------+-------------+
             |                           |
             v                           v
          BARCODE                       STOK
             |                           |
             v                           v
          SCAN                      MUTASI STOK
          GENERATE                  MIN / MAX
                                         |
                                         v
                                      LAPORAN
                                         |
                         +---------------+---------------+
                         |               |               |
                         v               v               v
                       EXCEL           PRINT            PDF
```

## Inti sistem

> **Satu database Part Number → satu sumber stok → semua aktivitas barang masuk/keluar tercatat otomatis → Warehouse dan transaksi terhubung → barcode mempercepat proses → laporan dapat direkap, dicetak, dan diekspor.**

---

# 60. Instruksi Awal untuk AI Agent

Sebelum mengubah kode:

1. Baca PRD ini sampai selesai.
2. Scan seluruh project existing.
3. Identifikasi frontend React.
4. Identifikasi backend Laravel.
5. Identifikasi routes/API.
6. Identifikasi model dan migration.
7. Identifikasi Product/Item.
8. Identifikasi Inventory.
9. Identifikasi InventoryTransaction.
10. Identifikasi Barcode.
11. Identifikasi Purchase Order.
12. Identifikasi Quotation.
13. Identifikasi Sales Order.
14. Identifikasi Delivery Order.
15. Identifikasi Invoice.
16. Identifikasi User/Role.
17. Identifikasi struktur database stok.
18. Identifikasi file Excel master Part Number.

Setelah audit:

- tampilkan ringkasan kondisi existing;
- tampilkan konflik yang ditemukan;
- tampilkan file yang akan diubah;
- tampilkan migration yang diperlukan;
- tampilkan urutan implementasi;
- baru mulai Phase 1.

**Jangan melakukan rewrite total.**

**Jangan menghapus data.**

**Jangan membuat sistem stok kedua.**

**Prioritas pertama adalah Inventory Core + Warehouse + satu sumber stok + otomatisasi stok masuk/keluar.**
