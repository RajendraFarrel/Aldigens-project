<?php

namespace App\Http\Controllers;

use App\Models\Bom;
use App\Models\Product;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BomController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Bom::with(['product', 'items.product'])->latest()->get()]);
    }
    public function show(Bom $bom)
    {
        return response()->json(['data' => $bom->load(['product', 'items.product'])]);
    }
    public function update(Request $request, Bom $bom, InventoryStockService $stockService)
    {
        if ($bom->productions()->exists() || $bom->status === 'AKTIF') {
            return response()->json(['message' => 'Hanya BOM draft yang dapat diedit. BOM aktif sudah memengaruhi stok.'], 422);
        }

        $data = $this->validatedData($request, $bom->id);
        $updated = DB::transaction(function () use ($data, $bom, $request, $stockService) {
            $bom->update([...collect($data)->except('items', 'status')->toArray(), 'status' => 'DRAFT', 'created_by' => $request->user()?->id]);
            $bom->items()->delete();
            $bom->items()->createMany($data['items']);
            return $bom->fresh(['product', 'items.product']);
        });

        return response()->json(['data' => $updated]);
    }

    public function destroy(Bom $bom)
    {
        if ($bom->productions()->exists() || $bom->status === 'AKTIF') {
            return response()->json(['message' => 'Hanya BOM draft yang dapat dihapus. BOM aktif sudah memengaruhi stok.'], 422);
        }

        $bom->delete();
        return response()->json(['message' => 'Draft BOM berhasil dihapus.']);
    }

    public function store(Request $request, InventoryStockService $stockService)
    {
        $data = $this->validatedData($request);
        $bom = DB::transaction(function () use ($data, $request, $stockService) {
            $bom = Bom::create([
                ...collect($data)->except('items', 'status')->toArray(),
                'created_by' => $request->user()?->id,
                'status' => 'DRAFT',
            ]);
            $bom->items()->createMany($data['items']);
            if (($data['action'] ?? 'draft') === 'finalize') {
                $this->applyStock($bom, $data, $request, $stockService);
                $bom->update(['status' => 'AKTIF']);
            }
            return $bom->load(['product', 'items.product']);
        });

        return response()->json(['data' => $bom], 201);
    }

    public function finalize(Request $request, Bom $bom, InventoryStockService $stockService)
    {
        if ($bom->status !== 'DRAFT') {
            return response()->json(['message' => 'Hanya BOM draft yang dapat difinalisasi.'], 422);
        }
        $data = $this->validatedData($request, $bom->id);
        $finalized = DB::transaction(function () use ($data, $bom, $request, $stockService) {
            $bom->update(collect($data)->except('items', 'status', 'action')->toArray());
            $bom->items()->delete();
            $bom->items()->createMany($data['items']);
            $this->applyStock($bom, $data, $request, $stockService);
            $bom->update(['status' => 'AKTIF']);
            return $bom->fresh(['product', 'items.product']);
        });

        return response()->json(['data' => $finalized]);
    }

    private function validatedData(Request $request, ?int $bomId = null): array
    {
        $uniqueDocument = 'required|string|max:100|unique:boms,document_number' . ($bomId ? ',' . $bomId : '');
        return $request->validate([
            'document_number' => $uniqueDocument,
            'product_id' => 'required|exists:products,id',
            'output_quantity' => 'required|integer|min:1',
            'unit' => 'required|string|max:50',
            'status' => 'nullable|in:DRAFT,AKTIF,NONAKTIF',
            'action' => 'nullable|in:draft,finalize',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id|distinct',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit' => 'required|string|max:50',
        ]);
    }

    private function applyStock(Bom $bom, array $data, Request $request, InventoryStockService $stockService): void
    {
        $product = Product::query()->lockForUpdate()->findOrFail($data['product_id']);
        if (strtoupper($product->item_type ?? '') !== 'PRODUK JADI') {
            throw ValidationException::withMessages(['product_id' => 'Produk tujuan harus bertipe PRODUK JADI.']);
        }

        $context = [
            'user_id' => $request->user()?->id,
            'user_name' => $request->user()?->name,
            'reference_type' => 'BOM',
            'reference_id' => $bom->id,
            'reference_number' => $bom->document_number,
            'group_key' => (string) Str::uuid(),
            'notes' => 'Perakitan produk dari BOM',
        ];

        foreach ($data['items'] as $item) {
            $component = Product::query()->lockForUpdate()->findOrFail($item['product_id']);
            if (strtoupper($component->item_type ?? '') === 'PRODUK JADI') {
                throw ValidationException::withMessages(['items' => "{$component->name} bukan Komponen & Barang Satuan."]);
            }
            $requiredQuantity = (int) $item['quantity'] * (int) $data['output_quantity'];
            $stockService->adjust($component, $requiredQuantity, 'PRODUKSI KELUAR', $context);
        }

        $stockService->adjust($product, (int) $data['output_quantity'], 'PRODUKSI MASUK', $context);
    }
}
