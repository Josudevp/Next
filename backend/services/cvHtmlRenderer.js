/**
 * Server-side HTML renderers for all 6 CV templates.
 * Called by the Puppeteer PDF export controller.
 */

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** HTML-escape user data to prevent XSS/injection in the generated HTML. */
function esc(v) {
    return String(v || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function sortByDate(arr) {
    if (!Array.isArray(arr) || !arr.length) return [];
    return [...arr].sort((a, b) => {
        const yA = parseInt((a.dates || '').match(/\d{4}/)?.[0] ?? '0');
        const yB = parseInt((b.dates || '').match(/\d{4}/)?.[0] ?? '0');
        return yB - yA;
    });
}

function normalizeRef(e) {
    if (!e) return null;
    if (typeof e === 'string') return e.trim() ? { name: e.trim() } : null;
    const n = {
        name: e.name || '',
        // Support both new schema (position) and legacy data (relation / role)
        position: e.position || e.relation || e.role || '',
        phone: e.phone || '',
    };
    return Object.values(n).some(Boolean) ? n : null;
}

function getRefs(cv) {
    const norm = (arr) => (Array.isArray(arr) ? arr : []).map(normalizeRef).filter(Boolean);
    return {
        workRefs: norm(cv.workReferences || cv.references?.work),
        personalRefs: norm(cv.personalReferences || cv.references?.personal),
        familyRefs: norm(cv.familyReferences || cv.references?.family),
    };
}

function fmtRef(r) {
    if (!r) return '';
    const main = [r.name, r.position].filter(Boolean).join(' — ');
    return [main, r.phone].filter(Boolean).join(' · ');
}

function getSkills(skills) {
    const t = Array.isArray(skills?.technical) ? skills.technical : [];
    const s = Array.isArray(skills?.soft) ? skills.soft : [];
    return [...new Set([...t, ...s])].filter(Boolean);
}

function getLangs(languages) {
    return Array.isArray(languages)
        ? languages.filter(l => l && (l.language || typeof l === 'string'))
        : [];
}

function langStr(l) {
    return typeof l === 'string' ? l : [l.language, l.level].filter(Boolean).join(' — ');
}

function fixLinkedIn(url) {
    return (url || '').replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/');
}

function fixGithub(url) {
    return (url || '').replace(/https?:\/\/(www\.)?github\.com\//i, 'github.com/');
}

/** Generic person placeholder SVG (used when photo is absent but includePhoto is true) */
const personSvg = (fill, size = 40, opacity = '0.5') =>
    `<svg width="${size}" height="${size}" fill="${fill}" opacity="${opacity}" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;

// ─── Base HTML wrapper ────────────────────────────────────────────────────────
/**
 * Wraps rendered template content in a complete HTML document.
 * Loads Inter + Fira Code from Google Fonts for consistent rendering in Puppeteer.
 */
function wrapHtml(body) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Fira+Code:wght@400;500;600;700&display=swap">
<style>
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@page { size: 8.5in 11in; margin: 0; }
</style>
</head>
<body style="width:816px;background:#fff">${body}</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1.  Harvard Classic  (templateId: francisco)
// ═══════════════════════════════════════════════════════════════════════════════
function renderHarvard(cv, photo) {
    const {
        personalInfo: p = {}, summary,
        education: rawEdu = [], experience: rawExp = [],
        skills = {}, languages = [], includePhoto,
    } = cv;
    const exp = sortByDate(rawExp);
    const edu = sortByDate(rawEdu);
    const allSkills = getSkills(skills);
    const { workRefs, personalRefs, familyRefs } = getRefs(cv);
    const langs = getLangs(languages);

    const contactLine = [
        p.phone, p.email,
        [p.documentType, p.documentNumber].filter(bool => bool).join(' '), fixLinkedIn(p.linkedin), fixGithub(p.github),
        p.portfolio, p.address,
    ].filter(Boolean).join('   ·   ');

    const secHead = (t) =>
        `<div style="border-bottom:1.5px solid #111;margin-top:22px;margin-bottom:8px;padding-bottom:3px"><span style="font-size:9.5pt;font-weight:700;letter-spacing:2px;color:#111">${esc(t)}</span></div>`;

    const entry = (title, subtitle, dates, desc, isProject = false) =>
        `<div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
                <span style="font-size:10.5pt;font-weight:700;color:#111;flex:1">${esc(title)}${isProject ? '<span style="display:inline-block;font-size:6.9pt;margin-left:7px;color:#2563EB;font-weight:600;vertical-align:middle">Proyecto</span>' : ''}</span>
                ${dates ? `<span style="font-size:9pt;color:#666;flex-shrink:0">${esc(dates)}</span>` : ''}
            </div>
            ${subtitle ? `<p style="font-size:9.5pt;color:#555;font-style:italic;margin:3px 0 4px">${esc(subtitle)}</p>` : ''}
            ${desc ? `<p style="font-size:9.5pt;color:#444;line-height:1.65;margin:0">${esc(desc)}</p>` : ''}
        </div>`;

    const photoHtml = includePhoto && photo
        ? `<img src="${photo}" alt="Foto" style="width:108px;height:108px;border-radius:50%;object-fit:cover;flex-shrink:0">`
        : includePhoto
            ? `<div style="width:108px;height:108px;border-radius:50%;background:#E5E7EB;flex-shrink:0;display:flex;align-items:center;justify-content:center">${personSvg('#9CA3AF', 40)}</div>`
            : '';

    const refLines = (refs) =>
        refs.map(r => `<p style="font-size:10pt;color:#333;line-height:1.7;margin:0 0 8px">${esc(fmtRef(r))}</p>`).join('');

    return wrapHtml(`
<div style="padding:5mm 20mm 20mm;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1a1a1a;min-height:11in">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px">
        <div style="flex:1">
            <h1 style="font-size:26pt;font-weight:800;letter-spacing:-0.3px;line-height:1.05;margin:0 0 8px;color:#0a0a0a;text-transform:uppercase">${esc(p.name || '')}</h1>
            ${p.title ? `<p style="font-size:11pt;color:#555;margin:2px 0 0;font-style:italic;letter-spacing:0.2px">${esc(p.title)}</p>` : ''}
        </div>
        ${photoHtml}
    </div>
    <hr style="border:none;border-top:2px solid #111;margin:16px 0 8px">
    ${contactLine ? `<p style="font-size:9pt;color:#444;margin:6px 0 0;letter-spacing:0.3px;line-height:1.7">${esc(contactLine)}</p>` : ''}
    ${summary ? `${secHead('PERFIL PROFESIONAL')}<p style="font-size:10.5pt;color:#333;line-height:1.7;margin:8px 0 0">${esc(summary)}</p>` : ''}
    ${exp.length ? `${secHead('EXPERIENCIA LABORAL')}<div style="margin-top:8px">${exp.map(e => entry(e.position || e.title || '', e.company, e.dates, e.description, e.projectLabel)).join('')}</div>` : ''}
    ${edu.length ? `${secHead('EDUCACIÓN')}<div style="margin-top:8px">${edu.map(e => entry(e.degree || '', e.institution, e.dates, e.description)).join('')}</div>` : ''}
    ${allSkills.length ? `${secHead('HABILIDADES')}<p style="font-size:10.5pt;color:#333;line-height:1.7;margin:8px 0 0">${esc(allSkills.join('  ·  '))}</p>` : ''}
    ${langs.length ? `${secHead('IDIOMAS')}<p style="font-size:10.5pt;color:#333;line-height:1.7;margin:8px 0 0">${esc(langs.map(langStr).join('   ·   '))}</p>` : ''}
    ${workRefs.length ? `${secHead('REFERENCIAS LABORALES')}<div style="margin-top:8px">${refLines(workRefs)}</div>` : ''}
    ${personalRefs.length ? `${secHead('REFERENCIAS PERSONALES')}<div style="margin-top:8px">${refLines(personalRefs)}</div>` : ''}
    ${familyRefs.length ? `${secHead('REFERENCIAS FAMILIARES')}<div style="margin-top:8px">${refLines(familyRefs)}</div>` : ''}
</div>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2.  Modern Blue  (templateId: daniel)
// ═══════════════════════════════════════════════════════════════════════════════
function renderModernBlue(cv, photo) {
    const {
        personalInfo: p = {}, summary,
        education: rawEdu = [], experience: rawExp = [],
        skills = {}, languages = [], includePhoto,
    } = cv;
    const exp = sortByDate(rawExp);
    const edu = sortByDate(rawEdu);
    const allSkills = getSkills(skills);
    const { workRefs, personalRefs, familyRefs } = getRefs(cv);
    const langs = getLangs(languages);
    const SIDEBAR_W = 272;

    const contactItems = [
        { icon: '&#9990;', value: p.phone },
        { icon: '&#9993;', value: p.email },
        { icon: '&#128196;', value: [p.documentType, p.documentNumber].filter(Boolean).join(' ') },
        { icon: 'in', value: fixLinkedIn(p.linkedin) },
        { icon: 'gh', value: fixGithub(p.github) },
        { icon: '&#127760;', value: p.portfolio },
        { icon: '&#128205;', value: p.address },
    ].filter(i => i.value);

    const sideHead = (t) =>
        `<div style="margin-top:20px;margin-bottom:10px;padding-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.2)"><span style="font-size:8.5pt;font-weight:700;letter-spacing:2.5px;color:#fff;text-transform:uppercase">${esc(t)}</span></div>`;

    const bodyHead = (t) =>
        `<div style="margin-top:22px;margin-bottom:10px;padding-bottom:4px;border-bottom:2px solid #436696"><span style="font-size:9.5pt;font-weight:700;letter-spacing:2px;color:#436696;text-transform:uppercase">${esc(t)}</span></div>`;

    const photoHtml = includePhoto && photo
        ? `<div style="text-align:center;margin-bottom:18px"><img src="${photo}" alt="Foto" style="width:128px;height:128px;border-radius:50%;object-fit:cover;border:3px solid #fff;display:inline-block"></div>`
        : includePhoto
            ? `<div style="text-align:center;margin-bottom:18px"><div style="width:128px;height:128px;border-radius:50%;background:rgba(255,255,255,0.15);border:3px solid #fff;display:inline-flex;align-items:center;justify-content:center">${personSvg('rgba(255,255,255,0.5)', 44)}</div></div>`
            : '';

    const expEntry = (e) =>
        `<div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
                <span style="font-size:9.5pt;font-weight:700;color:#111;flex:1">${esc(e.position || e.title || '')}${e.projectLabel ? '<span style="font-size:6.9pt;margin-left:6px;color:#3B82F6;font-weight:600">Proyecto</span>' : ''}</span>
                ${e.dates ? `<span style="font-size:8.5pt;color:#888;flex-shrink:0">${esc(e.dates)}</span>` : ''}
            </div>
            ${e.company ? `<p style="font-size:9.5pt;color:#436696;font-weight:500;margin:2px 0 4px">${esc(e.company)}</p>` : ''}
            ${e.description ? `<p style="font-size:9.5pt;color:#555;line-height:1.65;margin:0">${esc(e.description)}</p>` : ''}
        </div>`;

    const eduEntry = (e) =>
        `<div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
                <span style="font-size:10.5pt;font-weight:700;color:#111;flex:1">${esc(e.degree || '')}</span>
                ${e.dates ? `<span style="font-size:8.5pt;color:#888;flex-shrink:0">${esc(e.dates)}</span>` : ''}
            </div>
            ${e.institution ? `<p style="font-size:9.5pt;color:#436696;font-weight:500;margin:2px 0 4px">${esc(e.institution)}</p>` : ''}
            ${e.description ? `<p style="font-size:9.5pt;color:#555;line-height:1.65;margin:0">${esc(e.description)}</p>` : ''}
        </div>`;

    return wrapHtml(`
<div style="display:flex;min-height:11in;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1a1a1a">
    <div style="width:${SIDEBAR_W}px;flex-shrink:0;background:#436696;color:#fff;padding:28px 22px;display:flex;flex-direction:column">
        ${photoHtml}
        ${contactItems.length ? `${sideHead('Contacto')}
        <div style="display:flex;flex-direction:column;gap:8px">
            ${contactItems.map(i => `<div style="display:flex;align-items:flex-start;gap:8px"><span style="margin-top:2px;flex-shrink:0;opacity:0.7;font-size:10px">${i.icon}</span><span style="font-size:9pt;color:rgba(255,255,255,0.85);line-height:1.5;word-break:break-word">${esc(i.value)}</span></div>`).join('')}
        </div>` : ''}
        ${allSkills.length ? `${sideHead('Habilidades')}
        <div style="display:flex;flex-direction:column;gap:6px">
            ${allSkills.map(sk => `<div style="display:flex;align-items:center;gap:8px"><div style="width:5px;height:5px;border-radius:50%;background:#3B82F6;flex-shrink:0"></div><span style="font-size:9pt;color:rgba(255,255,255,0.85);line-height:1.4">${esc(sk)}</span></div>`).join('')}
        </div>` : ''}
        ${langs.length ? `${sideHead('Idiomas')}
        <div style="display:flex;flex-direction:column;gap:6px">
            ${langs.map(l => `<div style="display:flex;align-items:center;gap:8px"><div style="width:5px;height:5px;border-radius:50%;background:#60A5FA;flex-shrink:0"></div><span style="font-size:9pt;color:rgba(255,255,255,0.85);line-height:1.4">${esc(langStr(l))}</span></div>`).join('')}
        </div>` : ''}
    </div>
    <div style="flex:1;background:#fff;padding:28px;display:flex;flex-direction:column">
        <div>
            <h1 style="font-size:24pt;font-weight:800;color:#436696;margin:0;line-height:1.1;letter-spacing:-0.3px">${esc(p.name || '')}</h1>
            ${p.title ? `<p style="font-size:10.5pt;color:#3B82F6;margin:6px 0 0;font-weight:500;letter-spacing:0.3px">${esc(p.title)}</p>` : ''}
        </div>
        ${summary ? `${bodyHead('Perfil Profesional')}<p style="font-size:10.5pt;color:#444;line-height:1.7;margin:0">${esc(summary)}</p>` : ''}
        ${exp.length ? `${bodyHead('Experiencia Laboral')}<div style="display:flex;flex-direction:column;gap:14px">${exp.map(expEntry).join('')}</div>` : ''}
        ${edu.length ? `${bodyHead('Educación')}<div style="display:flex;flex-direction:column;gap:14px">${edu.map(eduEntry).join('')}</div>` : ''}
        ${workRefs.length ? `${bodyHead('Referencias Laborales')}<div style="display:flex;flex-direction:column;gap:10px">${workRefs.map(r => `<p style="font-size:9.3pt;color:#555;line-height:1.65;margin:0">${esc(fmtRef(r))}</p>`).join('')}</div>` : ''}
        ${personalRefs.length ? `${bodyHead('Referencias Personales')}<div style="display:flex;flex-direction:column;gap:10px">${personalRefs.map(r => `<p style="font-size:9.3pt;color:#555;line-height:1.65;margin:0">${esc(fmtRef(r))}</p>`).join('')}</div>` : ''}
        ${familyRefs.length ? `${bodyHead('Referencias Familiares')}<div style="display:flex;flex-direction:column;gap:10px">${familyRefs.map(r => `<p style="font-size:9.3pt;color:#555;line-height:1.65;margin:0">${esc(fmtRef(r))}</p>`).join('')}</div>` : ''}
    </div>
</div>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3.  Tech Dev  (templateId: murad)
// ═══════════════════════════════════════════════════════════════════════════════
function renderTech(cv, photo) {
    const {
        personalInfo: p = {}, summary,
        education: rawEdu = [], experience: rawExp = [],
        skills = {}, languages = [], includePhoto,
    } = cv;
    const exp = sortByDate(rawExp);
    const edu = sortByDate(rawEdu);
    const allSkills = getSkills(skills);
    const { workRefs, personalRefs, familyRefs } = getRefs(cv);
    const langs = getLangs(languages);

    const ACCENT = '#16A34A';
    const MONO = "'Fira Code','Courier New',monospace";

    const contactParts = [
        p.phone, p.email,
        [p.documentType, p.documentNumber].filter(bool => bool).join(' '), fixLinkedIn(p.linkedin), fixGithub(p.github),
        p.portfolio, p.address,
    ].filter(Boolean);

    const secHead = (t) =>
        `<div style="display:flex;align-items:center;gap:8px;margin:22px 0 10px">
            <span style="font-family:${MONO};font-size:10pt;color:${ACCENT};font-weight:700;line-height:1">&gt;</span>
            <span style="font-family:${MONO};font-size:7.5pt;font-weight:700;color:#111;letter-spacing:2.5px;text-transform:uppercase">${esc(t)}</span>
            <div style="flex:1;height:1px;background:#BBF7D0"></div>
        </div>`;

    const expEntry = (e) =>
        `<div style="padding-left:14px;border-left:2px solid #D1FAE5;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
                <span style="font-size:10.5pt;font-weight:700;color:#111;flex:1">${esc(e.position || e.title || '')}${e.projectLabel ? `<span style="font-family:${MONO};font-size:7pt;margin-left:7px;color:${ACCENT}">proyecto</span>` : ''}</span>
                ${e.dates ? `<span style="font-family:${MONO};font-size:8pt;color:#888;flex-shrink:0">${esc(e.dates)}</span>` : ''}
            </div>
            ${e.company ? `<p style="font-family:${MONO};font-size:9pt;color:${ACCENT};font-weight:500;margin:2px 0 4px">@ ${esc(e.company)}</p>` : ''}
            ${e.description ? `<p style="font-size:9.5pt;color:#555;line-height:1.65;margin:0">${esc(e.description)}</p>` : ''}
        </div>`;

    const eduEntry = (e) =>
        `<div style="padding-left:14px;border-left:2px solid #D1FAE5;margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
                <span style="font-size:10.5pt;font-weight:700;color:#111;flex:1">${esc(e.degree || '')}</span>
                ${e.dates ? `<span style="font-family:${MONO};font-size:8pt;color:#888;flex-shrink:0">${esc(e.dates)}</span>` : ''}
            </div>
            ${e.institution ? `<p style="font-family:${MONO};font-size:9pt;color:${ACCENT};font-weight:500;margin:2px 0">@ ${esc(e.institution)}</p>` : ''}
            ${e.description ? `<p style="font-size:9.5pt;color:#555;line-height:1.65;margin:0">${esc(e.description)}</p>` : ''}
        </div>`;

    const photoHtml = includePhoto && photo
        ? `<img src="${photo}" alt="Foto" style="width:110px;height:110px;border-radius:8px;object-fit:cover;border:2px solid ${ACCENT};flex-shrink:0;margin-right:8px">`
        : includePhoto
            ? `<div style="width:110px;height:110px;border-radius:8px;background:#D1FAE5;border:2px solid ${ACCENT};flex-shrink:0;margin-right:8px;display:flex;align-items:center;justify-content:center">${personSvg(ACCENT, 40)}</div>`
            : '';

    return wrapHtml(`
<div style="display:flex;min-height:11in;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1a1a1a">
    <div style="width:5px;flex-shrink:0;background:${ACCENT}"></div>
    <div style="flex:1;background:#fff;padding:32px 80px 44px 62px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px">
            <div style="flex:1">
                <h1 style="font-family:${MONO};font-size:27pt;font-weight:700;color:#0a0a0a;margin:0;line-height:1.05;letter-spacing:-0.5px">${esc(p.name || '')}</h1>
                ${p.title ? `<p style="font-family:${MONO};font-size:10.5pt;color:${ACCENT};margin:5px 0 0;font-weight:500">// ${esc(p.title)}</p>` : ''}
                ${contactParts.length ? `<p style="font-size:8.5pt;color:#666;margin:10px 0 0;line-height:1.7">${esc(contactParts.join(' · '))}</p>` : ''}
            </div>
            ${photoHtml}
        </div>
        <div style="height:1.5px;background:#D1FAE5;margin:18px 0"></div>
        ${summary ? `${secHead('Perfil Profesional')}<p style="font-size:9.5pt;color:#444;line-height:1.7">${esc(summary)}</p>` : ''}
        ${allSkills.length ? `${secHead('Stack & Habilidades')}<p style="font-size:9.5pt;color:#444;line-height:1.7;font-family:${MONO}">${esc(allSkills.join(' · '))}</p>` : ''}
        ${exp.length ? `${secHead('Experiencia Laboral')}<div style="display:flex;flex-direction:column;gap:16px">${exp.map(expEntry).join('')}</div>` : ''}
        ${edu.length ? `${secHead('Educación')}<div style="display:flex;flex-direction:column;gap:14px">${edu.map(eduEntry).join('')}</div>` : ''}
        ${langs.length ? `${secHead('Idiomas')}<p style="font-size:9.5pt;color:#444;line-height:1.7">${esc(langs.map(langStr).join('   ·   '))}</p>` : ''}
        ${workRefs.length ? `${secHead('Referencias Laborales')}<div style="display:flex;flex-direction:column;gap:8px">${workRefs.map(r => `<p style="font-size:9pt;color:#444;line-height:1.7;margin:0;font-family:${MONO}">${esc(fmtRef(r))}</p>`).join('')}</div>` : ''}
        ${personalRefs.length ? `${secHead('Referencias Personales')}<div style="display:flex;flex-direction:column;gap:8px">${personalRefs.map(r => `<p style="font-size:9pt;color:#444;line-height:1.7;margin:0;font-family:${MONO}">${esc(fmtRef(r))}</p>`).join('')}</div>` : ''}
        ${familyRefs.length ? `${secHead('Referencias Familiares')}<div style="display:flex;flex-direction:column;gap:8px">${familyRefs.map(r => `<p style="font-size:9pt;color:#444;line-height:1.7;margin:0;font-family:${MONO}">${esc(fmtRef(r))}</p>`).join('')}</div>` : ''}
    </div>
</div>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4.  Executive Teal  (templateId: jordi)
// ═══════════════════════════════════════════════════════════════════════════════
function renderExecutive(cv, photo) {
    const {
        personalInfo: p = {}, summary,
        education: rawEdu = [], experience: rawExp = [],
        skills = {}, languages = [], includePhoto,
    } = cv;
    const exp = sortByDate(rawExp);
    const edu = sortByDate(rawEdu);
    const allSkills = getSkills(skills);
    const { workRefs, personalRefs, familyRefs } = getRefs(cv);
    const langs = getLangs(languages);

    const ACCENT = '#1E5F5F';
    const SERIF = "'Georgia','Times New Roman',serif";

    const contactLine = [
        p.phone, p.email,
        [p.documentType, p.documentNumber].filter(bool => bool).join(' '), fixLinkedIn(p.linkedin), fixGithub(p.github),
        p.portfolio, p.address,
    ].filter(Boolean).join('  ·  ');

    const secHead = (t) =>
        `<div style="display:flex;align-items:center;gap:14px;margin:24px 0 12px">
            <div style="flex:1;height:1px;background:${ACCENT};opacity:0.35"></div>
            <span style="font-family:${SERIF};font-size:8.5pt;font-weight:700;color:${ACCENT};letter-spacing:3px;text-transform:uppercase">${esc(t)}</span>
            <div style="flex:1;height:1px;background:${ACCENT};opacity:0.35"></div>
        </div>`;

    const entry = (title, subtitle, dates, desc) =>
        `<div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
                <span style="font-family:${SERIF};font-size:10.5pt;font-weight:700;color:#1a1a1a;flex:1">${esc(title)}</span>
                ${dates ? `<span style="font-family:${SERIF};font-size:8.5pt;color:#888;flex-shrink:0;font-style:italic">${esc(dates)}</span>` : ''}
            </div>
            ${subtitle ? `<p style="font-family:${SERIF};font-size:9.5pt;color:${ACCENT};font-style:italic;margin:2px 0 5px">${esc(subtitle)}</p>` : ''}
            ${desc ? `<p style="font-family:${SERIF};font-size:9.5pt;color:#555;line-height:1.75;margin:0">${esc(desc)}</p>` : ''}
        </div>`;

    const photoHtml = includePhoto && photo
        ? `<img src="${photo}" alt="Foto" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:2px solid ${ACCENT};display:inline-block;margin-bottom:14px">`
        : includePhoto
            ? `<div style="width:120px;height:120px;border-radius:50%;background:#E5E7EB;border:2px solid ${ACCENT};display:inline-flex;align-items:center;justify-content:center;margin-bottom:14px">${personSvg('#9CA3AF', 36)}</div>`
            : '';

    return wrapHtml(`
<div style="font-family:${SERIF};background:#FAFAF7;color:#1a1a1a;min-height:11in">
    <div style="height:5px;background:${ACCENT}"></div>
    <div style="padding:36px 80px 48px">
        <div style="text-align:center;margin-bottom:24px">
            ${photoHtml}
            <h1 style="font-family:${SERIF};font-size:28pt;font-weight:400;color:#111;margin:0;letter-spacing:4px;text-transform:uppercase;line-height:1.1">${esc(p.name || '')}</h1>
            ${p.title ? `<p style="font-family:${SERIF};font-size:10.5pt;color:${ACCENT};margin:8px 0 0;font-style:italic;letter-spacing:1.5px">${esc(p.title)}</p>` : ''}
            ${contactLine ? `<p style="font-size:7.5pt;color:#777;margin:10px 0 0;letter-spacing:0.5px;line-height:1.8">${esc(contactLine)}</p>` : ''}
        </div>
        <div style="border-top:2px solid ${ACCENT};padding-top:4px">
            <div style="height:1px;background:${ACCENT};opacity:0.3"></div>
        </div>
        ${summary ? `${secHead('Perfil Profesional')}<p style="font-family:${SERIF};font-size:9.5pt;color:#444;line-height:1.8;text-align:justify">${esc(summary)}</p>` : ''}
        ${exp.length ? `${secHead('Experiencia Laboral')}${exp.map(e => entry(e.position || e.title || '', e.company, e.dates, e.description)).join('')}` : ''}
        ${edu.length ? `${secHead('Educación')}${edu.map(e => entry(e.degree || '', e.institution, e.dates, e.description)).join('')}` : ''}
        ${allSkills.length ? `${secHead('Competencias')}<p style="font-family:${SERIF};font-size:9.5pt;color:#444;line-height:1.8;text-align:center">${esc(allSkills.join('   ·   '))}</p>` : ''}
        ${langs.length ? `${secHead('Idiomas')}<p style="font-family:${SERIF};font-size:9.5pt;color:#444;line-height:1.8;text-align:center">${esc(langs.map(langStr).join('   ·   '))}</p>` : ''}
        ${workRefs.length ? `${secHead('Referencias Laborales')}${workRefs.map(r => `<p style="font-family:${SERIF};font-size:9.3pt;color:#444;line-height:1.8;text-align:center;margin:0 0 6px">${esc(fmtRef(r))}</p>`).join('')}` : ''}
        ${personalRefs.length ? `${secHead('Referencias Personales')}${personalRefs.map(r => `<p style="font-family:${SERIF};font-size:9.3pt;color:#444;line-height:1.8;text-align:center;margin:0 0 6px">${esc(fmtRef(r))}</p>`).join('')}` : ''}
        ${familyRefs.length ? `${secHead('Referencias Familiares')}${familyRefs.map(r => `<p style="font-family:${SERIF};font-size:9.3pt;color:#444;line-height:1.8;text-align:center;margin:0 0 6px">${esc(fmtRef(r))}</p>`).join('')}` : ''}
        <div style="height:3px;background:${ACCENT};opacity:0.4;margin-top:36px"></div>
    </div>
</div>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5.  Creative Blue  (templateId: andrea)
// ═══════════════════════════════════════════════════════════════════════════════
function renderCreative(cv, photo) {
    const {
        personalInfo: p = {}, summary,
        education: rawEdu = [], experience: rawExp = [],
        skills = {}, languages = [], includePhoto,
    } = cv;
    const exp = sortByDate(rawExp);
    const edu = sortByDate(rawEdu);
    const allSkills = getSkills(skills);
    const { workRefs, personalRefs, familyRefs } = getRefs(cv);
    const langs = getLangs(languages);

    const ACCENT = '#2596BE';
    const DARK_ACCENT = '#1F6F8B';

    const contactLine = [
        p.phone, p.email,
        [p.documentType, p.documentNumber].filter(bool => bool).join(' '), fixLinkedIn(p.linkedin), fixGithub(p.github),
        p.portfolio, p.address,
    ].filter(Boolean).join('  ·  ');

    const colHead = (t) =>
        `<div style="font-size:7.5pt;font-weight:700;letter-spacing:2.5px;color:${ACCENT};text-transform:uppercase;border-bottom:2px solid ${ACCENT};padding-bottom:4px;margin-bottom:10px">${esc(t)}</div>`;

    const expEntry = (title, company, dates, description) =>
        `<div style="margin-bottom:14px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:6px">
                <span style="font-size:9.5pt;font-weight:700;color:#111;flex:1">${esc(title)}</span>
                ${dates ? `<span style="font-size:7.5pt;color:#888;flex-shrink:0">${esc(dates)}</span>` : ''}
            </div>
            ${company ? `<p style="font-size:8.5pt;color:${DARK_ACCENT};font-weight:600;margin:2px 0 3px">${esc(company)}</p>` : ''}
            ${description ? `<p style="font-size:8.5pt;color:#555;line-height:1.65;margin:0">${esc(description)}</p>` : ''}
        </div>`;

    const refEntry = (r) =>
        `<div style="margin-bottom:10px">
            <p style="font-size:8.8pt;color:#111;font-weight:700;margin:0">${esc(r.name || 'Referencia')}</p>
            ${r.position ? `<p style="font-size:8.2pt;color:${DARK_ACCENT};margin:2px 0 3px;font-weight:600">${esc(r.position)}</p>` : ''}
            ${r.phone ? `<p style="font-size:8.2pt;color:#555;margin:0;line-height:1.55">${esc(r.phone)}</p>` : ''}
        </div>`;

    const photoHtml = includePhoto && photo
        ? `<img src="${photo}" alt="Foto" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:3px solid ${ACCENT};flex-shrink:0">`
        : includePhoto
            ? `<div style="width:120px;height:120px;border-radius:50%;background:rgba(0,0,0,0.06);border:3px solid ${ACCENT};flex-shrink:0;display:flex;align-items:center;justify-content:center">${personSvg(ACCENT, 36)}</div>`
            : '';

    return wrapHtml(`
<div style="background:#fff;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1a1a1a;min-height:11in">
    <div style="background:#E9F6FB;padding:26px 36px;display:flex;align-items:center;gap:24px">
        ${photoHtml}
        <div style="flex:1">
            <h1 style="font-size:26pt;font-weight:800;color:#1a1a1a;margin:0;line-height:1.1;letter-spacing:-0.3px">${esc(p.name || '')}</h1>
            ${p.title ? `<p style="font-size:10.5pt;color:${DARK_ACCENT};margin:5px 0 0;font-weight:600;letter-spacing:0.5px">${esc(p.title)}</p>` : ''}
            ${contactLine ? `<p style="font-size:7.5pt;color:#555;margin:8px 0 0;line-height:1.7">${esc(contactLine)}</p>` : ''}
        </div>
    </div>
    <div style="display:flex;padding:24px 60px 36px;gap:28px">
        <div style="flex:0 0 57%">
            ${exp.length ? `<div style="margin-bottom:22px">${colHead('Experiencia')}${exp.map(e => expEntry(e.position || e.title || '', e.company, e.dates, e.description)).join('')}</div>` : ''}
            ${edu.length ? `<div>${colHead('Educación')}${edu.map(e => expEntry(e.degree || '', e.institution, e.dates, e.description)).join('')}</div>` : ''}
        </div>
        <div style="flex:1">
            ${summary ? `<div style="margin-bottom:22px">${colHead('Perfil')}<p style="font-size:8.5pt;color:#444;line-height:1.7">${esc(summary)}</p></div>` : ''}
            ${allSkills.length ? `<div style="margin-bottom:22px">${colHead('Habilidades')}<p style="font-size:8.5pt;color:#555;line-height:1.7;margin:0">${esc(allSkills.join(' · '))}</p></div>` : ''}
            ${langs.length ? `<div>${colHead('Idiomas')}<div style="display:flex;flex-direction:column;gap:4px">${langs.map(l => `<p style="font-size:8.5pt;color:#444;margin:0;line-height:1.6">${esc(langStr(l))}</p>`).join('')}</div></div>` : ''}
            ${workRefs.length ? `<div style="margin-top:22px">${colHead('Referencias Laborales')}${workRefs.map(refEntry).join('')}</div>` : ''}
            ${personalRefs.length ? `<div style="margin-top:22px">${colHead('Referencias Personales')}${personalRefs.map(refEntry).join('')}</div>` : ''}
            ${familyRefs.length ? `<div style="margin-top:22px">${colHead('Referencias Familiares')}${familyRefs.map(refEntry).join('')}</div>` : ''}
        </div>
    </div>
</div>`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6.  Corporate / Right Sidebar  (templateId: carlos)
// ═══════════════════════════════════════════════════════════════════════════════
function renderCorporate(cv, photo) {
    const {
        personalInfo: p = {}, summary,
        education: rawEdu = [], experience: rawExp = [],
        skills = {}, languages = [], includePhoto,
    } = cv;
    const exp = sortByDate(rawExp);
    const edu = sortByDate(rawEdu);
    const allSkills = getSkills(skills);
    const { workRefs, personalRefs, familyRefs } = getRefs(cv);
    const langs = getLangs(languages);

    const SIDEBAR_BG = '#1E293B';
    const SIDEBAR_W = 268;
    const ACCENT = '#94A3B8';
    const BODY_ACCENT = '#334155';

    const contactItems = [
        p.phone, p.email,
        [p.documentType, p.documentNumber].filter(bool => bool).join(' '), fixLinkedIn(p.linkedin), fixGithub(p.github),
        p.portfolio, p.address,
    ].filter(Boolean);

    const sideHead = (t) =>
        `<p style="font-size:7pt;font-weight:700;letter-spacing:2px;color:${ACCENT};text-transform:uppercase;margin:18px 0 6px;border-bottom:1px solid rgba(148,163,184,0.3);padding-bottom:4px">${esc(t)}</p>`;

    const mainHead = (t) =>
        `<p style="font-size:7.5pt;font-weight:700;letter-spacing:2px;color:${BODY_ACCENT};text-transform:uppercase;margin:22px 0 10px;border-bottom:1.5px solid ${BODY_ACCENT};padding-bottom:4px">${esc(t)}</p>`;

    const mainEntry = (title, subtitle, dates, desc) =>
        `<div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
                <span style="font-size:10.5pt;font-weight:700;color:#111;flex:1">${esc(title)}</span>
                ${dates ? `<span style="font-size:8pt;color:#888;flex-shrink:0">${esc(dates)}</span>` : ''}
            </div>
            ${subtitle ? `<p style="font-size:9pt;color:${BODY_ACCENT};font-weight:600;margin:2px 0 4px">${esc(subtitle)}</p>` : ''}
            ${desc ? `<p style="font-size:9.5pt;color:#555;line-height:1.65;margin:0">${esc(desc)}</p>` : ''}
        </div>`;

    const photoHtml = includePhoto && photo
        ? `<div style="text-align:center;margin-bottom:20px"><img src="${photo}" alt="Foto" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.25);display:inline-block"></div>`
        : includePhoto
            ? `<div style="text-align:center;margin-bottom:20px"><div style="width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,0.08);border:3px solid rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center">${personSvg('rgba(255,255,255,0.35)', 40)}</div></div>`
            : '';

    return wrapHtml(`
<div style="display:flex;min-height:11in;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#1a1a1a">
    <div style="flex:1;background:#fff;padding:36px 36px 48px 40px;min-width:0">
        <h1 style="font-size:28pt;font-weight:800;color:#111;margin:0 0 10px;line-height:1.05;letter-spacing:-0.5px">${esc(p.name || '')}</h1>
        ${p.title ? `<p style="font-size:11pt;color:${BODY_ACCENT};margin:6px 0 0;font-weight:500;letter-spacing:0.3px">${esc(p.title)}</p>` : ''}
        <div style="height:2px;background:${BODY_ACCENT};margin-top:20px"></div>
        ${summary ? `${mainHead('Perfil Profesional')}<p style="font-size:9.5pt;color:#444;line-height:1.75">${esc(summary)}</p>` : ''}
        ${exp.length ? `${mainHead('Experiencia Laboral')}${exp.map(e => mainEntry(e.position || e.title || '', e.company, e.dates, e.description)).join('')}` : ''}
        ${edu.length ? `${mainHead('Educación')}${edu.map(e => mainEntry(e.degree || '', e.institution, e.dates, e.description)).join('')}` : ''}
        ${workRefs.length ? `${mainHead('Referencias Laborales')}${workRefs.map(r => `<p style="font-size:8.9pt;color:#555;line-height:1.65;margin:0 0 10px">${esc(fmtRef(r))}</p>`).join('')}` : ''}
        ${personalRefs.length ? `${mainHead('Referencias Personales')}${personalRefs.map(r => `<p style="font-size:8.9pt;color:#555;line-height:1.65;margin:0 0 10px">${esc(fmtRef(r))}</p>`).join('')}` : ''}
        ${familyRefs.length ? `${mainHead('Referencias Familiares')}${familyRefs.map(r => `<p style="font-size:8.9pt;color:#555;line-height:1.65;margin:0 0 10px">${esc(fmtRef(r))}</p>`).join('')}` : ''}
    </div>
    <div style="width:${SIDEBAR_W}px;flex-shrink:0;background:${SIDEBAR_BG};padding:32px 22px 48px;color:#E2E8F0">
        ${photoHtml}
        ${contactItems.length ? `${sideHead('Contacto')}<div style="display:flex;flex-direction:column;gap:5px">${contactItems.map(c => `<p style="font-size:8pt;color:#CBD5E1;line-height:1.5;margin:0;word-break:break-all">${esc(c)}</p>`).join('')}</div>` : ''}
        ${allSkills.length ? `${sideHead('Habilidades')}<div style="display:flex;flex-direction:column;gap:5px">${allSkills.map(sk => `<div style="display:flex;align-items:center;gap:7px"><div style="width:4px;height:4px;border-radius:50%;background:${ACCENT};flex-shrink:0"></div><span style="font-size:8.5pt;color:#CBD5E1">${esc(sk)}</span></div>`).join('')}</div>` : ''}
        ${langs.length ? `${sideHead('Idiomas')}<div style="display:flex;flex-direction:column;gap:5px">${langs.map(l => `<p style="font-size:8.5pt;color:#CBD5E1;margin:0;line-height:1.5">${esc(langStr(l))}</p>`).join('')}</div>` : ''}
    </div>
</div>`);
}

// ─── Dispatch table ──────────────────────────────────────────────────────────
const RENDERERS = {
    francisco: renderHarvard,
    daniel: renderModernBlue,
    murad: renderTech,
    jordi: renderExecutive,
    andrea: renderCreative,
    carlos: renderCorporate,
};

/**
 * @param {object} cvData     - The full CV data object from the frontend.
 * @param {string} templateId - One of: francisco | daniel | murad | jordi | andrea | carlos.
 * @param {string|null} profilePicture - Base64 data URL for the profile photo, or null.
 * @returns {string} Complete HTML document ready for Puppeteer.
 */
export function renderCvHtml(cvData, templateId, profilePicture) {
    const renderer = RENDERERS[templateId] ?? RENDERERS.francisco;
    return renderer(cvData, profilePicture || null);
}
