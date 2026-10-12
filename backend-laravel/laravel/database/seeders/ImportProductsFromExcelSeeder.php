<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Customer;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportProductsFromExcelSeeder extends Seeder
{
    public function run(): void
    {
        $path = storage_path('app/Persediaan Aldigens 2026.xlsx');

        if (!file_exists($path)) {
            $this->command->error("File Excel tidak ditemukan di: " . $path);
            return;
        }

        $spreadsheet = IOFactory::load($path);
        $sheetNames = $spreadsheet->getSheetNames();

        foreach ($sheetNames as $sheetName) {
            if (trim(strtoupper($sheetName)) === 'ALL CUSTOMER') continue;

            $sheet = $spreadsheet->getSheetByName($sheetName);
            $rows = $sheet->toArray(null, true, true, false);

            if (!$rows) continue;

            // Buat atau ambil data customer berdasarkan nama sheet
            $customerName = 'PT. ' . trim($sheetName);
            $customer = Customer::firstOrCreate(
                ['customer_name' => $customerName],
                [
                    'customer_code' => 'CUST-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $sheetName), 0, 5)),
                    'status'        => 'AKTIF'
                ]
            );

            foreach ($rows as $index => $row) {
                // Lewati baris header dan judul laporan di bagian atas (baris 1 s.d. 4)
                if ($index < 4) continue;

                // Membaca kolom yang sesuai dengan struktur asli file Persediaan Aldigens 2026.xlsx:
                // Kolom C (index 2) = Part Number
                // Kolom D (index 3) = Nama Barang
                // Kolom E (index 4) = Jenis Barang
                // Kolom F (index 5) = Satuan
                // Kolom H (index 7) = Stock Awal
                $partNumber  = trim($row[2] ?? '');
                $description = trim($row[3] ?? '');
                $jenis       = trim($row[4] ?? 'INV');
                $satuan      = trim($row[5] ?? 'Pcs');
                $stockAwal   = is_numeric($row[7] ?? null) ? (float) $row[7] : 0;

                // Validasi agar baris kosong atau teks header terlewati
                if (empty($partNumber) || strtoupper($partNumber) === 'PART NUMBER') {
                    continue;
                }

                Product::updateOrCreate(
                    ['part_number' => $partNumber],
                    [
                        'product_code' => $partNumber,
                        'name'         => $description !== '' ? $description : 'Item Barang',
                        'customer_id'  => $customer->id,
                        'unit'         => $satuan !== '' ? $satuan : 'PCS',
                        'stock'        => $stockAwal,
                    ]
                );
            }
        }

        $this->command->info("Berhasil mengimpor seluruh data Persediaan Aldigens dengan akurat!");
    }
}