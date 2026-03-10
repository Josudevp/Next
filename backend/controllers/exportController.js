import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { renderCvHtml } from '../services/cvHtmlRenderer.js';

/**
 * POST /api/export/pdf
 * Body: { cvData: object, templateId: string, profilePicture: string|null }
 * Returns: application/pdf binary stream.
 *
 * Uses @sparticuz/chromium — a stripped, statically-linked Chromium binary
 * compiled for Linux containers (Render, Lambda, etc.) — so no system-level
 * Chrome installation or shared library dependencies are needed.
 */
export const exportCvPdf = async (req, res) => {
    const { cvData, templateId, profilePicture } = req.body;

    if (!cvData || typeof cvData !== 'object') {
        return res.status(400).json({ error: 'cvData es requerido y debe ser un objeto.' });
    }

    let browser;
    try {
        browser = await puppeteer.launch({
            // @sparticuz/chromium provides a pre-set optimised args list and
            // the path to its bundled Chromium binary — no system Chrome needed.
            args: chromium.args,
            defaultViewport: { width: 816, height: 1056, deviceScaleFactor: 1 },
            executablePath: await chromium.executablePath(),
            headless: true,
        });

        const page = await browser.newPage();

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
        console.error('[exportCvPdf] Error generando PDF:', err);
        res.status(500).json({ error: 'No se pudo generar el PDF. Intenta de nuevo.' });
    } finally {
        // Always close the browser instance to free memory
        await browser?.close();
    }
};
