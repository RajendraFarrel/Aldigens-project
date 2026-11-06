<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Payload user untuk frontend.
     * `permissions` & `menu_access` dihitung DI SERVER sehingga perubahan role
     * langsung berlaku tanpa menunggu frontend. `menu_access` tetap dikirim
     * untuk kompatibilitas komponen lama.
     */
    private function userPayload(User $user): array
    {
        return [
            'id'           => $user->id,
            'name'         => $user->name,
            'full_name'    => $user->full_name,
            'email'        => $user->email,
            'role'         => $user->role,
            'menu_access'  => $user->allowedMenus(),
            'permissions'  => $user->allowedPermissions(),
            'is_admin'     => $user->isAdministrator(),
        ];
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        // Role harus valid (tersimpan di tabel roles). Login ditolak bila role
        // tidak dikenal sehingga token tidak pernah membawa hak tak terdefinisi.
        $existing = User::query()->where('email', $credentials['email'])->first();
        if ($existing && !\App\Models\Role::query()->where('name', $existing->role)->exists()) {
            AuditLogService::record($request, 'security.login', 'security', 'failed', 'Role tidak valid untuk akun ' . $credentials['email']);

            return response()->json([
                'status'  => 'error',
                'message' => 'Role pengguna tidak valid. Hubungi Administrator.',
            ], 403);
        }

        if (!Auth::attempt($credentials)) {
            AuditLogService::record($request, 'security.login', 'security', 'failed', 'Login gagal untuk ' . $credentials['email']);

            return response()->json([
                'status'  => 'error',
                'message' => 'Email atau Password salah!',
            ], 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;

        AuditLogService::record($request, 'security.login', 'security', 'success', 'Login berhasil', 'user', $user->id);

        return response()->json([
            'status'  => 'success',
            'message' => 'Login Berhasil!',
            'user'    => $this->userPayload($user),
            'token'   => $token,
        ], 200);
    }

    public function logout(Request $request)
    {
        AuditLogService::record($request, 'security.logout', 'security', 'success', 'Logout');

        // Hapus token yang sedang dipakai. Guard ditangani defensif: token
        // transien / tanpa access token tidak boleh membuat logout gagal.
        $token = $request->user()->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Logout berhasil.',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($this->userPayload($request->user()));
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'      => 'sometimes|required|string|max:255',
            'full_name' => 'nullable|string|max:255',
        ]);

        // Hanya field profil yang boleh diubah; role/menu_access diabaikan.
        $user->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Profil berhasil diperbarui.',
            'user'    => $this->userPayload($user->fresh()),
        ]);
    }

    public function changePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:6|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Password lama salah.',
            ], 400);
        }

        $user->update(['password' => Hash::make($validated['new_password'])]);

        AuditLogService::record($request, 'security.password.change', 'security', 'success', 'Password diubah sendiri', 'user', $user->id);

        return response()->json([
            'status'  => 'success',
            'message' => 'Password berhasil diubah.',
        ]);
    }

    /**
     * Daftar activity log (read-only). Hanya untuk pemegang
     * security.activity_logs.view. Tidak ada endpoint edit/hapus.
     */
    public function activityLogs(Request $request)
    {
        $this->authorize('viewAny', ActivityLog::class);

        if (!ActivityLog::tableReady()) {
            return response()->json([
                'data'    => [],
                'message' => 'Tabel activity_logs belum tersedia. Jalankan migration permission/log.',
            ]);
        }

        $query = ActivityLog::query()->latest('id');

        if ($request->filled('module')) {
            $query->where('module', $request->input('module'));
        }
        if ($request->filled('result')) {
            $query->where('result', $request->input('result'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        return response()->json([
            'data' => $query->limit((int) min($request->integer('limit', 200), 500))->get(),
        ]);
    }
}
