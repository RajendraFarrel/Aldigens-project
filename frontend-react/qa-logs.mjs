// Tangkap error saat halaman Data Part Number me-render 531 baris.
export default async function run(page) {
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 400)));
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + (e.stack || String(e)).slice(0, 700)));

  // Muat ulang halaman produk langsung
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Inventory')?.click();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === 'Part Number Data');
    (el?.closest('button, a, li') || el)?.click();
  });
  await page.waitForTimeout(6000);

  return {
    logs,
    state: await page.evaluate(() => ({
      hasError: /Gagal memuat data produk/.test(document.body.innerText),
      rows: document.querySelectorAll('tbody tr').length,
      pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
    })),
  };
}
