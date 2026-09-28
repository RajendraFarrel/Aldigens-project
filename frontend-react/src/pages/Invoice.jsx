import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus, Printer } from 'lucide-react';

export default function Invoice() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        sales_order_id: 1,
        invoice_number: 'F-' + Math.floor(10000000 + Math.random() * 90000000) + '/INV',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        customer_address: '',
        ref_po: '',
        terms: 'Net 30',
        items: [{ code: '', name: '', qty: 1, price: 0, disc: 0 }]
    });

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await api.get('/invoices');
            setInvoices(response.data.data || response.data);
        } catch (error) {
            console.error("Gagal memuat data Invoice:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { code: '', name: '', qty: 1, price: 0, disc: 0 }] });
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length === 1) return;
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;
        setFormData({ ...formData, items: updatedItems });
    };

    const resetForm = () => setFormData({
        sales_order_id: 1,
        invoice_number: 'F-' + Math.floor(10000000 + Math.random() * 90000000) + '/INV',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
        customer_name: '',
        customer_address: '',
        ref_po: '',
        terms: 'Net 30',
        items: [{ code: '', name: '', qty: 1, price: 0, disc: 0 }]
    });

    const handleSubmitNewInvoice = async (e) => {
        e.preventDefault();
        try {
            let subTotal = 0;
            const formattedItems = formData.items.map((item) => {
                const totalRow = (Number(item.qty) * Number(item.price)) - ((Number(item.qty) * Number(item.price) * Number(item.disc)) / 100);
                subTotal += totalRow;
                return {
                    code: item.code,
                    name: item.name,
                    qty: Number(item.qty),
                    price: Number(item.price),
                    disc: Number(item.disc),
                    total: totalRow
                };
            });

            const taxAmount = subTotal * 0.11;
            const grandTotal = subTotal + taxAmount;

            const payload = {
                sales_order_id: 1, // Menggunakan dummy ID 1 agar aman dari validasi eksistensi relasi backend
                invoice_number: formData.invoice_number,
                date: formData.date,
                due_date: formData.due_date,
                customer_name: formData.customer_name,
                customer_address: formData.customer_address,
                ref_po: formData.ref_po,
                terms: formData.terms,
                sub_total: subTotal,
                tax_amount: taxAmount,
                grand_total: grandTotal,
                items: formattedItems
            };

            await api.post('/invoices', payload);
            swalSuccess('Berhasil', 'Invoice baru berhasil disimpan ke database!');
            setIsModalOpen(false);
            resetForm();
            fetchInvoices();
        } catch (error) {
            console.error('Gagal menyimpan Invoice:', error);
            swalError('Gagal Menyimpan', error.response?.data?.message || 'Periksa kembali inputan Anda.');
        }
    };

    const terbilang = (nilai) => {
        const angka = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
        let n = Math.abs(nilai);
        if (n < 12) return angka[n];
        if (n < 20) return terbilang(n - 10) + " belas";
        if (n < 100) return terbilang(Math.floor(n / 10)) + " puluh " + terbilang(n % 10);
        if (n < 200) return "seratus " + terbilang(n - 100);
        if (n < 1000) return terbilang(Math.floor(n / 100)) + " ratus " + terbilang(n % 100);
        if (n < 2000) return "seribu " + terbilang(n - 1000);
        if (n < 1000000) return terbilang(Math.floor(n / 1000)) + " ribu " + terbilang(n % 1000);
        if (n < 1000000000) return terbilang(Math.floor(n / 1000000)) + " juta " + terbilang(n % 1000000);
        return n.toLocaleString() + " Rupiah";
    };

    // --- TEMPLATE CETAK INVOICE STANDAR ACCURATE 4 ---
    const handlePrintInvoice = (inv) => {
        const itemsList = inv.items || [];
        const subTotal = itemsList.reduce((acc, curr) => acc + (Number(curr.qty || curr.quantity) * Number(curr.price || curr.unit_price || 0)), 0);
        const taxTotal = subTotal * 0.11;
        const grandTotal = subTotal + taxTotal;
        const terbilangStr = terbilang(Math.round(grandTotal)) + " Rupiah";

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${inv.invoice_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; margin: 0; }
                        .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
                        .logo-area { width: 50%; vertical-align: top; }
                        .company-address { font-size: 9px; line-height: 1.3; color: #333; margin-top: 4px; }
                        .title-area { width: 50%; text-align: right; vertical-align: top; }
                        .doc-title { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 0.5px; }
                        .meta-table { width: 100%; font-size: 10px; margin-bottom: 12px; }
                        .meta-table td { padding: 2px 4px; vertical-align: top; }
                        .info-box-table { width: 100%; margin-bottom: 12px; border: 1px solid #999; border-collapse: collapse; }
                        .info-box-table td { padding: 5px 8px; vertical-align: top; width: 50%; border: 1px solid #999; font-size: 10px; }
                        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
                        .items-table th, .items-table td { border: 1px solid #000; padding: 5px 6px; font-size: 10px; }
                        .items-table th { background: #f0f0f0; text-align: center; }
                        .bank-box { border: 1px solid #999; padding: 6px; font-size: 10px; margin-top: 10px; line-height: 1.4; }
                        .sign-table { width: 100%; margin-top: 25px; text-align: center; font-size: 10px; }
                        .sign-box { height: 50px; }
                    </style>
                </head>
                <body>
                    <table class="header-table">
                        <tr>
                            <td class="logo-area">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
                                    <svg width="38" height="35" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 90 L10 35 L38 10 L38 90 Z" fill="none" stroke="#000" stroke-width="8"/>
                                        <path d="M28 90 L28 22 L62 5 L62 90 Z" fill="none" stroke="#000" stroke-width="8"/>
                                    </svg>
                                    <span style="font-weight: 900; font-size: 15px; letter-spacing: 0.5px;">PT. ALDIGENS PUTERA PERSADA</span>
                                </div>
                                <div class="company-address">
                                    Ruko Bekasi Mas Blok C-25<br/>
                                    Jl. Jend. Ahmad Yani, Margajaya, Bekasi Selatan - 17141
                                </div>
                            </td>
                            <td class="title-area">
                                <div class="doc-title">INVOICE</div>
                                <div><strong>No :</strong> ${inv.invoice_number}</div>
                            </td>
                        </tr>
                    </table>

                    <table class="meta-table">
                        <tr>
                            <td style="width: 50%;"></td>
                            <td style="width: 50%;">
                                <table style="width: 100%; font-size: 10px;">
                                    <tr><td><strong>Tanggal</strong></td><td>: ${inv.date}</td></tr>
                                    <tr><td><strong>Term Pembayaran</strong></td><td>: ${inv.terms || 'Net 30'}</td></tr>
                                    <tr><td><strong>Reff. PO. No</strong></td><td>: ${inv.ref_po || '-'}</td></tr>
                                    <tr><td><strong>Mata Uang</strong></td><td>: Rupiah (IDR)</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <table class="info-box-table">
                        <tr>
                            <td>
                                <strong>Pelanggan :</strong><br/>
                                <span style="font-size: 12px; font-weight: bold;">${inv.customer_name}</span><br/>
                                <span>${inv.customer_address || '-'}</span>
                            </td>
                            <td>
                                <strong>Keterangan Pengiriman :</strong><br/>
                                <span>Franco Jakarta</span>
                            </td>
                        </tr>
                    </table>

                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 5%;">No</th>
                                <th style="width: 22%;">Kode Barang</th>
                                <th style="width: 35%;">Nama Barang</th>
                                <th style="width: 8%;">Qty</th>
                                <th style="width: 15%;">Harga</th>
                                <th style="width: 15%;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList.map((item, idx) => `
                                <tr>
                                    <td align="center">${idx + 1}</td>
                                    <td>${item.code || 'item-' + (idx+1)}</td>
                                    <td>${item.name || item.description}</td>
                                    <td align="center">${item.qty || item.quantity}</td>
                                    <td align="right">${Number(item.price || item.unit_price || 0).toLocaleString()}</td>
                                    <td align="right">${(Number(item.qty || item.quantity) * Number(item.price || item.unit_price || 0)).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <table style="width: 100%; margin-top: 10px;">
                        <tr>
                            <td style="width: 55%; vertical-align: top;">
                                <div style="font-style: italic; font-weight: bold; margin-bottom: 8px; font-size: 10px;">
                                    Terbilang : #${terbilangStr}#
                                </div>
                                <div class="bank-box">
                                    <strong>Mohon Pembayaran dilakukan ke Account kami sob :</strong><br/>
                                    Nama Account &nbsp;: <strong>PT. ALDIGENS PUTERA PERSADA</strong><br/>
                                    Nama Bank &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>BANK PERMATA</strong><br/>
                                    Account No &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>AC No: 070.224.339-4</strong>
                                </div>
                            </td>
                            <td style="width: 45%; vertical-align: top;">
                                <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                                    <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>Sub Total</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${subTotal.toLocaleString()}</td></tr>
                                    <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>PPN 11%</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${taxTotal.toLocaleString()}</td></tr>
                                    <tr><td style="padding: 6px; font-size: 11px; font-weight: bold;">TOTAL</td><td align="right" style="padding: 6px; font-size: 11px; font-weight: bold;">${grandTotal.toLocaleString()}</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <table class="sign-table">
                        <tr>
                            <td style="width: 50%;"></td>
                            <td style="width: 50%;">
                                PT. ALDIGENS PUTERA PERSADA<br/>
                                <div class="sign-box"></div>
                                <strong>KHAFID YUSUF</strong><br/>
                                <span style="font-size: 9px;">Direktur</span>
                            </td>
                        </tr>
                    </table>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // --- FUNGSI TEST CETAK DATA DUMMY INSTAN ---
    const handlePrintDummy = () => {
        const dummyInvoice = {
            invoice_number: 'F-26090035/INV',
            date: '2026-09-28',
            terms: 'Net 30',
            ref_po: '990615622',
            customer_name: 'PT. UNITED TRACTORS Tbk',
            customer_address: 'Jl. Raya Bekasi Km 22 Cakung, Jakarta Timur - 13910',
            items: [
                { code: 'OPT-SWTC-UDTO-LB2Q', name: 'LOTTO BOX 2 (ESD,LOS)', qty: 5, price: 4000000 },
                { code: 'OPT-APAR-UDTO-F6SO', name: 'FIRE EXTINGUISHER 6KG - BR', qty: 5, price: 1100000 }
            ]
        };
        handlePrintInvoice(dummyInvoice);
    };

    if (loading) return <div className="p-6 text-slate-600 dark:text-slate-300">Memuat data Invoice...</div>;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daftar Invoice (Faktur Penjualan)</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handlePrintDummy}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer"
                    >
                        <Printer className="h-4 w-4" />
                        <span>Cetak Dummy Invoice (Testing)</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer"
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span>Buat Invoice Baru</span>
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">No. Invoice</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Pelanggan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Total Tagihan</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {invoices.length > 0 ? (
                            invoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">{inv.invoice_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{inv.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800 dark:text-slate-200">{inv.customer_name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">Rp {Number(inv.grand_total || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <button
                                            onClick={() => handlePrintInvoice(inv)}
                                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 px-3 py-1 rounded transition inline-flex items-center space-x-1 cursor-pointer"
                                            title="Cetak Invoice"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>Cetak</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">Belum ada data Invoice dari database. Gunakan tombol hijau di atas untuk uji cetak dummy.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Buat Invoice Baru</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitNewInvoice} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor Invoice</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.invoice_number}
                                        onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tanggal</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Pelanggan</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: PT. UNITED TRACTORS Tbk"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Reff PO No.</label>
                                    <input
                                        type="text"
                                        placeholder="Nomor PO Pelanggan"
                                        value={formData.ref_po}
                                        onChange={(e) => setFormData({ ...formData, ref_po: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alamat Pelanggan</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Alamat lengkap pelanggan"
                                    value={formData.customer_address}
                                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm text-slate-700">Daftar Item Penagihan</h4>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah Baris</span>
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-rose-500 hover:text-rose-700 p-1 transition cursor-pointer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kode Barang</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Contoh: OPT-SWTC"
                                                        value={item.code}
                                                        onChange={(e) => handleItemChange(index, 'code', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Barang</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Deskripsi barang"
                                                        value={item.name}
                                                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Qty</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={item.qty}
                                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga Satuan</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        required
                                                        value={item.price}
                                                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Diskon (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={item.disc}
                                                        onChange={(e) => handleItemChange(index, 'disc', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
                                >
                                    Simpan Invoice
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}