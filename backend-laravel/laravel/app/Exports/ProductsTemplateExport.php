<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Template Excel untuk import data produk.
 *
 * Struktur sengaja dibuat SAMA PERSIS dengan yang dibaca ProductsImport:
 *  - Baris 1-3 : judul file (akan dilewati oleh importer)
 *  - Baris 4   : header -> Part Number | Nama Barang | Jenis Barang | Satuan | Stock Awal
 *  - Baris 5+  : data
 *
 * Dengan memakai template ini, pengguna tidak perlu menebak posisi header.
 */
class ProductsTemplateExport implements FromArray, WithStyles, WithColumnWidths
{
    public function array(): array
    {
        return [
            // Baris 1-3: judul (dilewati saat import)
            ['Template Import Data Produk'],
            ['PT. ALDIGENS PUTERA PERSADA'],
            ['Isi data mulai baris 5. Jangan mengubah baris header (baris 4).'],
            // Baris 4: header
            ['Part Number', 'Nama Barang', 'Jenis Barang', 'Satuan', 'Stock Awal'],
            // Baris 5: contoh (boleh dihapus)
            ['19-003-12', 'Contoh Barang', 'INV', 'Pcs', 10],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 22,
            'B' => 32,
            'C' => 16,
            'D' => 12,
            'E' => 14,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Judul file
            1 => ['font' => ['bold' => true, 'size' => 14]],

            // Header (baris 4)
            4 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '2563EB'],
                ],
                'alignment' => ['horizontal' => 'center'],
            ],

            // Contoh baris (baris 5) dibuat italic abu-abu
            5 => ['font' => ['italic' => true, 'color' => ['rgb' => '9CA3AF']]],
        ];
    }
}
