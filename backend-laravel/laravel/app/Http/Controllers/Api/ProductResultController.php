<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProductResult;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProductResultController extends Controller
{
    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            // 1. Simpan Dokumen Product Result
            $pr = ProductResult::create([
                'pr_no'   => $request->prNo,
                'ref_wo'  => $request->refWO,
                'date'    => $request->date,
                'product' => $request->product,
                'qty_in'  => $request->qtyIn,
                'unit'    => $request->unit,
                'status'  => $request->status,
            ]);

            // 2. TAMBAH STOK KE TABEL PRODUCTS (Master Data Frontend)
            if ($request->status === 'Disetujui') {
                $productName = trim($request->product);
                
                // MENGGUNAKAN TABEL PRODUCTS SESUAI API FRONTEND
                $tableName = 'products'; 
                
                // Fallback aman jika tabel bernama inventories
                if (!Schema::hasTable($tableName)) {
                    $tableName = 'inventories';
                }

                $columns = Schema::getColumnListing($tableName);

                // Cari kolom stok yang valid
                $stockCol = null;
                foreach (['stock', 'stok', 'qty', 'quantity', 'jumlah', 'balance'] as $col) {
                    if (in_array($col, $columns)) {
                        $stockCol = $col;
                        break;
                    }
                }
                if (!$stockCol) { $stockCol = 'stock'; }

                // Cari kolom nama barang
                $nameCol = 'name';
                if (in_array('item_name', $columns)) {
                    $nameCol = 'item_name';
                } elseif (in_array('product_name', $columns)) {
                    $nameCol = 'product_name';
                }

                // Cek apakah produk sudah ada di tabel
                $product = DB::table($tableName)
                    ->where($nameCol, 'LIKE', '%' . $productName . '%')
                    ->first();

                if ($product) {
                    // JIKA ADA: Tambah stok dan paksa status jadi PRODUK JADI
                    $extraUpdate = [];
                    if (in_array('item_type', $columns)) {
                        $extraUpdate['item_type'] = 'PRODUK JADI';
                    }
                    
                    DB::table($tableName)
                        ->where('id', $product->id)
                        ->increment($stockCol, $request->qtyIn, $extraUpdate);
                } else {
                    // JIKA BELUM ADA: Buat baru di tabel Products
                    $newPartNumber = 'FG-' . date('y') . date('m') . '-' . rand(100, 999);
                    
                    $newData = [];
                    if (in_array('part_number', $columns)) {
                        $newData['part_number'] = $newPartNumber;
                    }
                    if (in_array('product_code', $columns)) {
                        $newData['product_code'] = $newPartNumber; // Kolom yang sering ada di Master Data
                    }
                    
                    $newData[$nameCol] = $productName;
                    $newData[$stockCol] = $request->qtyIn;
                    
                    if (in_array('unit', $columns)) {
                        $newData['unit'] = $request->unit;
                    }
                    if (in_array('category', $columns)) {
                        $newData['category'] = 'Barang Jadi';
                    }
                    if (in_array('item_type', $columns)) {
                        $newData['item_type'] = 'PRODUK JADI'; // Wajib agar tampil di Tab React
                    }

                    DB::table($tableName)->insert($newData);
                }
            }

            DB::commit();
            return response()->json(['message' => 'Hasil produksi dicatat & masuk ke Master Produk!'], 201);

        } catch (\Exception $e) {
            DB::rollback();
            return response()->json([
                'error' => 'Gagal menyimpan: ' . $e->getMessage(),
                'line'  => $e->getLine()
            ], 500);
        }
    }
}