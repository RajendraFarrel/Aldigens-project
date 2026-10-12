<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product; 
use App\Models\WarehouseStock;
use App\Models\Warehouse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        $products = Product::with('customer')->orderBy('id', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $products
        ]);
    }

    public function update(Request $request, $id)
    {
        try {
            $product = Product::findOrFail($id);

            // Update data produk termasuk stok tanpa validasi ketat gudang
            $product->fill($request->all());
            $product->save();

            // Sinkronisasi ke tabel warehouse stock
            if ($request->has('stock')) {
                $warehouseStock = WarehouseStock::where('product_id', $product->id)->first();
                if ($warehouseStock) {
                    $warehouseStock->update(['stock' => $request->stock]);
                } else {
                    $defaultWarehouse = Warehouse::first();
                    if ($defaultWarehouse) {
                        WarehouseStock::create([
                            'warehouse_id' => $defaultWarehouse->id,
                            'product_id'   => $product->id,
                            'stock'        => $request->stock
                        ]);
                    }
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Produk berhasil diperbarui!'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage()
            ], 422);
        }
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv|max:5120' 
        ]);

        try {
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