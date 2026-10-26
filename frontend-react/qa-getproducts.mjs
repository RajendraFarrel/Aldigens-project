// Panggil getProducts lewat modul app (axios instance yang sama).
export default async function run(page) {
  return await page.evaluate(async () => {
    try {
      const mod = await import('/src/services/api.js');
      const res = await mod.getProducts('');
      return { ok: true, status: res.status, rows: res.data?.data?.length ?? null, type: typeof res.data };
    } catch (e) {
      return {
        ok: false,
        message: e.message,
        code: e.code,
        status: e.response?.status,
        respData: e.response?.data ? JSON.stringify(e.response.data).slice(0, 300) : null,
        url: e.config?.url,
        baseURL: e.config?.baseURL,
      };
    }
  });
}
