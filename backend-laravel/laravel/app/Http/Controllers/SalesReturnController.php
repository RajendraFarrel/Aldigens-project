<?php

namespace App\Http\Controllers;

use App\Models\SalesReturn;
use Illuminate\Http\Request;

class SalesReturnController extends Controller
{
    // Mengirim daftar data untuk List View di React
    public function index()
    {
        // Mengambil data retur beserta nama customer dan nomor invoice-nya
        $returns = SalesReturn::with(['customer:id,name', 'invoice:id,invoice_no'])
                    ->orderBy('created_at', 'desc')
                    ->get();

        return response()->json([
            'status' => 'success',
            'data' => $returns
        ]);
    }

    // Menyimpan data baru saat tombol "Save" di form React ditekan
    public function store(Request $request)
    {
        $validated = $request->validate([
            'return_no'   => 'required|unique:sales_returns',
            'date'        => 'required|date',
            'customer_id' => 'required|exists:customers,id',
            'invoice_id'  => 'nullable|exists:sales_invoices,id',
            'amount'      => 'required|numeric',
            'description' => 'nullable|string'
        ]);

        $salesReturn = SalesReturn::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Sales Return berhasil dibuat',
            'data' => $salesReturn
        ], 201);
    }
}
