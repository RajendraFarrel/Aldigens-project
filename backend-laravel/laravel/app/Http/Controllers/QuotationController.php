<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Quotation;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    // 1. Fungsi untuk menyimpan data (POST)
    public function store(Request $request)
    {
        DB::beginTransaction();
        
        try {
            $quotation = Quotation::create([
                'quotation_number' => $request->quotation_number,
                'date' => $request->date,
                'revision' => $request->revision ?? 0,
                'admin_sales' => $request->admin_sales,
                'customer_name' => $request->customer_name,
                'customer_address' => $request->customer_address,
                'attention_person' => $request->attention_person,
                'customer_phone' => $request->customer_phone,
                'customer_email' => $request->customer_email,
                'model_unit' => $request->model_unit,
                'subject' => $request->subject,
                'currency' => $request->currency ?? 'IDR (Rupiah)',
                'place_of_delivery' => $request->place_of_delivery,
                'terms_of_payment' => $request->terms_of_payment,
                'terms_of_delivery' => $request->terms_of_delivery,
                'terms_of_warranty' => $request->terms_of_warranty,
                'sub_total' => $request->sub_total,
                'tax_percentage' => $request->tax_percentage ?? 11,
                'tax_amount' => $request->tax_amount,
                'grand_total' => $request->grand_total,
            ]);

            if ($request->has('items') && is_array($request->items)) {
                foreach ($request->items as $item) {
                    $quotation->items()->create([
                        'part_number' => $item['part_number'] ?? null,
                        'description' => $item['description'],
                        'qty' => $item['qty'],
                        'unit' => $item['unit'] ?? 'SET',
                        'unit_price' => $item['unit_price'],
                        'amount' => $item['amount'],
                    ]);
                }
            }

            DB::commit(); 

            return response()->json([
                'status' => 'success',
                'message' => 'Surat Penawaran berhasil disimpan!',
                'data' => $quotation->load('items')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan data penawaran: ' . $e->getMessage()
            ], 500);
        }
    }

    // 2. Fungsi untuk menampilkan semua data (GET) - POSISINYA DI LUAR FUNGSI STORE
    public function index()
    {
        $quotations = Quotation::with('items')->get();

        return response()->json([
            'status' => 'success',
            'data' => $quotations
        ], 200);
    }
}