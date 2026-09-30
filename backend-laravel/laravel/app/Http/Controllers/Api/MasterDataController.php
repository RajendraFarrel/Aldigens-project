<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Supplier;
use Illuminate\Http\Request;

class MasterDataController extends Controller
{
    // ================= CUSTOMER METHODS =================
    public function getCustomers()
    {
        $customers = Customer::orderBy('id', 'desc')->get();
        return response()->json([
            'success' => true,
            'data' => $customers
        ]);
    }

    public function storeCustomer(Request $request)
    {
        $validated = $request->validate([
            'customer_code' => 'required|unique:customers,customer_code',
            'customer_name' => 'required|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'status' => 'required|in:AKTIF,NONAKTIF',
        ]);

        $customer = Customer::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil ditambahkan',
            'data' => $customer
        ], 201);
    }

    public function updateCustomer(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $validated = $request->validate([
            'customer_code' => 'required|unique:customers,customer_code,' . $id,
            'customer_name' => 'required|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'status' => 'required|in:AKTIF,NONAKTIF',
        ]);

        $customer->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil diperbarui',
            'data' => $customer
        ]);
    }

    public function deleteCustomer($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->update(['status' => 'NONAKTIF']); // Soft disable / nonaktifkan

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil dinonaktifkan'
        ]);
    }

    // ================= SUPPLIER METHODS =================
    public function getSuppliers()
    {
        $suppliers = Supplier::orderBy('id', 'desc')->get();
        return response()->json([
            'success' => true,
            'data' => $suppliers
        ]);
    }

    public function storeSupplier(Request $request)
    {
        $validated = $request->validate([
            'supplier_code' => 'required|unique:suppliers,supplier_code',
            'supplier_name' => 'required|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'status' => 'required|in:AKTIF,NONAKTIF',
        ]);

        $supplier = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil ditambahkan',
            'data' => $supplier
        ], 201);
    }

    public function updateSupplier(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'supplier_code' => 'required|unique:suppliers,supplier_code,' . $id,
            'supplier_name' => 'required|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'status' => 'required|in:AKTIF,NONAKTIF',
        ]);

        $supplier->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil diperbarui',
            'data' => $supplier
        ]);
    }

    public function deleteSupplier($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->update(['status' => 'NONAKTIF']);

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil dinonaktifkan'
        ]);
    }
}