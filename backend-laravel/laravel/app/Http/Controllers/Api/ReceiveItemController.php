<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ReceiveItem;
use App\Services\InventoryStockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReceiveItemController extends Controller
{
    public function index()
    {
        return response()->json(ReceiveItem::with('items.product')->latest()->get());
    }

    public function store(Request $request, InventoryStockService $stockService)
    {
        $validated = $request->validate([
            'receiveNo' => 'required|string|max:100',
            'date' => 'required|date',
            'vendorName' => 'required|string|max:255',
            'poRef' => 'nullable|string|max:100',
            'status' => 'required|string|max:50',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|numeric|min:1',
            'items.*.unit' => 'nullable|string|max:50',
        ]);

        $item = DB::transaction(function () use ($validated, $request, $stockService) {
            $receiveItem = ReceiveItem::create([
                'document_number' => $validated['receiveNo'],
                'receive_date' => $validated['date'],
                'vendor_name' => $validated['vendorName'],
                'po_ref' => $validated['poRef'] ?? null,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ]);

            // Satu group_key untuk seluruh baris dokumen ini, agar mutasinya
            // bisa dibatalkan bersamaan bila dokumen dihapus.
            $groupKey = (string) Str::uuid();

            foreach ($validated['items'] as $line) {
                $product = Product::findOrFail($line['product_id']);
                $quantity = (int) $line['quantity'];

                $receiveItem->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit' => $line['unit'] ?? $product->unit ?? 'PCS',
                ]);

                // Tambah stok inventory (MASUK) sekaligus catat mutasinya.
                $stockService->adjust($product, $quantity, 'MASUK', [
                    'group_key' => $groupKey,
                    'user_id' => $request->user()?->id,
                    'user_name' => $request->user()?->name,
                    'reference_type' => 'RECEIVE',
                    'reference_number' => $receiveItem->document_number,
                    'reference_id' => $receiveItem->id,
                    'notes' => $validated['notes'] ?? null,
                ]);
            }

            return $receiveItem->load('items.product');
        });

        return response()->json(['message' => 'Data penerimaan berhasil disimpan', 'data' => $item], 201);
    }

    public function destroy($id, InventoryStockService $stockService)
    {
        $item = ReceiveItem::findOrFail($id);

        DB::transaction(function () use ($item, $stockService) {
            // Kembalikan stok yang pernah ditambahkan dokumen ini agar saldo
            // tidak menggantung setelah dokumen penerimaan dihapus.
            $groupKeys = \App\Models\InventoryTransaction::where('reference_type', 'RECEIVE')
                ->where('reference_number', $item->document_number)
                ->whereNotNull('group_key')
                ->distinct()
                ->pluck('group_key');

            foreach ($groupKeys as $groupKey) {
                $stockService->revertGroup($groupKey);
            }

            $item->delete();
        });

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}
