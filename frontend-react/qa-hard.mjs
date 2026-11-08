// Reload keras lalu buka halaman produk, tampilkan console log.
export default async function run(page) {
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 400)));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + (e.stack || String(e)).slice(0, 500)));

  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3500);

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Inventory')?.click();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === 'Part Number Data');
    (el?.closest('button, a, li') || el)?.click();
  });
  await page.waitForTimeout(8000);

  return {
    logs,
    state: await page.evaluate(() => ({
      error: /Gagal memuat data produk/.test(document.body.innerText),
      rows: [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length,
      pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
      loading: document.body.innerText.includes('Memuat data...'),
    })),
  };
}
