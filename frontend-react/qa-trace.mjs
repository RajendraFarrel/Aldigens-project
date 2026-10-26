// Lacak pemanggilan getProducts dari komponen (via patch axios adapter).
export default async function run(page) {
  const trace = await page.evaluate(async () => {
    const calls = [];
    const api = (await import('/src/services/api.js')).default;
    api.interceptors.request.use((cfg) => {
      if (String(cfg.url).includes('inventory/products')) {
        calls.push({ url: cfg.url, params: JSON.stringify(cfg.params || {}) });
      }
      return cfg;
    });
    api.interceptors.response.use(
      (r) => {
        if (String(r.config.url).includes('inventory/products')) {
          calls.push({ ok: true, status: r.status, rows: r.data?.data?.length, params: JSON.stringify(r.config.params || {}) });
        }
        return r;
      },
      (e) => {
        if (String(e.config?.url || '').includes('inventory/products')) {
          calls.push({ ok: false, status: e.response?.status, msg: e.message, params: JSON.stringify(e.config?.params || {}) });
        }
        return Promise.reject(e);
      }
    );

    // Navigasi ulang ke halaman produk agar ikut tercatat
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Inventory')?.click();
    await new Promise((r) => setTimeout(r, 1200));
    const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === 'Part Number Data');
    (el?.closest('button, a, li') || el)?.click();
    await new Promise((r) => setTimeout(r, 6000));

    return {
      calls,
      ui: {
        error: /Gagal memuat data produk/.test(document.body.innerText),
        rows: [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length,
        pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
      },
    };
  });
  return trace;
}
