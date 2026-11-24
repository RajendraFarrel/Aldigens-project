const BASE = 'http://localhost:5174/';

// Shapes mirror backend InventoryWarehouseController::mutations + getWarehouses + getProducts.
const now = new Date();
const iso = (d) => new Date(d).toISOString();

const productA = { id: 1, part_number: 'PN-001', barcode: 'BC-001', name: 'Baut Hex M10', unit: 'PCS', stock: 120 };
const productB = { id: 2, part_number: 'PN-002', barcode: 'BC-002', name: 'Bearing 6204', unit: 'PCS', stock: 40 };

const rows = [
  {
    group_key: 'g-receive-1', transaction_ids: [11], reference_type: 'RECEIVE', reference_number: 'PO-2026-001',
    notes: 'Penerimaan dari supplier', transaction_time: iso(now), user_name: 'admin', quantity: 10,
    stock_before: 110, stock_after: 120, product: productA,
    warehouse: { id: 1, code: 'WH1', name: 'Gudang Utama' }, location: { id: 3, code: 'A-01', name: 'Rak A1' },
    destination_warehouse: null, destination_location: null,
  },
  {
    group_key: 'g-receive-2', transaction_ids: [12], reference_type: 'RECEIVE', reference_number: 'PO-2026-002',
    notes: null, transaction_time: iso(now), user_name: 'admin', quantity: 5,
    stock_before: 35, stock_after: 40, product: productB,
    warehouse: { id: 1, code: 'WH1', name: 'Gudang Utama' }, location: null,
    destination_warehouse: null, destination_location: null,
  },
  {
    group_key: 'g-issue-1', transaction_ids: [21], reference_type: 'ISSUE', reference_number: 'SO-2026-010',
    notes: 'Pengeluaran produksi', transaction_time: iso(now), user_name: 'admin', quantity: 4,
    stock_before: 124, stock_after: 120, product: productA,
    warehouse: { id: 1, code: 'WH1', name: 'Gudang Utama' }, location: { id: 3, code: 'A-01', name: 'Rak A1' },
    destination_warehouse: null, destination_location: null,
  },
  {
    group_key: 'g-transfer-1', transaction_ids: [31, 32], reference_type: 'TRANSFER', reference_number: 'TRF-2026-003',
    notes: 'Pindah ke gudang cabang', transaction_time: iso(now), user_name: 'admin', quantity: 2,
    stock_before: 40, stock_after: 38, product: productB,
    warehouse: { id: 1, code: 'WH1', name: 'Gudang Utama' }, location: { id: 3, code: 'A-01', name: 'Rak A1' },
    destination_warehouse: { id: 2, code: 'WH2', name: 'Gudang Cabang' },
    destination_location: { id: 5, code: 'B-02', name: 'Rak B2' },
  },
];

const warehouses = [
  { id: 1, code: 'WH1', name: 'Gudang Utama', locations: [{ id: 3, code: 'A-01', name: 'Rak A1' }] },
  { id: 2, code: 'WH2', name: 'Gudang Cabang', locations: [{ id: 5, code: 'B-02', name: 'Rak B2' }] },
];

const posts = [];

