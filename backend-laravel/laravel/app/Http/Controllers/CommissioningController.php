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
            'do_number' => 'nullable|string',
            'so_number' => 'nullable|string',
            'ref_po' => 'nullable|string',
            'unit_model' => 'nullable|string',
            'serial_no' => 'nullable|string',
            'installation_date' => 'nullable|date',
        ]);

        try {
            DB::beginTransaction();

            $lastCommissioning = Commissioning::latest()->first();
            $lastId = $lastCommissioning ? $lastCommissioning->id : 0;
            $commCode = 'COM-' . date('Y') . '-' . str_pad($lastId + 1, 4, '0', STR_PAD_LEFT);

            // Simpan header komisioning termasuk unit_model dan serial_no
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
                'status' => $request->status ?? 'COMPLETED',
                'notes' => $request->notes,
            ]);

            // Simpan item checklist lapangan
            foreach ($request->items as $item) {
                CommissioningItem::create([
                    'commissioning_id' => $commissioning->id,
                    'no' => $item['no'] ?? null,
                    'check_item' => $item['check_item'],
                    'physical' => $item['physical'] ?? 'Good',
                    'function' => $item['function'] ?? 'Good',
                    'result' => $item['result'] ?? 'Good',
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

            // Hapus item lama dan masukkan item checklist yang baru
            $commissioning->items()->delete();
            foreach ($request->items as $item) {
                CommissioningItem::create([
                    'commissioning_id' => $commissioning->id,
                    'no' => $item['no'] ?? null,
                    'check_item' => $item['check_item'],
                    'physical' => $item['physical'] ?? 'Good',
                    'function' => $item['function'] ?? 'Good',
                    'result' => $item['result'] ?? 'Good',
                    'remarks' => $item['remarks'] ?? null,
                ]);
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