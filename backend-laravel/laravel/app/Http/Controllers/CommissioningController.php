<?php

namespace App\Http\Controllers;

use App\Models\Commissioning;
use App\Models\CommissioningItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CommissioningController extends Controller
{
    // Mengambil daftar semua data komisioning
    public function index()
    {
        $commissionings = Commissioning::with(['customer', 'items'])->latest()->get();
        return response()->json([
            'status' => 'success',
            'data' => $commissionings
        ]);
    }

    // Menyimpan data komisioning baru & Potong Stok
    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'commissioning_date' => 'required|date',
            'technician_name' => 'required|string',
            'items' => 'required|array|min:1',
        ]);

        try {
            DB::beginTransaction();

            $lastCommissioning = Commissioning::latest()->first();
            $lastId = $lastCommissioning ? $lastCommissioning->id : 0;
            $commCode = 'COM-' . date('Y') . '-' . str_pad($lastId + 1, 4, '0', STR_PAD_LEFT);

            $status = $request->status ?? 'COMPLETED';

            // 1. Simpan header komisioning
            $commissioning = Commissioning::create([
                'commissioning_code' => $request->commissioning_code ?? $commCode,
                'customer_id' => $request->customer_id,
                'do_number' => $request->do_number,
                'so_number' => $request->so_number,
                'ref_po' => $request->ref_po,
                'unit_model' => $request->unit_model,
                'serial_no' => $request->serial_no,
                'installation_date' => $request->installation_date,
                'commissioning_date' => $request->commissioning_date,
                'technician_name' => $request->technician_name,
                'status' => $status,
                'notes' => $request->notes,
            ]);

            // 2. Simpan item checklist (DIPERBAIKI AGAR TIDAK ERROR TRUNCATED)
            $hasResultCol = Schema::hasColumn('commissioning_items', 'result');
            foreach ($request->items as $item) {
                $itemData = [
                    'commissioning_id' => $commissioning->id,
                    'no' => $item['no'] ?? null,
                    'check_item' => $item['check_item'],
                    'physical' => $item['physical'] ?? 'Good',
                    'function' => $item['function'] ?? 'Good',
                    'remarks' => $item['remarks'] ?? null,
                ];

                // Jika kolom result ada, kita isi angka 1 (true) bukan teks 'Good'
                if ($hasResultCol) {
                    $itemData['result'] = '1';
                }

                CommissioningItem::create($itemData);
            }

            // 3. LOGIKA PEMOTONGAN STOK BARANG JADI
            if ($status === 'COMPLETED' || $status === 'APPROVED') {
                $productName = trim($request->unit_model);
                
                if ($productName) {
                    $tableName = 'products';
                    if (!Schema::hasTable($tableName)) {
                        $tableName = 'inventories';
                    }

                    if (Schema::hasTable($tableName)) {
                        $columns = Schema::getColumnListing($tableName);
                        $stockCol = 'stock';
                        foreach (['stock', 'stok', 'qty', 'quantity', 'jumlah', 'balance'] as $col) {
                            if (in_array($col, $columns)) {
                                $stockCol = $col;
                                break;
                            }
                        }

                        $nameCol = 'name';
                        if (in_array('item_name', $columns)) $nameCol = 'item_name';
                        elseif (in_array('product_name', $columns)) $nameCol = 'product_name';

                        DB::table($tableName)
                            ->where($nameCol, 'LIKE', '%' . $productName . '%')
                            ->decrement($stockCol, 1);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Data Komisioning & BAST berhasil disimpan dan Stok Terpotong!',
                'data' => $commissioning->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan data: ' . $e->getMessage()
            ], 500);
        }
    }

    // Memperbarui data komisioning (Edit)
    public function update(Request $request, $id)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'commissioning_date' => 'required|date',
            'technician_name' => 'required|string',
            'items' => 'required|array|min:1',
        ]);

        try {
            DB::beginTransaction();

            $commissioning = Commissioning::findOrFail($id);
            
            $commissioning->update([
                'customer_id' => $request->customer_id,
                'do_number' => $request->do_number,
                'so_number' => $request->so_number,
                'ref_po' => $request->ref_po,
                'unit_model' => $request->unit_model,
                'serial_no' => $request->serial_no,
                'installation_date' => $request->installation_date,
                'commissioning_date' => $request->commissioning_date,
                'technician_name' => $request->technician_name,
                'status' => $request->status ?? $commissioning->status,
                'notes' => $request->notes,
            ]);

            // Hapus yang lama, insert yang baru (DIPERBAIKI)
            $commissioning->items()->delete();
            $hasResultCol = Schema::hasColumn('commissioning_items', 'result');
            foreach ($request->items as $item) {
                $itemData = [
                    'commissioning_id' => $commissioning->id,
                    'no' => $item['no'] ?? null,
                    'check_item' => $item['check_item'],
                    'physical' => $item['physical'] ?? 'Good',
                    'function' => $item['function'] ?? 'Good',
                    'remarks' => $item['remarks'] ?? null,
                ];

                if ($hasResultCol) {
                    $itemData['result'] = '1';
                }

                CommissioningItem::create($itemData);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Data Komisioning berhasil diperbarui!',
                'data' => $commissioning->load('items')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui data: ' . $e->getMessage()
            ], 500);
        }
    }

    // Memperbarui status komisioning
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:DRAFT,APPROVED,COMPLETED,REJECTED',
        ]);

        $commissioning = Commissioning::findOrFail($id);
        $commissioning->update([
            'status' => $request->status,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Status Komisioning berhasil diperbarui!',
            'data' => $commissioning
        ]);
    }
}