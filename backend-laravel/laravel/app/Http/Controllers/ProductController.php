<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Imports\ProductsImport;
use App\Exports\ProductsTemplateExport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::query();

        if ($request->has('search') && $request->search !== '') {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('product_code', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('part_number', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('id', 'desc')->get();

        return response()->json(['data' => $products]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_code' => 'nullable|string|max:255',
            'part_number'  => 'nullable|string|max:255',
            'name'         => 'required|string|max:255',
            'category'     => 'nullable|string|max:255',
            'unit'         => 'nullable|string|max:50',
            'stock'        => 'nullable|integer|min:0',
        ]);

        // Auto-generate product code jika kosong
        if (empty($validated['product_code'])) {
            $validated['product_code'] = Product::generateInternalCode();
        }

        $validated['barcode'] = $validated['product_code'];
        $validated['unit']    = $validated['unit'] ?? 'Unit';
        $validated['stock']   = $validated['stock'] ?? 0;

        // Cek duplikasi
        $exists = Product::where('product_code', $validated['product_code'])
                         ->orWhere('barcode', $validated['barcode'])
                         ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Kode produk atau barcode sudah ada.'
            ], 422);
        }

        $product = Product::create($validated);

        return response()->json(['data' => $product, 'message' => 'Produk berhasil ditambahkan.'], 201);
    }

    public function show(Product $product)
    {
        return response()->json(['data' => $product]);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'product_code' => 'nullable|string|max:255',
            'part_number'  => 'nullable|string|max:255',
            'name'         => 'required|string|max:255',
            'category'     => 'nullable|string|max:255',
            'unit'         => 'nullable|string|max:50',
            'stock'        => 'nullable|integer|min:0',
        ]);

        if (empty($validated['product_code'])) {
            $validated['product_code'] = $product->product_code;
        }

        $validated['barcode'] = $validated['product_code'];
        $validated['unit']    = $validated['unit'] ?? $product->unit;

        // Cek duplikasi (kecuali produk itu sendiri)
        $exists = Product::where(function ($q) use ($validated) {
            $q->where('product_code', $validated['product_code'])
              ->orWhere('barcode', $validated['barcode']);
        })->where('id', '!=', $product->id)->exists();

        if ($exists) {
            return response()->json([
                'message' => 'Kode produk atau barcode sudah digunakan produk lain.'
            ], 422);
        }

        $product->update($validated);

        return response()->json(['data' => $product, 'message' => 'Produk berhasil diperbarui.']);
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Produk berhasil dihapus.']);
    }

    /**
     * Import data produk dari file Excel/CSV.
     * Kolom Kode Produk dibuat otomatis (INT-XXXX).
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv,txt|max:10240',
        ]);

        try {
            $import = new ProductsImport();
            Excel::import($import, $request->file('file'));

            return response()->json([
                'message'  => 'Import selesai.',
                'imported' => $import->getImported(),
                'skipped'  => $import->getSkipped(),
                'errors'   => $import->getErrors(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal mengimpor file: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Unduh template Excel untuk import produk.
     */
    public function downloadTemplate()
    {
        return Excel::download(new ProductsTemplateExport(), 'template-import-produk.xlsx');
    }

    /**
     * Cari produk berdasarkan barcode/kode (untuk scanner).
     */
    public function findByCode(Request $request)
    {
        $value = $request->query('code', '');

        if (empty($value)) {
            return response()->json(['message' => 'Kode tidak boleh kosong.'], 400);
        }

        $product = Product::findByCode($value);

        if (!$product) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan untuk kode: ' . $value,
                'scanned_code' => $value,
            ], 404);
        }

        return response()->json([
            'success' => true,
            'scanned_code' => $value,
            'data' => $product,
        ]);
    }
}
