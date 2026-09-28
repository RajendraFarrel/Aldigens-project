import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Wallet, ArrowDownRight, ArrowUpRight, RefreshCw, PlusCircle, X } from 'lucide-react';
import { swalSuccess, swalError } from '../utils/swal';

export default function Dashboard() {
    const [summary, setSummary] = useState({
        total_cash_modal: 145500000,
        total_cash_in: 35200000,
        total_cash_out: 12800000,
    });
    const [mutations, setMutations] = useState([
        { id: 1, ref: 'BKM-2609001', date: '2026-09-28', description: 'Pelunasan Invoice PT United Tractors', account: 'Bank Permata (070.224.339-4)', type: 'IN', amount: 25500000 },
        { id: 2, ref: 'BKK-2609002', date: '2026-09-27', description: 'Pembayaran Pembelian Material Toko Garda', account: 'Bank Permata (070.224.339-4)', type: 'OUT', amount: 8400000 }
    ]);
    const [loading, setLoading] = useState(false);
    const [isInputModalOpen, setIsInputModalOpen] = useState(false);

    // State untuk form modal
    const [formData, setFormData] = useState({
        type: 'IN',
        ref_number: 'BKM-' + Math.floor(100000 + Math.random() * 900000),
        date: new Date().toISOString().split('T')[0],
        account: 'Bank Permata (070.224.339-4)',
        contact_name: '',
        amount: '',
        description: ''
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/dashboard-financials');
            if (response.data) {
                if (response.data.summary) setSummary(response.data.summary);
                if (response.data.mutations) setMutations(response.data.mutations);
            }
        } catch (error) {
            console.warn("Menggunakan data fallback lokal:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = (newType) => {
        const prefix = newType === 'IN' ? 'BKM-' : 'BKK-';
        setFormData({
            ...formData,
            type: newType,
            ref_number: prefix + Math.floor(100000 + Math.random() * 900000)
        });
    };

    const handleSubmitModal = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                transaction_type: formData.type,
                reference_number: formData.ref_number,
                date: formData.date,
                bank_account: formData.account,
                contact_name: formData.contact_name,
                amount: Number(formData.amount),
                description: formData.description
            };

            await api.post('/financial-mutations', payload);
            swalSuccess('Berhasil', 'Transaksi kas berhasil dicatat!');
            setIsInputModalOpen(false);
            fetchDashboardData();
        } catch (error) {
            console.error('Gagal menyimpan mutasi kas:', error);
            swalError('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan transaksi.');
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Utama - Keuangan</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">PT. Aldigens Putera Persada • Pemantauan Kas, Bank & Mutasi Transaksi</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsInputModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer"
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>Input Kas Masuk / Keluar</span>
                    </button>
                    <button
                        onClick={fetchDashboardData}
                        className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1 hover:bg-slate-100 transition shadow-xs cursor-pointer"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Kas & Modal</p>
                        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">Rp {Number(summary.total_cash_modal).toLocaleString()}</h3>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-2 inline-block">Akun: Bank Permata / Cash</span>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Wallet className="h-7 w-7" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Uang Masuk</p>
                        <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">+ Rp {Number(summary.total_cash_in).toLocaleString()}</h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 inline-block">Otomatis dari Modul Penjualan</span>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <ArrowDownRight className="h-7 w-7" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Uang Keluar</p>
                        <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">- Rp {Number(summary.total_cash_out).toLocaleString()}</h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-2 inline-block">Otomatis dari Modul Pembelian</span>
                    </div>
                    <div className="p-4 bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded-xl">
                        <ArrowUpRight className="h-7 w-7" />
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white text-lg">Mutasi & Arus Kas Transaksi Terakhir</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Sinkronisasi real-time dari transaksi penjualan dan pembelian perusahaan.</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">No. Ref / Tanggal</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Keterangan Transaksi</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Akun Kas/Bank</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Jenis Arus</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nominal (IDR)</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {mutations.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className="font-bold text-slate-900 dark:text-white">{item.ref}</span>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{item.date}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200 font-medium">{item.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{item.account}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {item.type === 'IN' ? (
                                            <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 rounded-full inline-flex items-center gap-1">
                                                <ArrowDownRight className="h-3.5 w-3.5" /> Uang Masuk
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-400 rounded-full inline-flex items-center gap-1">
                                                <ArrowUpRight className="h-3.5 w-3.5" /> Uang Keluar
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${item.type === 'IN' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {item.type === 'IN' ? '+ ' : '- '} Rp {Number(item.amount).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Input Built-in */}
            {isInputModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Input Kas Masuk / Keluar Manual</h3>
                            <button onClick={() => setIsInputModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitModal} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('IN')}
                                    className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                                        formData.type === 'IN' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    <ArrowDownRight className="h-4 w-4" /> Kas Masuk (BKM)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTypeChange('OUT')}
                                    className={`py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition cursor-pointer ${
                                        formData.type === 'OUT' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                    }`}
                                >
                                    <ArrowUpRight className="h-4 w-4" /> Kas Keluar (BKK)
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Nomor Referensi</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.ref_number}
                                        onChange={(e) => setFormData({ ...formData, ref_number: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Akun Kas / Bank</label>
                                    <select
                                        value={formData.account}
                                        onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                                    >
                                        <option value="Bank Permata (070.224.339-4)">Bank Permata (070.224.339-4)</option>
                                        <option value="Kas Kecil (Petty Cash)">Kas Kecil (Petty Cash)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Pihak Terkait / Kontak</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: PT United Tractors"
                                        value={formData.contact_name}
                                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Nominal (IDR)</label>
                                <input
                                    type="number"
                                    min="0"
                                    required
                                    placeholder="Contoh: 5000000"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-1">Keterangan / Uraian Transaksi</label>
                                <textarea
                                    rows="3"
                                    required
                                    placeholder="Tuliskan keterangan lengkap..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-white resize-none"
                                ></textarea>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsInputModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
                                >
                                    Simpan Transaksi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}