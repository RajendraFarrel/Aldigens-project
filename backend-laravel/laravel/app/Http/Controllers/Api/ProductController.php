<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product; // Pastikan model ini sesuai dengan nama model part number Anda
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        // Mengambil semua data produk beserta relasi customernya
        $products = Product::with('customer')->orderBy('id', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    public function import(Request $request)
    {
        // Validasi agar file yang diupload benar-benar ada dan berformat excel/csv
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:5120' 
        ]);

        try {
            // TODO: Logika untuk membaca baris per baris dari file Excel ditaruh di sini
            // Biasanya menggunakan package Laravel Excel (Maatwebsite)
            
            return response()->json([
                'status' => 'success',
                'message' => 'Data produk berhasil di-import!'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal meng-import file: ' . $e->getMessage()
            ], 500);
        }
    }
}