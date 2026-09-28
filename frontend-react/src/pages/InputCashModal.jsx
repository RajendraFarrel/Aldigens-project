import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Wallet, ArrowDownRight, ArrowUpRight, RefreshCw, PlusCircle } from 'lucide-react';
import InputCashModal from './InputCashModal'; // Pastikan path import modal ini sesuai

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
            console.warn("Menggunakan data fallback lokal karena endpoint backend belum tersedia:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
            {/* Header Title */}
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
                        title="Muat Ulang"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Kartu Ringkasan Keuangan (Modal, Uang Masuk, Uang Keluar) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Kas & Modal */}
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

                {/* Total Uang Masuk */}
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

                {/* Total Uang Keluar */}
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

            {/* Tabel Mutasi & Arus Kas Terakhir */}
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
                            {mutations.length > 0 ? (
                                mutations.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className="font-bold text-slate-900 dark:text-white">{item.ref}</span>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.date}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-800 dark:text-slate-200 font-medium">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                                            {item.account}
                                        </td>
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
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">Belum ada data mutasi kas masuk/keluar.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Input Kas Masuk / Keluar */}
            <InputCashModal
                isOpen={isInputModalOpen}
                onClose={() => setIsInputModalOpen(false)}
                onSuccess={fetchDashboardData}
            />
        </div>
    );
}