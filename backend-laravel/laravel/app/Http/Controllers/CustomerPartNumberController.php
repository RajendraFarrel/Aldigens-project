<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerPartNumber;
use Illuminate\Http\Request;
use App\Exports\CustomerPartNumbersTemplateExport;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class CustomerPartNumberController extends Controller
{
    private function key(string $value): string
    {
        return trim(strtolower(preg_replace('/[^a-z0-9]+/', '_', $value)), '_');
    }

    private function value(array $row, array $keys)
    {
        foreach ($keys as $key) if (isset($row[$key]) && trim((string) $row[$key]) !== '') return trim((string) $row[$key]);
        return null;
    }

    public function index(Request $request)
    {
        $query = CustomerPartNumber::with('customer')->orderBy('customer_id')->orderBy('part_number');
        if ($request->filled('customer_id')) $query->where('customer_id', $request->integer('customer_id'));
        if ($request->filled('search')) $query->where(fn($q) => $q->where('part_number', 'like', '%' . $request->search . '%')->orWhere('item_description', 'like', '%' . $request->search . '%'));
        return response()->json(['data' => $query->get(), 'summary' => ['total_customer' => CustomerPartNumber::distinct('customer_id')->count('customer_id'), 'total_part_number' => CustomerPartNumber::count()]]);
    }

    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:xlsx,xls,csv|max:20480']);

        $imported = 0;
        $skipped = 0;
        $errors = [];

        try {
            // PARTNUMBER_APP.xlsx memakai satu sheet untuk tiap customer. Header bisa
            // berada di baris mana pun (file lama biasanya mulai di baris ke-4).
            $spreadsheet = IOFactory::load($request->file('file')->getRealPath());
            DB::transaction(function () use ($spreadsheet, &$imported, &$skipped, &$errors) {
                foreach ($spreadsheet->getWorksheetIterator() as $sheet) {
                    $this->importSheet($sheet, $imported, $skipped, $errors);
                }
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Gagal mengimpor file: ' . $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Import selesai.',
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => array_values(array_unique($errors)),
        ]);
    }

    private function importSheet(Worksheet $sheet, int &$imported, int &$skipped, array &$errors): void
    {
        $rows = $sheet->toArray(null, true, true, false);
        if (!$rows) return;

        $headerIndex = null;
        foreach ($rows as $index => $line) {
            $headers = array_map(fn($value) => $this->key((string) $value), $line);
            if (in_array('part_number', $headers, true) || in_array('partnumber', $headers, true) || in_array('part_no', $headers, true)) {
                $headerIndex = $index;
                break;
            }
        }
        $sheetCustomer = trim($sheet->getTitle());
        $sheetCustomer = strtoupper($sheetCustomer) === 'ALL CUSTOMER' ? null : $sheetCustomer;

        // Format PARTNUMBER_APP lama: tiga baris awal adalah judul/header,
        // Part Number berada di kolom B, deskripsi di C, dan harga di D.
        // Pada beberapa worksheet header berupa gambar/merge sehingga tidak
        // terbaca sebagai nilai sel. Karena itu gunakan fallback posisi kolom.
        if ($headerIndex === null) {
            $headerIndex = 2;
            $headers = ['customer', 'part_number', 'item_description', 'selling_price', 'status'];
            $legacyFormat = true;
        } else {
            $headers = array_map(fn($value) => $this->key((string) $value), $rows[$headerIndex]);
            $legacyFormat = false;
        }

        foreach (array_slice($rows, $headerIndex + 1) as $line) {
            if ($legacyFormat) {
                $row = [
                    'customer' => $line[0] ?? null,
                    'part_number' => $line[1] ?? null,
                    'item_description' => $line[2] ?? null,
                    'selling_price' => $line[3] ?? null,
                    'status' => $line[4] ?? null,
                ];
            } else {
                $row = [];
                foreach ($headers as $i => $header) if ($header !== '') $row[$header] = $line[$i] ?? null;
            }

            $customerName = $this->value($row, ['customer', 'customer_name', 'pelanggan']) ?: $sheetCustomer;
            $part = $this->value($row, ['part_number', 'partnumber', 'part_no']);
            $description = $this->value($row, ['item_description', 'description', 'nama_barang', 'nama_produk', 'item']);

            // Lewati baris kosong atau baris judul yang ikut terbaca sebagai data.
            if (!$customerName || !$part || strtoupper($part) === 'PART NUMBER' || strtoupper($part) === 'PARTNUMBER') {
                if (array_filter($line, fn($value) => trim((string) $value) !== '')) $skipped++;
                continue;
            }

            $customer = $this->findOrCreateCustomer($customerName);
            CustomerPartNumber::updateOrCreate(
                ['customer_id' => $customer->id, 'part_number' => $part],
                [
                    'item_description' => $description,
                    'selling_price' => $this->numberValue($this->value($row, ['harga_jual', 'selling_price', 'harga', 'price'])),
                    'status' => strtoupper($this->value($row, ['status']) ?: 'AKTIF'),
                ]
            );
            $imported++;
        }
    }

    private function findOrCreateCustomer(string $name): Customer
    {
        $name = trim(preg_replace('/\\s+/', ' ', $name));
        $normalizedName = $this->normalizeCustomerName($name);
        $customer = Customer::where('customer_code', $name)->first();
        if (!$customer) {
            $customer = Customer::get()->first(fn ($item) => $this->normalizeCustomerName($item->customer_name) === $normalizedName);
        }
        if ($customer) return $customer;

        $clean = strtoupper(substr(preg_replace('/[^A-Z0-9]/i', '', $name), 0, 8)) ?: 'IMPORT';
        $code = 'CUST-' . $clean;
        $suffix = 1;
        while (Customer::where('customer_code', $code)->exists()) $code = 'CUST-' . $clean . '-' . $suffix++;

        $displayName = preg_match('/^PT\\.?\\s+/i', $name) ? $name : 'PT. ' . $name;
        return Customer::create([
            'customer_code' => $code,
            'customer_name' => $displayName,
            'phone' => null,
            'email' => null,
            'address' => null,
            'status' => 'AKTIF',
        ]);
    }

    private function normalizeCustomerName(string $name): string
    {
        return trim(preg_replace('/^PT\\.?\\s+/i', '', strtolower(preg_replace('/\\s+/', ' ', $name))));
    }

    private function numberValue($value): ?float
    {
        if ($value === null || trim((string) $value) === '') return null;
        $value = trim((string) $value);
        if (is_numeric($value)) return (float) $value;
        $value = str_replace('.', '', $value);
        $value = str_replace(',', '.', $value);
        return is_numeric($value) ? (float) $value : null;
    }

    /**
     * Unduh template import Data Customer.
     * Satu sheet untuk setiap PT/customer, mengikuti format PARTNUMBER_APP.xlsx.
     */
    public function downloadTemplate()
    {
        return Excel::download(new CustomerPartNumbersTemplateExport(), 'template-import-data-customer.xlsx');
    }

    public function export()
    {
        $rows = CustomerPartNumber::with('customer')->get();
        $csv = "Customer,Part Number,Item Description,Harga Jual,Status\n";
        foreach ($rows as $row) $csv .= implode(',', array_map(fn($v) => '"' . str_replace('"', '"', (string) $v) . '"', [$row->customer->customer_name, $row->part_number, $row->item_description, $row->selling_price, $row->status])) . "\n";
        return response($csv)->header('Content-Type', 'text/csv')->header('Content-Disposition', 'attachment; filename=data-customer.csv');
    }
}
