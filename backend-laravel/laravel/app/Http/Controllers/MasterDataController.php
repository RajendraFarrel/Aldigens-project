<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MasterDataController extends Controller
{
    public function customers(Request $request)
    {
        $query = Customer::query()->orderBy('customer_name');
        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(fn($q) => $q->where('customer_code', 'like', "%{$search}%")
                ->orWhere('customer_name', 'like', "%{$search}%"));
        }
        return response()->json(['data' => $query->get()]);
    }

    public function storeCustomer(Request $request)
    {
        $data = $request->validate([
            'customer_code' => 'required|string|max:50|unique:customers,customer_code',
            'customer_name' => 'required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'status' => 'nullable|in:AKTIF,NONAKTIF',
        ]);
        return response()->json(['data' => Customer::create($data)], 201);
    }

    public function updateCustomer(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'customer_code' => 'sometimes|required|string|max:50|unique:customers,customer_code,' . $customer->id,
            'customer_name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'status' => 'nullable|in:AKTIF,NONAKTIF',
        ]);
        $customer->update($data);
        return response()->json(['data' => $customer->fresh()]);
    }

    public function deleteCustomer(Customer $customer)
    {
        $customer->update(['status' => 'NONAKTIF']);
        return response()->json(['message' => 'Customer dinonaktifkan.']);
    }

    public function suppliers(Request $request)
    {
        $query = Supplier::query()->orderBy('supplier_name');
        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(fn($q) => $q->where('supplier_code', 'like', "%{$search}%")
                ->orWhere('supplier_name', 'like', "%{$search}%"));
        }
        return response()->json(['data' => $query->get()]);
    }

    public function storeSupplier(Request $request)
    {
        $data = $request->validate([
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code',
            'supplier_name' => 'required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'status' => 'nullable|in:AKTIF,NONAKTIF',
        ]);
        return response()->json(['data' => Supplier::create($data)], 201);
    }

    public function updateSupplier(Request $request, Supplier $supplier)
    {
        $data = $request->validate([
            'supplier_code' => 'sometimes|required|string|max:50|unique:suppliers,supplier_code,' . $supplier->id,
            'supplier_name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'status' => 'nullable|in:AKTIF,NONAKTIF',
        ]);
        $supplier->update($data);
        return response()->json(['data' => $supplier->fresh()]);
    }

    public function deleteSupplier(Supplier $supplier)
    {
        $supplier->update(['status' => 'NONAKTIF']);
        return response()->json(['message' => 'Supplier dinonaktifkan.']);
    }
}
