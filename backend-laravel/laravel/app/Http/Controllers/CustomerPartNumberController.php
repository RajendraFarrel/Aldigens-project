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

    /**
     * Validasi mapping ke produk Inventory.
     * - boleh null (mapping dikosongkan / belum terhubung)
     * - bila terisi: harus produk yang ada dan berstatus AKTIF
     */
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

    /**
     * Normalisasi payload mapping: kosong / "-" / "0" / "null" dianggap NULL.
     */
    private function inventoryProductIdFrom(Request $request): ?int
    {
        $value = $request->input('inventory_product_id');
        if ($value === null || $value === '' || $value === '-' || $value === 0 || $value === '0' || $value === 'null') {
            return null;
        }
        return (int) $value;
    }

    /**
     * Total stok Inventory per product_id = SUM(inventory_stocks.quantity)
     * dari seluruh warehouse dan lokasi. Hanya query, tidak mengubah saldo.
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

    /**
     * Bentuk response baris Data Customer, termasuk informasi produk Inventory
     * dan total stok terkini (null bila belum terhubung).
     */
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

        return array_merge($record->toArray(), [
            'inventory_product_id' => $product?->id,
            'inventory_product'    => $product ? [
                'id'           => $product->id,
                'product_code' => $product->product_code,
                'barcode'      => $product->barcode,
                'part_number'  => $product->part_number,
                'name'         => $product->name,
                'item_type'    => $product->item_type,
                'unit'         => $product->unit,
                'status'       => $product->status,
            ] : null,
            'inventory_stock_total' => $inventoryStockTotal,
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

        // Satu query agregasi untuk semua produk sekaligus (menghindari N+1).
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
            'customer_id'      => 'required|exists:customers,id',
            'part_number'      => 'required|string|max:100',
            'item_description' => 'nullable|string|max:255',
            'selling_price'    => 'nullable|numeric|min:0',
            'status'           => 'nullable|string|in:AKTIF,NONAKTIF',
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

        // Mapping hanya diubah bila field dikirim; mengirim null berarti
        // melepas relasi (record Part Number Customer tetap dipertahankan).
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
            // Kenali "PART NUMBER" (dengan atau tanpa spasi/trailing space) dan variannya
            if (
                in_array('part_number', $headers, true) ||
                in_array('partnumber', $headers, true) ||
                in_array('part_no', $headers, true)
            ) {
                $headerIndex = $index;
                break;
            }
        }

        // Nama sheet dipakai sebagai customer kecuali sheet "ALL CUSTOMER" ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
        // pada sheet tersebut customer diambil dari kolom CUSTOMER di setiap baris.
        $sheetTitle = trim($sheet->getTitle());
        $sheetCustomer = strtoupper($sheetTitle) === 'ALL CUSTOMER' ? null : $sheetTitle;

        // Format PARTNUMBER_APP lama: tiga baris awal adalah judul/header,
        // Part Number berada di kolom B, deskripsi di C, dan harga di D.
        // Pada beberapa worksheet header berupa gambar/merge sehingga tidak
        // terbaca sebagai nilai sel. Karena itu gunakan fallback posisi kolom.
        if ($headerIndex === null) {
            $headerIndex = 3; // baris ke-4 (0-indexed = 3) adalah header default PARTNUMBER_APP
            $headers = ['no', 'part_number', 'item_description', 'selling_price', 'status'];
            $legacyFormat = true;
        } else {
            $headers = array_map(fn($value) => $this->key((string) $value), $rows[$headerIndex]);
            $legacyFormat = false;
        }

        foreach (array_slice($rows, $headerIndex + 1) as $line) {
            if ($legacyFormat) {
                // Fallback: kolom A=No, B=Part Number, C=Item Description, D=Harga Jual
                $row = [
                    'no'               => $line[0] ?? null,
                    'part_number'      => $line[1] ?? null,
                    'item_description' => $line[2] ?? null,
                    'selling_price'    => $line[3] ?? null,
                    'status'           => $line[4] ?? null,
                ];
            } else {
                $row = [];
                foreach ($headers as $i => $header) {
                    if ($header !== '') $row[$header] = $line[$i] ?? null;
                }
            }

            // Coba ambil nama customer dari kolom data; fallback ke nama sheet
            $customerName = $this->value($row, ['customer', 'customer_name', 'pelanggan']) ?: $sheetCustomer;
            $part         = $this->value($row, ['part_number', 'partnumber', 'part_no']);
            // "DESCRIPTION" di sheet KOBEXINDO diakomodasi lewat kunci 'description'
            $description  = $this->value($row, ['item_description', 'description', 'deskripsi', 'nama_barang', 'nama_produk', 'item']);

            // Lewati baris kosong atau baris judul yang ikut terbaca sebagai data
            if (
                !$part ||
                strtoupper(trim($part)) === 'PART NUMBER' ||
                strtoupper(trim($part)) === 'PARTNUMBER'
            ) {
                if (array_filter($line, fn($value) => trim((string) $value) !== '')) $skipped++;
                continue;
            }

            // Baris tanpa customer tidak bisa diproses
            if (!$customerName) {
                if (array_filter($line, fn($value) => trim((string) $value) !== '')) $skipped++;
                continue;
            }

            $customer = $this->findOrCreateCustomer($customerName);
            // Mapping Inventory tidak disentuh saat import: data hasil import tetap
            // NULL sampai pengguna memetakan secara manual.
            CustomerPartNumber::updateOrCreate(
                ['customer_id' => $customer->id, 'part_number' => $part],
                [
                    'item_description' => $description,
                    'selling_price'    => $this->numberValue(
                        $this->value($row, ['harga_jual', 'selling_price', 'harga', 'price'])
                    ),
                    'status'           => strtoupper($this->value($row, ['status']) ?: 'AKTIF'),
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

        // Hapus prefix mata uang seperti "Rp", "IDR", "$", dsb. dan whitespace
        $value = preg_replace('/^[^0-9,\\.\\-]+/', '', $value);
        $value = trim($value);

        // Format Indonesia: titik sebagai ribuan, koma sebagai desimal ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢ "1.290.000" atau "4.290.000"
        // Format Rp: "4,290,000" (koma sebagai ribuan, seperti format HYUNDAI di PARTNUMBER_APP)
        if (preg_match('/^\\d{1,3}(,\\d{3})+(\\,\\d{1,2})?$/', $value)) {
            // Format: 4,290,000 ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â koma sebagai separator ribuan (bukan desimal)
            $value = str_replace(',', '', $value);
        } elseif (preg_match('/^\\d{1,3}(\\.\\d{3})+(,\\d{1,2})?$/', $value)) {
            // Format: 4.290.000 atau 4.290.000,50
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        } else {
            // Fallback: bersihkan semua titik ribuan, ubah koma desimal ke titik
            $value = str_replace('.', '', $value);
            $value = str_replace(',', '.', $value);
        }
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

    /**
     * Daftar produk aktif untuk dropdown mapping Data Customer.
     * Mendukung pencarian berdasarkan Part Number, Product Code, Barcode, dan Nama.
     */
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
                'id'           => $product->id,
                'product_code' => $product->product_code,
                'barcode'      => $product->barcode,
                'part_number'  => $product->part_number,
                'name'         => $product->name,
                'item_type'    => $product->item_type,
                'unit'         => $product->unit,
                'status'       => $product->status,
                'stock_total'  => (int) ($totals[$product->id] ?? 0),
            ])->values(),
        ]);
    }
}
