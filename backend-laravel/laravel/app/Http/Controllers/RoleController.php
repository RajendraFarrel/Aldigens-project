<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index()
    {
        $roles = Role::withCount('users')->orderBy('id')->get();
        return response()->json(['data' => $roles]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:100|unique:roles,name',
            'description'   => 'nullable|string|max:255',
            'default_menus' => 'nullable|array',
            'default_menus.*' => 'string',
        ]);

        $role = Role::create([
            'name'          => trim($validated['name']),
            'description'   => $validated['description'] ?? null,
            'default_menus' => $validated['default_menus'] ?? null,
            'is_system'     => false,
        ]);

        return response()->json([
            'data'    => $role,
            'message' => "Role '{$role->name}' berhasil dibuat."
        ], 201);
    }

    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'name'          => "required|string|max:100|unique:roles,name,{$role->id}",
            'description'   => 'nullable|string|max:255',
            'default_menus' => 'nullable|array',
            'default_menus.*' => 'string',
        ]);

        $oldName = $role->name;
        $newName = trim($validated['name']);

        // Cegah pengubahan nama Administrator jika role sistem
        if ($role->is_system && $oldName === 'Administrator' && $newName !== 'Administrator') {
            return response()->json([
                'message' => 'Nama role sistem Administrator tidak dapat diubah.'
            ], 422);
        }

        $role->update([
            'name'          => $newName,
            'description'   => $validated['description'] ?? null,
            'default_menus' => $validated['default_menus'] ?? null,
        ]);

        // Jika nama role diubah, sinkronkan nama role pada tabel users
        if ($oldName !== $newName) {
            User::where('role', $oldName)->update(['role' => $newName]);
        }

        return response()->json([
            'data'    => $role,
            'message' => 'Role berhasil diperbarui.'
        ]);
    }

    public function destroy(Role $role)
    {
        if ($role->is_system || $role->name === 'Administrator' || $role->name === 'Staff Gudang') {
            return response()->json([
                'message' => "Role sistem '{$role->name}' tidak dapat dihapus."
            ], 422);
        }

        $userCount = User::where('role', $role->name)->count();
        if ($userCount > 0) {
            return response()->json([
                'message' => "Role '{$role->name}' sedang digunakan oleh {$userCount} pengguna dan tidak dapat dihapus."
            ], 422);
        }

        $role->delete();

        return response()->json([
            'message' => "Role '{$role->name}' berhasil dihapus."
        ]);
    }
}
