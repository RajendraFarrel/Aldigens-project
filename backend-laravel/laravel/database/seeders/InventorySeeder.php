<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Inventory;
use PhpOffice\PhpSpreadsheet\IOFactory;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        $filePath = database_path('seeders/Persediaan Aldigens 2026.xlsx'); 

        if (!file_exists($filePath)) {
            $this->command->error("File Excel tidak ditemukan di path: {$filePath}");
            return;
        }

        $spreadsheet = IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray();

        $autoInc = 1;

        for ($i = 4; $i < count($rows); $i++) {
            $row = $rows[$i];
            
            $category = $row[1] ?? 'UMUM';
            $partNumber = $row[2] ?? null;
            $itemName = $row[3] ?? null;
            $unit = $row[5] ?? 'Pcs';
            $price = is_numeric($row[6]) ? $row[6] : 0;

            if (!$itemName) continue;

            // Jika part_number kosong di Excel, buatkan kode otomatis agar tidak null
            if (empty($partNumber)) {
                $partNumber = 'AUTO-' . str_pad($autoInc++, 4, '0', STR_PAD_LEFT);
            }

            Inventory::updateOrCreate(
                ['part_number' => $partNumber],
                [
                    'item_name' => $itemName,
                    'category' => $category,
                    'unit' => $unit,
                    'selling_price' => $price,
                    'stock_quantity' => 0
                ]
            );
        }

        $this->command->info('Data inventaris berhasil diimpor!');
    }
}
