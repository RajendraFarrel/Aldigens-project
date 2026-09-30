<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportExcelMasterSeeder extends Seeder
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
            // Lewati sheet 'ALL CUSTOMER'
            if (trim($sheetName) === 'ALL CUSTOMER') continue;

            $sheet = $spreadsheet->getSheetByName($sheetName);
            $rows = $sheet->toArray();

            $this->command->info("Memproses Sheet: " . $sheetName);

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

            // Looping baris data part number
            foreach ($rows as $index => $row) {
                if ($index < 3) continue; // Lewati baris header

                $partNumber = $row[1] ?? null;
                $description = $row[2] ?? null;
                $price = isset($row[3]) && is_numeric($row[3]) ? $row[3] : 0;

                if (!empty($partNumber) && $partNumber !== 'PART NUMBER') {
                    // Masukkan ke tabel customer_part_numbers dengan nama kolom yang benar
                    DB::table('customer_part_numbers')->updateOrInsert(
                        [
                            'customer_id' => $customer->id,
                            'part_number' => trim($partNumber)
                        ],
                        [
                            'item_description' => trim($description ?? '-'),
                            'selling_price' => $price, // <-- Bagian ini yang kita sesuaikan
                            'status' => 'AKTIF',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    );
                }
            }
        }

        $this->command->info("Semua data Part Number berhasil masuk ke Master Data Customer!");
    }
}