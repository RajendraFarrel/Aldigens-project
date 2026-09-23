<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Email atau Password salah!',
            ], 401);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'status'  => 'success',
            'message' => 'Login Berhasil!',
            'user'    => [
                'id'        => $user->id,
                'name'      => $user->name,
                'full_name' => $user->full_name,
                'email'     => $user->email,
                'role'      => $user->role,
                'menu_access' => $user->menu_access,
            ],
            'token' => $token,
        ], 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Logout berhasil.',
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'id'        => $user->id,
            'name'      => $user->name,
            'full_name' => $user->full_name,
            'email'     => $user->email,
            'role'      => $user->role,
            'menu_access' => $user->menu_access,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name'      => 'sometimes|required|string|max:255',
            'full_name' => 'nullable|string|max:255',
        ]);

        $user->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Profil berhasil diperbarui.',
            'user'    => [
                'id'        => $user->id,
                'name'      => $user->name,
                'full_name' => $user->full_name,
                'email'     => $user->email,
                'role'      => $user->role,
            ],
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

        return response()->json([
            'status'  => 'success',
            'message' => 'Password berhasil diubah.',
        ]);
    }
}