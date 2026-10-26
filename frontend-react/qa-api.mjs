// Cek panggilan API langsung dari browser (sesi login).
export default async function run(page) {
  return await page.evaluate(async () => {
    const t = localStorage.getItem('auth_token');
    const out = {};
    try {
      const r = await fetch('http://127.0.0.1:8000/api/inventory/products', {
        headers: { Authorization: 'Bearer ' + t, Accept: 'application/json' },
      });
      const j = await r.json().catch(() => null);
      out.products = { status: r.status, rows: j?.data?.length ?? null, cors: r.headers.get('access-control-allow-origin') };
    } catch (e) {
      out.products = { error: String(e) };
    }
    out.origin = window.location.origin;
    out.tokenLen = t ? t.length : 0;
    return out;
  });
}
