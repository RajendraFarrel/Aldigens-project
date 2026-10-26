// Cek apakah modul terbaru termuat & status tombol Refresh.
export default async function run(page) {
  const info = await page.evaluate(async () => {
    const src = await fetch('/src/pages/InventoryProducts.jsx').then((r) => r.text());
    return {
      hasNewLog: src.includes('[fetchProducts] start'),
      srcLen: src.length,
      btns: [...document.querySelectorAll('button')].map((b) => b.textContent.split(/\s+/).join(' ').trim()).filter((t) => t && t.length < 40).slice(0, 15),
      refresh: !!document.querySelector('button[title="Refresh"]'),
      bodyHead: document.body.innerText.split('\n').filter(Boolean).slice(0, 12),
    };
  });
  return info;
}
