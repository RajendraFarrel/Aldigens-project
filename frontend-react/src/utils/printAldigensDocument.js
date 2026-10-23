/**
 * Helper cetak dokumen AIMS — meniru template Sales Order (SalesOrder.jsx handlePrint).
 *
 * Dipakai seluruh modul Inventory agar header, logo, tabel, kotak keterangan,
 * tanda tangan, dan footer konsisten dengan dokumen resmi PT. Aldigens Putera Persada.
 *
 * Semua fungsi di sini hanya MEMBACA data yang sudah ada di layar/Api.
 * Tidak ada request tulis/transaksi, tidak mengubah stok, tidak menyimpan apa pun.
 */

/* ────────────────────────────── Utils format ────────────────────────────── */

export const isBlank = (v) => v === null || v === undefined || v === '';

/** Format nilai untuk dicetak. Nilai kosong/objek aneh -> '-', tidak pernah "undefined"/"NaN". */
export const fmtText = (value, fallback = '-') => {
  if (isBlank(value)) return fallback;
  if (typeof value === 'object') return fallback;
  const text = String(value).trim();
  if (!text || text === 'undefined' || text === 'null' || text === 'NaN') return fallback;
  return text;
};

/** Angka format Indonesia. Qty boleh desimal. */
export const fmtQty = (value) => {
  if (isBlank(value)) return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('id-ID', { maximumFractionDigits: 3 });
};

/** Angka bulat format Indonesia. */
export const fmtNumber = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return n.toLocaleString('id-ID');
};

/** Escape HTML supaya data dari database tidak dianggap markup/script. */
export const escapeHtml = (value) => {
  if (isBlank(value)) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '`': '&#96;',
  };
  return String(value).replace(/[&<>"'`]/g, (ch) => map[ch]);
};

/** Escape lalu format; satu langkah untuk sel tabel. */
const cell = (value, fallback = '-') => escapeHtml(fmtText(value, fallback));

/* ────────────────────────────── Utils tanggal ────────────────────────────── */

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/**
 * Parse tanggal tanpa pergeseran UTC.
 * Menerima 'YYYY-MM-DD' (diperlakukan sebagai tanggal lokal) atau Date.
 * Mengembalikan Date pada 00:00 waktu lokal, atau null.
 */
export const parseLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const pad2 = (n) => String(n).padStart(2, '0');

/** Date -> 'YYYY-MM-DD' berdasarkan komponen lokal (aman dari UTC shift). */
export const toDateInput = (date) => {
  const d = date instanceof Date ? date : parseLocalDate(date);
  if (!d) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const todayInput = () => toDateInput(new Date());

/**
 * Format tanggal panjang Indonesia: '1 Oktober 2026'.
 * String tanggal ('YYYY-MM-DD') diparse sebagai tanggal lokal, bukan UTC.
 */
export const fmtDateLong = (value) => {
  const d = parseLocalDate(value);
  if (!d) return '-';
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
};

/** Format tanggal pendek: '01/10/2026'. */
export const fmtDateShort = (value) => {
  const d = parseLocalDate(value);
  if (!d) return '-';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Format tanggal + jam (waktu lokal). Aman untuk nilai null. */
export const fmtDateTime = (value) => {
  if (isBlank(value)) return '-';
  const raw = typeof value === 'string' ? value.replace(' ', 'T') : value;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return fmtText(value);
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Nama pengguna aktif (dari auth_user) untuk tanda tangan & footer. */
export const getCurrentUserName = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    if (!raw) return 'ADMIN';
    const user = JSON.parse(raw);
    return fmtText(user?.full_name || user?.name || user?.username || user?.email, 'ADMIN');
  } catch {
    return 'ADMIN';
  }
};

/** Nomor dokumen cetak — hanya identitas dokumen, tidak disimpan ke database. */
export const makeReportNumber = (prefix = 'RPT') => {
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
  return `${prefix}-${stamp}`;
};

/* ────────────────────────────── Helper periode ────────────────────────────── */

export const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Harian' },
  { value: 'weekly', label: 'Mingguan' },
  { value: 'monthly', label: 'Bulanan' },
  { value: 'yearly', label: 'Tahunan' },
  { value: 'custom', label: 'Rentang Tanggal' },
];

/** Awal minggu = Senin. */
const startOfWeek = (d) => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay(); // 0=Min .. 6=Sab
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

/**
 * Hitung rentang periode.
 * @param {'daily'|'weekly'|'monthly'|'yearly'|'custom'} mode
 * @param {{ date?: string, start?: string, end?: string }} value
 * @returns {{ start: string, end: string, label: string }} start/end = 'YYYY-MM-DD'
 */
export const getPeriodRange = (mode, value = {}) => {
  const base = parseLocalDate(value.date) || new Date();
  let start;
  let end;

  switch (mode) {
    case 'daily':
      start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      end = new Date(start);
      break;
    case 'weekly':
      start = startOfWeek(base);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      break;
    case 'monthly':
      start = new Date(base.getFullYear(), base.getMonth(), 1);
      end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
      break;
    case 'yearly':
      start = new Date(base.getFullYear(), 0, 1);
      end = new Date(base.getFullYear(), 11, 31);
      break;
    case 'custom': {
      const s = parseLocalDate(value.start) || base;
      const e = parseLocalDate(value.end) || s;
      // Validasi: tanggal akhir tidak boleh lebih awal dari tanggal awal.
      start = s <= e ? s : e;
      end = s <= e ? e : s;
      break;
    }
    default:
      start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      end = new Date(start);
  }

  const startStr = toDateInput(start);
  const endStr = toDateInput(end);
  const sameDay = startStr === endStr;
  const label = sameDay
    ? fmtDateLong(startStr)
    : `${fmtDateLong(startStr)} - ${fmtDateLong(endStr)}`;

  return { start: startStr, end: endStr, label };
};

/** Apakah tanggal (string/ISO) berada dalam rentang [start, end] inklusif. */
export const isWithinRange = (dateValue, start, end) => {
  if (!dateValue) return false;
  const d = parseLocalDate(dateValue);
  const s = parseLocalDate(start);
  const e = parseLocalDate(end);
  if (!d || !s || !e) return false;
  return d >= s && d <= e;
};

/**
 * Ringkasan quantity per satuan (untuk laporan lintas satuan).
 * Mencegah penjumlahan PCS + METER menjadi satu angka.
 * @returns {{ label: string, value: string }[]}
 */
export const sumQtyByUnit = (rows, qtyGetter, unitGetter) => {
  const map = new Map();
  rows.forEach((row) => {
    const qty = Number(qtyGetter(row));
    if (!Number.isFinite(qty) || qty === 0) return;
    const unit = fmtText(unitGetter(row), '-');
    map.set(unit, (map.get(unit) || 0) + qty);
  });
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([unit, total]) => ({ label: `Total ${unit}`, value: fmtQty(total) }));
};

