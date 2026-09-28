<?php
namespace App\Http\Controllers;
use App\Models\PurchaseRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class PurchaseRequestController extends Controller
{
    public function index(Request $request) { return response()->json(['data' => PurchaseRequest::with(['items.product','supplier','requester'])->latest()->get()]); }
    public function store(Request $request)
    {
        $data = $request->validate([
            'document_number' => 'required|string|max:100|unique:purchase_requests,document_number', 'request_date' => 'required|date',
            'requester_id' => 'nullable|exists:users,id', 'supplier_id' => 'nullable|exists:suppliers,id', 'request_type' => 'nullable|string|max:100', 'notes' => 'nullable|string',
            'status' => 'nullable|in:DRAFT,WAITING APPROVAL,APPROVED,REJECTED,COMPLETED', 'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id', 'items.*.quantity' => 'required|numeric|min:0.001', 'items.*.unit' => 'required|string|max:50', 'items.*.notes' => 'nullable|string',
        ]);
        $pr = DB::transaction(function () use ($data, $request) {
            $pr = PurchaseRequest::create([...collect($data)->except('items')->toArray(), 'created_by' => $request->user()?->id, 'status' => $data['status'] ?? 'DRAFT']);
            $pr->items()->createMany($data['items']); return $pr->load(['items.product','supplier']);
        });
        return response()->json(['data' => $pr], 201);
    }
    public function show(PurchaseRequest $purchaseRequest)
    {
        return response()->json(['data' => $purchaseRequest->load(['items.product', 'supplier', 'requester'])]);
    }

    public function update(Request $request, PurchaseRequest $purchaseRequest)
    {
        if ($purchaseRequest->status !== 'DRAFT') {
            return response()->json(['message' => 'PR yang sudah diajukan tidak dapat diedit.'], 422);
        }
        $data = $request->validate([
            'document_number' => 'required|string|max:100|unique:purchase_requests,document_number,' . $purchaseRequest->id,
            'request_date' => 'required|date', 'requester_id' => 'nullable|exists:users,id', 'supplier_id' => 'nullable|exists:suppliers,id',
            'request_type' => 'nullable|string|max:100', 'notes' => 'nullable|string', 'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id', 'items.*.quantity' => 'required|numeric|min:0.001', 'items.*.unit' => 'required|string|max:50', 'items.*.notes' => 'nullable|string',
        ]);
        $updated = DB::transaction(function () use ($data, $purchaseRequest) {
            $purchaseRequest->update(collect($data)->except('items')->toArray());
            $purchaseRequest->items()->delete();
            $purchaseRequest->items()->createMany($data['items']);
            return $purchaseRequest->fresh(['items.product', 'supplier', 'requester']);
        });
        return response()->json(['data' => $updated]);
    }

    public function destroy(PurchaseRequest $purchaseRequest)
    {
        if ($purchaseRequest->status !== 'DRAFT') return response()->json(['message' => 'PR yang sudah diajukan tidak dapat dihapus.'], 422);
        $purchaseRequest->delete();
        return response()->json(['message' => 'Purchase Request berhasil dihapus.']);
    }

    public function updateStatus(Request $request, PurchaseRequest $purchaseRequest)
    {
        $data = $request->validate(['status' => 'required|in:DRAFT,WAITING APPROVAL,APPROVED,REJECTED,COMPLETED']);
        $purchaseRequest->update([...$data, 'approved_by' => in_array($data['status'], ['APPROVED','REJECTED'], true) ? $request->user()?->id : null, 'approved_at' => in_array($data['status'], ['APPROVED','REJECTED'], true) ? now() : null]);
        return response()->json(['data' => $purchaseRequest->fresh(['items.product','supplier','requester'])]);
    }
}
