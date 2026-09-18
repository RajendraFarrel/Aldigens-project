import React, { useState } from 'react';
import { Users, UserPlus, Shield, Lock, MoreVertical } from 'lucide-react';

export default function UserManagement() {
  // Data dummy karyawan
  const [userList] = useState([
    { id: 1, name: 'Budi Santoso (Anda)', email: 'admin@aldigens.co.id', role: 'Super Admin', status: 'Aktif' },
    { id: 2, name: 'Andi Pratama', email: 'andi.sales@aldigens.co.id', role: 'Sales', status: 'Aktif' },
    { id: 3, name: 'Siti Aminah', email: 'siti.sales@aldigens.co.id', role: 'Sales', status: 'Nonaktif' },
  ]);

  return (
    <div className="p-8 space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600" />
            <span>Manajemen Pengguna Sistem</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Pusat kontrol akses karyawan. Tambahkan akun staf baru tanpa fitur registrasi publik.
          </p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 transition shadow-xs cursor-pointer">
          <UserPlus className="h-4 w-4" />
          <span>Tambah Karyawan Baru</span>
        </button>
      </div>

      {/* Tabel Pengguna */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Nama & Email Lengkap</th>
                <th className="py-3.5 px-6">Role Akses</th>
                <th className="py-3.5 px-6">Status Akun</th>
                <th className="py-3.5 px-6 text-center">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {userList.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900">{user.name}</div>
                    <div className="text-xs text-slate-500 flex items-center mt-1">
                      {user.email}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-700">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                      user.role === 'Super Admin' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {user.role === 'Super Admin' && <Shield className="h-3 w-3" />}
                      <span>{user.role}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.status === 'Aktif' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center flex justify-center space-x-2">
                    <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Reset Password">
                      <Lock className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition" title="Menu Lainnya">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}