<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\InventoryStock;
use App\Models\InventoryTransaction;
use Illuminate\Http\Request;

class ExportController extends Controller
{
    public function csv(Request $request, string $type)
    {
        $rows = match ($type) {
            'products', 'inventory', 'stocks' => Product::with('customer')->get()->map(fn($p) => [$p->part_number, $p->name, $p->customer?->customer_name, $p->item_type, $p->unit, $p->stock, $p->minimum_stock, $p->maximum_stock, $p->barcode, $p->status]),
            'customers' => Customer::get()->map(fn($r) => [$r->customer_code, $r->customer_name, $r->address, $r->phone, $r->email, $r->status]),
            'suppliers' => Supplier::get()->map(fn($r) => [$r->supplier_code, $r->supplier_name, $r->address, $r->phone, $r->email, $r->status]),
            'transactions', 'mutations', 'in', 'out' => InventoryTransaction::with('product')->latest()->get()->map(fn($r) => [$r->transaction_time, $r->reference_number, $r->product?->part_number, $r->product?->name, $r->transaction_type, $r->quantity, $r->stock_before, $r->stock_after, $r->user_name, $r->notes]),
            default => collect(),
        };
        $headers = match ($type) {
            'products', 'inventory', 'stocks' => ['Part Number', 'Item', 'Customer', 'Jenis Item', 'Satuan', 'Stok', 'Minimum', 'Maksimum', 'Barcode', 'Status'],
            'customers' => ['Kode', 'Customer', 'Alamat', 'Telepon', 'Email', 'Status'],
            'suppliers' => ['Kode', 'Supplier', 'Alamat', 'Telepon', 'Email', 'Status'],
            default => ['Tanggal', 'Dokumen', 'Part Number', 'Item', 'Jenis', 'Quantity', 'Before', 'After', 'User', 'Keterangan'],
        };
        return response()->streamDownload(function () use ($headers, $rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);
            foreach ($rows as $row) fputcsv($out, $row);
            fclose($out);
        }, "aldigens-{$type}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
