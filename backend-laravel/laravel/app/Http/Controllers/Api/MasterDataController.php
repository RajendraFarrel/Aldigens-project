<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerPartNumber;
use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MasterDataController extends Controller
{
    // ================= CUSTOMER METHODS =================
    public function getCustomers()
    {
        // Sertakan jumlah sparepart & part number customer agar UI bisa informed
        // sebelum menghapus (dan setelah hapus, products.customer_id di-null-kan).
        $customers = Customer::withCount(['products', 'partNumbers'])
            ->orderBy('id', 'desc')
            ->get();

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

        // Kumpulkan dependensi transaksional yang tidak boleh hilang.
        $blocking = [];

        // Hanya periksa tabel yang benar-benar punya kolom customer_id.
        $models = [
            'commissionings'  => \App\Models\Commissioning::class,
            'sales_returns'   => \App\Models\SalesReturn::class,
            'sales_orders'    => \App\Models\SalesOrder::class,
            'delivery_orders' => \App\Models\DeliveryOrder::class,
            'quotations'      => \App\Models\Quotation::class,
            'invoices'        => \App\Models\Invoice::class,
            'sales_receipts'  => \App\Models\SalesReceipt::class,
        ];

        foreach ($models as $label => $model) {
            if (!class_exists($model)) continue;
            if (!Schema::hasColumn($model::make()->getTable(), 'customer_id')) continue;
            $count = $model::where('customer_id', $customer->id)->count();
            if ($count > 0) {
                $blocking[] = "{$count} data {$label}";
            }
        }

        if ($blocking) {
            return response()->json([
                'message' => 'Customer masih terkait dengan ' . implode(', ', $blocking)
                    . '. Hapus atau pindahkan datanya terlebih dahulu.',
            ], 422);
        }

        DB::transaction(function () use ($customer) {
            // Sparepart tidak ikut terhapus; hanya dilepas dari customer ini.
            Product::where('customer_id', $customer->id)->update(['customer_id' => null]);
            CustomerPartNumber::where('customer_id', $customer->id)->delete();
            $customer->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil dihapus'
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