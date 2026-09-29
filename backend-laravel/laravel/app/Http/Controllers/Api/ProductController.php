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
}