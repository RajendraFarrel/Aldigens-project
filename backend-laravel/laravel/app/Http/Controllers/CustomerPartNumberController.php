<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerPartNumber;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
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

    private function validateInventoryProductId(Request $request): void
    {
        $request->validate([
            'inventory_product_id' => [
                'nullable',
                'integer',
                Rule::exists('products', 'id')->where(fn($q) => $q->where('status', 'AKTIF')),
            ],
        ], [
            'inventory_product_id.exists' => 'Produk Inventory yang dipilih tidak ditemukan atau sudah tidak aktif.',
        ]);
    }

    private function inventoryProductIdFrom(Request $request): ?int
    {
        $value = $request->input('inventory_product_id');
        if ($value === null || $value === '' || $value === '-' || $value === 0 || $value === '0' || $value === 'null') {
            return null;
        }
        return (int) $value;
    }

    /**
     * DIKEMBALIKAN KE KODE ASLI YANG BEKERJA DENGAN BAIK (Menghindari Column Not Found)
     */
    private function stockTotals(array $productIds): array
    {
        $productIds = array_values(array_unique(array_filter($productIds)));
        if (!$productIds) return [];

        return DB::table('inventory_stocks')
            ->selectRaw('product_id, SUM(quantity) as total_stock')
            ->whereIn('product_id', $productIds)
            ->groupBy('product_id')
            ->pluck('total_stock', 'product_id')
            ->toArray();
    }

    private function present(CustomerPartNumber $record, ?array $totals = null): array
    {
        $product = $record->relationLoaded('inventoryProduct') ? $record->inventoryProduct : null;

        if ($totals === null) {
            $totals = $this->stockTotals([$product?->id]);
        }

        $inventoryStockTotal = null;
        if ($product) {
            $inventoryStockTotal = (int) ($totals[$product->id] ?? 0);
        }

        $productData = $product ? [
            'id'                   => $product->id,
            'product_code'         => $product->product_code,
            'barcode'              => $product->barcode,
            'part_number'          => $product->part_number,
            'name'                 => $product->name,
            'item_type'            => $product->item_type,
            'unit'                 => $product->unit,
            'status'               => $product->status,
            // --- ALIAS KEY UNTUK FORM SALES ORDER ---
            'stock'                => $inventoryStockTotal,
            'stok'                 => $inventoryStockTotal,
            'stock_total'          => $inventoryStockTotal,
            'inventory_stock_total'=> $inventoryStockTotal,
            'inventory_stock'      => $inventoryStockTotal,
            'sisa_stok'            => $inventoryStockTotal,
            'qty_available'        => $inventoryStockTotal,
            'stock_gudang'         => $inventoryStockTotal,
            'available_stock'      => $inventoryStockTotal,
            'qty'                  => $inventoryStockTotal,
        ] : null;

        return array_merge($record->toArray(), [
            'inventory_product_id'  => $product?->id,
            'inventory_product'     => $productData,
            // --- ALIAS KEY UNTUK FORM SALES ORDER (ROOT LEVEL) ---
            'inventory_stock_total' => $inventoryStockTotal,
            'stock_total'           => $inventoryStockTotal,
            'inventory_stock'       => $inventoryStockTotal,
            'stock'                 => $inventoryStockTotal,
            'stok'                  => $inventoryStockTotal,
            'sisa_stok'             => $inventoryStockTotal,
            'qty_available'         => $inventoryStockTotal,
            'stock_gudang'          => $inventoryStockTotal,
            'available_stock'       => $inventoryStockTotal,
            'qty'                   => $inventoryStockTotal,
        ]);
    }

    public function index(Request $request)
    {
        $query = CustomerPartNumber::with(['customer', 'inventoryProduct'])
            ->orderBy('customer_id')
            ->orderBy('part_number');
        if ($request->filled('customer_id')) $query->where('customer_id', $request->integer('customer_id'));
        if ($request->filled('search')) $query->where(fn($q) => $q->where('part_number', 'like', '%' . $request->search . '%')->orWhere('item_description', 'like', '%' . $request->search . '%'));

        $records = $query->get();

        $totals = $this->stockTotals($records->pluck('inventory_product_id')->all());

        return response()->json([
            'data' => $records->map(fn($record) => $this->present($record, $totals))->values(),
            'summary' => [
                'total_customer' => CustomerPartNumber::distinct('customer_id')->count('customer_id'),
                'total_part_number' => CustomerPartNumber::count(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_id'           => 'required|exists:customers,id',
            'part_number'           => 'required|string|max:100',
            'inventory_part_number' => 'nullable|string|max:255', 
            'item_description'      => 'nullable|string|max:255',
            'selling_price'         => 'nullable|numeric|min:0',
            'status'                => 'nullable|string|in:AKTIF,NONAKTIF',
        ]);
        $this->validateInventoryProductId($request);

        $record = CustomerPartNumber::updateOrCreate(
            ['customer_id' => $request->customer_id, 'part_number' => $request->part_number],
            [
                'item_description' => $request->item_description,
                'selling_price'    => $request->selling_price,
                'status'           => strtoupper($request->status ?? 'AKTIF'),
                'inventory_product_id' => $request->has('inventory_product_id')
                    ? $this->inventoryProductIdFrom($request)
                    : null,
            ]
        );

        $record->load('customer', 'inventoryProduct');

        return response()->json(['message' => 'Data berhasil disimpan.', 'data' => $this->present($record)], 201);
    }

    public function update(Request $request, $id)
    {
        $record = CustomerPartNumber::findOrFail($id);

        $request->validate([
            'customer_id'      => 'required|exists:customers,id',
            'part_number'      => 'required|string|max:100',
            'item_description' => 'nullable|string|max:255',
            'selling_price'    => 'nullable|numeric|min:0',
            'status'           => 'nullable|string|in:AKTIF,NONAKTIF',
        ]);
        $this->validateInventoryProductId($request);

        $data = [
            'customer_id'      => $request->customer_id,
            'part_number'      => $request->part_number,
            'item_description' => $request->item_description,
            'selling_price'    => $request->selling_price,
            'status'           => strtoupper($request->status ?? 'AKTIF'),
        ];

        if ($request->has('inventory_product_id')) {
            $data['inventory_product_id'] = $this->inventoryProductIdFrom($request);
        }

        $record->update($data);
        $record->load('customer', 'inventoryProduct');

        return response()->json(['message' => 'Data berhasil diperbarui.', 'data' => $this->present($record)]);
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
                    'inventory_part_number' => $inventoryCode,
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
            $customer = Customer::get()->first(fn($item) => $this->normalizeCustomerName($item->customer_name) === $normalizedName);
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
        $rows = CustomerPartNumber::with(['customer', 'inventoryProduct'])->get();
        $totals = $this->stockTotals($rows->pluck('inventory_product_id')->all());
        $csv = "Customer,Part Number,Item Description,Harga Jual,Status,Part Number Inventory,Nama Produk Inventory,Stok Inventory,Satuan\n";
        foreach ($rows as $row) {
            $product = $row->inventoryProduct;
            $stockTotal = $product ? (int) ($totals[$product->id] ?? 0) : null;
            $csv .= implode(',', array_map(fn($v) => '"' . str_replace('"', '""', (string) $v) . '"', [
                $row->customer?->customer_name,
                $row->part_number,
                $row->item_description,
                $row->selling_price,
                $row->status,
                $product?->part_number ?? '',
                $product?->name ?? '',
                $stockTotal ?? '',
                $product?->unit ?? '',
            ])) . "\n";
        }
        return response($csv)->header('Content-Type', 'text/csv')->header('Content-Disposition', 'attachment; filename=data-customer.csv');
    }

    public function inventoryProductOptions(Request $request)
    {
        $query = Product::query()
            ->where('status', 'AKTIF')
            ->select(['id', 'product_code', 'barcode', 'part_number', 'name', 'item_type', 'unit', 'status']);

        $search = trim((string) $request->query('search', ''));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('product_code', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhere('part_number', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('part_number')->orderBy('id')->limit((int) $request->query('limit', 50))->get();
        $totals = $this->stockTotals($products->pluck('id')->all());

        return response()->json([
            'data' => $products->map(fn(Product $product) => [
                'id'                   => $product->id,
                'product_code'         => $product->product_code,
                'barcode'              => $product->barcode,
                'part_number'          => $product->part_number,
                'name'                 => $product->name,
                'item_type'            => $product->item_type,
                'unit'                 => $product->unit,
                'status'               => $product->status,
                // --- ALIAS KEY UNTUK DROPDOWN REACT ---
                'stock'                => (int) ($totals[$product->id] ?? 0),
                'stok'                 => (int) ($totals[$product->id] ?? 0),
                'stock_total'          => (int) ($totals[$product->id] ?? 0),
                'inventory_stock_total'=> (int) ($totals[$product->id] ?? 0),
                'inventory_stock'      => (int) ($totals[$product->id] ?? 0),
                'sisa_stok'            => (int) ($totals[$product->id] ?? 0),
                'qty_available'        => (int) ($totals[$product->id] ?? 0),
                'stock_gudang'         => (int) ($totals[$product->id] ?? 0),
                'available_stock'      => (int) ($totals[$product->id] ?? 0),
                'qty'                  => (int) ($totals[$product->id] ?? 0),
            ])->values(),
        ]);
    }
}