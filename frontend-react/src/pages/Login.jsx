import React, { useState } from 'react';
// 1. Impor logo perusahaan (sesuaikan jumlah titiknya ../ tergantung letak file Login.jsx)
import logoPerusahaan from '../assets/LOGO ALDIGENS.jpeg'; 

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulasi login sukses
    if (username.trim() && password.trim()) {
      onLogin();
    } else {
      alert('Mohon masukkan username dan password!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-800">
        
        {/* === BAGIAN LOGO & JUDUL LOGIN === */}
        <div className="text-center mb-8">
          <img 
            src={logoPerusahaan} 
            alt="Logo PT Aldigens" 
            className="h-16 w-16 object-cover rounded-xl mx-auto mb-4 shadow-md border border-slate-200" 
          />
          <h2 className="text-xl font-bold text-slate-900">PT. ALDIGENS PUTERA PERSADA</h2>
          <p className="text-xs text-slate-500 mt-1">Sistem Terintegrasi PO & Radar Siklus Alat</p>
        </div>
        {/* ================================= */}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Username</label>
            <input 
              type="text" 
              required
              placeholder="Masukkan username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Password</label>
            <input 
              type="password" 
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button 
            type="submit" 
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-md cursor-pointer mt-2 text-sm"
          >
            Masuk
          </button>
        </form>

      </div>
    </div>
  );
}