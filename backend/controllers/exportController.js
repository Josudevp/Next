import { getBrowser } from '../services/browserPool.js';
import { renderCvHtml } from '../services/cvHtmlRenderer.js';

/**
 * POST /api/export/pdf
 * Body: { cvData: object, templateId: string, profilePicture: string|null }
 * Returns: application/pdf binary stream.
 *
 * Uses a shared Chromium instance (browserPool) so launch cost (~4 s) is
 * paid only once at server startup, not on every download request.
 */
export const exportCvPdf = async (req, res) => {
    const { cvData, templateId, profilePicture } = req.body;

    if (!cvData || typeof cvData !== 'object') {
        return res.status(400).json({ error: 'cvData es requerido y debe ser un objeto.' });
    }

    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();

        // Render HTML string for the requested template
        const html = renderCvHtml(
            cvData,
            templateId || 'francisco',
            profilePicture || null,
        );

        // Usar 'load' (no 'networkidle0') para evitar bloqueos por peticiones en segundo plano.
        // Toleramos timeouts para no devolver código 500 si la red de Render va lenta.
        await page.setContent(html, { waitUntil: 'load', timeout: 15_000 }).catch(err => {
            console.warn('[exportCvPdf] Aviso de timeout en setContent, continuando...', err.message);
        });

        // Esperar explícitamente a que las fuentes de Google terminen de cargar.
        await page.evaluateHandle('document.fonts.ready').catch(() => {});

        const pdfBuffer = await page.pdf({
            format: 'Letter',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });

        // Build a safe ASCII filename from the person's name
        const safeName = (cvData.personalInfo?.name || 'MiCV')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .trim();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="CV_${safeName}.pdf"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);
    } catch (err) {
        console.error('[exportCvPdf] Error generando PDF:', err);
        res.status(500).json({ error: 'No se pudo generar el PDF. Intenta de nuevo.' });
    } finally {
        // Close only the page (tab), never the shared browser
        await page?.close();
    }
};
