<?php

namespace App\Http\Controllers;

use App\Models\SalesReceipt;
use Illuminate\Http\Request;

class SalesReceiptController extends Controller
{
    // Mengambil semua data untuk ditampilkan di tabel React
    public function index()
    {
        $receipts = SalesReceipt::orderBy('created_at', 'desc')->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $receipts
        ]);
    }

    // Menyimpan data baru saat tombol simpan ditekan
    public function store(Request $request)
    {
        $validated = $request->validate([
            'form_no'      => 'required|unique:sales_receipts',
            'payment_date' => 'required|date',
            'bill_to_no'   => 'nullable|string',
            'name'         => 'required|string',
            'cheque_no'    => 'nullable|string',
            'cheque_date'  => 'nullable|date',
            'amount'       => 'required|numeric',
            'reconciled'   => 'boolean',
            'description'  => 'nullable|string'
        ]);

        $receipt = SalesReceipt::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Penerimaan Penjualan (Receipt) berhasil dibuat',
            'data' => $receipt
        ], 201);
    }
}