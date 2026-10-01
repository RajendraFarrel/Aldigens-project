<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Daftar key menu yang valid (sinkron dengan config/menus.js di frontend).
     */
    private const MENU_KEYS = [
        'dashboard',
        // Pembelian
        'purchases-menu',
        'purchase-requisition',
        'purchase-order',
        'receive-item',
        'purchase-invoice',
        'purchase-return',
        'purchase-payment',
        // Penjualan
        'sales-menu',
        'quotation',
        'sales-order',
        'delivery-order',
        'invoice',
        'sales-return',
        'sales-receipt',
        // Manufaktur
        'manufactures-menu',
        'bill-of-materials',
        'work-order',
        'material-release',
        'production',
        'product-result',
        // Inventory
        'inventory-menu',
        'inventory-products',
        'inventory-warehouses',
        'inventory-receive',
        'inventory-issue',
        'inventory-transfer',
        'inventory-opname',
        'inventory-scan',
        'inventory-transactions',
        'inventory-reports',
        'commissioning',
        // Master Data
        'master-data-menu',
        'master-customers',
        'master-suppliers',
        // Network & Security
        'network-security-menu',
        'network-monitoring',
        'security-status',
        'activity-log',
        // Pengaturan
        'users',
    ];

    public function index()
    {
        $users = User::orderBy('id')->get([
            'id', 'name', 'full_name', 'email', 'role', 'menu_access', 'created_at',
        ]);
        return response()->json(['data' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:255',
            'full_name'     => 'nullable|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:6',
            'role'          => 'nullable|string|max:100',
            'menu_access'   => 'nullable|array',
            'menu_access.*' => 'string|max:100|regex:/^[a-zA-Z0-9_-]+$/',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['role']     = $validated['role'] ?? 'Staff Gudang';

        // Non-Administrator tidak boleh diberi akses ke menu Pengaturan Sistem (users)
        if ($validated['role'] !== 'Administrator' && isset($validated['menu_access'])) {
            $validated['menu_access'] = array_values(array_diff($validated['menu_access'], ['users']));
        }

        $user = User::create($validated);

        return response()->json([
            'data'    => $user->only(['id', 'name', 'full_name', 'email', 'role', 'menu_access', 'created_at']),
            'message' => 'User berhasil ditambahkan.'
        ], 201);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'full_name'     => 'nullable|string|max:255',
            'email'         => "sometimes|required|email|unique:users,email,{$user->id}",
            'password'      => 'nullable|string|min:6',
            'role'          => 'nullable|string|max:100',
            'menu_access'   => 'nullable|array',
            'menu_access.*' => 'string|max:100|regex:/^[a-zA-Z0-9_-]+$/',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $role = $validated['role'] ?? $user->role;
        if ($role !== 'Administrator' && isset($validated['menu_access'])) {
            $validated['menu_access'] = array_values(array_diff($validated['menu_access'], ['users']));
        }

        $user->update($validated);

        return response()->json([
            'data'    => $user->only(['id', 'name', 'full_name', 'email', 'role', 'menu_access', 'created_at']),
            'message' => 'User berhasil diperbarui.'
        ]);
    }

    /**
     * Simpan khusus hak akses menu seorang user.
     */
    public function updateMenuAccess(Request $request, User $user)
    {
        $validated = $request->validate([
            'menu_access'   => 'present|array',
            'menu_access.*' => 'string|max:100|regex:/^[a-zA-Z0-9_-]+$/',
        ]);

        $menus = $validated['menu_access'];

        // Staff tidak boleh mendapat menu Pengaturan Sistem.
        if ($user->role !== 'Administrator') {
            $menus = array_values(array_diff($menus, ['users']));
        } else {
            // Administrator wajib tetap bisa mengakses Pengaturan Sistem.
            if (!in_array('users', $menus, true)) {
                $menus[] = 'users';
            }
        }

        $user->menu_access = array_values(array_unique($menus));
        $user->save();

        return response()->json([
            'data'    => $user->only(['id', 'name', 'full_name', 'email', 'role', 'menu_access', 'created_at']),
            'message' => 'Hak akses menu berhasil diperbarui.'
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        // Cegah hapus diri sendiri
        if ($request->user() && $request->user()->id === $user->id) {
            return response()->json(['message' => 'Tidak dapat menghapus akun yang sedang digunakan.'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'User berhasil dihapus.']);
    }
}
