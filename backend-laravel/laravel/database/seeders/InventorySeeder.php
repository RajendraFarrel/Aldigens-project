<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        // Pastikan nama file sesuai dengan yang Anda letakkan di folder storage/app/
        $path = storage_path('app/Persediaan Aldigens 2026.xlsx');

        if (!file_exists($path)) {
            $this->command->error("File Excel tidak ditemukan di: " . $path);
            return;
        }

        $spreadsheet = IOFactory::load($path);
        
        // Membaca sheet Inven-Mei
        $sheet = $spreadsheet->getSheetByName('Inven-Mei');
        if (!$sheet) {
            $this->command->error("Sheet 'Inven-Mei' tidak ditemukan.");
            return;
        }

        $rows = $sheet->toArray();
        $this->command->info("Memproses Data Persediaan Inventory...");

        // Looping data (mulai dari index 5 karena baris 1-4 adalah judul & header)
        foreach ($rows as $index => $row) {
            if ($index < 5) continue;

            $kategori = $row[1] ?? '-';
            $partNumber = $row[2] ?? null;
            $namaBarang = $row[3] ?? null;
            $satuan = $row[5] ?? 'Pcs';
            $stockAkhir = (int) ($row[10] ?? 0); 

            // Lewati jika nama barang kosong
            if (empty($namaBarang)) continue;

            // Jika part number kosong dari Excel, kita buatkan part number otomatis
            if (empty(trim($partNumber))) {
                $partNumber = 'INV-' . strtoupper(uniqid());
            }

            // Masukkan ke tabel products menggunakan DB Facade agar aman
            // Masukkan ke tabel products menggunakan DB Facade agar aman
            DB::table('products')->updateOrInsert(
                ['part_number' => trim($partNumber)],
                [
                    'product_code' => trim($partNumber), // <-- Tambahkan baris ini
                    'name' => trim($namaBarang),
                    'category' => trim($kategori), 
                    'unit' => trim($satuan), 
                    'stock' => $stockAkhir,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info("Data Persediaan berhasil masuk ke Inventory!");
    }
}