export default async function run(page, ui) {
  const out = { received: [], posted: posts };

  const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
  // Same shape as AuthController::userPayload() for an unrestricted administrator.
  const user = { id: 1, name: 'admin', full_name: 'Administrator Sistem', email: 'admin@aldigens.co.id', role: 'Administrator', menu_access: null, permissions: [], is_admin: true };
  const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });

  await page.route('**/api/**', (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    return route.fallback();
  });

  await page.route('**/api/login', (route) => json(route, { token: 'qa-token', user }));
  await page.route('**/api/me', (route) => json(route, user));
  await page.route('**/api/permissions', (route) => json(route, { data: [] }));
  await page.route('**/api/inventory/products**', (route) => json(route, { data: [productA, productB] }));
  await page.route('**/api/inventory/warehouses**', (route) => json(route, { data: warehouses }));
  await page.route('**/api/inventory/mutations**', (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (req.method() !== 'GET') {
      posts.push({ path: url.pathname, method: req.method(), body: req.postDataJSON ? req.postDataJSON() : null });
      return json(route, { message: 'ok' });
    }
    const types = (url.searchParams.get('reference_types') || '').split(',').map((s) => s.trim()).filter(Boolean);
    const search = (url.searchParams.get('search') || '').toLowerCase();
    let data = types.length ? rows.filter((r) => types.includes(r.reference_type)) : rows;
    if (search) data = data.filter((r) => JSON.stringify(r).toLowerCase().includes(search));
    out.received.push({ query: url.search, count: data.length });
    return json(route, { data });
  });

  const postHandler = (name) => (route) => {
    const body = route.request().postDataJSON();
    posts.push({ path: name, body });
    return json(route, { message: 'Stok berhasil diperbarui.', data: { ok: true } });
  };
  await page.route('**/api/inventory/receive', postHandler('receive'));
  await page.route('**/api/inventory/issue', postHandler('issue'));
  await page.route('**/api/inventory/transfer', postHandler('transfer'));

  await page.route('**/api/**', (route) => json(route, { data: [] }));

  const info = () => page.evaluate(() => ({
    heading: document.querySelector('h2')?.innerText || null,
    headers: [...document.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
    rows: [...document.querySelectorAll('tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 130)),
    empty: document.body.innerText.includes('Belum ada data'),
    addButton: [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).find((t) => t.startsWith('Tambah ')) || null,
    printButton: [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).find((t) => t.startsWith('Cetak PDF')) || null,
    printTitle: document.querySelector('h2')?.innerText || null,
  }));

  const HEADINGS = { 'inventory-receive': 'Penerimaan Barang', 'inventory-issue': 'Pengeluaran Barang', 'inventory-transfer': 'Transfer Lokasi' };
  const waitHeading = async (tab) => {
    await page.waitForFunction((label) => [...document.querySelectorAll('h2')].some((h) => h.innerText.trim() === label), HEADINGS[tab], { timeout: 30000 });
    await page.waitForTimeout(1500);
  };

  // Menu labels are defined in src/config/menus.js (unchanged by the refactor).
  const MENU_LABELS = { 'inventory-receive': 'Goods Receipt', 'inventory-issue': 'Goods Issue', 'inventory-transfer': 'Location Transfer' };

  // Click the real sidebar sub-menu (no reload: it would drop the seeded auth).
  const openMenu = async (tab) => {
    const item = page.locator(`aside button, nav button, button`).filter({ hasText: new RegExp(`^\\s*${MENU_LABELS[tab]}\\s*$`) }).first();
    await item.waitFor({ state: 'visible', timeout: 15000 });
    await item.click();
    await waitHeading(tab);
    const state = await page.evaluate(() => localStorage.getItem('aldigens_active_tab'));
    out.menuTabs = { ...(out.menuTabs || {}), [tab]: state };
  };

  // login via the real form (mocked /api/login)
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="text"]', { timeout: 20000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('admin@aldigens.co.id');
  await inputs.nth(1).fill('password');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForFunction(() => localStorage.getItem('auth_token'), null, { timeout: 20000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Memverifikasi'), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  out.loginOk = true;
  out.afterLogin = await page.evaluate(() => ({ h1: document.querySelector('h1')?.innerText || null, h2: document.querySelector('h2')?.innerText || null }));

  // ---- RECEIPT ----
  await openMenu('inventory-receive');
  out.receipt = await info();
  await page.screenshot({ path: 'mock-receipt.png' });

  // add receipt
  await page.getByRole('button', { name: /^Tambah Penerimaan Barang$/ }).first().click();
  await page.waitForTimeout(400);
  out.receiptModal = await page.evaluate(() => ({
    title: document.querySelector('.fixed h3')?.innerText,
    labels: [...document.querySelectorAll('.fixed form label')].map((l) => l.innerText.trim()),
    options: [...document.querySelectorAll('.fixed select')].length,
  }));
  await page.selectOption('.fixed form select >> nth=0', 'BC-001');
  await page.fill('.fixed form input[type="number"]', '7');
  await page.fill('.fixed form input:not([type])', 'PO-QA-1');
  await page.selectOption('.fixed form select >> nth=1', '1');
  await page.selectOption('.fixed form select >> nth=2', '3');
  await page.fill('.fixed form textarea', 'QA receive');
  await page.screenshot({ path: 'mock-receipt-modal.png' });
  await page.locator('.fixed form button[type="submit"], .fixed form button:not([type="button"])').last().click();
  await page.waitForTimeout(1000);
  out.receiptAfterSave = await page.evaluate(() => document.body.innerText.includes('berhasil disimpan'));

  // edit receipt (first row) — must PUT with reference_type RECEIVE
  await page.locator('tbody tr >> nth=0').locator('button[title="Edit"]').click();
  await page.waitForTimeout(400);
  await page.fill('.fixed form input[type="number"]', '9');
  await page.locator('.fixed form button:not([type="button"])').last().click();
  await page.waitForTimeout(800);

  // delete receipt
  page.once('dialog', (d) => d.accept());
  await page.locator('tbody tr >> nth=0').locator('button[title="Hapus"]').click();
  await page.waitForTimeout(800);

  // search + period
  await page.fill('input[placeholder^="Cari dokumen"]', 'PO-2026-002');
  await page.waitForTimeout(1200);
  out.receiptSearch = await page.evaluate(() => [...document.querySelectorAll('tbody tr')].map((tr) => tr.innerText.replace(/\s+/g, ' ').slice(0, 60)));

  // ---- ISSUE ----
  await openMenu('inventory-issue');
  out.issue = await info();
  await page.screenshot({ path: 'mock-issue.png' });
  await page.getByRole('button', { name: /^Tambah Pengeluaran Barang$/ }).first().click();
  await page.waitForTimeout(400);
  out.issueModal = await page.evaluate(() => ({
    title: document.querySelector('.fixed h3')?.innerText,
    labels: [...document.querySelectorAll('.fixed form label')].map((l) => l.innerText.trim()),
  }));
  await page.selectOption('.fixed form select >> nth=0', 'BC-002');
  await page.fill('.fixed form input[type="number"]', '3');
  await page.selectOption('.fixed form select >> nth=1', '2');
  await page.screenshot({ path: 'mock-issue-modal.png' });
  await page.locator('.fixed form button:not([type="button"])').last().click();
  await page.waitForTimeout(1000);
  out.issueAfterSave = await page.evaluate(() => document.body.innerText.includes('berhasil disimpan'));

  // ---- TRANSFER ----
  await openMenu('inventory-transfer');
  out.transfer = await info();
  await page.screenshot({ path: 'mock-transfer.png' });
  await page.getByRole('button', { name: /^Tambah Transfer Lokasi$/ }).first().click();
  await page.waitForTimeout(400);
  out.transferModal = await page.evaluate(() => ({
    title: document.querySelector('.fixed h3')?.innerText,
    labels: [...document.querySelectorAll('.fixed form label')].map((l) => l.innerText.trim()),
    selects: document.querySelectorAll('.fixed select').length,
  }));
  await page.selectOption('.fixed form select >> nth=0', 'BC-001');
  await page.fill('.fixed form input[type="number"]', '2');
  await page.selectOption('.fixed form select >> nth=1', '1');
  await page.selectOption('.fixed form select >> nth=3', '2');
  await page.screenshot({ path: 'mock-transfer-modal.png' });
  await page.locator('.fixed form button:not([type="button"])').last().click();
  await page.waitForTimeout(1000);
  out.transferAfterSave = await page.evaluate(() => document.body.innerText.includes('berhasil disimpan'));

  // --- print PDF: capture generated HTML from every popup window
  await page.evaluate(() => {
    window.__printed = [];
    window.__origOpen = window.open;
    window.open = () => {
      const w = window.__origOpen('', '_blank', 'width=1024,height=768');
      if (!w) return w;
      const realWrite = w.document.write.bind(w.document);
      w.document.write = (html) => { window.__printed.push(String(html)); };
      try { w.print = () => {}; } catch (e) { /* noop */ }
      void realWrite;
      return w;
    };
  });
  const capturePrint = async (tab) => {
    await page.getByRole('button', { name: /^Cetak PDF/ }).first().click();
    await page.waitForTimeout(1500);
    return page.evaluate(() => (window.__printed || []).slice(-1).map((h) => ({
      title: (h.match(/LAPORAN [A-Z ]+/) || [null])[0],
      reportNo: (h.match(/(TRF|RCV|ISS)-\d+/) || [null])[0],
      hasNote: h.includes('Satu baris = satu transfer'),
      hasWarehouseCol: h.includes('Warehouse'),
      hasWhAsal: h.includes('WH Asal'),
      rows: (h.match(/<tbody[\s\S]*?<\/tbody>/) || [''])[0].length,
    })));
  };
  out.printTransfer = await capturePrint('inventory-transfer');

  await openMenu('inventory-receipt');
  out.printReceipt = await capturePrint('inventory-receive');

  await openMenu('inventory-issue');
  out.printIssue = await capturePrint('inventory-issue');

  return out;
}
