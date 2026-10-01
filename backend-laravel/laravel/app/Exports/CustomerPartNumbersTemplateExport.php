<?php

namespace App\Exports;

use App\Models\Customer;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use PhpOffice\PhpSpreadsheet\Style\Fill;

/**
 * Template Excel untuk import Data Customer (part number per customer).
 *
 * Setiap sheet mewakili satu customer/PT:
 *   - Baris 1 : judul file (dilewati importer)
 *   - Baris 2 : nama customer (dilewati importer)
 *   - Baris 3 : Petunjuk pengisian (dilewati importer)
 *   - Baris 4 : header -> No | Part Number | Item Description | Harga Jual | Status
 *   - Baris 5+: data
 *
 * Nama sheet dipakai importer sebagai nama customer, sehingga user cukup
 * menyalin/menambah sheet dan mengganti isinya tanpa mengubah struktur.
 */
class CustomerPartNumbersTemplateExport implements FromArray, WithMultipleSheets, WithStyles, WithColumnWidths
{
    private array $sheets = [];

    public function __construct()
    {
        $customers = Customer::orderBy('customer_name')->get();

        foreach ($customers as $customer) {
            $this->sheets[] = new class($customer->customer_name) implements FromArray, WithStyles, WithColumnWidths
            {
                public function __construct(private string $customerName) {}

                public function array(): array
                {
                    return [
                        ['Template Import Data Customer - Part Number'],
                        ['Customer: ' . $this->customerName],
                        ['Isi data mulai baris 5. Jangan mengubah baris header (baris 4).'],
                        ['No', 'Part Number', 'Item Description', 'Harga Jual', 'Status'],
                        [1, 'CONTOH-PART-001', 'Contoh nama barang', 0, 'AKTIF'],
                    ];
                }

                public function title(): string
                {
                    return $this->sheetTitle();
                }

                public function columnWidths(): array
                {
                    return ['A' => 6, 'B' => 24, 'C' => 40, 'D' => 16, 'E' => 14];
                }

                public function styles(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet)
                {
                    return [
                        1 => ['font' => ['bold' => true, 'size' => 14]],
                        2 => ['font' => ['bold' => true, 'color' => ['rgb' => '1D4ED8']]],
                        3 => ['font' => ['italic' => true, 'color' => ['rgb' => '6B7280']]],
                        4 => [
                            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                            'fill' => [
                                'fillType' => Fill::FILL_SOLID,
                                'startColor' => ['rgb' => '2563EB'],
                            ],
                            'alignment' => ['horizontal' => 'center'],
                        ],
                        5 => ['font' => ['italic' => true, 'color' => ['rgb' => '9CA3AF']]],
                    ];
                }

                private function sheetTitle(): string
                {
                    $title = preg_replace('/[\\\\\/\?\*\[\]:]/', ' ', strtoupper(trim($this->customerName)));
                    $title = trim(preg_replace('/\s+/', ' ', $title));
                    return substr($title ?: 'CUSTOMER', 0, 31);
                }
            };
        }

        // Sheet contoh agar user punya pola pengisian ketika customer baru dibuat.
        $this->sheets[] = new class implements FromArray, WithStyles, WithColumnWidths
        {
            public function array(): array
            {
                return [
                    ['Template Import Data Customer - Part Number'],
                    ['Customer: (ganti dengan nama PT, atau rename sheet ini sesuai PT)'],
                    ['Isi data mulai baris 5. Jangan mengubah baris header (baris 4).'],
                    ['No', 'Part Number', 'Item Description', 'Harga Jual', 'Status'],
                    [1, 'CONTOH-PART-001', 'Contoh nama barang', 0, 'AKTIF'],
                ];
            }

            public function title(): string
            {
                return 'CONTOH CUSTOMER BARU';
            }

            public function columnWidths(): array
            {
                return ['A' => 6, 'B' => 24, 'C' => 40, 'D' => 16, 'E' => 14];
            }

            public function styles(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet)
            {
                return [
                    1 => ['font' => ['bold' => true, 'size' => 14]],
                    2 => ['font' => ['bold' => true, 'color' => ['rgb' => '1D4ED8']]],
                    3 => ['font' => ['italic' => true, 'color' => ['rgb' => '6B7280']]],
                    4 => [
                        'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => '2563EB'],
                        ],
                        'alignment' => ['horizontal' => 'center'],
                    ],
                    5 => ['font' => ['italic' => true, 'color' => ['rgb' => '9CA3AF']]],
                ];
            }
        };
    }

    public function sheets(): array
    {
        return $this->sheets;
    }

    public function columnWidths(): array
    {
        return [];
    }

    public function styles(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet)
    {
        return [];
    }
}
