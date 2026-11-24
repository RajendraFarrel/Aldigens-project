const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
// Same shape as AuthController::userPayload() for an unrestricted administrator.
const user = { id: 1, name: 'admin', full_name: 'Administrator Sistem', email: 'admin@aldigens.co.id', role: 'Administrator', menu_access: null, permissions: [], is_admin: true };
const now = new Date().toISOString();

const productA = { id: 1, part_number: 'PN-001', barcode: 'BC-001', name: 'Baut Hex M10', unit: 'PCS', stock: 120 };
const productB = { id: 2, part_number: 'PN-002', barcode: 'BC-002', name: 'Bearing 6204', unit: 'PCS', stock: 40 };
const wh1 = { id: 1, code: 'WH1', name: 'Gudang Utama' };
const wh2 = { id: 2, code: 'WH2', name: 'Gudang Cabang' };
const loc1 = { id: 3, code: 'A-01', name: 'Rak A1' };
const loc2 = { id: 5, code: 'B-02', name: 'Rak B2' };

const rows = [
  { group_key: 'g-receive-1', transaction_ids: [11], reference_type: 'RECEIVE', reference_number: 'PO-2026-001', notes: 'Dari supplier', transaction_time: now, user_name: 'admin', quantity: 10, stock_before: 110, stock_after: 120, product: productA, warehouse: wh1, location: loc1, destination_warehouse: null, destination_location: null },
  { group_key: 'g-receive-2', transaction_ids: [12], reference_type: 'RECEIVE', reference_number: 'PO-2026-002', notes: null, transaction_time: now, user_name: 'admin', quantity: 5, stock_before: 35, stock_after: 40, product: productB, warehouse: wh1, location: null, destination_warehouse: null, destination_location: null },
  { group_key: 'g-issue-1', transaction_ids: [21], reference_type: 'ISSUE', reference_number: 'SO-2026-010', notes: 'Produksi', transaction_time: now, user_name: 'admin', quantity: 4, stock_before: 124, stock_after: 120, product: productA, warehouse: wh1, location: loc1, destination_warehouse: null, destination_location: null },
  { group_key: 'g-transfer-1', transaction_ids: [31, 32], reference_type: 'TRANSFER', reference_number: 'TRF-2026-003', notes: 'Pindah cabang', transaction_time: now, user_name: 'admin', quantity: 2, stock_before: 40, stock_after: 38, product: productB, warehouse: wh1, location: loc1, destination_warehouse: wh2, destination_location: loc2 },
];

