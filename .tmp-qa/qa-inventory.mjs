const BASE = 'http://localhost:5174/';

const pageInfo = async (page) => page.evaluate(() => ({
  heading: document.querySelector('h2')?.innerText || null,
  bodyChars: document.body.innerText.length,
  tableRows: document.querySelectorAll('tbody tr').length,
  headers: [...document.querySelectorAll('thead th')].map((th) => th.innerText.trim()),
  buttons: [...document.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 12),
  firstRowText: document.querySelector('tbody tr')?.innerText.replace(/\s+/g, ' ').slice(0, 160) || null,
  errorBox: document.querySelector('.bg-red-50.border-red-200')?.innerText || null,
  url: location.href,
}));

export default async function run(page, ui) {
  const result = { steps: [] };

  // ---- login ----
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="text"]', { timeout: 20000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('admin@aldigens.co.id');
  await inputs.nth(1).fill('password');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForFunction(() => localStorage.getItem('auth_token'), null, { timeout: 30000 });
  await page.waitForSelector('aside, nav', { timeout: 20000 });
  result.steps.push({ login: 'ok', token: true });

  // ---- Good Receipt ----
  await page.evaluate(() => localStorage.setItem('aldigens_active_tab', 'inventory-receive'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('h2'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  result.receipt = await pageInfo(page);
  await page.screenshot({ path: 'shots-good-receipt.png', fullPage: false });

  // open add modal
  const addBtn = page.getByRole('button', { name: /Tambah Penerimaan Barang/ }).first();
  if (await addBtn.count()) {
    await addBtn.click();
    await page.waitForTimeout(600);
    result.receiptModal = await page.evaluate(() => ({
      title: document.querySelector('.fixed h3')?.innerText || null,
      labels: [...document.querySelectorAll('.fixed form label')].map((l) => l.innerText.trim()),
      hasWarehouseSelect: [...document.querySelectorAll('.fixed select')].length,
    }));
    await page.screenshot({ path: 'shots-good-receipt-modal.png' });
    await page.keyboard.press('Escape');
    await page.locator('.fixed button[type="button"]').first().click();
    await page.waitForTimeout(400);
  } else {
    result.receiptModal = 'ADD BUTTON NOT FOUND';
  }

  // ---- Good Issue ----
  await page.evaluate(() => localStorage.setItem('aldigens_active_tab', 'inventory-issue'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('h2'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  result.issue = await pageInfo(page);
  await page.screenshot({ path: 'shots-good-issue.png' });

  // ---- Transfer ----
  await page.evaluate(() => localStorage.setItem('aldigens_active_tab', 'inventory-transfer'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!document.querySelector('h2'), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  result.transfer = await pageInfo(page);
  await page.screenshot({ path: 'shots-inventory-transfer.png' });

  // transfer add modal (must show BOTH source and destination)
  const tAdd = page.getByRole('button', { name: /Tambah Transfer Lokasi/ }).first();
  if (await tAdd.count()) {
    await tAdd.click();
    await page.waitForTimeout(600);
    result.transferModal = await page.evaluate(() => ({
      title: document.querySelector('.fixed h3')?.innerText || null,
      labels: [...document.querySelectorAll('.fixed form label')].map((l) => l.innerText.trim()),
    }));
    await page.screenshot({ path: 'shots-transfer-modal.png' });
  } else {
    result.transferModal = 'ADD BUTTON NOT FOUND';
  }

  return result;
}
