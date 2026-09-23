import React, { useState } from 'react';
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg';
import { authLogin } from '../services/api';
import { RefreshCw, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login({ onLogin }) {
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
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
      onLogin();
    } catch (e) {
      setError(e.response?.data?.message || 'Login gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex items-center justify-center p-4 relative">
      <button
        onClick={toggleTheme}
        title={isDark ? 'Mode Terang' : 'Mode Gelap'}
        className="absolute top-5 right-5 p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition cursor-pointer"
      >
        {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-800 dark:border-slate-700">

        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={logoPerusahaan}
            alt="Logo PT Aldigens"
            className="h-16 w-16 object-cover rounded-xl mx-auto mb-4 shadow-md border border-slate-200 dark:border-slate-600"
          />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">PT. ALDIGENS PUTERA PERSADA</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sistem Terintegrasi PO & Inventory</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Email</label>
            <input
              type="email"
              required
              placeholder="email@perusahaan.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition shadow-md cursor-pointer mt-2 text-sm flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            {loading ? 'Memverifikasi...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}