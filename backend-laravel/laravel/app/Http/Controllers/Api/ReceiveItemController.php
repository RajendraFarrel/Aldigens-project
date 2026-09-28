<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ReceiveItem;
use Illuminate\Http\Request;

class ReceiveItemController extends Controller
{
    public function index()
    {
        return response()->json(ReceiveItem::latest()->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'receiveNo' => 'required|string|unique:receive_items,receive_no',
            'date' => 'required|date',
            'vendorName' => 'required|string',
            'poRef' => 'nullable|string',
            'status' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $item = ReceiveItem::create([
            'receive_no' => $validated['receiveNo'],
            'date' => $validated['date'],
            'vendor_name' => $validated['vendorName'],
            'po_ref' => $validated['poRef'] ?? null,
            'status' => $validated['status'],
            'notes' => $validated['notes'] ?? null,
        ]);

        return response()->json(['message' => 'Data penerimaan berhasil disimpan', 'data' => $item], 201);
    }

    public function destroy($id)
    {
        $item = ReceiveItem::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Data berhasil dihapus']);
    }
}
