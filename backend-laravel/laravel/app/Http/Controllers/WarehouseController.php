<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use App\Models\Warehouse;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    public function index()
    {
        $warehouses = Warehouse::with('locations')->orderBy('name')->get();

        // Ringkasan isi tiap warehouse: jumlah item & total qty dari saldo di lokasi.
        $summary = InventoryStock::query()
            ->select('warehouse_id')
            ->selectRaw('COUNT(DISTINCT product_id) as item_count, COALESCE(SUM(quantity), 0) as total_qty')
            ->groupBy('warehouse_id')
            ->get()
            ->keyBy('warehouse_id');

        $warehouses = $warehouses->map(function ($w) use ($summary) {
            $row = $summary->get($w->id);
            $w->item_count = (int) ($row->item_count ?? 0);
            $w->total_qty  = (int) ($row->total_qty ?? 0);
            return $w;
        });

        return response()->json(['data' => $warehouses]);
    }

    /** Daftar item yang tersimpan di sebuah warehouse (beserta lokasi & jumlahnya). */
    public function items(Request $request, Warehouse $warehouse)
    {
        $query = InventoryStock::with(['product:id,part_number,name,unit,stock'])
            ->where('warehouse_id', $warehouse->id)
            ->where('quantity', '>', 0)
            ->orderByDesc('quantity');

        if ($request->filled('location_id')) {
            $query->where('warehouse_location_id', $request->integer('location_id'));
        }

        $stocks = $query->get()->map(function ($s) {
            return [
                'id'          => $s->id,
                'quantity'    => (int) $s->quantity,
                'location_id' => $s->warehouse_location_id,
                'location'    => $s->location ? ['id' => $s->location->id, 'code' => $s->location->code, 'name' => $s->location->name] : null,
                'product'     => $s->product ? [
                    'id'          => $s->product->id,
                    'part_number' => $s->product->part_number,
                    'name'        => $s->product->name,
                    'unit'        => $s->product->unit,
                ] : null,
            ];
        })->values();

        return response()->json([
            'data'    => $stocks,
            'summary' => [
                'item_count'  => $stocks->pluck('product.id')->filter()->unique()->count(),
                'total_qty'   => (int) $stocks->sum('quantity'),
            ],
        ]);
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
