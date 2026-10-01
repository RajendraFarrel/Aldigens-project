<?php

namespace App\Http\Controllers;

use App\Models\Commissioning;
use App\Models\CommissioningItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

    // Menyimpan data komisioning baru beserta checklist-nya
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

            // Perbaikan agar aman saat tabel masih kosong
            $lastCommissioning = Commissioning::latest()->first();
            $lastId = $lastCommissioning ? $lastCommissioning->id : 0;
            $commCode = 'COM-' . date('Y') . '-' . str_pad($lastId + 1, 4, '0', STR_PAD_LEFT);

            // Simpan header komisioning
            $commissioning = Commissioning::create([
                'commissioning_code' => $commCode,
                'customer_id' => $request->customer_id,
                'project_name' => $request->project_name,
                'commissioning_date' => $request->commissioning_date,
                'technician_name' => $request->technician_name,
                'status' => 'DRAFT',
                'notes' => $request->notes,
            ]);

            // Simpan item checklist lapangan   
            foreach ($request->items as $item) {
                CommissioningItem::create([
                    'commissioning_id' => $commissioning->id,
                    'check_item' => $item['check_item'],
                    'result' => $item['result'] ?? 'NA',
                    'remarks' => $item['remarks'] ?? null,
                ]);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Data Komisioning & BAST berhasil disimpan!',
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