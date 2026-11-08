<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceiveItem;
use App\Models\ReceiveItemLine;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiveItemController extends Controller
{
    public function index()
    {
        $receiveItems = ReceiveItem::with('items.product')->latest()->get();

        $receiveItems->transform(function ($ri) {
            $ri->items->transform(function ($item) {
                $item->part_number = $item->product ? $item->product->part_number : '-';
                $item->description = $item->product ? $item->product->description : '-';
                $item->qty = (float)$item->quantity; 
                
                return $item;
            });
            return $ri;
        });

        return response()->json($receiveItems);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiveNo' => 'required|string',
            'date' => 'required|date',
            'vendorName' => 'nullable|string',
            'vendor_name' => 'nullable|string',
            'supplier_name' => 'nullable|string',
            'poRef' => 'nullable|string',
            'status' => 'required|string',
            'notes' => 'nullable|string',
            'items' => 'nullable|array', 
        ]);

        $vendor = $request->vendorName ?? $request->vendor_name ?? $request->supplier_name ?? '-';
        $poRef = $request->poRef ?? '-';

        DB::beginTransaction();

        try {
            $receiveItem = ReceiveItem::create([
                'document_number' => $validated['receiveNo'],
                'receive_date' => $validated['date'],
                'status' => $validated['status'],
                'delivery_order' => $request->delivery_order ?? null,
                'spk_supplier' => $request->spk_supplier ?? null,
                'notes' => "PO Ref: {$poRef} | Vendor: {$vendor}" . (!empty($request->notes) ? " | " . $request->notes : ""),
            ]);

            if (!empty($request->items)) {
                foreach ($request->items as $itemData) {
                    $qty = isset($itemData['qty']) ? (float)$itemData['qty'] : (isset($itemData['quantity']) ? (float)$itemData['quantity'] : 0);
                    $unit = $itemData['unit'] ?? 'PCS';
                    
                    $productId = $itemData['product_id'] ?? null;
                    $partNumber = $itemData['part_number'] ?? null;

                    if ($qty > 0) {
                        if (!$productId && $partNumber) {
                            $product = Product::where('part_number', $partNumber)->first();
                            if ($product) {
                                $productId = $product->id;
                            }
                        }

                        if ($productId) {
                            $productModel = Product::find($productId);
                            if ($productModel) {
                                $productModel->stock += $qty;
                                $productModel->save();
                            }

                            ReceiveItemLine::create([
                                'receive_item_id' => $receiveItem->id,
                                'product_id' => $productId,
                                'quantity' => $qty,
                                'unit' => $unit,
                            ]);
                        }
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Data penerimaan berhasil disimpan dan stok Inventory otomatis bertambah!', 
                'data' => $receiveItem->load('items.product')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal: ' . $e->getMessage()
            ], 500);
        }
    }

    // FUNGSI INI YANG SEBELUMNYA HILANG DAN BIKIN ERROR 500
    public function update(Request $request, $id)
    {
        try {
            $receiveItem = ReceiveItem::findOrFail($id);

            $receiveItem->update([
                'delivery_order' => $request->delivery_order ?? $receiveItem->delivery_order,
                'spk_supplier'   => $request->spk_supplier ?? $receiveItem->spk_supplier,
                'status'         => $request->status ?? $receiveItem->status,
                'notes'          => $request->notes ?? $receiveItem->notes,
            ]);

            return response()->json([
                'message' => 'Data berhasil diperbarui!',
                'data' => $receiveItem
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $item = ReceiveItem::findOrFail($id);
        $item->items()->delete();
        $item->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}