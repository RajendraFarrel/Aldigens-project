<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\QuotationItem;
use Illuminate\Http\Request;

class QuotationController extends Controller
{
    public function index()
    {
        $quotations = Quotation::with('items')->latest()->get();
        return response()->json([
            'status' => 'success',
            'data' => $quotations
        ]);
    }

    public function store(Request $request)
    {
        try {
            $quotation = Quotation::create([
                'quotation_number' => $request->quotation_number,
                'date' => $request->date,
                'revision' => $request->revision ?? 0,
                'admin_sales' => $request->admin_sales ?? 'Admin',
                'customer_name' => $request->customer_name,
                'customer_address' => $request->customer_address,
                'attention_person' => $request->attention_person,
                'customer_phone' => $request->customer_phone,
                'customer_email' => $request->customer_email,
                'model_unit' => $request->model_unit,
                'subject' => $request->subject,
                'currency' => $request->currency,
                'place_of_delivery' => $request->place_of_delivery,
                'terms_of_payment' => $request->terms_of_payment,
                'terms_of_delivery' => $request->terms_of_delivery,
                'terms_of_warranty' => $request->terms_of_warranty,
                'sub_total' => $request->sub_total ?? 0,
                'tax_percentage' => $request->tax_percentage ?? 11,
                'tax_amount' => $request->tax_amount ?? 0,
                'grand_total' => $request->grand_total ?? 0,
            ]);

            if ($request->has('items')) {
                foreach ($request->items as $item) {
                    QuotationItem::create([
                        'quotation_id' => $quotation->id,
                        'part_number' => $item['part_number'] ?? null, // Sesuai migrasi Anda
                        'description' => $item['description'] ?? '-',
                        'qty' => $item['qty'] ?? 1,
                        'unit' => $item['unit'] ?? 'SET',
                        'unit_price' => $item['unit_price'] ?? 0,
                        'amount' => $item['amount'] ?? 0,
                    ]);
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Quotation berhasil disimpan',
                'data' => $quotation->load('items')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan Quotation: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $quotation = Quotation::with('items')->find($id);

        if (!$quotation) {
            return response()->json([
                'status' => 'error',
                'message' => 'Quotation tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $quotation
        ]);
    }
}