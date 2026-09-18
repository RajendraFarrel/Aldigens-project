<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        // 1. Validasi input yang dikirim dari React
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        // 2. Cek kecocokan dengan database
        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            return response()->json([
                'status' => 'success',
                'message' => 'Login Berhasil!',
                'user' => $user
            ], 200);
        }

        // 3. Kalau email atau password salah
        return response()->json([
            'status' => 'error',
            'message' => 'Email atau Password salah!'
        ], 401);
    }
}