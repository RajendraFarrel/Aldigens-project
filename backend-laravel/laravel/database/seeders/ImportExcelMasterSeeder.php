<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use App\Models\Product; // Model Part Number/Product Anda
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportExcelMasterSeeder extends Seeder
{
    public function run(): void
    {
        // Path lokasi file Excel Anda di storage
        $path = storage_path('app/PARTNUMBER_APP.xlsx');

        if (!file_exists($path)) {
            $this->command->error("File Excel tidak ditemukan di: " . $path);
            return;
        }

        $spreadsheet = IOFactory::load($path);
        $sheetNames = $spreadsheet->getSheetNames();

        foreach ($sheetNames as $sheetName) {
            // Lewati sheet 'ALL CUSTOMER' jika hanya rangkuman
            if (trim($sheetName) === 'ALL CUSTOMER') continue;

            $sheet = $spreadsheet->getSheetByName($sheetName);
            $rows = $sheet->toArray();

            $this->command->info("Memproses Sheet: " . $sheetName);

            // 1. Masukkan nama sheet sebagai Master Customer (jika belum ada)
            $customerName = 'PT. ' . trim($sheetName);
            $customerCode = 'CUST-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $sheetName), 0, 5));
            
            $customer = Customer::updateOrCreate(
                ['customer_code' => $customerCode],
                [
                    'customer_name' => $customerName,
                    'status' => 'AKTIF',
                    'phone' => '-',
                    'email' => strtolower(str_replace(' ', '', $sheetName)) . '@client.co.id',
                    'address' => 'Indonesia'
                ]
            );

            // 2. Looping baris data part number di bawahnya (mulai dari baris ke-3 / index 3)
            // Sesuaikan struktur kolom berdasarkan file Excel Anda: Kolom Part Number & Deskripsi
            foreach ($rows as $index => $row) {
                if ($index < 3) continue; // Lewati baris header

                // Kolom di Excel biasanya: [No, Part Number, Description, Harga Jual]
                $partNumber = $row[1] ?? null;
                $description = $row[2] ?? null;

                if (!empty($partNumber) && $partNumber !== 'PART NUMBER') {
                    // Masukkan ke tabel Products / Part Number yang berelasi dengan Customer
                    Product::updateOrCreate(
                        ['part_number' => trim($partNumber)],
                        [
                            'name' => trim($description ?? 'Item Barang'),
                            'customer_id' => $customer->id,
                            'unit' => 'PCS',
                            'price' => isset($row[3]) && is_numeric($row[3]) ? $row[3] : 0,
                        ]
                    );
                }
            }
        }

        $this->command->info("Semua data Customer dan Part Number dari Excel berhasil diimpor ke database!");
    }
}