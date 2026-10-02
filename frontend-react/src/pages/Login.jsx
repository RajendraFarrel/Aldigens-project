import React, { useState } from 'react';
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg';
import { authLogin } from '../services/api';
import {
  RefreshCw, Moon, Sun, Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const fieldClass =
  'w-full pl-11 pr-4 py-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-300/70 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition';

export default function Login({ onLogin }) {
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail]       = useState(() => localStorage.getItem('aldigens_remember_email') || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(() => localStorage.getItem('aldigens_remember_email') || '');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Mohon masukkan email dan password!');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await authLogin(email, password);
      const { token, user } = res.data;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
      // Simpan email bila "Ingat Saya" dicentang, agar tidak harus diketik ulang.
      if (remember) localStorage.setItem('aldigens_remember_email', email);
      else localStorage.removeItem('aldigens_remember_email');
      onLogin();
    } catch (e) {
      setError(e.response?.data?.message || 'Login gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative">
      <button
        onClick={toggleTheme}
        title={isDark ? 'Mode Terang' : 'Mode Gelap'}
        className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/10 dark:bg-white/10 hover:bg-white/20 text-slate-300 dark:text-slate-200 transition cursor-pointer"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Kartu utama: sisi kiri branding, sisi kanan form */}
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 grid md:grid-cols-2">

        {/* ── Panel kiri ── */}
        <div className="relative bg-slate-900 dark:bg-slate-950 text-white p-8 sm:p-10 flex flex-col justify-between">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-[0.07]"
            style={{ backgroundImage: `url(${logoPerusahaan})` }}
            aria-hidden="true"
          />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <ShieldCheck className="w-4 h-4" />
              <div className="leading-tight">
                <p className="text-[10px] uppercase tracking-wider text-white/60">Portal Corporat</p>
                <p className="text-xs font-semibold">Sistem Informasi Terpadu</p>
              </div>
            </div>
          </div>

          <div className="relative flex-1 flex items-center justify-center py-10">
            <div className="w-40 h-40 rounded-3xl border border-white/15 bg-white/5 backdrop-blur-sm flex items-center justify-center">
              <img src={logoPerusahaan} alt="Logo PT Aldigens" className="w-24 h-24 object-contain" />
            </div>
          </div>

          <div className="relative">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              <span className="text-red-600">PT. ALDIGENS</span>
              <br />
              <span className="text-slate-300 dark:text-slate-400">PUTERA PERSADA</span>
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-white/55 leading-relaxed max-w-xs">
              Menghadirkan solusi konstruksi, pengembangan, dan layanan profesional
              dengan standar kualitas tinggi.
            </p>
          </div>
        </div>

        {/* ── Panel kanan: form ── */}
        <div className="p-8 sm:p-10 bg-white dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Selamat Datang Kembali</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Silakan masukkan kredensial akun korporat Anda untuk masuk.
          </p>

          {error && (
            <div className="mt-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Email Korporat / Username
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="nama@aldigens.co.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${fieldClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title={showPass ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!remember}
                  onChange={(e) => setRemember(e.target.checked ? email : '')}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">Ingat Saya</span>
              </label>
              <button type="button" className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                Lupa Password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer text-sm flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Memverifikasi...' : 'Masuk ke Sistem'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-center text-xs text-slate-400">
              Butuh bantuan akses akun? Hubungi{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">Tim IT Support</span>
            </p>
          </div>
        </div>
      </div>

      <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-slate-400 dark:text-slate-600">
        © {new Date().getFullYear()} PT. Aldigens Putera Persada. · Bantuan · Kebijakan Privasi
      </p>
    </div>
  );
}