/* ────────────────────────────── Template dokumen ────────────────────────────── */

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  @page { margin: 10mm; }
  html, body { width: 100%; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10px;
    color: #000;
    padding: 0;
    margin: 0;
    overflow-x: hidden;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  .doc-wrap { width: 100%; max-width: 100%; overflow: hidden; }
  .header-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; margin-bottom: 8px; }
  .header-table td { padding: 0 0 6px 0; vertical-align: top; }
  .logo-area { width: 55%; }
  .logo-area img { height: 38px; border-radius: 3px; display: block; }
  .company-address { font-size: 8.5px; line-height: 1.25; color: #222; margin-top: 3px; }
  .title-area { width: 45%; text-align: right; }
  .doc-title { font-size: 15px; font-weight: bold; margin: 0 0 3px 0; letter-spacing: 0.4px; line-height: 1.15; }
  .doc-subtitle { font-size: 9px; color: #333; }
  .meta-table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 8px; table-layout: fixed; }
  .meta-table td { padding: 2px 0; vertical-align: top; word-wrap: break-word; }
  .info-table { width: 100%; margin-bottom: 10px; border: 1px solid #000; border-collapse: collapse; page-break-inside: avoid; }
  .info-table td { padding: 5px 8px; vertical-align: top; width: 50%; border: 1px solid #000; font-size: 9.5px; line-height: 1.35; }
  .info-table td.full { width: 100%; }
  .items-table { width: 100%; border-collapse: collapse; border: 1px solid #000; table-layout: fixed; }
  .items-table thead { display: table-header-group; }
  .items-table tr { page-break-inside: avoid; break-inside: avoid; }
  .items-table th, .items-table td { border: 1px solid #000; padding: 3px 5px; font-size: 9px; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
  .items-table th { background-color: #f1f5f9 !important; text-align: center; font-weight: bold; }
  .items-table td.num { text-align: right; white-space: nowrap; }
  .items-table td.ctr { text-align: center; white-space: nowrap; }
  .items-table tfoot td { background-color: #f1f5f9 !important; font-weight: bold; }
  .section-title { margin: 12px 0 4px 0; font-size: 10px; font-weight: bold; page-break-after: avoid; break-after: avoid; }
  .section-note { font-size: 8.5px; color: #444; margin: 0 0 5px 0; page-break-after: avoid; }
  .middle-container { width: 100%; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; display: table; table-layout: fixed; page-break-inside: avoid; }
  .keterangan-box { display: table-cell; vertical-align: top; padding: 8px; font-size: 9px; border-right: 1px solid #000; line-height: 1.35; }
  .summary-box { display: table-cell; vertical-align: top; }
  .summary-table { width: 100%; border-collapse: collapse; font-size: 9px; }
  .summary-table td { padding: 3px 8px; border-bottom: 1px solid #000; vertical-align: top; }
  .summary-table tr:last-child td { border-bottom: none; }
  .summary-table td.val { text-align: right; white-space: nowrap; font-weight: bold; }
  .summary-table .total-row td { background-color: #f1f5f9 !important; font-weight: bold; font-size: 10px; }
  .sign-container { margin-top: 12px; width: 100%; border: 1px solid #000; border-collapse: collapse; page-break-inside: avoid; break-inside: avoid; }
  .sign-container td { border: 1px solid #000; padding: 5px; vertical-align: top; text-align: center; font-size: 9px; }
  .sign-space { height: 45px; }
  .footer-info { margin-top: 6px; font-size: 8px; text-align: right; color: #555; }
  .page-number { font-size: 8px; color: #555; }
  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

const renderCells = (row, columns) =>
  columns
    .map((col) => {
      const raw = typeof col.value === 'function' ? col.value(row) : row?.[col.key];
      const align = col.align === 'right' ? 'num' : col.align === 'center' ? 'ctr' : '';
      return `<td class="${align}">${escapeHtml(fmtText(raw, col.empty ?? '-'))}</td>`;
    })
    .join('');

const colspanTotal = (columns) =>
  columns.reduce((sum, col) => sum + (Number(col.colSpan) || 1), 0);

/**
 * Bangun HTML dokumen (dipakai internal & bisa diuji tanpa membuka jendela).
 */
export const buildDocumentHtml = (options = {}) => {
  const {
    title = 'LAPORAN',
    reportNumber = '-',
    printedAt = new Date(),
    printedBy = getCurrentUserName(),
    periodLabel = '',
    metadataLeft = [],
    metadataRight = [],
    infoBox = [],
    sections = [],
    notes = [],
    summary = [],
    summaryTitle = 'Ringkasan',
    signatories = [],
    landscape = false,
    pageLabel = '',
    emptyMessage = 'Tidak ada data pada periode/filter yang dipilih.',
  } = options;

  const headerMeta = (items) =>
    items
      .filter((m) => m && m.label)
      .map((m) => `${escapeHtml(m.label)} : ${m.strong ? `<strong>${escapeHtml(fmtText(m.value))}</strong>` : escapeHtml(fmtText(m.value))}`)
      .join('<br/>');

  const infoBoxHtml = infoBox.length
    ? `<table class="info-table"><tr>${infoBox
      .map((box) => `<td class="${box.full ? 'full' : ''}"><strong>${escapeHtml(box.label)} :</strong><br/><span>${escapeHtml(fmtText(box.value)).replace(/\n/g, '<br/>')}</span></td>`)
      .join('')}</tr></table>`
    : '';

  const sectionsHtml = sections
    .map((section) => {
      const columns = Array.isArray(section.columns) ? section.columns : [];
      const rows = Array.isArray(section.rows) ? section.rows : [];
      const head = columns
        .map((col) => {
          const span = Number(col.colSpan) || 1;
          const width = col.width ? ` style="width: ${escapeHtml(col.width)};"` : '';
          return `<th${span > 1 ? ` colspan="${span}"` : ''}${width}>${escapeHtml(col.header)}</th>`;
        })
        .join('');

      const body = rows.length
        ? rows.map((row) => `<tr>${renderCells(row, columns)}</tr>`).join('')
        : `<tr><td colspan="${colspanTotal(columns)}" style="text-align:center; padding:10px;">${escapeHtml(section.emptyMessage || emptyMessage)}</td></tr>`;

      const footer = section.footer ? `<tfoot><tr>${renderCells(section.footer, columns)}</tr></tfoot>` : '';

      return `
        ${section.title ? `<div class="section-title">${escapeHtml(section.title)}</div>` : ''}
        ${section.note ? `<div class="section-note">${escapeHtml(section.note)}</div>` : ''}
        <table class="items-table">
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
          ${footer}
        </table>`;
    })
    .join('');

  const notesHtml = notes
    .filter(Boolean)
    .map((n) => (/^[0-9]+\./.test(n) ? escapeHtml(n) : `- ${escapeHtml(n)}`))
    .join('<br/>');

  const summaryRows = summary
    .filter((s) => s && s.label !== undefined)
    .map((s) => `<tr class="${s.total ? 'total-row' : ''}"><td>${escapeHtml(s.label)}</td><td class="val">${escapeHtml(fmtText(s.value))}</td></tr>`)
    .join('');

  const middleHtml =
    notesHtml || summaryRows
      ? `<table class="middle-container" cellpadding="0" cellspacing="0"><tr>
          <td class="keterangan-box" style="width: ${summaryRows ? '58%' : '100%'}">
            <strong>Keterangan :</strong><br/>
            ${notesHtml || '-'}
          </td>
          ${summaryRows ? `<td class="summary-box" style="width: 42%"><table class="summary-table">${summaryRows}</table></td>` : ''}
        </tr></table>`
      : '';

  const signHtml = signatories.length
    ? `<table class="sign-container"><tr>${signatories
      .map(
        (s) => `<td>
            ${escapeHtml(fmtText(s.label, 'Dibuat Oleh'))},<br/>
            <div class="sign-space"></div>
            <strong>( ${escapeHtml(fmtText(s.name, '-'))} )</strong><br/>
            <span style="font-size: 7.5px; color: #666;">${escapeHtml(fmtText(s.role, ''))}</span>
          </td>`
      )
      .join('')}</tr></table>`
    : '';

  const printedDateLabel = fmtDateLong(printedAt);
  const printedFull = fmtDateTime(printedAt);

  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)} - ${escapeHtml(fmtText(reportNumber))}</title>
    <style>@page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }${PRINT_STYLES}</style>
  </head>
  <body>
    <table class="header-table">
      <tr>
        <td class="logo-area">
          <div><img src="/LOGO ALDIGENS2.jpeg" alt="Logo Aldigens" onerror="this.style.display='none'" /></div>
          <div class="company-address">
            <strong>PT. ALDIGENS PUTERA PERSADA</strong><br/>
            Ruko Bekasi Mas Blok C-25, Jl. Jend. Ahmad Yani, Margajaya<br/>
            Bekasi Selatan - 17141
          </div>
        </td>
        <td class="title-area">
          <div class="doc-title">${escapeHtml(title)}</div>
          <div class="doc-subtitle"><strong>No :</strong> ${escapeHtml(fmtText(reportNumber))}</div>
          ${pageLabel ? `<div class="doc-subtitle" style="margin-top:2px;">${escapeHtml(pageLabel)}</div>` : ''}
        </td>
      </tr>
    </table>

    <table class="meta-table">
      <tr>
        <td style="width: 55%;">${headerMeta(metadataLeft)}</td>
        <td align="right" style="width: 45%;">
          ${periodLabel ? `Periode : <strong>${escapeHtml(periodLabel)}</strong><br/>` : ''}
          ${headerMeta(metadataRight)}
          Tanggal Cetak : ${escapeHtml(printedDateLabel)}
        </td>
      </tr>
    </table>

    ${infoBoxHtml}
    ${sectionsHtml}
    ${middleHtml}
    ${signHtml}

    <div class="footer-info">
      Dibuat oleh: ${escapeHtml(fmtText(printedBy, 'ADMIN'))} | ${escapeHtml(printedFull)} | Powered by Aldigens ERP
    </div>

    <script>
      (function () {
        var printed = false;
        var run = function () {
          if (printed) return;
          printed = true;
          try { window.focus(); window.print(); } catch (e) { /* diabaikan */ }
        };
        window.onload = function () {
          var images = Array.prototype.slice.call(document.images || []);
          var pending = images.filter(function (img) { return !img.complete; }).length;
          if (!pending) { setTimeout(run, 120); return; }
          var done = 0;
          var tick = function () {
            done += 1;
            if (done >= pending) setTimeout(run, 120);
          };
          images.forEach(function (img) {
            img.addEventListener('load', tick, { once: true });
            img.addEventListener('error', tick, { once: true });
          });
          setTimeout(run, 2000);
        };
      })();
    </script>
  </body>
</html>`;
};

/**
 * Buka jendela cetak, tulis dokumen, dan jalankan print.
 * @returns {boolean} false bila popup diblokir browser.
 */
export const openPrintWindow = (html, title = 'Laporan') => {
  const win = window.open('', '_blank', 'width=1024,height=768');
  if (!win) {
    alert('Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.');
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  if (title) document.title = title;
  return true;
};

/**
 * API utama: cetak dokumen AIMS.
 * @param {object} options seluruh opsi laporan (lihat buildDocumentHtml)
 * @returns {boolean} berhasil membuka jendela cetak
 */
export const printAldigensDocument = (options = {}) => {
  const html = buildDocumentHtml(options);
  return openPrintWindow(html, options.title);
};

export default printAldigensDocument;
