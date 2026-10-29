import { useEffect, useState } from 'react';
import api from '../services/api';
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus, Printer } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import logoAldigens from '../../LOGO ALDIGENS2.jpeg';

const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const findSupplierByName = (list, name) => {
    const key = normName(name);
    return key ? list.find((s) => normName(s.supplier_name) === key) : undefined;
};

const NEW_SUPPLIER = '__new__';

const emptyItem = () => ({ part_number: '', description: '', qty: 1, unit_price: 0, discount: 0 });

const emptyForm = () => ({
    supplier_id: '',
    new_supplier_name: '',
    new_supplier_address: '',
    invoice_number: `F-${Math.floor(10000000 + Math.random() * 90000000)}/INV`,
    po_reference: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [emptyItem()],
});

function terbilang(nilai) {
    const angka = Math.abs(Number(nilai) || 0);
    if (angka === 0) return 'Nol Rupiah';
    const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    const bagi = (n) => {
        if (n < 12) return ' ' + huruf[n];
        if (n < 20) return bagi(n - 10) + ' Belas';
        if (n < 100) return bagi(Math.floor(n / 10)) + ' Puluh' + bagi(n % 10);
        if (n < 200) return ' Seratus' + bagi(n - 100);
        if (n < 1000) return bagi(Math.floor(n / 100)) + ' Ratus' + bagi(n % 100);
        if (n < 2000) return ' Seribu' + bagi(n - 1000);
        if (n < 1000000) return bagi(Math.floor(n / 1000)) + ' Ribu' + bagi(n % 1000);
        if (n < 1000000000) return bagi(Math.floor(n / 1000000)) + ' Juta' + bagi(n % 1000000);
        return '';
    };
    return bagi(angka).trim() + ' Rupiah';
}

// ============================================================
// TEMPLATE CETAK INVOICE (mengikuti format invoice fisik / Accurate)
// Logo diambil dari import logoAldigens di bagian atas file ini.
// ============================================================
const PRINT_COMPANY = {
    name: 'PT. ALDIGENS PUTERA PERSADA',
    address: ['Ruko Bekasi Mas Blok C-25', 'Jl. Jend Ahmad Yani, Margajaya', 'Bekasi Selatan - 17141'],
};
const PRINT_DOC_TITLE = 'INVOICE';
const PRINT_PARTY_LABEL = 'Pelanggan';
const PRINT_TERBILANG_LANG = 'en';   // 'en' = bahasa Inggris seperti foto, 'id' = bahasa Indonesia
const PRINT_SHOW_PAYMENT_INFO = true; // false = sembunyikan blok "Mohon Pembayaran..."
const PRINT_PAYMENT_INFO = { accountName: 'PT. ALDIGENS PUTERA PERSADA', bankName: 'BANK PERMATA', accountNo: '' }; // isi nomor rekening
const PRINT_SIGNER = { name: 'KHAFID YUSUF', title: 'Direktur' };

const P_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const P_ONES = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
    'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const P_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const P_SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

const pEsc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pLines = (v) => pEsc(v).replace(/\r?\n/g, '<br/>');
const pFmt = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

