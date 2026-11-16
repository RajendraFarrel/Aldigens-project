export default async function run(page) {
  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="text"]', { timeout: 20000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('admin@aldigens.co.id');
  await inputs.nth(1).fill('password');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  return page.evaluate(() => ({
    token: localStorage.getItem('auth_token'),
    user: localStorage.getItem('auth_user'),
    tab: localStorage.getItem('aldigens_active_tab'),
    h1: document.querySelector('h1')?.innerText || null,
    h2: [...document.querySelectorAll('h2')].map((x) => x.innerText),
    body: document.body.innerText.slice(0, 700),
  }));
}
