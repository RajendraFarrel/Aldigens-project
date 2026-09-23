import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, Shield, X, Save, RefreshCw, Trash2, Edit2, Lock,
  KeyRound, Check,
} from 'lucide-react';
import {
  getUsers, createUser, updateUser, deleteUser, updateUserMenuAccess,
} from '../services/api';
import { MENU_GROUPS, MENU_KEYS, getAllowedMenus } from '../config/menus';
import { swalConfirm, swalError, swalToast } from '../utils/swal';

const EMPTY_FORM = {
  name: '',
  full_name: '',
  email: '',
  password: '',
  role: 'Staff Gudang',
  menu_access: null, // null = belum diatur (pakai default)
};

export default function UserManagement() {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(false);
  const [showModal, setShowModal]       = useState(false);
  const [editingUser, setEditingUser]   = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  // Modal khusus pengaturan akses menu
  const [accessUser, setAccessUser]     = useState(null);
  const [accessDraft, setAccessDraft]   = useState([]);
  const [savingAccess, setSavingAccess] = useState(false);

  // User yang sedang login (untuk mencegah hapus akun sendiri)
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('auth_user') || 'null');
    } catch {
      return null;
    }
  })();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getUsers();
      setUsers(res.data.data || []);
    } catch {
      setError('Gagal memuat data pengguna.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openAdd = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name:      user.name      || '',
      full_name: user.full_name || '',
      email:     user.email     || '',
      password:  '',
      role:      user.role      || 'Staff Gudang',
      menu_access: Array.isArray(user.menu_access) ? user.menu_access : null,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError('Nama dan email wajib diisi.');
      return;
    }
    if (!editingUser && !form.password.trim()) {
      setError('Password wajib diisi untuk pengguna baru.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = { ...form };
      // Saat edit, kosongkan password = tidak diubah
      if (editingUser && !payload.password) {
        delete payload.password;
      }

      if (editingUser) {
        await updateUser(editingUser.id, payload);
        swalToast('Data pengguna berhasil diperbarui.', 'success');
      } else {
        await createUser(payload);
        swalToast('Pengguna baru berhasil ditambahkan.', 'success');
      }
      setShowModal(false);
      fetchUsers();
    } catch (e) {
      const msg = e.response?.data?.message
        || (e.response?.data?.errors
          ? Object.values(e.response.data.errors).flat().join(' ')
          : 'Terjadi kesalahan, coba lagi.');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (currentUser && currentUser.id === user.id) {
      swalError('Tidak dapat menghapus', 'Anda tidak dapat menghapus akun yang sedang digunakan.');
      return;
    }
    const ok = await swalConfirm({
      title: 'Hapus Pengguna?',
      text: `Pengguna "${user.full_name || user.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteUser(user.id);
      swalToast('Pengguna berhasil dihapus.', 'success');
      fetchUsers();
    } catch (e) {
      swalError('Gagal menghapus', e.response?.data?.message || 'Terjadi kesalahan saat menghapus pengguna.');
    }
  };

  // -------------------- Pengaturan Akses Menu --------------------
  const openAccess = (user) => {
    setAccessUser(user);
    setAccessDraft(getAllowedMenus(user));
  };

  const toggleAccess = (key) => {
    if (key === 'dashboard' || key === 'users') return; // wajib / dikelola role
    setAccessDraft((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const setAllAccess = (on) => {
    setAccessDraft(() => {
      const locked = ['dashboard'];
      if (accessUser?.role === 'Administrator') locked.push('users');
      return on ? [...MENU_KEYS] : locked;
    });
  };

  const handleSaveAccess = async () => {
    if (!accessUser) return;
    setSavingAccess(true);
    try {
      const res = await updateUserMenuAccess(accessUser.id, accessDraft);
      swalToast('Hak akses menu berhasil diperbarui.', 'success');
      setAccessUser(null);
      fetchUsers();

      // Jika admin mengubah aksesnya sendiri, sinkronkan sesi lokal segera.
      const updated = res.data?.data;
      if (updated && currentUser && currentUser.id === updated.id) {
        localStorage.setItem('auth_user', JSON.stringify(updated));
        window.dispatchEvent(new Event('auth:user-updated'));
      }
    } catch (e) {
      swalError('Gagal menyimpan', e.response?.data?.message || 'Terjadi kesalahan saat menyimpan hak akses.');
    } finally {
      setSavingAccess(false);
    }
  };

  const roleBadge = (role) =>
    role === 'Administrator'
      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40'
      : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600';

  const accessSummary = (user) => {
    const total = MENU_KEYS.length;
    const allowed = getAllowedMenus(user);
    if (allowed.length >= total) return 'Semua menu';
    return `${allowed.length} dari ${total} menu`;
  };

  return (
    <div className="p-8 space-y-6 dark:text-slate-200">

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Manajemen Pengguna Sistem</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Pusat kontrol akses karyawan. Anda juga dapat mengatur menu apa saja yang boleh diakses setiap pengguna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2.5 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center space-x-2 transition shadow-xs cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Tambah Karyawan Baru</span>
          </button>
        </div>
      </div>

      {/* Alert messages */}
      {error && !showModal && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <span>✗</span> {error}
        </div>
      )}

      {/* Tabel Pengguna */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <th className="py-3.5 px-6">Nama & Email Lengkap</th>
                <th className="py-3.5 px-6">Role Akses</th>
                <th className="py-3.5 px-6">Akses Menu</th>
                <th className="py-3.5 px-6">Status Akun</th>
                <th className="py-3.5 px-6 text-center">Aksi Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
                    Memuat data pengguna...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {user.full_name || user.name}
                      {currentUser && currentUser.id === user.id && (
                        <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-400">(Anda)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-1">
                      {user.email}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-700 dark:text-slate-200">
                    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-medium ${roleBadge(user.role)}`}>
                      {user.role === 'Administrator' && <Shield className="h-3 w-3" />}
                      <span>{user.role}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => openAccess(user)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                      title="Atur akses menu"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>{accessSummary(user)}</span>
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/40">
                      Aktif
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => openAccess(user)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition cursor-pointer"
                        title="Atur Akses Menu"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 rounded-lg transition cursor-pointer"
                        title="Edit / Reset Password"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition cursor-pointer"
                        title="Hapus Pengguna"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500">
          Total: {users.length} pengguna
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingUser ? 'Edit Pengguna' : 'Tambah Karyawan Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-300 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Nama Login <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: budi.santoso"
                  className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@aldigens.co.id"
                  className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Password {editingUser
                    ? <span className="text-slate-400 font-normal">(kosongkan jika tidak diubah)</span>
                    : <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-9 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">Role Akses</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="Staff Gudang">Staff Gudang</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Atur Akses Menu */}
      {accessUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={() => setAccessUser(null)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Atur Akses Menu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {accessUser.full_name || accessUser.name} · <span className="font-medium">{accessUser.role}</span>
                </p>
              </div>
              <button onClick={() => setAccessUser(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Aksi cepat */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAllAccess(true)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Pilih Semua
              </button>
              <button
                onClick={() => setAllAccess(false)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Kosongkan
              </button>
            </div>

            <div className="space-y-4">
              {MENU_GROUPS.map((group) => (
                <div key={group.group}>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    {group.group}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const locked = item.key === 'dashboard' || item.key === 'users';
                      const checked = accessDraft.includes(item.key);
                      return (
                        <label
                          key={item.key}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition ${
                            locked
                              ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 cursor-not-allowed opacity-70'
                              : checked
                                ? 'border-indigo-300 dark:border-indigo-500/50 bg-indigo-50 dark:bg-indigo-500/15 cursor-pointer'
                                : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-indigo-600"
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggleAccess(item.key)}
                          />
                          <Icon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700 dark:text-slate-200 truncate">{item.label}</span>
                          {locked && (
                            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">wajib</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2">
              Menu <b>Dashboard</b> selalu aktif. Menu <b>Pengaturan Sistem</b> otomatis hanya untuk Administrator.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setAccessUser(null)}
                className="flex-1 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveAccess}
                disabled={savingAccess}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                {savingAccess ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {savingAccess ? 'Menyimpan...' : 'Simpan Akses'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}