// 2026-09-17 -> 17 Sep 2026
const pDate = (value) => {
    if (!value) return '-';
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(value);
    return `${Number(m[3])} ${P_MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

const pDaysBetween = (a, b) => {
    const d1 = Date.parse(String(a || '').slice(0, 10));
    const d2 = Date.parse(String(b || '').slice(0, 10));
    return Number.isNaN(d1) || Number.isNaN(d2) ? null : Math.round((d2 - d1) / 86400000);
};

const pBelow1000 = (num) => {
    const words = [];
    let n = num;
    if (n >= 100) {
        words.push(`${P_ONES[Math.floor(n / 100)]} hundred`);
        n %= 100;
    }
    if (n >= 20) {
        words.push(P_TENS[Math.floor(n / 10)] + (n % 10 ? `-${P_ONES[n % 10]}` : ''));
    } else if (n > 0) {
        words.push(P_ONES[n]);
    }
    return words.join(' ');
};

// 25500000 -> "Twenty-five million five hundred thousand Rupiah"
const pWords = (value) => {
    let n = Math.floor(Math.abs(Number(value) || 0));
    if (n === 0) return 'Zero Rupiah';
    const chunks = [];
    let scale = 0;
    while (n > 0) {
        const chunk = n % 1000;
        if (chunk) chunks.unshift(`${pBelow1000(chunk)}${P_SCALES[scale] ? ` ${P_SCALES[scale]}` : ''}`);
        n = Math.floor(n / 1000);
        scale += 1;
    }
    const text = chunks.join(' ');
    return `${text.charAt(0).toUpperCase()}${text.slice(1)} Rupiah`;
};

const pTerbilang = (value) => (PRINT_TERBILANG_LANG === 'id' ? terbilang(value) : pWords(value));

// Samakan bentuk data invoice dari API (nama field bisa berbeda-beda)
const normalizeInvoiceForPrint = (inv = {}) => {
    const rawItems = inv.items || inv.details || inv.lines || [];
    const items = rawItems.map((it) => {
        const qty = Number(it.qty ?? it.quantity ?? 0);
        const price = Number(it.unit_price ?? it.price ?? 0);
        const disc = Number(it.discount ?? it.discount_percent ?? it.disc_percent ?? 0);
        return {
            code: it.part_number || it.code || '',
            name: it.description || it.name || '',
            qty,
            price,
            disc,
            total: Number(qty * price * (1 - disc / 100)),
        };
    });

    const taxPct = Number(inv.tax_percentage ?? 11);
    let subTotal = inv.sub_total ?? inv.subtotal ?? (items.length ? items.reduce((s, i) => s + i.total, 0) : null);
    let tax = inv.tax_amount ?? inv.tax ?? null;
    let grand = inv.grand_total ?? null;
    if (subTotal == null) subTotal = grand != null ? (tax != null ? Number(grand) - Number(tax) : Math.round(Number(grand) / (1 + taxPct / 100))) : 0;
    if (tax == null) tax = Math.round(Number(subTotal) * taxPct / 100);
    if (grand == null) grand = Number(subTotal) + Number(tax);

    const invoiceDate = inv.invoice_date || inv.date;
    const days = pDaysBetween(invoiceDate, inv.due_date);
    // Buang awalan "Reff PO. No. :" / "Ref PO:" supaya tidak tercetak dobel
    const rawRef = String(inv.po_reference || inv.notes || '').replace(/^\s*Re(?:f|ff)\.?\s*PO\.?(?:\s*No\.?)?\s*:?\s*/i, '').trim();

    return {
        number: inv.supplier_invoice_number || inv.invoice_number || '-',
        date: pDate(invoiceDate),
        term: days == null ? 'Net 30' : days > 0 ? `Net ${days}` : 'Tunai',
        refPo: rawRef && rawRef !== '-' ? rawRef : '-',
        partyName: inv.supplier?.supplier_name || inv.supplier_name || '-',
        partyAddress: inv.supplier?.address || inv.supplier_address || '',
        items,
        subTotal: Number(subTotal),
        tax: Number(tax),
        taxPct,
        grand: Number(grand),
    };
};

const PRINT_INVOICE_STYLE = `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 10mm 14mm; }
    .script { font-family: 'Comic Sans MS', 'Comic Sans', 'Comic Neue', cursive; }

    .head { display: flex; justify-content: space-between; align-items: flex-start; }
    /* brightness: latar JPEG abu-abu muda dibuat putih, bagian hitam tetap hitam */
    .logo { width: 62mm; height: auto; display: block; margin-bottom: 2mm; filter: brightness(1.06); }
    .co-name { font-weight: 700; }
    .co-addr { line-height: 1.35; }
    .head-right { text-align: right; padding-top: 9mm; }
    .doc-title { font-size: 17px; font-weight: 700; text-decoration: underline; letter-spacing: .4px; }
    .doc-no { font-size: 12px; font-weight: 700; margin-top: 2px; }

    .party { display: flex; justify-content: space-between; margin-top: 10mm; }
    .party-left { flex: 0 0 56%; line-height: 1.4; }
    .party-left .name { font-weight: 700; margin: 3px 0 7px; }
    .meta { text-align: right; line-height: 2; }

    .items { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 2mm; }
    .items th { border: 1px solid #000; padding: 4px; font-weight: 700; text-align: center; background: #ececec; }
    .items td { border-left: 1px solid #000; border-right: 1px solid #000; padding: 1px 5px; vertical-align: top; word-wrap: break-word; }
    .items tr.fill td { border-bottom: 1px solid #000; }
    .items .r { text-align: right; }
    .items .c { text-align: center; }

    .totals { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .totals td { border: 1px solid #000; padding: 3px 8px; height: 6.2mm; }
    .totals tr.last td { height: 9mm; }
    .totals .l { width: 20.5%; text-align: right; }
    .totals .v { width: 21%; text-align: right; }
    .totals .words { width: 58.5%; vertical-align: middle; }
    .totals .strong { font-weight: 700; }

    .pay { margin-top: 3mm; line-height: 1.7; page-break-inside: avoid; }
    .pay table { border-collapse: collapse; }
    .pay td { padding: 2px 6px 2px 0; }
    .sign { margin-top: 10mm; page-break-inside: avoid; }
    .sign .space { height: 22mm; }
    .sign .line { border-top: 1px dashed #000; width: 52mm; margin: 2px 0; }
`;

function buildInvoiceHtml(rawInvoice, { autoPrint = false, logoUrl = '' } = {}) {
    const d = normalizeInvoiceForPrint(rawInvoice);

    const rows = d.items
        .map(
            (it, idx) => `
                <tr>
                    <td class="c">${idx + 1}</td>
                    <td>${pEsc(it.code)}</td>
                    <td>${pEsc(it.name)}</td>
                    <td class="c">${pFmt(it.qty)}</td>
                    <td class="r">${pFmt(it.price)}</td>
                    <td class="c">${pFmt(it.disc)}</td>
                    <td class="r">${pFmt(it.total)}</td>
                </tr>`
        )
        .join('');

    // Baris kosong supaya garis kolom memanjang ke bawah seperti invoice fisik
    const fillHeightMm = Math.max(0, 78 - d.items.length * 5);

    const logoTag = logoUrl
        ? `<img class="logo" src="${pEsc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
        : '';

    const paymentBlock = PRINT_SHOW_PAYMENT_INFO
        ? `<div class="pay script">
                Mohon Pembayaran dilakukan ke Account kami sbb :
                <table class="script">
                    <tr><td>Nama Account</td><td>: ${pEsc(PRINT_PAYMENT_INFO.accountName)}</td></tr>
                    <tr><td>Nama Bank</td><td>: ${pEsc(PRINT_PAYMENT_INFO.bankName)}</td></tr>
                    <tr><td>Account No</td><td>: ${pEsc(PRINT_PAYMENT_INFO.accountNo || '......................')}</td></tr>
                </table>
            </div>`
        : '';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>${pEsc(PRINT_DOC_TITLE)} ${pEsc(d.number)}</title>
    <style>${PRINT_INVOICE_STYLE}</style>
</head>
<body>
<div class="page">

    <div class="head">
        <div class="head-left">
            ${logoTag}
            <div class="co-name">${pEsc(PRINT_COMPANY.name)}</div>
            <div class="co-addr">${PRINT_COMPANY.address.map(pEsc).join('<br/>')}</div>
        </div>
        <div class="head-right">
            <div class="doc-title">${pEsc(PRINT_DOC_TITLE)}</div>
            <div class="doc-no">No. ${pEsc(d.number)}</div>
        </div>
    </div>

    <div class="party">
        <div class="party-left">
            <div>${pEsc(PRINT_PARTY_LABEL)} :</div>
            <div class="name">${pEsc(d.partyName)}</div>
            <div>${pLines(d.partyAddress)}</div>
        </div>
        <div class="meta">
            <div>Tanggal : ${pEsc(d.date)}</div>
            <div>Term Pembayaran : ${pEsc(d.term)}</div>
            <div>Reff PO. No : ${pEsc(d.refPo)}</div>
            <div>Mata Uang : Rupiah</div>
        </div>
    </div>

    <table class="items">
        <colgroup>
            <col style="width:5.5%" /><col style="width:29%" /><col style="width:26.5%" />
            <col style="width:6%" /><col style="width:12.5%" /><col style="width:6.5%" /><col style="width:14%" />
        </colgroup>
        <thead>
            <tr><th>No.</th><th>Kode Barang</th><th>Nama Barang</th><th>Qty</th><th>Harga @</th><th>Disc %</th><th>Total</th></tr>
        </thead>
        <tbody>
            ${rows}
            <tr class="fill"><td style="height:${fillHeightMm}mm"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
    </table>

    <table class="totals">
        <tr><td class="words"></td><td class="l">Sub Total :</td><td class="v">${pFmt(d.subTotal)}</td></tr>
        <tr><td class="words"></td><td class="l">PPN ${pEsc(d.taxPct)} % :</td><td class="v">${pFmt(d.tax)}</td></tr>
        <tr class="last"><td class="words">${pEsc(pTerbilang(d.grand))}</td><td class="l strong">TOTAL :</td><td class="v">${pFmt(d.grand)}</td></tr>
    </table>

    ${paymentBlock}

    <div class="sign script">
        <div>${pEsc(PRINT_COMPANY.name)}</div>
        <div class="space"></div>
        <div>${pEsc(PRINT_SIGNER.name)}</div>
        <div class="line"></div>
        <div>${pEsc(PRINT_SIGNER.title)}</div>
    </div>

</div>
${autoPrint ? '<script>window.onload = function () { window.focus(); setTimeout(function () { window.print(); }, 500); };</script>' : ''}
</body>
</html>`;
}

function printInvoiceDocument(invoice, logoUrl) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak invoice.');
        return;
    }
    printWindow.document.write(buildInvoiceHtml(invoice, { autoPrint: true, logoUrl }));
    printWindow.document.close();
}


export default function PurchaseInvoice() {
    const [invoices, setInvoices] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);

    const pagination = usePagination(invoices, 10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        fetchInvoices();
        fetchPurchaseOrders();
        fetchSuppliers();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.get('/purchase-invoices');
            const apiData = response?.data?.data || response?.data;
            setInvoices(Array.isArray(apiData) ? apiData : []);
        } catch (error) {
            console.error('Gagal memuat invoice:', error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPurchaseOrders = async () => {
        let allPOs = [];
        try {
            const response = await api.get('/purchase-orders').catch(() => null);
            const apiData = response?.data?.data || response?.data;
            if (Array.isArray(apiData)) {
                allPOs = [...apiData];
            }
        } catch { /* abaikan */ }

        const possibleKeys = ['aldigens_purchase_orders', 'purchase_orders', 'po_list'];
        possibleKeys.forEach(key => {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        allPOs = [...allPOs, ...parsed];
                    }
                } catch { /* abaikan */ }
            }
        });

        const uniquePOs = Array.from(new Map(allPOs.map(po => [po.po_number || po.customer_po_number || po.id, po])).values());
        setPurchaseOrders(uniquePOs);
    };

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/suppliers');
            const apiData = response?.data?.data || response?.data;
            const list = Array.isArray(apiData) ? apiData : [];
            setSuppliers(list);
            return list;
        } catch (error) {
            console.error('Gagal memuat supplier:', error);
            return [];
        }
    };

    const registerSupplier = async (name, address) => {
        const latest = await fetchSuppliers();
        const existing = findSupplierByName(latest, name);
        if (existing) return existing.id;

        const maxNo = latest.reduce((max, s) => {
            const m = String(s.supplier_code || '').match(/(\d+)$/);
            return m ? Math.max(max, Number(m[1])) : max;
        }, 0);
        const codes = [`SUP-${String(maxNo + 1).padStart(3, '0')}`, `SUP-${String(Date.now()).slice(-6)}`];

        let lastError;
        for (const code of codes) {
            try {
                const res = await api.post('/suppliers', {
                    supplier_code: code,
                    supplier_name: name,
                    address: address || null,
                    status: 'AKTIF',
                });
                const created = res?.data?.data ?? res?.data;
                await fetchSuppliers();
                return created?.id;
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError;
    };

    const handleSelectPO = (poIdentifier) => {
        if (!poIdentifier) {
            setFormData({ ...formData, po_reference: '' });
            return;
        }

        const selectedPO = purchaseOrders.find(po =>
            String(po.po_number) === String(poIdentifier) ||
            String(po.customer_po_number) === String(poIdentifier) ||
            String(po.id) === String(poIdentifier)
        );

        if (selectedPO) {
            const rawItems = selectedPO.items || selectedPO.details || selectedPO.product_items || [];

            const formattedItems = rawItems.length > 0 ? rawItems.map(i => ({
                part_number: i.part_number || i.code || i.product_code || '',
                description: i.description || i.name || i.item_name || '',
                qty: Number(i.qty || i.quantity || 1),
                unit_price: Number(i.unit_price || i.price || i.cost || 0),
                discount: Number(i.discount || 0)
            })) : [emptyItem()];

            const supName = selectedPO.customer_name || selectedPO.supplier_name || selectedPO.vendor_name || '';
            const supAddress = selectedPO.customer_address || selectedPO.supplier_address || '';
            const matchedSupplier = findSupplierByName(suppliers, supName);

            setFormData({
                ...formData,
                po_reference: selectedPO.po_number || selectedPO.customer_po_number || poIdentifier,
                supplier_id: matchedSupplier ? String(matchedSupplier.id) : '',
                new_supplier_name: matchedSupplier ? '' : supName,
                new_supplier_address: matchedSupplier ? '' : supAddress,
                items: formattedItems
            });
        }
    };

    const handleSelectSupplier = (value) => {
        if (value === NEW_SUPPLIER) return;
        setFormData({ ...formData, supplier_id: value, new_supplier_name: '', new_supplier_address: '' });
    };

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, emptyItem()] });
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

    const resetForm = () => setFormData(emptyForm());

    const handleSubmitInvoice = async (e) => {
        e.preventDefault();
        try {
            let supplierId = Number(formData.supplier_id);
            if (!supplierId && formData.new_supplier_name) {
                supplierId = Number(await registerSupplier(formData.new_supplier_name, formData.new_supplier_address));
            }
            if (!supplierId) {
                swalError('Supplier belum dipilih', 'Pilih supplier atau pilih PO terlebih dahulu.');
                return;
            }

            const payload = {
                supplier_id: supplierId,
                supplier_invoice_number: formData.invoice_number,
                invoice_date: formData.date,
                due_date: formData.due_date,
                tax_percentage: 11,
                debit_account_id: 1,
                notes: `Reff PO. No. : ${formData.po_reference || '-'}`,
                items: formData.items.map(item => ({
                    part_number: item.part_number || null,
                    description: item.description,
                    qty: Number(item.qty),
                    unit: 'PCS',
                    unit_price: Number(item.unit_price)
                }))
            };

            await api.post('/purchase-invoices', payload);

            swalSuccess('Berhasil', 'Purchase Invoice berhasil disimpan ke database!');
            setIsModalOpen(false);
            resetForm();
            fetchInvoices();
        } catch (error) {
            console.error(error);
            swalError('Gagal Menyimpan', error.response?.data?.message || 'Periksa kembali inputan Anda.');
        }
    };

    const handleMarkAsPaid = async (id) => {
        const ok = await swalConfirm({
            title: 'Lunasi Invoice?',
            text: 'Status invoice akan diubah menjadi Lunas (Dibayar).',
            confirmText: 'Ya, Lunas',
            cancelText: 'Batal',
            icon: 'question',
        });
        if (!ok) return;

        const updated = invoices.map(inv => inv.id === id ? { ...inv, status: 'Lunas' } : inv);
        setInvoices(updated);
        swalSuccess('Berhasil', 'Status invoice diperbarui menjadi Lunas.');
    };

    // Cetak invoice: ambil detail lengkap (item, supplier) dari server bila tersedia,
    // lalu cetak dengan template invoice. Bila endpoint detail tidak ada, memakai data dari baris daftar.
    const handlePrintInvoice = async (inv) => {
        let detail = inv;
        try {
            const res = await api.get(`/purchase-invoices/${inv.id}`);
            const data = res?.data?.data ?? res?.data;
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                detail = { ...inv, ...data };
            }
        } catch (error) {
            console.warn('Detail invoice tidak bisa dimuat, memakai data dari daftar:', error);
        }
        // URL logo dibuat absolut supaya terbaca dari jendela cetak
        const logoUrl = new URL(logoAldigens, window.location.href).href;
        printInvoiceDocument(detail, logoUrl);
    };

    if (loading) return <div className="p-6 text-slate-600">Memuat data Purchase Invoice...</div>;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Purchase Invoice (Faktur Pembelian)</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition cursor-pointer"
                >
                    <PlusCircle className="h-4 w-4"/>
                    <span>Buat Invoice Baru</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Invoice / Supplier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref. PO</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tagihan</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {pagination.paginatedItems.length > 0 ? (
                            pagination.paginatedItems.map((inv, idx) => (
                                <tr key={inv.id || idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {inv.invoice_number} <br/><span className="text-xs text-slate-500">{inv.supplier?.supplier_name || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{inv.notes || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900 dark:text-white">
                                        IDR {Number(inv.grand_total || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                            inv.status === 'Lunas' || inv.status === 'PAID'
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        }`}>
                                            {inv.status || 'UNPAID'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handlePrintInvoice(inv)}
                                            className="text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded transition cursor-pointer inline-flex items-center gap-1"
                                            title="Cetak Invoice"
                                        >
                                            <Printer className="h-3.5 w-3.5"/> Cetak
                                        </button>
                                        {inv.status !== 'Lunas' && inv.status !== 'PAID' && (
                                            <button
                                                onClick={() => handleMarkAsPaid(inv.id)}
                                                className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded transition cursor-pointer"
                                            >
                                                Tandai Lunas
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-500">Belum ada data Purchase Invoice.</td></tr>
                        )}
                    </tbody>
                </table>
                <Pagination currentPage={pagination.currentPage} onPageChange={pagination.setCurrentPage} onPageSizeChange={pagination.setPageSize} pageSize={pagination.pageSize} totalItems={pagination.totalItems}/>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Buat Purchase Invoice (Faktur Pembelian)</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"><X className="h-5 w-5"/></button>
                        </div>
                        <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ambil Data dari Purchase Order (Opsional)</label>
                                <select
                                    value={formData.po_reference}
                                    onChange={(e) => handleSelectPO(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                >
                                    <option value="">-- Pilih PO untuk Tarik Otomatis --</option>
                                    {purchaseOrders.map((po, idx) => (
                                        <option key={idx} value={po.po_number || po.customer_po_number || po.id}>
                                            {po.po_number || po.customer_po_number || `PO ID: ${po.id}`} — {po.customer_name || po.supplier_name || 'Supplier'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Pilih Supplier</label>
                                    <select
                                        required
                                        value={formData.supplier_id || (formData.new_supplier_name ? NEW_SUPPLIER : '')}
                                        onChange={(e) => handleSelectSupplier(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                    >
                                        <option value="">-- Pilih Supplier yang Terdaftar --</option>
                                        {formData.new_supplier_name && (
                                            <option value={NEW_SUPPLIER}>{formData.new_supplier_name} (dari PO)</option>
                                        )}
                                        {suppliers.map((sup) => (
                                            <option key={sup.id} value={sup.id}>{sup.supplier_name}</option>
                                        ))}
                                    </select>
                                    {formData.new_supplier_name && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Supplier &quot;{formData.new_supplier_name}&quot; belum ada di Master Data, akan otomatis didaftarkan saat invoice disimpan.
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor Invoice</label>
                                    <input type="text" required value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tanggal Invoice</label>
                                    <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Jatuh Tempo (Due Date)</label>
                                    <input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm text-slate-700">Daftar Item Tagihan</h4>
                                    <button type="button" onClick={handleAddItem} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 cursor-pointer">
                                        <Plus className="h-3.5 w-3.5"/><span>Tambah Baris</span>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"><Trash2 className="h-4 w-4"/></button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kode Barang</label>
                                                    <input type="text" value={item.part_number} onChange={(e) => handleItemChange(index, 'part_number', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Barang</label>
                                                    <input type="text" required value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">QTY</label>
                                                    <input type="number" min="1" required value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga Satuan (IDR)</label>
                                                    <input type="number" min="0" required value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Disc %</label>
                                                    <input type="number" min="0" max="100" value={item.discount} onChange={(e) => handleItemChange(index, 'discount', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer">Simpan Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
