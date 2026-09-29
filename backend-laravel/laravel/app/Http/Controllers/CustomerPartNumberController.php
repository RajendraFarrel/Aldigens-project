<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerPartNumber;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\DB;

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
        $sheets = Excel::toArray([], $request->file('file'));
        $imported = 0;
        $skipped = 0;
        $errors = [];
        DB::transaction(function () use ($sheets, &$imported, &$skipped, &$errors) {
            foreach ($sheets as $sheetIndex => $sheet) {
                if (!$sheet) continue;
                $sheetName = trim((string) ($sheet[0][0] ?? ''));
                $headerIndex = 0;
                foreach ($sheet as $i => $line) {
                    $normalized = array_map(fn($v) => $this->key((string) $v), $line);
                    if (in_array('part_number', $normalized, true) || in_array('partnumber', $normalized, true)) {
                        $headerIndex = $i;
                        break;
                    }
                }
                $headers = array_map(fn($v) => $this->key((string) $v), $sheet[$headerIndex] ?? []);
                $customerName = $sheetName !== '' && strtoupper($sheetName) !== 'ALL CUSTOMER' ? $sheetName : null;
                foreach (array_slice($sheet, $headerIndex + 1) as $lineNumber => $line) {
                    $row = [];
                    foreach ($headers as $i => $header) $row[$header] = $line[$i] ?? null;
                    $customer = $this->value($row, ['customer', 'customer_name', 'pelanggan']) ?: $customerName;
                    $part = $this->value($row, ['part_number', 'partnumber', 'part_no']);
                    $description = $this->value($row, ['item_description', 'description', 'nama_barang', 'nama_produk', 'item']);
                    if (!$customer || !$part) {
                        $skipped++;
                        continue;
                    }
                    $customerModel = Customer::where('customer_name', $customer)->orWhere('customer_code', $customer)->first();
                    if (!$customerModel) {
                        $skipped++;
                        $errors[] = "Customer '{$customer}' belum terdaftar.";
                        continue;
                    }
                    CustomerPartNumber::updateOrCreate(['customer_id' => $customerModel->id, 'part_number' => $part], ['item_description' => $description, 'selling_price' => $this->value($row, ['harga_jual', 'selling_price', 'harga']), 'status' => $this->value($row, ['status']) ?: 'AKTIF']);
                    $imported++;
                }
            }
        });
        return response()->json(['message' => 'Import selesai.', 'imported' => $imported, 'skipped' => $skipped, 'errors' => array_values(array_unique($errors))]);
    }

    public function export()
    {
        $rows = CustomerPartNumber::with('customer')->get();
        $csv = "Customer,Part Number,Item Description,Harga Jual,Status\n";
        foreach ($rows as $row) $csv .= implode(',', array_map(fn($v) => '"' . str_replace('"', '"', (string) $v) . '"', [$row->customer->customer_name, $row->part_number, $row->item_description, $row->selling_price, $row->status])) . "\n";
        return response($csv)->header('Content-Type', 'text/csv')->header('Content-Disposition', 'attachment; filename=data-customer.csv');
    }
}
