import puppeteer from 'puppeteer';
import { renderCvHtml } from '../services/cvHtmlRenderer.js';

/**
 * POST /api/export/pdf
 * Body: { cvData: object, templateId: string, profilePicture: string|null }
 * Returns: application/pdf binary stream (triggers browser file-save dialog).
 *
 * Uses a headless Chromium instance (bundled with puppeteer) to render the
 * pure-HTML template and export an exact A4/Letter PDF — fully independent
 * of the user's browser or device. Works on Android, iOS, and desktop.
 */
export const exportCvPdf = async (req, res) => {
    const { cvData, templateId, profilePicture } = req.body;

    if (!cvData || typeof cvData !== 'object') {
        return res.status(400).json({ error: 'cvData es requerido y debe ser un objeto.' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                // On Linux containers (Render) /dev/shm may be small; use /tmp instead
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--disable-extensions',
                '--disable-background-networking',
                '--disable-default-apps',
                '--mute-audio',
                '--disable-sync',
                '--disable-translate',
                '--hide-scrollbars',
            ],
        });

        const page = await browser.newPage();

        // Set viewport to match Letter width (816px @ 96dpi = 8.5in)
        await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 1 });

        // Render HTML string for the requested template
        const html = renderCvHtml(
            cvData,
            templateId || 'francisco',
            profilePicture || null,
        );

        // waitUntil: 'networkidle0' ensures Google Fonts have finished loading
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,         // Render background colors/images
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });

        // Build a safe ASCII filename from the person's name
        const safeName = (cvData.personalInfo?.name || 'MiCV')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '_') || 'MiCV';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="CV_${safeName}.pdf"`);
        // Expose header so browsers can read it cross-origin (needed for Blob download)
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (err) {
        console.error('[exportCvPdf] Error generando PDF:', err.message);
        res.status(500).json({ error: 'No se pudo generar el PDF. Intenta de nuevo.' });
    } finally {
        // Always close the browser instance to free memory
        await browser?.close();
    }
};
