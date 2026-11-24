<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MaterialRelease;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MaterialReleaseController extends Controller
{
    public function store(Request $request)
    {
        // 1. Mulai Transaksi Database
        DB::beginTransaction();

        try {
            // 2. Simpan Dokumen Material Release
            $mr = MaterialRelease::create([
                'mr_no'  => $request->mrNo,
                'ref_wo' => $request->refWO,
                'date'   => $request->date,
                'pic'    => $request->pic,
                'status' => $request->status,
            ]);

            // Deteksi otomatis nama kolom di tabel inventories agar tidak error 1054
            $hasItemName = Schema::hasColumn('inventories', 'item_name');
            $hasName = Schema::hasColumn('inventories', 'name');
            $hasProductName = Schema::hasColumn('inventories', 'product_name');
            
            // Deteksi otomatis nama kolom untuk stok
            $stockColumn = 'stok'; // default
            if (Schema::hasColumn('inventories', 'stock')) {
                $stockColumn = 'stock';
            } elseif (Schema::hasColumn('inventories', 'qty')) {
                $stockColumn = 'qty';
            } elseif (Schema::hasColumn('inventories', 'quantity')) {
                $stockColumn = 'quantity';
            }

            // 3. Simpan Detail Material & POTONG STOK DI INVENTORY
            foreach ($request->materials as $mat) {
                $mr->details()->create([
                    'item_desc' => $mat['desc'],
                    'qty'       => $mat['qty'],
                    'unit'      => $mat['unit'],
                ]);

                if ($request->status === 'Dikeluarkan') {
                    $searchDesc = trim($mat['desc']);
                    
                    // Cari barang di database secara fleksibel berdasarkan nama/deskripsi terlebih dahulu
                    $inventoryQuery = DB::table('inventories');

                    $inventoryQuery->where(function($query) use ($searchDesc, $hasItemName, $hasName, $hasProductName) {
                        $hasMatched = false;

                        if ($hasItemName) {
                            $query->orWhere('item_name', 'LIKE', '%' . $searchDesc . '%');
                            $hasMatched = true;
                        }
                        if ($hasName) {
                            $query->orWhere('name', 'LIKE', '%' . $searchDesc . '%');
                            $hasMatched = true;
                        }
                        if ($hasProductName) {
                            $query->orWhere('product_name', 'LIKE', '%' . $searchDesc . '%');
                            $hasMatched = true;
                        }

                        // Fallback jika tidak ada kolom nama standar, gunakan part_number
                        if (!$hasMatched && Schema::hasColumn('inventories', 'part_number')) {
                            $query->orWhere('part_number', 'LIKE', '%' . $searchDesc . '%');
                        }
                    });

                    $inventory = $inventoryQuery->first();

                    if ($inventory) {
                        // Potong stok menggunakan nama kolom stok yang berhasil terdeteksi
                        DB::table('inventories')
                            ->where('id', $inventory->id)
                            ->decrement($stockColumn, $mat['qty']);
                    }
                }
            }

            // 4. Jika semua sukses, simpan permanen ke MySQL
            DB::commit();
            return response()->json(['message' => 'Material Release berhasil disimpan & Stok terpotong!'], 201);

        } catch (\Exception $e) {
            DB::rollback(); // Batalkan semua jika ada error
            return response()->json(['error' => 'Gagal menyimpan: ' . $e->getMessage()], 500);
        }
    }
}