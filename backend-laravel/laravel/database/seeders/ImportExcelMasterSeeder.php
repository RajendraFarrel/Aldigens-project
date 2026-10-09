<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use App\Models\CustomerPartNumber;
use Illuminate\Support\Facades\Schema;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ImportExcelMasterSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        CustomerPartNumber::truncate();
        Customer::truncate();
        Schema::enableForeignKeyConstraints();

        // Sesuaikan dengan nama file Excel Anda di storage/app/
        $filePath = storage_path('app/PARTNUMBER_APP.xlsx');

        if (!file_exists($filePath)) {
            // Coba fallback ke .csv jika file .xlsx tidak ada
            $filePathCsv = storage_path('app/PARTNUMBER_APP.csv');
            if (file_exists($filePathCsv)) {
                $filePath = $filePathCsv;
            } else {
                $this->command->error("File Excel / CSV tidak ditemukan di storage/app/");
                return;
            }
        }

        try {
            $spreadsheet = IOFactory::load($filePath);
            $counter = 1;

            foreach ($spreadsheet->getWorksheetIterator() as $sheet) {
                $rows = $sheet->toArray(null, true, true, false);
                if (!$rows) continue;

                $sheetTitle = trim($sheet->getTitle());
                // Lewati sheet ALL CUSTOMER jika ada
                if (strtoupper($sheetTitle) === 'ALL CUSTOMER') continue;

                // Format PARTNUMBER_APP: baris ke-4 (index 3) biasanya adalah header
                $headerIndex = 3;
                if (!isset($rows[$headerIndex])) $headerIndex = 0;

                foreach (array_slice($rows, $headerIndex + 1) as $line) {
                    // Fallback kolom: B=Part Number (index 1), C=Description (index 2), D=Harga (index 3)
                    $partNumber  = trim($line[1] ?? '');
                    $description = trim($line[2] ?? '');
                    $sellingPrice = trim($line[3] ?? null);

                    if (empty($partNumber) || strtoupper($partNumber) === 'PART NUMBER') {
                        continue;
                    }

                    $customerName = 'PT. ' . $sheetTitle;
                    $customerCode = 'CUST-' . str_pad($counter, 3, '0', STR_PAD_LEFT);

                    $customer = Customer::firstOrCreate(
                        ['customer_name' => $customerName],
                        [
                            'customer_code' => $customerCode,
                            'address' => 'Alamat ' . $customerName,
                            'phone' => '021-' . rand(1000000, 9999999),
                            'status' => 'AKTIF'
                        ]
                    );

                    if ($customer->wasRecentlyCreated) {
                        $counter++;
                    }

                    CustomerPartNumber::updateOrCreate(
                        [
                            'customer_id' => $customer->id,
                            'part_number' => strtoupper($partNumber)
                        ],
                        [
                            'item_description' => $description ?: null,
                            'selling_price' => is_numeric(str_replace(['.', ','], ['', '.'], $sellingPrice)) ? (float) str_replace(['.', ','], ['', '.'], $sellingPrice) : null,
                            'status' => 'AKTIF'
                        ]
                    );
                }
            }

            $this->command->info("Data Master Customer dan Part Number berhasil diimpor dari Excel!");
        } catch (\Throwable $e) {
            $this->command->error("Gagal mengimpor: " . $e->getMessage());
        }
    }
}