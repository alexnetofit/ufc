import type { Browser } from 'puppeteer-core';

/**
 * Renderiza um HTML completo em PDF usando Chromium headless.
 * Usa @sparticuz/chromium (binário compatível com o runtime serverless da Vercel).
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  let browser: Browser | null = null;

  try {
    const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
      import('@sparticuz/chromium'),
      import('puppeteer-core'),
    ]);

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
