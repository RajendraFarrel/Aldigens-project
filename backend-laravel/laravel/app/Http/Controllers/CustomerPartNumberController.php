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

    public function store(Request $request)
    {
        $request->validate([
            'customer_id'           => 'required|exists:customers,id',
            'part_number'           => 'required|string|max:100',
            // Validasi untuk Jembatan Inventory
            'inventory_part_number' => 'nullable|string|max:255', 
            'item_description'      => 'nullable|string|max:255',
            'selling_price'         => 'nullable|numeric|min:0',
            'status'                => 'nullable|string|in:AKTIF,NONAKTIF',
        ]);

        $record = CustomerPartNumber::updateOrCreate(
            ['customer_id' => $request->customer_id, 'part_number' => $request->part_number],
            [
                'inventory_part_number' => $request->inventory_part_number, // Simpan Mapping 
                'item_description'      => $request->item_description,
                'selling_price'         => $request->selling_price,
                'status'                => strtoupper($request->status ?? 'AKTIF'),
            ]
        );

        return response()->json(['message' => 'Data berhasil disimpan.', 'data' => $record->load('customer')], 201);
    }

    public function update(Request $request, $id)
{
    $record = CustomerPartNumber::findOrFail($id);

    $request->validate([
        'customer_id'           => 'required|exists:customers,id',
        'part_number'           => 'required|string|max:100',
        'inventory_part_number' => 'nullable|string|max:255',
        'item_description'      => 'nullable|string|max:255',
        'selling_price'         => 'nullable|numeric|min:0',
        'status'                => 'nullable|string|in:AKTIF,NONAKTIF',
    ]);

    $record->update([
        'customer_id'           => $request->customer_id,
        'part_number'           => $request->part_number,
        'inventory_part_number' => $request->inventory_part_number,
        'item_description'      => $request->item_description,
        'selling_price'         => $request->selling_price,
        'status'                => strtoupper($request->status ?? 'AKTIF'),
    ]);

    return response()->json(['message' => 'Data berhasil diperbarui.', 'data' => $record->load('customer')]);
}

    public function destroy($id)
    {
        $record = CustomerPartNumber::findOrFail($id);
        $record->delete();
        return response()->json(['message' => 'Data berhasil dihapus.']);
    }

    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:xlsx,xls,csv|max:20480']);

        $imported = 0;
        $skipped = 0;
        $errors = [];

        try {
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
            if (
                in_array('part_number', $headers, true) ||
                in_array('partnumber', $headers, true) ||
                in_array('part_no', $headers, true)
            ) {
                $headerIndex = $index;
                break;
            }
        }

        $sheetTitle = trim($sheet->getTitle());
        $sheetCustomer = strtoupper($sheetTitle) === 'ALL CUSTOMER' ? null : $sheetTitle;

        if ($headerIndex === null) {
            $headerIndex = 3; 
            // Tambahkan inventory_part_number ke legacy header array
            $headers = ['no', 'part_number', 'item_description', 'selling_price', 'status', 'inventory_part_number'];
            $legacyFormat = true;
        } else {
            $headers = array_map(fn($value) => $this->key((string) $value), $rows[$headerIndex]);
            $legacyFormat = false;
        }

        foreach (array_slice($rows, $headerIndex + 1) as $line) {
            if ($legacyFormat) {
                $row = [
                    'no'                    => $line[0] ?? null,
                    'part_number'           => $line[1] ?? null,
                    'item_description'      => $line[2] ?? null,
                    'selling_price'         => $line[3] ?? null,
                    'status'                => $line[4] ?? null,
                    // Tarik kolom E (index 5) di excel jika ada sebagai inventory code
                    'inventory_part_number' => $line[5] ?? null, 
                ];
            } else {
                $row = [];
                foreach ($headers as $i => $header) {
                    if ($header !== '') $row[$header] = $line[$i] ?? null;
                }
            }

            $customerName = $this->value($row, ['customer', 'customer_name', 'pelanggan']) ?: $sheetCustomer;
            $part         = $this->value($row, ['part_number', 'partnumber', 'part_no']);
            $description  = $this->value($row, ['item_description', 'description', 'deskripsi', 'nama_barang', 'nama_produk', 'item']);
            
            // Baca kolom untuk Kode Internal Inventory jika ada di dalam file Excel
            $inventoryCode = $this->value($row, ['inventory_part_number', 'kode_inventory', 'inventory_code', 'kode_internal']);

            if (
                !$part ||
                strtoupper(trim($part)) === 'PART NUMBER' ||
                strtoupper(trim($part)) === 'PARTNUMBER'
            ) {
                if (array_filter($line, fn($value) => trim((string) $value) !== '')) $skipped++;
                continue;
            }

            if (!$customerName) {
                if (array_filter($line, fn($value) => trim((string) $value) !== '')) $skipped++;
                continue;
            }

            $customer = $this->findOrCreateCustomer($customerName);
            CustomerPartNumber::updateOrCreate(
                ['customer_id' => $customer->id, 'part_number' => $part],
                [
                    'inventory_part_number' => $inventoryCode, // Simpan mapping dari excel
                    'item_description'      => $description,
                    'selling_price'         => $this->numberValue(
                        $this->value($row, ['harga_jual', 'selling_price', 'harga', 'price'])
                    ),
                    'status'                => strtoupper($this->value($row, ['status']) ?: 'AKTIF'),
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

        $value = preg_replace('/^[^0-9,\.\-]+/', '', $value);
        $value = trim($value);

        if (preg_match('/^\d{1,3}(,\d{3})+(\,\d{1,2})?$/', $value)) {
            $value = str_replace(',', '', $value);
        } elseif (preg_match('/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/', $value)) {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } else {
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        }
        return is_numeric($value) ? (float) $value : null;
    }

    public function downloadTemplate()
    {
        return Excel::download(new CustomerPartNumbersTemplateExport(), 'template-import-data-customer.xlsx');
    }

    public function export()
    {
        $rows = CustomerPartNumber::with('customer')->get();
        // Tambahkan header Kode Inventory di CSV
        $csv = "Customer,Part Number,Kode Inventory,Item Description,Harga Jual,Status\n";
        foreach ($rows as $row) {
            $csv .= implode(',', array_map(fn($v) => '"' . str_replace('"', '""', (string) $v) . '"', [
                $row->customer->customer_name, 
                $row->part_number, 
                $row->inventory_part_number, // Kolom jembatan 
                $row->item_description, 
                $row->selling_price, 
                $row->status
            ])) . "\n";
        }
        return response($csv)->header('Content-Type', 'text/csv')->header('Content-Disposition', 'attachment; filename=data-customer.csv');
    }
}