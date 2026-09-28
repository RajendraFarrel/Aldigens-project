<?php

namespace App\Http\Controllers;

use App\Models\Warehouse;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Warehouse::with('locations')->orderBy('name')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:50|unique:warehouses,code',
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:500',
            'status' => 'nullable|in:AKTIF,NONAKTIF',
        ]);
        return response()->json(['data' => Warehouse::create($data)], 201);
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $data = $request->validate([
            'code' => 'sometimes|required|string|max:50|unique:warehouses,code,' . $warehouse->id,
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string|max:500',
            'status' => 'nullable|in:AKTIF,NONAKTIF',
        ]);
        $warehouse->update($data);
        return response()->json(['data' => $warehouse->fresh('locations')]);
    }

    public function locations(Warehouse $warehouse)
    {
        return response()->json(['data' => $warehouse->locations()->orderBy('code')->get()]);
    }

    public function storeLocation(Request $request, Warehouse $warehouse)
    {
        $data = $request->validate([
            'code' => 'required|string|max:50',
            'name' => 'nullable|string|max:255',
            'status' => 'nullable|in:AKTIF,NONAKTIF',
        ]);
        if ($warehouse->locations()->where('code', $data['code'])->exists()) {
            return response()->json(['message' => 'Kode lokasi sudah digunakan pada warehouse ini.'], 422);
        }
        return response()->json(['data' => $warehouse->locations()->create($data)], 201);
    }

    public function destroy(Warehouse $warehouse)
    {
        if ($warehouse->locations()->exists()) {
            return response()->json(['message' => 'Warehouse yang masih memiliki lokasi tidak dapat dihapus.'], 422);
        }
        $warehouse->delete();
        return response()->json(['message' => 'Warehouse berhasil dihapus.']);
    }
}
