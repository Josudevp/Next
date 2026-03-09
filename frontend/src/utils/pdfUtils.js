/**
 * Shared PDF export utilities for CV templates.
 */

/**
 * Fixes profile images in a cloned DOM element so that html2canvas renders
 * them with proper "object-fit: cover" behavior (which html2canvas v1 ignores).
 * Replaces each <img> src with a pre-drawn canvas data URL cropped to the
 * element's rendered dimensions.
 *
 * @param {HTMLElement} container - The cloned DOM element to process.
 */
export async function fixProfileImages(container) {
    // html2canvas is called with scale:2, so we must render at 2× CSS dimensions
    // to avoid the captured image being upscaled (and therefore blurry).
    const EXPORT_SCALE = 2;

    const imgs = Array.from(container.querySelectorAll('img'));
    for (const img of imgs) {
        if (!img.src) continue;
        try {
            await new Promise((resolve) => {
                const loader = new Image();
                loader.crossOrigin = 'anonymous';
                loader.onload = () => {
                    const w = img.offsetWidth  || parseInt(img.style.width)  || 110;
                    const h = img.offsetHeight || parseInt(img.style.height) || 110;
                    if (!w || !h || !loader.naturalWidth || !loader.naturalHeight) {
                        resolve();
                        return;
                    }
                    // Canvas at 2× CSS size so html2canvas (scale:2) gets a 1:1 pixel match
                    const cw = w * EXPORT_SCALE;
                    const ch = h * EXPORT_SCALE;
                    const cvs = document.createElement('canvas');
                    cvs.width  = cw;
                    cvs.height = ch;
                    const ctx = cvs.getContext('2d');
                    // Simulate object-fit: cover + object-position: center at 2× resolution
                    const scale = Math.max(cw / loader.naturalWidth, ch / loader.naturalHeight);
                    const sw = loader.naturalWidth  * scale;
                    const sh = loader.naturalHeight * scale;
                    const ox = (sw - cw) / 2;
                    const oy = (sh - ch) / 2;
                    ctx.drawImage(loader, -ox, -oy, sw, sh);
                    img.src = cvs.toDataURL('image/png');
                    resolve();
                };
                loader.onerror = () => resolve();
                loader.src = img.src;
            });
        } catch {
            // Silently skip images that can't be processed
        }
    }
}

/**
 * Sorts an array of CV entries (education / experience) in descending order
 * by the start year extracted from the "dates" field (e.g. "2020 - 2024" → 2020).
 *
 * @param {Array} arr - Array of entry objects with a `.dates` string property.
 * @returns {Array} New sorted array (original is not mutated).
 */
export function sortByDateDesc(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return arr;
    return [...arr].sort((a, b) => {
        const yearA = parseInt((a.dates || '').match(/\d{4}/)?.[0] ?? '0');
        const yearB = parseInt((b.dates || '').match(/\d{4}/)?.[0] ?? '0');
        return yearB - yearA;
    });
}

function normalizeReferenceEntry(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') {
        const trimmed = entry.trim();
        return trimmed ? { name: trimmed } : null;
    }

    const normalized = {
        name: entry.name || '',
        relation: entry.relation || entry.role || '',
        company: entry.company || '',
        phone: entry.phone || '',
        email: entry.email || '',
    };

    return Object.values(normalized).some(Boolean) ? normalized : null;
}

function normalizeReferenceGroup(group) {
    if (!Array.isArray(group)) return [];
    return group.map(normalizeReferenceEntry).filter(Boolean);
}

export function normalizeReferenceGroups(cvData = {}) {
    return {
        workReferences: normalizeReferenceGroup(cvData.workReferences || cvData.references?.work),
        personalReferences: normalizeReferenceGroup(cvData.personalReferences || cvData.references?.personal),
    };
}

export function formatReferenceLine(reference) {
    if (!reference) return '';

    const main = [reference.name, reference.relation || reference.company].filter(Boolean).join(' — ');
    const contact = [reference.phone, reference.email].filter(Boolean).join(' · ');

    return [main, contact].filter(Boolean).join(' · ');
}

export function openCvPrint(onAfterPrint) {
    document.body.classList.add('cv-print-mode');

    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        document.body.classList.remove('cv-print-mode');
        window.removeEventListener('afterprint', finish);
        onAfterPrint?.();
    };

    // afterprint fires when the print dialog closes (cancel or print)
    window.addEventListener('afterprint', finish);
    // Safety: clean up after 2 min in case afterprint never fires
    setTimeout(finish, 120_000);

    requestAnimationFrame(() => window.print());
}
