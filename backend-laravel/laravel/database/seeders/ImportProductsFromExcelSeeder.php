<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product; // Sesuaikan dengan nama model produk Anda
use App\Models\Customer;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportProductsFromExcelSeeder extends Seeder
{
    public function run(): void
    {
        $path = storage_path('app/PARTNUMBER_APP.xlsx');

        if (!file_exists($path)) {
            $this->command->error("File Excel tidak ditemukan di: " . $path);
            return;
        }

        $spreadsheet = IOFactory::load($path);
        $sheetNames = $spreadsheet->getSheetNames();

        foreach ($sheetNames as $sheetName) {
            if (trim($sheetName) === 'ALL CUSTOMER') continue;

            $sheet = $spreadsheet->getSheetByName($sheetName);
            $rows = $sheet->toArray();

            // Cari atau buat data customer berdasarkan nama sheet
            $customerName = 'PT. ' . trim($sheetName);
            $customer = Customer::firstOrCreate(
                ['customer_name' => $customerName],
                [
                    'customer_code' => 'CUST-' . strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $sheetName), 0, 5)),
                    'status' => 'AKTIF'
                ]
            );

            foreach ($rows as $index => $row) {
                if ($index < 3) continue; // Lewati header

                // Sesuaikan urutan kolom dari Excel Anda
                $partNumber = $row[1] ?? null;
                $description = $row[2] ?? null;

                if (!empty($partNumber) && $partNumber !== 'PART NUMBER') {
                    Product::updateOrCreate(
                        ['part_number' => trim($partNumber)],
                        [
                            'product_code' => trim($partNumber),
                            'name' => trim($description ?? 'Item Barang'),
                            'customer_id' => $customer->id,
                            'unit' => 'PCS',
                            'stock' => 0,
                        ]
                    );
                }
            }
        }

        $this->command->info("Berhasil mengimpor seluruh Part Number dari Excel ke database!");
    }
}