// Login via UI (step 1) — tunggu sampai dashboard muncul.
export default async function run(page, ui) {
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);
  const snap = await ui.snapshot();
  const boxes = [...snap.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  if (boxes.length < 2) return { error: 'no login form', snap };
  await ui.fill('@' + boxes[0], 'admin@aldigens.co.id');
  await ui.fill('@' + boxes[1], 'password');
  await ui.click('@e7').catch(() => { });
  await page.waitForTimeout(9000);
  return {
    token: await page.evaluate(() => !!localStorage.getItem('auth_token')),
    body: (await page.evaluate(() => document.body.innerText)).slice(0, 300),
  };
}
