import type { Browser, PDFOptions } from 'puppeteer-core';

export interface GeneratePdfOptions {
  /** Quando definido, usa página com largura/altura customizadas (ex: 16:9) em vez de A4. */
  width?: string;
  height?: string;
}

/**
 * Renderiza um HTML completo em PDF usando Chromium headless.
 * Usa @sparticuz/chromium (binário compatível com o runtime serverless da Vercel).
 */
export async function generatePdfFromHtml(html: string, options: GeneratePdfOptions = {}): Promise<Buffer> {
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

    const pdfOptions: PDFOptions = {
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    };

    if (options.width && options.height) {
      pdfOptions.width = options.width;
      pdfOptions.height = options.height;
    } else {
      pdfOptions.format = 'A4';
    }

    const pdfBuffer = await page.pdf(pdfOptions);
    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
