// Klik tombol Refresh dan tangkap log fetchProducts.
export default async function run(page) {
  const logs = [];
  page.on('console', (m) => logs.push(m.type() + ': ' + m.text().slice(0, 300)));

  await page.evaluate(() => document.querySelector('button[title="Refresh"]')?.click());
  await page.waitForTimeout(6000);

  return {
    logs: logs.filter((l) => /fetchProducts|error|Gagal/i.test(l)),
    state: await page.evaluate(() => ({
      error: /Gagal memuat data produk/.test(document.body.innerText),
      rows: [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length,
      pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
      loading: document.body.innerText.includes('Memuat data...'),
    })),
  };
}
