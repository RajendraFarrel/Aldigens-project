const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
const user = { id: 1, name: 'admin', email: 'admin@aldigens.co.id', role: 'Administrator', role_name: 'Administrator', permissions: [] };

export default async function run(page) {
  const hits = [];
  const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });

  await page.route('**/api/**', (route) => {
    const req = route.request();
    hits.push({ m: req.method(), u: req.url() });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    if (req.url().includes('/api/login')) return json(route, { token: 'qa-token', user });
    if (req.url().includes('/api/me')) return json(route, { data: user, user, permissions: [] });
    return json(route, { data: [] });
  });

  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type="text"]', { timeout: 20000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('admin@aldigens.co.id');
  await inputs.nth(1).fill('password');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5000);

  return page.evaluate(() => ({
    token: localStorage.getItem('auth_token'),
    user: localStorage.getItem('auth_user'),
    h2: [...document.querySelectorAll('h2')].map((x) => x.innerText),
    body: document.body.innerText.slice(0, 400),
  })).then((state) => ({ state, hits }));
}
