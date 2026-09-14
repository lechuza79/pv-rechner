/** Read public DOM content in an isolated browser; no form submission or arbitrary server-side eval. */
export async function renderContactPage(url: string): Promise<string> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route('**/*', route => ['image','media','font'].includes(route.request().resourceType()) ? route.abort() : route.continue());
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });
    await page.waitForFunction(() => !/email hidden; JavaScript is required/i.test(document.body.innerText) && !document.querySelector("hrencrypted"), { }, { timeout: 4000 });
    return await page.content();
  } finally { await browser.close(); }
}
