// Tangkap error runtime halaman (unhandledrejection + error) saat membuka produk.
export default async function run(page) {
  await page.evaluate(() => {
    window.__errs = [];
    window.addEventListener('unhandledrejection', (e) => {
      window.__errs.push('REJECTION: ' + (e.reason?.stack || String(e.reason)).slice(0, 800));
    });
    window.addEventListener('error', (e) => {
      window.__errs.push('ERROR: ' + (e.error?.stack || e.message).slice(0, 800));
    });
  });

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Inventory')?.click();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === 'Part Number Data');
    (el?.closest('button, a, li') || el)?.click();
  });
  await page.waitForTimeout(6000);

  return await page.evaluate(() => ({
    errs: window.__errs,
    error: /Gagal memuat data produk/.test(document.body.innerText),
    rows: [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length,
  }));
}
