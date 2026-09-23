<?php

namespace App\Imports;

use App\Models\Product;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Collection;

/**
 * Import data produk dari file Excel.
 *
 * Struktur file yang diharapkan (header ada di baris ke-4):
 *   Part Number | Nama Barang | Jenis Barang | Satuan | Stock Awal
 *
 * Kolom "Kode Produk" TIDAK ada di Excel — dibuat otomatis (INT-XXXX).
 *
 * Beberapa hal yang ditangani di sini:
 * - Baris judul di atas header ("Database Persediaan Barang", dst) dilewati
 *   dengan memakai WithStartRow.
 * - Nama kolom dinormalisasi (huruf kecil, buang spasi/underscore) supaya
 *   toleran terhadap variasi penulisan header.
 * - Baris tanpa Nama Barang dilewati.
 * - Duplikat dideteksi berdasarkan kombinasi part_number + name.
 */
class ProductsImport implements ToCollection, WithHeadingRow
{
    /** @var int */
    protected int $imported = 0;

    /** @var int */
    protected int $skipped = 0;

    /** @var array<int, string> */
    protected array $errors = [];

    /**
     * Header berada di baris ke-4 (baris 1-3 adalah judul file).
     * Menggunakan headingRow() agar WithHeadingRow membaca baris yang benar,
     * sekaligus baris 1-3 otomatis dilewati.
     */
    public function headingRow(): int
    {
        return 4;
    }

    /**
     * Normalisasi nama kolom: "Part Number" -> "part_number".
     */
    protected function normalizeKey(string $key): string
    {
        $key = strtolower(trim($key));
        $key = preg_replace('/[^a-z0-9]+/', '_', $key);
        return trim($key, '_');
    }

    public function collection(Collection $rows)
    {
        foreach ($rows as $index => $row) {
            $data = [];

            foreach ($row as $key => $value) {
                $data[$this->normalizeKey((string) $key)] = is_string($value) ? trim($value) : $value;
            }

            $partNumber = $this->firstValue($data, ['part_number', 'partnumber', 'part_no']);
            $name       = $this->firstValue($data, ['nama_barang', 'name', 'nama']);
            $category   = $this->firstValue($data, ['jenis_barang', 'category', 'kategori']);
            $unit       = $this->firstValue($data, ['satuan', 'unit']);
            $stock      = $this->firstValue($data, ['stock_awal', 'stok_awal', 'stock', 'stok']);

            // Baris kosong / tanpa nama barang -> dilewati
            if ($name === null || $name === '') {
                $this->skipped++;
                continue;
            }

            // Normalisasi stok menjadi integer (kolom DB bertipe integer)
            $stockValue = 0;
            if ($stock !== null && $stock !== '') {
                $stockValue = (int) preg_replace('/[^0-9\-]/', '', (string) $stock);
                if ($stockValue < 0) {
                    $stockValue = 0;
                }
            }

            // Deteksi duplikat berdasarkan part_number + name
            $duplicateQuery = Product::where('name', $name);
            if ($partNumber !== null && $partNumber !== '') {
                $duplicateQuery->where('part_number', $partNumber);
            } else {
                $duplicateQuery->whereNull('part_number');
            }

            if ($duplicateQuery->exists()) {
                $this->errors[] = 'Baris ' . ($index + 1) . ': "' . $name . '" sudah ada (dilewati).';
                $this->skipped++;
                continue;
            }

            try {
                $productCode = Product::generateInternalCode();

                Product::create([
                    'product_code' => $productCode,
                    'barcode'      => $productCode,
                    'part_number'  => ($partNumber !== null && $partNumber !== '') ? $partNumber : null,
                    'name'         => $name,
                    'category'     => ($category !== null && $category !== '') ? $category : null,
                    'unit'         => ($unit !== null && $unit !== '') ? $unit : 'Unit',
                    'stock'        => $stockValue,
                ]);

                $this->imported++;
            } catch (\Exception $e) {
                $this->errors[] = 'Baris ' . ($index + 1) . ' (' . $name . '): ' . $e->getMessage();
                $this->skipped++;
            }
        }
    }

    /**
     * Ambil nilai pertama yang ada dari beberapa kemungkinan nama kolom.
     */
    protected function firstValue(array $data, array $keys)
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {
                return $data[$key];
            }
        }
        return null;
    }

    public function getImported(): int
    {
        return $this->imported;
    }

    public function getSkipped(): int
    {
        return $this->skipped;
    }

    public function getErrors(): array
    {
        return $this->errors;
    }
}
