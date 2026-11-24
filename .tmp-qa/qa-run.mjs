const PORT = 5174;
const BASE = `http://localhost:${PORT}/`;
const realUser = {
  id: 1, name: 'QA Admin', email: 'qa@local', is_admin: true,
  permissions: ['inventory.goods_receipt.view','inventory.goods_issue.view','inventory.transfer.view',
    'inventory.products.view','inventory.warehouse.view','inventory.transactions.view',
    'inventory.goods_receipt.create','inventory.goods_issue.create','inventory.transfer.create',
    'inventory.mutation.update','inventory.mutation.delete'],
};
const product = { id: 7, part_number: 'PN-001', barcode: 'PN-001', product_code: 'PN-001', name: 'Baut Hex M12', unit: 'PCS', stock: 120 };
const warehouses = [
  { id: 1, code: 'WH-JKT', name: 'Gudang Jakarta', locations: [{ id: 11, code: 'R1-A', name: 'Rak A' }] },
  { id: 2, code: 'WH-SBY', name: 'Gudang Surabaya', locations: [{ id: 21, code: 'R2-B', name: 'Rak B' }] },
];
const mk = (group, type, extra = {}) => ({
  group_key: group, transaction_ids: [1, 2], reference_type: type,
  reference_number: `DOC-${group}`, notes: 'QA data', transaction_time: new Date().toISOString(),
  user_name: 'QA Admin', quantity: 3, stock_before: 100, stock_after: type === 'ISSUE' ? 97 : 103,
  product, warehouse: warehouses[0], location: warehouses[0].locations[0],
  destination_warehouse: type === 'TRANSFER' ? warehouses[1] : null,
  destination_location: type === 'TRANSFER' ? warehouses[1].locations[0] : null,
  ...extra,
});

const pageInfo = async (page) => page.evaluate(() => ({
  heading: document.querySelector('h2')?.innerText || null,
  subheading: document.querySelector('h2 + p, h2 ~ p')?.innerText || null,
  tableRows: document.querySelectorAll('tbody tr').length,
  headers: [...document.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
  buttons: [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 8),
  firstRowText: document.querySelector('tbody tr')?.innerText.replace(/\s+/g, ' ').slice(0, 200) || null,
  errorBox: document.querySelector('.bg-red-50.border-red-200')?.innerText || null,
  brokenEncoding: /â€|â”|â†/.test(document.body.innerText),
}));

const openModalInfo = async (page) => {
  await page.waitForTimeout(500);
  return page.evaluate(() => ({
    panel: !!document.querySelector('.fixed'),
    title: document.querySelector('.fixed h3')?.innerText || null,
    labels: [...document.querySelectorAll('.fixed form label')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()),
    selects: [...document.querySelectorAll('.fixed select')].length,
    options: [...document.querySelectorAll('.fixed select')].map((s) => [...s.options].slice(0, 3).map((o) => o.textContent.trim())),
  }));
};

export default async function run(page, ui) {
  const result = { steps: [] };
  await page.addInitScript(([user]) => {
    localStorage.setItem('auth_token', 'qa-token');
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, [realUser]);

  const calls = [];
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, '');
    calls.push(`${req.method()} ${path}`);
    const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === '/me') return json(realUser);
    if (path === '/inventory/mutations') {
      const types = (url.searchParams.get('reference_types') || '').split(',');
      return json({ data: types.map((t) => mk(t.toLowerCase(), t)) });
    }
    if (path === '/inventory/products') return json({ data: [product] });
    if (path === '/inventory/warehouses') return json({ data: warehouses });
    if (req.method() === 'POST' || req.method() === 'PUT') {
      return json({ message: 'Stok berhasil diperbarui.', data: [] });
    }
    return json({ data: [] });
  });

  const visit = async (tab, key) => {
    await page.evaluate((t) => localStorage.setItem('aldigens_active_tab', t), tab);
    await page.goto(BASE + '?t=' + Date.now(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!document.querySelector('h2'), null, { timeout: 30000 });
    await page.waitForTimeout(2000);
    const info = await pageInfo(page);
    await page.screenshot({ path: `qa-${key}.png` });
    result[key] = info;
    return info;
  };

  result.receipt = await visit('inventory-receive', 'receipt');
  const rAdd = page.getByRole('button', { name: /Tambah Penerimaan Barang/ }).first();
  if (await rAdd.count()) {
    await rAdd.click();
    result.receiptModal = await openModalInfo(page);
    await page.screenshot({ path: 'qa-receipt-modal.png' });
    // isi form + submit, pastikan payload berakhir di /inventory/receive
    // urutan select di modal: 0 = part number, 1 = warehouse, 2 = lokasi
    await page.locator('.fixed select').first().selectOption('PN-001');
    await page.locator('.fixed select').nth(1).selectOption('1');
    await page.locator('.fixed select').nth(2).selectOption('11');
    await page.locator('.fixed form button:not([type="button"])').first().click();
    await page.waitForTimeout(1200);
    result.receiptSubmit = { message: await page.evaluate(() => document.querySelector('.bg-emerald-50')?.innerText || null), calls: [...calls] };
  } else result.receiptModal = 'ADD BUTTON NOT FOUND';

  result.issue = await visit('inventory-issue', 'issue');
  const iAdd = page.getByRole('button', { name: /Tambah Pengeluaran Barang/ }).first();
  if (await iAdd.count()) {
    await iAdd.click();
    result.issueModal = await openModalInfo(page);
    await page.screenshot({ path: 'qa-issue-modal.png' });
    await page.locator('.fixed button[type="button"]').first().click();
  } else result.issueModal = 'ADD BUTTON NOT FOUND';

  result.transfer = await visit('inventory-transfer', 'transfer');
  const tAdd = page.getByRole('button', { name: /Tambah Transfer Lokasi/ }).first();
  if (await tAdd.count()) {
    await tAdd.click();
    result.transferModal = await openModalInfo(page);
    await page.screenshot({ path: 'qa-transfer-modal.png' });
  } else result.transferModal = 'ADD BUTTON NOT FOUND';

  result.calls = calls;
  return result;
}