export default async function run(page) {
  const out = { posts: [], mutationQueries: [] };
  const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });

  await page.route('**/api/**', (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    const url = new URL(req.url());
    const path = url.pathname;
    if (path.endsWith('/api/login')) return json(route, { token: 'qa-token', user });
    if (path.endsWith('/api/me')) return json(route, user);
    if (path.endsWith('/api/inventory/products')) return json(route, { data: [productA, productB] });
    if (path.endsWith('/api/inventory/warehouses')) return json(route, { data: [{ ...wh1, locations: [loc1] }, { ...wh2, locations: [loc2] }] });
    if (path.endsWith('/api/inventory/mutations')) {
      const types = (url.searchParams.get('reference_types') || '').split(',').map((s) => s.trim()).filter(Boolean);
      const q = (url.searchParams.get('search') || '').toLowerCase();
      let data = rows.filter((r) => types.includes(r.reference_type));
      if (q) data = data.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
      out.mutationQueries.push({ types, q, count: data.length });
      return json(route, { data });
    }
    if (path.endsWith('/api/inventory/receive') || path.endsWith('/api/inventory/issue') || path.endsWith('/api/inventory/transfer')) {
      out.posts.push({ endpoint: path.split('/').pop(), body: req.postDataJSON() });
      return json(route, { message: 'Stok berhasil diperbarui.' });
    }
    if (path.includes('/api/inventory/mutations/')) {
      out.posts.push({ endpoint: 'mutation', method: req.method(), path, body: req.postDataJSON ? req.postDataJSON() : null });
      return json(route, { message: 'ok' });
    }
    return json(route, { data: [] });
  });

  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('input[type="text"]', { timeout: 30000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('admin@aldigens.co.id');
  await inputs.nth(1).fill('password');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForFunction(() => !!localStorage.getItem('auth_token'), null, { timeout: 30000 });
  await page.waitForTimeout(2000);

  const goto = async (tab, heading) => {
    await page.evaluate((t) => window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: t })), tab);
    await page.waitForFunction((h) => [...document.querySelectorAll('h2')].some((x) => x.innerText.trim() === h), heading, { timeout: 30000 });
    await page.waitForTimeout(1200);
  };

  const snapshot = () => page.evaluate(() => ({
    heading: [...document.querySelectorAll('h2')].map((h) => h.innerText.trim()),
    headers: [...document.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
    rowCount: document.querySelectorAll('tbody tr').length,
    firstRow: (document.querySelector('tbody tr')?.innerText || '').replace(/\s+/g, ' ').slice(0, 150),
    buttons: [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 6),
    tabs: localStorage.getItem('aldigens_active_tab'),
  }));

  // ---------- RECEIPT ----------
  await goto('inventory-receive', 'Penerimaan Barang');
  out.receipt = await snapshot();
  await page.screenshot({ path: 'shot-receipt.png' });

  const openModal = async (label) => {
    await page.getByRole('button', { name: label, exact: false }).first().click();
    await page.waitForSelector('.fixed form', { timeout: 10000 });
    return page.evaluate(() => ({
      title: document.querySelector('.fixed h3')?.innerText,
      labels: [...document.querySelectorAll('.fixed form label')].map((l) => l.innerText.trim().replace(/\s*\*$/, '')),
      selectCount: document.querySelectorAll('.fixed select').length,
    }));
  };

  out.receiptModal = await openModal('Tambah Penerimaan Barang');
  await page.selectOption('.fixed form select >> nth=0', 'BC-001');
  await page.fill('.fixed form input[type="number"]', '7');
  await page.fill('.fixed form input:not([type])', 'PO-QA-1');
  await page.selectOption('.fixed form select >> nth=1', '1');
  await page.selectOption('.fixed form select >> nth=2', '3');
  await page.fill('.fixed form textarea', 'QA receive');
  await page.screenshot({ path: 'shot-receipt-modal.png' });
  await page.locator('.fixed form button[type="submit"], .fixed form button:not([type="button"])').last().click();
  await page.waitForTimeout(1200);
  out.receiptSaved = await page.evaluate(() => document.body.innerText.includes('berhasil disimpan'));

  // edit first row
  await page.locator('tbody tr').first().locator('button[title="Edit"]').click();
  await page.waitForSelector('.fixed form', { timeout: 10000 });
  out.receiptEditPrefill = await page.evaluate(() => ({
    qty: document.querySelector('.fixed form input[type="number"]')?.value,
    doc: document.querySelector('.fixed form input:not([type])')?.value,
  }));
  await page.fill('.fixed form input[type="number"]', '9');
  await page.locator('.fixed form button:not([type="button"])').last().click();
  await page.waitForTimeout(1000);

  // delete first row
  page.once('dialog', (d) => d.accept());
  await page.locator('tbody tr').first().locator('button[title="Hapus"]').click();
  await page.waitForTimeout(1000);

  // search
  await page.fill('input[placeholder^="Cari dokumen"]', 'PO-2026-002');
  await page.waitForTimeout(1500);
  out.receiptSearchRows = await page.evaluate(() => [...document.querySelectorAll('tbody tr')].map((r) => r.innerText.replace(/\s+/g, ' ').slice(0, 50)));

  // ---------- ISSUE ----------
  await goto('inventory-issue', 'Pengeluaran Barang');
  out.issue = await snapshot();
  await page.screenshot({ path: 'shot-issue.png' });
  out.issueModal = await openModal('Tambah Pengeluaran Barang');
  await page.selectOption('.fixed form select >> nth=0', 'BC-002');
  await page.fill('.fixed form input[type="number"]', '3');
  await page.selectOption('.fixed form select >> nth=1', '2');
  await page.screenshot({ path: 'shot-issue-modal.png' });
  await page.locator('.fixed form button:not([type="button"])').last().click();
  await page.waitForTimeout(1200);
  out.issueSaved = await page.evaluate(() => document.body.innerText.includes('berhasil disimpan'));

  // ---------- TRANSFER ----------
  await goto('inventory-transfer', 'Transfer Lokasi');
  out.transfer = await snapshot();
  await page.screenshot({ path: 'shot-transfer.png' });
  out.transferModal = await openModal('Tambah Transfer Lokasi');
  await page.selectOption('.fixed form select >> nth=0', 'BC-001');
  await page.fill('.fixed form input[type="number"]', '2');
  await page.selectOption('.fixed form select >> nth=1', '1');
  await page.selectOption('.fixed form select >> nth=1', '1');
  await page.selectOption('.fixed form select >> nth=3', '2');
  await page.screenshot({ path: 'shot-transfer-modal.png' });
  await page.locator('.fixed form button:not([type="button"])').last().click();
  await page.waitForTimeout(1200);
  out.transferSaved = await page.evaluate(() => document.body.innerText.includes('berhasil disimpan'));

  // ---------- PRINT PDF ----------
  await page.evaluate(() => {
    window.__printed = [];
    const orig = window.open;
    window.open = () => {
      const w = orig('', '_blank', 'width=1024,height=768');
      if (!w) return w;
      w.document.write = (html) => { window.__printed.push(String(html)); };
      try { w.print = () => { }; } catch (e) { /* noop */ }
      return w;
    };
  });

  const print = async (tab, heading) => {
    await goto(tab, heading);
    await page.getByRole('button', { name: /^Cetak PDF/ }).first().click();
    await page.waitForTimeout(1500);
    return page.evaluate(() => {
      const html = (window.__printed || []).slice(-1)[0] || '';
      return {
        title: (html.match(/LAPORAN [A-Z ]+/) || [null])[0],
        reportNo: (html.match(/\b(RCV|ISS|TRF)-\d+/) || [null])[0],
        transferNote: html.includes('Satu baris = satu transfer'),
        warehouseCol: html.includes('Warehouse'),
        whAsalCol: html.includes('WH Asal'),
        hasTable: html.includes('<table'),
      };
    });
  };

  out.printTransfer = await print('inventory-transfer', 'Transfer Lokasi');
  out.printReceipt = await print('inventory-receive', 'Penerimaan Barang');
  out.printIssue = await print('inventory-issue', 'Pengeluaran Barang');

  return out;
}
