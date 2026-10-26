// Ukur durasi getProducts & cek status loading di halaman.
export default async function run(page) {
  const res = await page.evaluate(async () => {
    const t0 = performance.now();
    try {
      const mod = await import('/src/services/api.js');
      const r = await mod.getProducts('');
      return { ms: Math.round(performance.now() - t0), status: r.status, rows: r.data?.data?.length };
    } catch (e) {
      return { ms: Math.round(performance.now() - t0), error: e.message, status: e.response?.status };
    }
  });

  const state = await page.evaluate(() => ({
    loading: document.body.innerText.includes('Memuat data...'),
    pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
    error: /Gagal memuat data produk/.test(document.body.innerText),
    hidden: document.hidden,
  }));

  return { res, state };
}
