import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus, Printer } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function POList() {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const pagination = usePagination(purchaseOrders, 10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        quotation_number: '',
        date: new Date().toISOString().split('T')[0],
        admin_sales: '',
        customer_name: '',
        customer_address: 'Jakarta',
        customer_phone: '-',
        customer_email: '-',
        subject: '',
        items: [{ description: '', qty: 1, unit_price: 0 }],
    });

    useEffect(() => {
        fetchPurchaseOrders();
    }, []);

    const fetchPurchaseOrders = async () => {
        setLoading(true);
        try {
            const response = await api.get('/purchase-orders').catch(() => null);
            const apiData = response?.data?.data || response?.data;
            
            if (Array.isArray(apiData) && apiData.length > 0) {
                setPurchaseOrders(apiData);
            } else {
                const localData = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || localStorage.getItem('purchase_orders') || '[]');
                setPurchaseOrders(localData);
            }
        } catch (error) {
            console.warn("Menggunakan data lokal untuk PO:", error);
            const localData = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || localStorage.getItem('purchase_orders') || '[]');
            setPurchaseOrders(localData);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { description: '', qty: 1, unit_price: 0 }] });
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
        quotation_number: '',
        date: new Date().toISOString().split('T')[0],
        admin_sales: '',
        customer_name: '',
        customer_address: 'Jakarta',
        customer_phone: '-',
        customer_email: '-',
        subject: '',
        items: [{ description: '', qty: 1, unit_price: 0 }],
    });

    const handleSubmitNewPO = async (e) => {
        e.preventDefault();
        try {
            let calculatedSubTotal = 0;
            const formattedItems = formData.items.map((item) => {
                const amount = Number(item.qty) * Number(item.unit_price);
                calculatedSubTotal += amount;
                return {
                    part_number: 'PART-' + Math.floor(Math.random() * 1000),
                    description: item.description,
                    qty: Number(item.qty),
                    unit: 'PCS',
                    unit_price: Number(item.unit_price),
                    amount: amount,
                };
            });

            const taxAmount = calculatedSubTotal * 0.11;
            const grandTotal = calculatedSubTotal + taxAmount;

            const newPOItem = {
                id: Date.now(),
                quotation_number: formData.quotation_number,
                customer_po_number: formData.quotation_number,
                date: formData.date,
                po_date: formData.date,
                admin_sales: formData.admin_sales,
                customer_name: formData.customer_name,
                customer_address: formData.customer_address,
                attention_person: 'Bpk. / Ibu',
                customer_phone: formData.customer_phone,
                customer_email: formData.customer_email,
                subject: formData.subject,
                currency: 'IDR (Rupiah)',
                sub_total: calculatedSubTotal,
                tax_amount: taxAmount,
                grand_total: grandTotal,
                items: formattedItems,
                status: 'Pending'
            };

            try {
                await api.post('/purchase-orders', newPOItem);
            } catch (err) {
                console.log('API PO belum aktif, disimpan ke local storage.');
            }

            const existingLocal = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]');
            const updatedList = [newPOItem, ...existingLocal];
            localStorage.setItem('aldigens_purchase_orders', JSON.stringify(updatedList));

            swalSuccess('Berhasil', 'PO baru berhasil ditambahkan!');
            setIsModalOpen(false);
            resetForm();
            fetchPurchaseOrders();
        } catch (error) {
            console.error('Terjadi kesalahan saat menyimpan PO:', error);
            swalError('Gagal Menyimpan', 'Periksa kembali inputan Anda.');
        }
    };

    const handleConvertToSO = async (id) => {
        const ok = await swalConfirm({
            title: 'Proses ke Sales Order?',
            text: 'Purchase Order ini akan dikonversi menjadi Sales Order.',
            confirmText: 'Ya, Proses',
            cancelText: 'Batal',
            icon: 'question',
        });
        if (!ok) return;

        try {
            const targetPO = purchaseOrders.find(po => po.id === id || po.quotation_number === id || po.po_number === id);

            if (targetPO) {
                const newSO = {
                    id: Date.now(),
                    so_number: `SO-${Math.floor(10000000 + Math.random() * 90000000)}`,
                    date: new Date().toISOString().split('T')[0],
                    customer_name: targetPO.customer_name || 'Pelanggan Umum',
                    reff_po: targetPO.po_number || targetPO.customer_po_number || targetPO.quotation_number,
                    salesman: targetPO.admin_sales || 'FIKHAY',
                    status: 'Disetujui',
                    subject: targetPO.subject || 'FABRICATION',
                    items: targetPO.items || []
                };

                ['aldigens_sales_orders', 'sales_orders'].forEach(storageKey => {
                    const existingSOs = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    const filtered = existingSOs.filter(so => so.reff_po !== newSO.reff_po);
                    localStorage.setItem(storageKey, JSON.stringify([newSO, ...filtered]));
                });
            }

            await api.post(`/purchase-orders/${id}/convert-to-so`).catch(() => {});
            
            const updated = purchaseOrders.map(po => {
                if (po.id === id || po.quotation_number === id) {
                    return { ...po, status: 'processed_to_so' };
                }
                return po;
            });
            setPurchaseOrders(updated);
            localStorage.setItem('aldigens_purchase_orders', JSON.stringify(updated));

            swalSuccess('Berhasil', 'Berhasil diproses ke Sales Order!');
            fetchPurchaseOrders();
        } catch (error) {
            swalError('Gagal memproses', 'Terjadi kesalahan saat memproses PO ke SO.');
        }
    };

    // --- TEMPLATE CETAK PURCHASE ORDER SESUAI REFERENSI ACCURATE 4 & LOGO ALDIGENS 2 ---
    const handlePrintPO = (po) => {
        const itemsList = po.items || [];
        const subTotal = itemsList.reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.unit_price || curr.price || 0)), 0);
        const discountTotal = itemsList.reduce((acc, curr) => acc + ((Number(curr.qty || 1) * Number(curr.unit_price || curr.price || 0)) * (curr.disc || 0) / 100), 0);
        const taxTotal = subTotal * 0.11; // PPN 11%
        const grandTotal = (subTotal - discountTotal) + taxTotal;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase Order - ${po.customer_po_number || po.quotation_number || 'PO'}</title>
                    <style>
                        @page { size: A4 portrait; margin: 10mm; }
                        body { font-family: Arial, sans-serif; font-size: 10px; color: #000; padding: 0; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                        .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
                        .logo-area { width: 55%; vertical-align: top; }
                        .company-address { font-size: 8.5px; line-height: 1.2; color: #222; margin-top: 3px; }
                        .title-area { width: 45%; text-align: right; vertical-align: top; }
                        .doc-title { font-size: 16px; font-weight: bold; margin: 0 0 2px 0; letter-spacing: 0.5px; }
                        .recipient-table { width: 100%; margin-bottom: 10px; border: 1px solid #000; border-collapse: collapse; }
                        .recipient-table td { padding: 5px 8px; vertical-align: top; width: 50%; border: 1px solid #000; font-size: 9.5px; line-height: 1.3; }
                        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 0; border: 1px solid #000; }
                        .items-table th, .items-table td { border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; }
                        .items-table th { background-color: #f1f5f9 !important; text-align: center; font-weight: bold; }
                        .middle-container { width: 100%; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; display: table; }
                        .terbilang-box { display: table-cell; width: 60%; padding: 8px; vertical-align: top; font-size: 9.5px; border-right: 1px solid #000; }
                        .summary-box { display: table-cell; width: 40%; vertical-align: top; }
                        .summary-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
                        .summary-table td { padding: 4px 8px; border-bottom: 1px solid #000; }
                        .summary-table tr:last-child td { border-bottom: none; }
                        .summary-table .total-row { background-color: #f1f5f9 !important; font-weight: bold; font-size: 11px; }
                        .sign-container { margin-top: 15px; width: 100%; border: 1px solid #000; border-collapse: collapse; page-break-inside: avoid; }
                        .sign-container td { border: 1px solid #000; padding: 5px; vertical-align: top; text-align: center; font-size: 9.5px; width: 50%; }
                        .sign-space { height: 45px; }
                        .footer-info { margin-top: 5px; font-size: 8px; text-align: right; color: #555; }
                    </style>
                </head>
                <body>
                    <table class="header-table">
                        <tr>
                            <td class="logo-area">
                                <div>
                                    <img src="/LOGO ALDIGENS2.jpeg" alt="Logo" style="height: 38px; border-radius: 3px;" onerror="this.style.display='none'" />
                                </div>
                                <div class="company-address">
                                    <strong>PT. ALDIGENS PUTERA PERSADA</strong><br/>
                                    Ruko Bekasi Mas Blok C-25, Jl. Jend. Ahmad Yani, Margajaya<br/>
                                    Bekasi Selatan - 17141
                                </div>
                            </td>
                            <td class="title-area">
                                <div class="doc-title">Purchase Order</div>
                                <div><strong>No :</strong> ${po.customer_po_number || po.quotation_number || '-'}</div>
                            </td>
                        </tr>
                    </table>

                    <table class="recipient-table">
                        <tr>
                            <td>
                                <strong>Vendor :</strong><br/>
                                <span style="font-weight: bold; font-size: 10.5px;">${po.customer_name || 'Vendor Umum'}</span><br/>
                                <span>${po.customer_address || '-'}</span>
                            </td>
                            <td>
                                <table style="width: 100%; font-size: 9.5px; border-collapse: collapse;">
                                    <tr><td style="padding: 2px 0;"><strong>PO Date</strong> : ${po.po_date || po.date || '-'}</td><td style="padding: 2px 0;"><strong>PO Number</strong> : ${po.customer_po_number || po.quotation_number || '-'}</td></tr>
                                    <tr><td style="padding: 2px 0;"><strong>Terms</strong> : C.O.D</td><td style="padding: 2px 0;"><strong>FOB</strong> : F.O.B</td></tr>
                                    <tr><td style="padding: 2px 0;"><strong>Ship Via</strong> : Kurir</td><td style="padding: 2px 0;"><strong>Shipping Point</strong> : -</td></tr>
                                    <tr><td style="padding: 2px 0;"><strong>Vendor in Taxable</strong> : No</td><td style="padding: 2px 0;"><strong>Expected Date</strong> : ${po.po_date || po.date || '-'}</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <table style="width: 100%; margin-bottom: 8px; border: 1px solid #000; border-collapse: collapse; font-size: 9.5px;">
                        <tr>
                            <td style="padding: 5px 8px;"><strong>Ship To :</strong><br/><span>Ruko Bekasi Mas Blok C-25, Bekasi Selatan</span></td>
                        </tr>
                    </table>

                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 5%;">Item</th>
                                <th style="width: 45%;">Description</th>
                                <th style="width: 10%;">Qty</th>
                                <th style="width: 20%;">Unit Price</th>
                                <th style="width: 20%;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList.map((item, idx) => `
                                <tr>
                                    <td align="center">${idx + 1}</td>
                                    <td>${item.description || item.part_number || '-'}</td>
                                    <td align="center">${item.qty}</td>
                                    <td align="right">${Number(item.unit_price || 0).toLocaleString('id-ID')}</td>
                                    <td align="right">${(Number(item.qty) * Number(item.unit_price || 0)).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <table class="middle-container" cellpadding="0" cellspacing="0">
                        <tr>
                            <td class="terbilang-box">
                                <strong>Description :</strong><br/>
                                <span>${po.subject || 'Pengadaan barang operasional perusahaan.'}</span><br/>
                                <span style="font-size: 8.5px; color: #444; margin-top: 6px; display:block;">
                                    - Harap cantumkan No. PO pada surat jalan & faktur tagihan.<br/>
                                    - Barang dikirim sesuai alamat Ship To di atas.
                                </span>
                            </td>
                            <td class="summary-box">
                                <table class="summary-table">
                                    <tr>
                                        <td>Sub Total</td>
                                        <td align="right"><strong>${subTotal.toLocaleString('id-ID')}</strong></td>
                                    </tr>
                                    <tr>
                                        <td>Discount</td>
                                        <td align="right">${discountTotal.toLocaleString('id-ID')}</td>
                                    </tr>
                                    <tr>
                                        <td>PPN 11%</td>
                                        <td align="right">${taxTotal.toLocaleString('id-ID')}</td>
                                    </tr>
                                    <tr>
                                        <td>Estimated Freight</td>
                                        <td align="right">0</td>
                                    </tr>
                                    <tr class="total-row">
                                        <td>Total Order</td>
                                        <td align="right">IDR ${grandTotal.toLocaleString('id-ID')}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <table class="sign-container">
                        <tr>
                            <td>
                                Prepared By,<br/>
                                <div class="sign-space"></div>
                                <strong>( PURCHASING )</strong><br/>
                                <span style="font-size: 7.5px; color: #666;">Date: ${po.po_date || po.date || '-'}</span>
                            </td>
                            <td>
                                Approved By,<br/>
                                <div class="sign-space"></div>
                                <strong>( DIRECTOR )</strong><br/>
                                <span style="font-size: 7.5px; color: #666;">Date: ${po.po_date || po.date || '-'}</span>
                            </td>
                        </tr>
                    </table>

                    <div class="footer-info">
                        Dibuat oleh: ADMIN | ${new Date().toLocaleDateString('id-ID')} | Powered by Aldigens ERP
                    </div>

                    <script>
                        window.onload = function() { 
                            window.focus(); 
                            setTimeout(() => { window.print(); }, 500); 
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) return <div className="p-6 text-slate-600">Memuat data Purchase Order...</div>;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daftar Purchase Order (PO)</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer"
                >
                    <PlusCircle className="h-4 w-4" />
                    <span>Input PO Baru</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">No. PO / Klien</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {pagination.paginatedItems.length > 0 ? (
                            pagination.paginatedItems.map((po, idx) => (
                                <tr key={po.id || idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                                        {po.po_number || po.customer_po_number || po.quotation_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                                        {po.po_date || po.date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${po.status === 'processed_to_so' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {po.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handlePrintPO(po)}
                                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 px-3 py-1 rounded transition inline-flex items-center space-x-1 cursor-pointer"
                                            title="Cetak Dokumen PO"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>Cetak</span>
                                        </button>

                                        {po.status !== 'processed_to_so' ? (
                                            <button
                                                onClick={() => handleConvertToSO(po.id || po.quotation_number)}
                                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 px-3 py-1 rounded transition cursor-pointer"
                                            >
                                                Proses ke SO
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 dark:text-slate-500 italic">Sudah di-SO</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">
                                    Belum ada data Purchase Order. Silakan buat penawaran lalu klik "Deal (ke PO)" di menu Quotation.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Controller */}
                <Pagination
                    currentPage={pagination.currentPage}
                    totalItems={pagination.totalItems}
                    pageSize={pagination.pageSize}
                    onPageChange={pagination.setCurrentPage}
                    onPageSizeChange={pagination.setPageSize}
                />
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Input Data PO</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitNewPO} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor Quotation / PO</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: AQ-26090003"
                                        value={formData.quotation_number}
                                        onChange={(e) => setFormData({ ...formData, quotation_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tanggal Dokumen</label>
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
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Klien / Perusahaan</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: PT SANY PERKASA"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Admin Sales</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nama Admin Sales"
                                        value={formData.admin_sales}
                                        onChange={(e) => setFormData({ ...formData, admin_sales: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alamat Lengkap Klien</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Jl. Angkasa 1-3 Gunung Sahari Utara Sawah Besar - Jakarta Pusat"
                                    value={formData.customer_address}
                                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Subjek / Proyek</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: FABRICATION / OVERHAUL"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm text-slate-700">Daftar Spesifikasi Barang / Item</h4>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah Baris Item</span>
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-rose-500 hover:text-rose-700 p-1 transition cursor-pointer">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deskripsi Barang / Unit</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Contoh: REINFORCE MODIFICATION FLAT BUCKET"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kuantitas (QTY)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={item.qty}
                                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga Satuan (IDR)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        required
                                                        placeholder="Contoh: 1850000"
                                                        value={item.unit_price}
                                                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer">
                                    Batal
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer">
                                    Simpan PO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}