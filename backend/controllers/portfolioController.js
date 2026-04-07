import User from '../models/User.js';

// ── XSS-safe escaping ─────────────────────────────────────────────────────────
const esc = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

// ── Safely sanitize URLs (only allow http/https/mailto) ───────────────────────
const safeUrl = (url) => {
    if (!url) return '#';
    const trimmed = String(url).trim();
    if (/^(https?:\/\/|mailto:)/i.test(trimmed)) return esc(trimmed);
    if (/^[^:/?#]+$/.test(trimmed)) return '#'; // relative-ish, skip
    return '#';
};

// ── Format date range ─────────────────────────────────────────────────────────
const dateRange = (start, end) => {
    const s = start ? esc(start) : '';
    const e = end ? esc(end) : 'Presente';
    if (!s && !e) return '';
    if (!s) return e;
    return `${s} — ${e}`;
};

// ── Badge HTML ────────────────────────────────────────────────────────────────
const badge = (text, cls = '') =>
    `<span class="badge ${cls}">${esc(text)}</span>`;

// ── Icon SVGs (inline, no external dependency) ───────────────────────────────
const ICONS = {
    email: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.64 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    location: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
    github: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.2c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
    portfolio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
    work: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    edu: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 10-8-4L2 10l10 5 10-5z"/><path d="m6 12v4c3 3 9 3 12 0v-4"/></svg>`,
    project: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    lang: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>`,
};

// ── Portfolio Templates ───────────────────────────────────────────────────────

// Template 2 — Emerald Split: clean white bg, green accent, two-column hero
const _tplEmeraldSplit = ({ displayName, displayTitle, displaySummary, initials, photoSrc, personalInfo, navLinks, experienceSection, educationSection, skillsSection, projectsSection, languagesSection, contactSection }) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Portfolio profesional de ${displayName}" />
  <title>Portfolio — ${displayName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --accent: #059669; --accent-dk: #047857; --accent-lt: #ECFDF5; --accent-mid: #D1FAE5;
      --dark: #064E3B; --text: #1C1917; --gray: #6B7280;
      --bg: #F9FAFB; --white: #FFFFFF; --border: #D1FAE5;
      --radius: 12px; --shadow: 0 2px 16px rgba(6,78,59,.08);
      --font: 'Inter', system-ui, sans-serif;
    }
    html { scroll-behavior: smooth; }
    body { font-family: var(--font); color: var(--text); background: var(--bg); -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }
    svg { display: inline-block; }
    .navbar { position: sticky; top: 0; z-index: 100; background: var(--white); border-bottom: 2px solid var(--accent); padding: 0 clamp(1rem,5vw,3rem); display: flex; align-items: center; justify-content: space-between; height: 60px; }
    .navbar-brand { font-weight: 900; font-size: 1.15rem; color: var(--dark); letter-spacing: -.4px; }
    .navbar-brand span { color: var(--accent); }
    .navbar-links { display: flex; gap: 1.75rem; }
    .navbar-links a { font-size: .875rem; font-weight: 600; color: var(--gray); transition: color .2s; }
    .navbar-links a:hover { color: var(--accent); }
    .hero { background: var(--white); border-bottom: 1px solid var(--accent-mid); padding: clamp(4rem,10vw,7rem) clamp(1rem,5vw,3rem); }
    .hero-inner { max-width: 920px; margin: 0 auto; display: grid; grid-template-columns: 1fr auto; gap: 3rem; align-items: center; animation: fadeUp .7s ease both; }
    .hero-label { font-size: .8rem; text-transform: uppercase; letter-spacing: 2px; color: var(--accent); font-weight: 700; margin-bottom: .75rem; }
    .hero-name { font-size: clamp(2.5rem,6vw,4rem); font-weight: 900; color: var(--text); letter-spacing: -.6px; line-height: 1.0; margin-bottom: .6rem; }
    .hero-line { width: 60px; height: 4px; background: var(--accent); border-radius: 4px; margin: .75rem 0 1rem; }
    .hero-title { font-size: 1.2rem; color: var(--accent); font-weight: 600; margin-bottom: 1rem; }
    .hero-summary { font-size: 1rem; color: var(--gray); line-height: 1.8; max-width: 500px; margin-bottom: 2rem; }
    .hero-cta { display: flex; gap: .75rem; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: .5rem; padding: .7rem 1.6rem; border-radius: var(--radius); font-size: .875rem; font-weight: 700; transition: all .2s; cursor: pointer; }
    .btn-primary { background: var(--accent); color: white; }
    .btn-primary:hover { background: var(--accent-dk); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(5,150,105,.3); }
    .btn-outline { border: 2px solid var(--accent); color: var(--accent); }
    .btn-outline:hover { background: var(--accent-lt); transform: translateY(-1px); }
    .hero-avatar { width: 200px; height: 200px; border-radius: 20px; object-fit: cover; box-shadow: 0 20px 60px rgba(6,78,59,.18); border: 3px solid var(--accent-mid); }
    .hero-initials { width: 200px; height: 200px; border-radius: 20px; background: linear-gradient(135deg, var(--accent) 0%, #34D399 100%); display: flex; align-items: center; justify-content: center; font-size: 4rem; font-weight: 900; color: white; box-shadow: 0 20px 60px rgba(5,150,105,.3); }
    .section { padding: clamp(3.5rem,8vw,6rem) clamp(1rem,5vw,3rem); background: var(--bg); }
    .section-alt { background: var(--white); }
    .section-inner { max-width: 900px; margin: 0 auto; }
    .section-header { display: flex; align-items: center; gap: .75rem; margin-bottom: 2.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--accent-mid); }
    .section-icon { width: 38px; height: 38px; border-radius: 10px; background: var(--accent-lt); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .section-icon svg { width: 18px; height: 18px; }
    .section-header h2 { font-size: clamp(1.3rem,4vw,1.75rem); font-weight: 800; color: var(--dark); letter-spacing: -.3px; }
    .card { background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); border-left: 4px solid var(--accent); padding: 1.5rem; box-shadow: var(--shadow); animation: fadeUp .5s ease both; animation-delay: calc(var(--i,0) * .08s); }
    .section-alt .card { background: var(--bg); }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 1.25rem; }
    .timeline { display: flex; flex-direction: column; }
    .timeline-item { display: grid; grid-template-columns: 20px 1fr; gap: 0 1.25rem; padding-bottom: 1.75rem; position: relative; animation: fadeUp .5s ease both; animation-delay: calc(var(--i,0) * .1s); }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-item:last-child::before { display: none; }
    .timeline-item::before { content: ''; position: absolute; left: 9px; top: 20px; bottom: 0; width: 2px; background: var(--accent-mid); }
    .timeline-dot { width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid var(--accent-lt); margin-top: 14px; flex-shrink: 0; z-index: 1; }
    .timeline-content { flex: 1; }
    .entry-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: .5rem; }
    .entry-title { font-size: 1rem; font-weight: 700; color: var(--dark); }
    .entry-sub { font-size: .875rem; color: var(--gray); margin-top: .2rem; }
    .entry-date { font-size: .78rem; font-weight: 600; color: var(--accent); background: var(--accent-lt); padding: .25rem .75rem; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
    .entry-desc { font-size: .875rem; color: var(--gray); line-height: 1.75; margin-top: .75rem; }
    .skills-group { margin-bottom: 1.5rem; }
    .skills-label { font-size: .75rem; font-weight: 700; color: var(--gray); text-transform: uppercase; letter-spacing: 1px; margin-bottom: .75rem; }
    .badge-row { display: flex; flex-wrap: wrap; gap: .5rem; }
    .badge { padding: .35rem .9rem; border-radius: 8px; font-size: .8rem; font-weight: 600; }
    .badge-tech { background: var(--accent-lt); color: var(--accent); border: 1px solid var(--accent-mid); }
    .badge-soft { background: #FFF7ED; color: #C2410C; border: 1px solid #FED7AA; }
    .project-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; margin-bottom: .5rem; }
    .project-link { font-size: .8rem; font-weight: 700; color: var(--accent); white-space: nowrap; flex-shrink: 0; }
    .project-link:hover { text-decoration: underline; }
    .lang-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
    .lang-card { display: flex; flex-direction: column; gap: .25rem; min-width: 140px; padding: 1rem 1.25rem; }
    .lang-name { font-size: .95rem; font-weight: 700; color: var(--dark); }
    .lang-level { font-size: .8rem; color: var(--gray); }
    .contact-section { background: linear-gradient(135deg, #064E3B 0%, #059669 50%, #047857 100%); text-align: center; padding: clamp(3.5rem,8vw,6rem) clamp(1rem,5vw,3rem); }
    .contact-title { font-size: clamp(1.75rem,5vw,2.5rem); font-weight: 900; color: white; margin-bottom: .75rem; }
    .contact-sub { color: rgba(255,255,255,.7); margin-bottom: 2.5rem; font-size: 1rem; }
    .contact-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
    .contact-item { display: inline-flex; align-items: center; gap: .625rem; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); color: white; border-radius: 999px; padding: .65rem 1.4rem; font-size: .875rem; font-weight: 500; transition: all .2s; }
    a.contact-item:hover { background: rgba(255,255,255,.2); transform: translateY(-2px); }
    .contact-icon { width: 16px; height: 16px; display: flex; flex-shrink: 0; }
    .contact-icon svg { width: 16px; height: 16px; }
    .footer { text-align: center; padding: 1.75rem 1rem; border-top: 2px solid var(--accent-mid); font-size: .78rem; color: var(--gray); background: var(--white); }
    .footer a { color: var(--accent); }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 640px) { .navbar-links { display: none; } .hero-inner { grid-template-columns: 1fr; } .hero-avatar, .hero-initials { width: 100px; height: 100px; font-size: 2.2rem; margin: 0 auto; } }
    @media (max-width: 480px) { .cards-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <nav class="navbar">
    <span class="navbar-brand">${displayName.split(' ')[0] || 'Portfolio'}<span>.</span></span>
    <div class="navbar-links">${navLinks}</div>
  </nav>
  <section class="hero">
    <div class="hero-inner">
      <div>
        <p class="hero-label">Portafolio Profesional</p>
        <h1 class="hero-name">${displayName}</h1>
        <div class="hero-line"></div>
        ${displayTitle ? `<p class="hero-title">${displayTitle}</p>` : ''}
        ${displaySummary ? `<p class="hero-summary">${displaySummary}</p>` : ''}
        <div class="hero-cta">
          ${personalInfo.email ? `<a href="mailto:${esc(personalInfo.email)}" class="btn btn-primary">Contactar</a>` : ''}
          ${personalInfo.linkedin ? `<a href="${safeUrl(personalInfo.linkedin)}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">LinkedIn</a>` : ''}
          ${personalInfo.github ? `<a href="${safeUrl(personalInfo.github)}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''}
        </div>
      </div>
      <div>
        ${photoSrc ? `<img src="${photoSrc}" alt="Foto de ${displayName}" class="hero-avatar" />` : `<div class="hero-initials">${initials}</div>`}
      </div>
    </div>
  </section>
  ${experienceSection}
  ${educationSection}
  ${skillsSection}
  ${projectsSection}
  ${languagesSection}
  ${contactSection}
  <footer class="footer">
    <p>Portfolio generado con <a href="https://next-col.online" target="_blank" rel="noopener noreferrer">NEXT</a> &mdash; ${new Date().getFullYear()}</p>
  </footer>
</body>
</html>`;

// Template 3 — Midnight Dark: full dark theme, cyan neon accents, glassmorphism
const _tplMidnightDark = ({ displayName, displayTitle, displaySummary, initials, photoSrc, personalInfo, navLinks, experienceSection, educationSection, skillsSection, projectsSection, languagesSection, contactSection }) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Portfolio profesional de ${displayName}" />
  <title>Portfolio — ${displayName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --accent: #38BDF8; --accent-dk: #0EA5E9; --accent-lt: rgba(56,189,248,.12); --glow: rgba(56,189,248,.4);
      --bg: #0D1117; --bg2: #161B22; --bg3: #21262D;
      --text: #E6EDF3; --dim: #8B949E; --border: rgba(255,255,255,.08);
      --radius: 14px; --font: 'Inter', system-ui, sans-serif;
    }
    html { scroll-behavior: smooth; }
    body { font-family: var(--font); color: var(--text); background: var(--bg); -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }
    svg { display: inline-block; }
    .navbar { position: sticky; top: 0; z-index: 100; background: rgba(13,17,23,.85); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); padding: 0 clamp(1rem,5vw,3rem); display: flex; align-items: center; justify-content: space-between; height: 60px; }
    .navbar-brand { font-weight: 800; font-size: 1.1rem; color: var(--text); letter-spacing: -.3px; }
    .navbar-brand span { color: var(--accent); }
    .navbar-links { display: flex; gap: 1.75rem; }
    .navbar-links a { font-size: .875rem; font-weight: 500; color: var(--dim); transition: color .2s; }
    .navbar-links a:hover { color: var(--accent); }
    .hero { min-height: 100svh; display: flex; align-items: center; justify-content: center; background: var(--bg); position: relative; overflow: hidden; padding: clamp(4rem,10vw,8rem) clamp(1rem,5vw,3rem); text-align: center; }
    .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(56,189,248,.15) 0%, transparent 70%); }
    .hero-glow { position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(56,189,248,.06) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); pointer-events: none; }
    .hero-content { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; animation: fadeUp .7s ease both; }
    .hero-avatar { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 1.75rem; border: 2px solid var(--accent); object-fit: cover; box-shadow: 0 0 40px var(--glow); }
    .hero-initials { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 1.75rem; background: linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%); display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 800; color: var(--bg); border: 2px solid var(--accent); box-shadow: 0 0 40px var(--glow); }
    .hero-name { font-size: clamp(2.2rem,6vw,3.8rem); font-weight: 900; background: linear-gradient(135deg, #E6EDF3 0%, var(--accent) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; line-height: 1.05; letter-spacing: -.5px; margin-bottom: .75rem; }
    .hero-title { font-size: clamp(1rem,2.5vw,1.2rem); color: var(--accent); font-weight: 500; margin-bottom: 1.5rem; letter-spacing: .5px; }
    .hero-summary { font-size: clamp(.9rem,2vw,1rem); color: var(--dim); line-height: 1.85; max-width: 560px; margin: 0 auto 2.5rem; }
    .hero-cta { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .btn { display: inline-flex; align-items: center; gap: .5rem; padding: .75rem 1.75rem; border-radius: var(--radius); font-size: .9rem; font-weight: 600; transition: all .2s; cursor: pointer; }
    .btn-primary { background: var(--accent); color: var(--bg); font-weight: 700; }
    .btn-primary:hover { background: var(--accent-dk); box-shadow: 0 0 24px var(--glow); transform: translateY(-1px); }
    .btn-outline { border: 1.5px solid rgba(56,189,248,.4); color: var(--accent); background: rgba(56,189,248,.06); }
    .btn-outline:hover { border-color: var(--accent); background: rgba(56,189,248,.12); transform: translateY(-1px); }
    .section { padding: clamp(3.5rem,8vw,6rem) clamp(1rem,5vw,3rem); background: var(--bg); }
    .section-alt { background: var(--bg2); }
    .section-inner { max-width: 860px; margin: 0 auto; }
    .section-header { display: flex; align-items: center; gap: .75rem; margin-bottom: 2.5rem; }
    .section-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--accent-lt); color: var(--accent); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(56,189,248,.2); }
    .section-icon svg { width: 20px; height: 20px; }
    .section-header h2 { font-size: clamp(1.4rem,4vw,1.9rem); font-weight: 800; color: var(--text); letter-spacing: -.3px; }
    .card { background: rgba(255,255,255,.04); border-radius: var(--radius); border: 1px solid var(--border); padding: 1.5rem; backdrop-filter: blur(8px); animation: fadeUp .5s ease both; animation-delay: calc(var(--i,0) * .08s); transition: border-color .2s; }
    .card:hover { border-color: rgba(56,189,248,.3); }
    .section-alt .card { background: rgba(255,255,255,.03); }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap: 1.25rem; }
    .timeline { display: flex; flex-direction: column; }
    .timeline-item { display: grid; grid-template-columns: 20px 1fr; gap: 0 1.25rem; padding-bottom: 1.75rem; position: relative; animation: fadeUp .5s ease both; animation-delay: calc(var(--i,0) * .1s); }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-item:last-child::before { display: none; }
    .timeline-item::before { content: ''; position: absolute; left: 9px; top: 20px; bottom: 0; width: 2px; background: rgba(56,189,248,.2); }
    .timeline-dot { width: 20px; height: 20px; border-radius: 50%; background: var(--accent); border: 3px solid var(--bg); margin-top: 14px; flex-shrink: 0; z-index: 1; box-shadow: 0 0 8px var(--glow); }
    .timeline-content { flex: 1; }
    .entry-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: .5rem; }
    .entry-title { font-size: 1rem; font-weight: 700; color: var(--text); }
    .entry-sub { font-size: .875rem; color: var(--dim); margin-top: .2rem; }
    .entry-date { font-size: .78rem; font-weight: 500; color: var(--accent); background: var(--accent-lt); padding: .25rem .75rem; border-radius: 999px; white-space: nowrap; flex-shrink: 0; border: 1px solid rgba(56,189,248,.2); }
    .entry-desc { font-size: .875rem; color: var(--dim); line-height: 1.75; margin-top: .75rem; }
    .skills-group { margin-bottom: 1.5rem; }
    .skills-label { font-size: .75rem; font-weight: 700; color: var(--dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: .75rem; }
    .badge-row { display: flex; flex-wrap: wrap; gap: .5rem; }
    .badge { padding: .35rem .9rem; border-radius: 999px; font-size: .8rem; font-weight: 600; }
    .badge-tech { background: rgba(56,189,248,.12); color: var(--accent); border: 1px solid rgba(56,189,248,.25); }
    .badge-soft { background: rgba(52,211,153,.1); color: #34D399; border: 1px solid rgba(52,211,153,.25); }
    .project-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; margin-bottom: .5rem; }
    .project-link { font-size: .8rem; font-weight: 600; color: var(--accent); white-space: nowrap; flex-shrink: 0; }
    .project-link:hover { text-decoration: underline; }
    .lang-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
    .lang-card { display: flex; flex-direction: column; gap: .25rem; min-width: 140px; padding: 1rem 1.25rem; }
    .lang-name { font-size: .95rem; font-weight: 700; color: var(--text); }
    .lang-level { font-size: .8rem; color: var(--dim); }
    .contact-section { background: linear-gradient(135deg, #0D1117 0%, #161B22 50%, #0D1117 100%); border-top: 1px solid rgba(56,189,248,.15); text-align: center; padding: clamp(3.5rem,8vw,6rem) clamp(1rem,5vw,3rem); position: relative; overflow: hidden; }
    .contact-section::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 60% at 50% 100%, rgba(56,189,248,.1) 0%, transparent 70%); }
    .contact-title { font-size: clamp(1.75rem,5vw,2.5rem); font-weight: 900; color: var(--text); margin-bottom: .75rem; position: relative; }
    .contact-sub { color: var(--dim); margin-bottom: 2.5rem; font-size: 1rem; position: relative; }
    .contact-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; position: relative; }
    .contact-item { display: inline-flex; align-items: center; gap: .625rem; background: rgba(56,189,248,.08); border: 1px solid rgba(56,189,248,.2); color: var(--text); border-radius: 999px; padding: .65rem 1.4rem; font-size: .875rem; font-weight: 500; transition: all .2s; }
    a.contact-item:hover { background: rgba(56,189,248,.15); border-color: var(--accent); box-shadow: 0 0 16px var(--glow); transform: translateY(-2px); }
    .contact-icon { width: 16px; height: 16px; display: flex; flex-shrink: 0; }
    .contact-icon svg { width: 16px; height: 16px; }
    .footer { text-align: center; padding: 1.75rem 1rem; border-top: 1px solid var(--border); font-size: .78rem; color: var(--dim); background: var(--bg); }
    .footer a { color: var(--accent); }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 640px) { .navbar-links { display: none; } .hero-cta { flex-direction: column; align-items: center; } }
    @media (max-width: 480px) { .cards-grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <nav class="navbar">
    <span class="navbar-brand">${displayName.split(' ')[0] || 'Portfolio'}<span>.</span></span>
    <div class="navbar-links">${navLinks}</div>
  </nav>
  <section class="hero">
    <div class="hero-glow"></div>
    <div class="hero-content">
      ${photoSrc ? `<img src="${photoSrc}" alt="Foto de ${displayName}" class="hero-avatar" />` : `<div class="hero-initials">${initials}</div>`}
      <h1 class="hero-name">${displayName}</h1>
      ${displayTitle ? `<p class="hero-title">${displayTitle}</p>` : ''}
      ${displaySummary ? `<p class="hero-summary">${displaySummary}</p>` : ''}
      <div class="hero-cta">
        ${personalInfo.email ? `<a href="mailto:${esc(personalInfo.email)}" class="btn btn-primary">Contactar</a>` : ''}
        ${personalInfo.linkedin ? `<a href="${safeUrl(personalInfo.linkedin)}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">LinkedIn</a>` : ''}
        ${personalInfo.github ? `<a href="${safeUrl(personalInfo.github)}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">GitHub</a>` : ''}
      </div>
    </div>
  </section>
  ${experienceSection}
  ${educationSection}
  ${skillsSection}
  ${projectsSection}
  ${languagesSection}
  ${contactSection}
  <footer class="footer">
    <p>Portfolio generado con <a href="https://next-col.online" target="_blank" rel="noopener noreferrer">NEXT</a> &mdash; ${new Date().getFullYear()}</p>
  </footer>
</body>
</html>`;

// Template 4 — Sidebar: dark fixed left sidebar, scrollable right content
const _tplSidebar = ({ displayName, displayTitle, displaySummary, initials, photoSrc, personalInfo, experience, education, techSkills, softSkills, projects, validLangs, contactItems }) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Portfolio profesional de ${displayName}" />
  <title>Portfolio — ${displayName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --sb-bg: #1A1F2E; --sb-border: rgba(255,255,255,.08); --sb-text: rgba(255,255,255,.85);
      --sb-muted: rgba(255,255,255,.45); --accent: #10B981; --accent-dk: #059669;
      --main-bg: #F9FAFB; --white: #FFFFFF; --text: #111827; --gray: #6B7280;
      --border: #E5E7EB; --radius: 10px;
      --font: 'Inter', system-ui, sans-serif;
    }
    html, body { height: 100%; }
    html { scroll-behavior: smooth; }
    body { font-family: var(--font); -webkit-font-smoothing: antialiased; display: flex; min-height: 100vh; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }
    svg { display: inline-block; }
    /* ── Sidebar ── */
    .sidebar { width: 280px; min-width: 280px; background: var(--sb-bg); display: flex; flex-direction: column; padding: 2.5rem 1.75rem; gap: 2rem; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
    .sb-photo { width: 90px; height: 90px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); margin-bottom: .5rem; }
    .sb-initials { width: 90px; height: 90px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 900; color: white; margin-bottom: .5rem; }
    .sb-name { font-size: 1.1rem; font-weight: 800; color: white; line-height: 1.2; }
    .sb-title { font-size: .78rem; color: var(--accent); font-weight: 600; margin-top: .3rem; }
    .sb-divider { height: 1px; background: var(--sb-border); margin: -.5rem 0; }
    .sb-section-label { font-size: .65rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--sb-muted); font-weight: 700; margin-bottom: .75rem; }
    .sb-contact-list { display: flex; flex-direction: column; gap: .6rem; }
    .sb-contact-item { display: flex; align-items: center; gap: .6rem; color: var(--sb-text); font-size: .78rem; word-break: break-all; }
    .sb-contact-item svg { width: 14px; height: 14px; flex-shrink: 0; color: var(--accent); }
    .sb-contact-item a { color: var(--sb-text); transition: color .2s; }
    .sb-contact-item a:hover { color: var(--accent); }
    .sb-skills { display: flex; flex-wrap: wrap; gap: .4rem; }
    .sb-badge { font-size: .7rem; font-weight: 600; padding: .2rem .65rem; border-radius: 6px; background: rgba(16,185,129,.15); color: var(--accent); border: 1px solid rgba(16,185,129,.25); }
    .sb-badge-soft { background: rgba(255,255,255,.07); color: var(--sb-text); border: 1px solid var(--sb-border); }
    .sb-langs { display: flex; flex-direction: column; gap: .5rem; }
    .sb-lang { display: flex; justify-content: space-between; font-size: .78rem; color: var(--sb-text); }
    .sb-lang span:last-child { color: var(--sb-muted); }
    /* ── Main content ── */
    .main { flex: 1; min-width: 0; background: var(--main-bg); padding: 3rem clamp(1.5rem,4vw,3.5rem); overflow-y: auto; }
    .main-hero { margin-bottom: 3rem; border-bottom: 2px solid var(--border); padding-bottom: 2.5rem; }
    .main-name { font-size: clamp(2rem,5vw,3rem); font-weight: 900; color: #0F172A; letter-spacing: -.5px; line-height: 1.05; }
    .main-title { font-size: 1rem; color: var(--accent); font-weight: 600; margin-top: .4rem; margin-bottom: 1rem; }
    .main-summary { font-size: .95rem; color: var(--gray); line-height: 1.8; max-width: 600px; }
    .section-block { margin-bottom: 3rem; }
    .section-label { font-size: .7rem; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; color: var(--accent); margin-bottom: 1.25rem; }
    .section-title { font-size: 1.3rem; font-weight: 800; color: #0F172A; margin-bottom: 1.5rem; padding-bottom: .75rem; border-bottom: 2px solid var(--border); }
    .entry { padding: 1.25rem; background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: .875rem; transition: border-color .2s, box-shadow .2s; }
    .entry:hover { border-color: var(--accent); box-shadow: 0 4px 16px rgba(16,185,129,.1); }
    .entry-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: .35rem; }
    .entry-title { font-size: .95rem; font-weight: 700; color: #0F172A; }
    .entry-sub { font-size: .82rem; color: var(--gray); margin-top: .15rem; }
    .entry-date { font-size: .75rem; font-weight: 600; color: var(--accent); background: #ECFDF5; padding: .2rem .65rem; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
    .entry-desc { font-size: .85rem; color: var(--gray); line-height: 1.75; margin-top: .6rem; }
    .entry-tags { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .75rem; }
    .entry-tag { font-size: .72rem; font-weight: 600; padding: .2rem .6rem; border-radius: 6px; background: #F0FDF4; color: var(--accent-dk); border: 1px solid #D1FAE5; }
    .edu-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); gap: .875rem; }
    /* ── Responsive ── */
    @media (max-width: 768px) { body { flex-direction: column; } .sidebar { width: 100%; min-width: 0; height: auto; position: static; flex-direction: row; flex-wrap: wrap; padding: 1.5rem; gap: 1.5rem; } .sb-block { min-width: 140px; flex: 1; } .sb-photo, .sb-initials { width: 60px; height: 60px; font-size: 1.3rem; } }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="sb-block" style="display:flex;align-items:center;gap:1rem;">
      ${photoSrc ? `<img src="${photoSrc}" alt="Foto de ${displayName}" class="sb-photo" />` : `<div class="sb-initials">${initials}</div>`}
      <div><p class="sb-name">${displayName}</p>${displayTitle ? `<p class="sb-title">${displayTitle}</p>` : ''}</div>
    </div>
    <div class="sb-divider"></div>
    ${contactItems.length > 0 ? `
    <div class="sb-block">
      <p class="sb-section-label">Contacto</p>
      <div class="sb-contact-list">
        ${contactItems.map(c => `<div class="sb-contact-item">${c.icon}${c.href ? `<a href="${c.href}" target="${c.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer">${c.label}</a>` : `<span>${c.label}</span>`}</div>`).join('')}
      </div>
    </div>` : ''}
    ${techSkills.length > 0 ? `
    <div class="sb-block">
      <p class="sb-section-label">Habilidades Técnicas</p>
      <div class="sb-skills">${techSkills.map(s => `<span class="sb-badge">${esc(s)}</span>`).join('')}</div>
    </div>` : ''}
    ${softSkills.length > 0 ? `
    <div class="sb-block">
      <p class="sb-section-label">Habilidades Blandas</p>
      <div class="sb-skills">${softSkills.map(s => `<span class="sb-badge sb-badge-soft">${esc(s)}</span>`).join('')}</div>
    </div>` : ''}
    ${validLangs.length > 0 ? `
    <div class="sb-block">
      <p class="sb-section-label">Idiomas</p>
      <div class="sb-langs">${validLangs.map(l => { const name = typeof l === 'string' ? l : (l.language || ''); const level = typeof l === 'object' ? (l.level || '') : ''; return `<div class="sb-lang"><span>${esc(name)}</span>${level ? `<span>${esc(level)}</span>` : ''}</div>`; }).join('')}</div>
    </div>` : ''}
  </aside>
  <main class="main">
    <div class="main-hero">
      <h1 class="main-name">${displayName}</h1>
      ${displayTitle ? `<p class="main-title">${displayTitle}</p>` : ''}
      ${displaySummary ? `<p class="main-summary">${displaySummary}</p>` : ''}
    </div>
    ${experience.length > 0 ? `
    <div id="experience" class="section-block">
      <p class="section-label">Trayectoria</p>
      <h2 class="section-title">Experiencia</h2>
      ${experience.map(exp => `<div class="entry"><div class="entry-head"><div><p class="entry-title">${esc(exp.title || '')}</p>${exp.company ? `<p class="entry-sub">${esc(exp.company)}${exp.location ? ` · ${esc(exp.location)}` : ''}</p>` : ''}</div>${(exp.startDate || exp.endDate) ? `<span class="entry-date">${dateRange(exp.startDate, exp.endDate)}</span>` : ''}</div>${exp.description ? `<p class="entry-desc">${esc(exp.description)}</p>` : ''}</div>`).join('')}
    </div>` : ''}
    ${education.length > 0 ? `
    <div id="education" class="section-block">
      <p class="section-label">Formación</p>
      <h2 class="section-title">Educación</h2>
      <div class="edu-grid">
        ${education.map(edu => `<div class="entry"><p class="entry-title">${esc(edu.degree || edu.title || '')}</p>${edu.institution ? `<p class="entry-sub">${esc(edu.institution)}</p>` : ''}${(edu.startDate || edu.endDate) ? `<span class="entry-date" style="display:inline-block;margin-top:.4rem">${dateRange(edu.startDate, edu.endDate)}</span>` : ''}${edu.description ? `<p class="entry-desc">${esc(edu.description)}</p>` : ''}</div>`).join('')}
      </div>
    </div>` : ''}
    ${projects.length > 0 ? `
    <div id="projects" class="section-block">
      <p class="section-label">Trabajo</p>
      <h2 class="section-title">Proyectos</h2>
      <div class="edu-grid">
        ${projects.map(p => `<div class="entry"><div class="entry-head"><p class="entry-title">${esc(p.title || p.name || '')}</p>${p.url ? `<a href="${safeUrl(p.url)}" style="font-size:.78rem;font-weight:700;color:var(--accent)" target="_blank" rel="noopener noreferrer">Ver →</a>` : ''}</div>${p.description ? `<p class="entry-desc">${esc(p.description)}</p>` : ''}${Array.isArray(p.technologies) && p.technologies.length > 0 ? `<div class="entry-tags">${p.technologies.map(t => `<span class="entry-tag">${esc(t)}</span>`).join('')}</div>` : ''}</div>`).join('')}
      </div>
    </div>` : ''}
    <footer style="margin-top:3rem;padding-top:1.5rem;border-top:1px solid var(--border);font-size:.75rem;color:var(--gray)">
      Portfolio generado con <a href="https://next-col.online" target="_blank" rel="noopener noreferrer" style="color:var(--accent)">NEXT</a> &mdash; ${new Date().getFullYear()}
    </footer>
  </main>
</body>
</html>`;

// Template 5 — Magazine: bento-grid hero, asymmetric teal/rose layout
const _tplMagazine = ({ displayName, displayTitle, displaySummary, initials, photoSrc, personalInfo, experience, education, techSkills, softSkills, projects, validLangs, contactItems }) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Portfolio profesional de ${displayName}" />
  <title>Portfolio — ${displayName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --teal: #0D9488; --teal-lt: #F0FDFA; --teal-mid: #99F6E4;
      --rose: #E11D48; --rose-lt: #FFF1F2;
      --dark: #0F172A; --gray: #64748B; --border: #E2E8F0; --bg: #F8FAFC; --white: #FFFFFF;
      --font-head: 'Syne', system-ui, sans-serif;
      --font-body: 'Inter', system-ui, sans-serif;
      --radius: 12px;
    }
    html { scroll-behavior: smooth; }
    body { font-family: var(--font-body); color: var(--dark); background: var(--bg); -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    img { display: block; max-width: 100%; }
    svg { display: inline-block; }
    /* Hero bento grid */
    .hero { background: var(--dark); padding: clamp(2rem,5vw,4rem) clamp(1.5rem,5vw,4rem); }
    .bento { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 1.25rem; max-width: 1000px; margin: 0 auto; }
    .bento-name { grid-column: 1; grid-row: 1; background: var(--teal); border-radius: var(--radius); padding: 2rem 2.25rem; display: flex; flex-direction: column; justify-content: center; }
    .bento-name h1 { font-family: var(--font-head); font-size: clamp(2rem,5vw,3.5rem); font-weight: 900; color: white; line-height: 1; letter-spacing: -.5px; }
    .bento-name p { font-size: .9rem; color: rgba(255,255,255,.75); margin-top: .6rem; font-weight: 500; }
    .bento-photo { grid-column: 2; grid-row: 1 / span 2; background: #1E293B; border-radius: var(--radius); overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 260px; }
    .bento-photo img { width: 100%; height: 100%; object-fit: cover; }
    .bento-photo .initials { font-family: var(--font-head); font-size: 5rem; font-weight: 900; color: rgba(255,255,255,.15); }
    .bento-summary { grid-column: 1; grid-row: 2; background: #1E293B; border-radius: var(--radius); padding: 1.75rem 2rem; }
    .bento-summary p { font-size: .9rem; color: rgba(255,255,255,.65); line-height: 1.8; }
    .bento-contact { grid-column: 2; grid-row: 3; background: var(--rose); border-radius: var(--radius); padding: 1.5rem; display: flex; flex-wrap: wrap; gap: .75rem; align-content: flex-start; }
    .bento-contact-title { width: 100%; font-family: var(--font-head); font-size: .75rem; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,.75); font-weight: 700; }
    .bento-contact-link { display: inline-flex; align-items: center; gap: .4rem; font-size: .78rem; color: white; font-weight: 600; background: rgba(255,255,255,.15); border-radius: 999px; padding: .3rem .8rem; }
    .bento-contact-link svg { width: 12px; height: 12px; }
    .bento-skills { grid-column: 1; grid-row: 3; background: #F1F5F9; border-radius: var(--radius); padding: 1.5rem; }
    .bento-skills-title { font-size: .7rem; text-transform: uppercase; letter-spacing: 1.5px; color: var(--gray); font-weight: 700; margin-bottom: .75rem; }
    .skill-pill { display: inline-flex; font-size: .72rem; font-weight: 600; padding: .25rem .7rem; border-radius: 999px; background: var(--white); border: 1px solid var(--border); color: var(--dark); margin: .2rem; }
    /* Content */
    .content { max-width: 1000px; margin: 0 auto; padding: clamp(2rem,5vw,4rem) clamp(1.5rem,5vw,4rem); display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
    .content-full { grid-column: 1 / -1; }
    .section-block { background: var(--white); border-radius: var(--radius); border: 1px solid var(--border); overflow: hidden; }
    .section-head { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border); background: var(--bg); }
    .section-head h2 { font-family: var(--font-head); font-size: 1.1rem; font-weight: 800; color: var(--dark); }
    .section-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .entry { border-left: 3px solid var(--teal-mid); padding-left: .875rem; }
    .entry-title { font-size: .9rem; font-weight: 700; color: var(--dark); }
    .entry-sub { font-size: .8rem; color: var(--gray); margin-top: .1rem; }
    .entry-date { display: inline-block; font-size: .72rem; font-weight: 600; color: var(--teal); margin-top: .3rem; }
    .entry-desc { font-size: .82rem; color: var(--gray); line-height: 1.7; margin-top: .4rem; }
    .entry-tags { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .5rem; }
    .entry-tag { font-size: .68rem; font-weight: 600; padding: .15rem .55rem; border-radius: 4px; background: var(--teal-lt); color: var(--teal); border: 1px solid var(--teal-mid); }
    /* Footer */
    .footer { background: var(--dark); text-align: center; padding: 2rem 1rem; font-size: .8rem; color: rgba(255,255,255,.4); }
    .footer a { color: var(--teal); }
    @media (max-width: 700px) { .bento { grid-template-columns: 1fr; } .bento-photo { grid-column: 1; grid-row: auto; min-height: 180px; } .bento-name, .bento-summary, .bento-skills, .bento-contact { grid-column: 1; grid-row: auto; } .content { grid-template-columns: 1fr; } .content-full { grid-column: 1; } }
  </style>
</head>
<body>
  <header class="hero">
    <div class="bento">
      <div class="bento-name">
        <h1>${displayName}</h1>
        ${displayTitle ? `<p>${displayTitle}</p>` : ''}
      </div>
      <div class="bento-photo">
        ${photoSrc ? `<img src="${photoSrc}" alt="${displayName}" />` : `<span class="initials">${initials}</span>`}
      </div>
      ${displaySummary ? `<div class="bento-summary"><p>${displaySummary}</p></div>` : ''}
      ${(techSkills.length > 0 || softSkills.length > 0) ? `
      <div class="bento-skills">
        <p class="bento-skills-title">Habilidades</p>
        ${[...techSkills, ...softSkills].map(s => `<span class="skill-pill">${esc(s)}</span>`).join('')}
      </div>` : ''}
      ${contactItems.length > 0 ? `
      <div class="bento-contact">
        <p class="bento-contact-title">Contacto</p>
        ${contactItems.map(c => c.href ? `<a href="${c.href}" class="bento-contact-link" target="${c.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer">${c.icon}${c.label}</a>` : `<span class="bento-contact-link">${c.icon}${c.label}</span>`).join('')}
      </div>` : ''}
    </div>
  </header>
  <div class="content">
    ${experience.length > 0 ? `
    <div id="experience" class="section-block content-full">
      <div class="section-head"><h2>Experiencia</h2></div>
      <div class="section-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1rem">
        ${experience.map(exp => `<div class="entry"><p class="entry-title">${esc(exp.title || '')}</p>${exp.company ? `<p class="entry-sub">${esc(exp.company)}${exp.location ? ` · ${esc(exp.location)}` : ''}</p>` : ''}${(exp.startDate || exp.endDate) ? `<span class="entry-date">${dateRange(exp.startDate, exp.endDate)}</span>` : ''}${exp.description ? `<p class="entry-desc">${esc(exp.description)}</p>` : ''}</div>`).join('')}
      </div>
    </div>` : ''}
    ${education.length > 0 ? `
    <div id="education" class="section-block">
      <div class="section-head"><h2>Educación</h2></div>
      <div class="section-body">${education.map(edu => `<div class="entry"><p class="entry-title">${esc(edu.degree || edu.title || '')}</p>${edu.institution ? `<p class="entry-sub">${esc(edu.institution)}</p>` : ''}${(edu.startDate || edu.endDate) ? `<span class="entry-date">${dateRange(edu.startDate, edu.endDate)}</span>` : ''}${edu.description ? `<p class="entry-desc">${esc(edu.description)}</p>` : ''}</div>`).join('')}</div>
    </div>` : ''}
    ${projects.length > 0 ? `
    <div id="projects" class="section-block">
      <div class="section-head"><h2>Proyectos</h2></div>
      <div class="section-body">${projects.map(p => `<div class="entry"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem"><p class="entry-title">${esc(p.title || p.name || '')}</p>${p.url ? `<a href="${safeUrl(p.url)}" style="font-size:.75rem;font-weight:700;color:var(--teal)" target="_blank" rel="noopener noreferrer">Ver →</a>` : ''}</div>${p.description ? `<p class="entry-desc">${esc(p.description)}</p>` : ''}${Array.isArray(p.technologies) && p.technologies.length > 0 ? `<div class="entry-tags">${p.technologies.map(t => `<span class="entry-tag">${esc(t)}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>
    </div>` : ''}
    ${validLangs.length > 0 ? `
    <div id="languages" class="section-block">
      <div class="section-head"><h2>Idiomas</h2></div>
      <div class="section-body">${validLangs.map(l => { const n = typeof l === 'string' ? l : (l.language || ''); const lv = typeof l === 'object' ? (l.level || '') : ''; return `<div class="entry"><p class="entry-title">${esc(n)}</p>${lv ? `<span class="entry-date">${esc(lv)}</span>` : ''}</div>`; }).join('')}</div>
    </div>` : ''}
  </div>
  <footer class="footer">Portfolio generado con <a href="https://next-col.online" target="_blank" rel="noopener noreferrer">NEXT</a> &mdash; ${new Date().getFullYear()}</footer>
</body>
</html>`;

// Template 6 — Numbered Story: big numbered sections, alternating bands, bold typography
const _tplNumberedStory = ({ displayName, displayTitle, displaySummary, initials, photoSrc, personalInfo, experience, education, techSkills, softSkills, projects, validLangs, contactItems }) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Portfolio profesional de ${displayName}" />
  <title>Portfolio — ${displayName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --ink: #0A0A0A; --off: #F5F5F0; --white: #FFFFFF; --gray: #737373;
      --border: #E5E5E5; --accent: #F97316;
      --font-head: 'Bebas Neue', 'Impact', sans-serif;
      --font-body: 'Inter', system-ui, sans-serif;
    }
    html { scroll-behavior: smooth; }
    body { font-family: var(--font-body); color: var(--ink); background: var(--off); -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    img { display: block; max-width: 100%; }
    svg { display: inline-block; }
    /* Hero */
    .hero { background: var(--ink); padding: clamp(3rem,8vw,7rem) clamp(2rem,8vw,6rem); display: grid; grid-template-columns: 1fr auto; gap: 3rem; align-items: center; }
    .hero-left {}
    .hero-eyebrow { font-family: var(--font-body); font-size: .7rem; text-transform: uppercase; letter-spacing: 3px; color: var(--accent); font-weight: 600; margin-bottom: 1rem; }
    .hero-name { font-family: var(--font-head); font-size: clamp(5rem,14vw,11rem); line-height: .9; color: var(--white); letter-spacing: 1px; }
    .hero-title { font-size: 1rem; color: rgba(255,255,255,.5); margin-top: 1.25rem; font-weight: 500; padding-left: 4px; }
    .hero-summary { font-size: .9rem; color: rgba(255,255,255,.4); line-height: 1.8; margin-top: .8rem; max-width: 480px; padding-left: 4px; }
    .hero-right { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .hero-photo { width: 160px; height: 160px; border-radius: 50%; object-fit: cover; border: 3px solid var(--accent); }
    .hero-initials { width: 160px; height: 160px; border-radius: 50%; background: var(--accent); display: flex; align-items: center; justify-content: center; font-family: var(--font-head); font-size: 4rem; color: white; letter-spacing: 2px; }
    .hero-links { display: flex; flex-direction: column; gap: .4rem; width: 100%; }
    .hero-link { display: flex; align-items: center; gap: .5rem; font-size: .72rem; font-weight: 600; color: rgba(255,255,255,.6); background: rgba(255,255,255,.06); border-radius: 6px; padding: .4rem .7rem; transition: background .2s; }
    .hero-link:hover { background: rgba(255,255,255,.12); color: white; }
    .hero-link svg { width: 13px; height: 13px; flex-shrink: 0; }
    /* Numbered sections */
    .ns { display: grid; grid-template-columns: clamp(60px,10vw,100px) 1fr; border-top: 2px solid var(--ink); }
    .ns-odd { background: var(--off); }
    .ns-even { background: var(--white); }
    .ns-num { padding: clamp(2rem,5vw,4rem) clamp(1rem,2vw,2rem); border-right: 2px solid var(--ink); display: flex; align-items: flex-start; justify-content: center; }
    .ns-num span { font-family: var(--font-head); font-size: clamp(2.5rem,6vw,4rem); color: rgba(0,0,0,.1); }
    .ns-even .ns-num span { color: rgba(0,0,0,.07); }
    .ns-body { padding: clamp(2rem,5vw,4rem) clamp(1.5rem,4vw,3.5rem); }
    .ns-heading { font-family: var(--font-head); font-size: clamp(1.8rem,4vw,2.8rem); letter-spacing: 1.5px; color: var(--ink); margin-bottom: 1.75rem; }
    /* Entry cards */
    .entry-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
    .entry { background: var(--off); border: 1px solid var(--border); border-radius: 8px; padding: 1.25rem; transition: border-color .2s; }
    .ns-even .entry { background: var(--off); }
    .ns-odd .entry { background: var(--white); }
    .entry:hover { border-color: var(--accent); }
    .e-title { font-size: .95rem; font-weight: 700; color: var(--ink); }
    .e-sub { font-size: .8rem; color: var(--gray); margin-top: .25rem; }
    .e-date { display: inline-block; margin-top: .4rem; font-size: .72rem; font-weight: 600; color: var(--accent); }
    .e-desc { font-size: .82rem; color: var(--gray); line-height: 1.7; margin-top: .5rem; }
    .e-tags { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .6rem; }
    .e-tag { font-size: .68rem; font-weight: 600; padding: .15rem .55rem; border-radius: 4px; background: #FFF7ED; color: var(--accent); border: 1px solid #FDBA74; }
    /* Skills band */
    .skills-band { background: var(--accent); padding: clamp(1.5rem,4vw,3rem) clamp(2rem,8vw,6rem); display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; }
    .skills-band-label { font-family: var(--font-head); font-size: 1.5rem; color: white; margin-right: .5rem; letter-spacing: 1px; }
    .skill-chip { font-size: .78rem; font-weight: 600; padding: .3rem .85rem; border-radius: 999px; background: rgba(255,255,255,.2); color: white; border: 1px solid rgba(255,255,255,.3); }
    /* Contact footer */
    .contact { background: var(--ink); padding: clamp(3rem,7vw,5rem) clamp(2rem,8vw,6rem); display: grid; grid-template-columns: 1fr auto; gap: 2rem; align-items: center; }
    .contact-cta { font-family: var(--font-head); font-size: clamp(2.5rem,7vw,5rem); color: white; letter-spacing: 2px; line-height: 1; }
    .contact-cta span { color: var(--accent); }
    .contact-links { display: flex; flex-direction: column; gap: .6rem; }
    .contact-link { display: inline-flex; align-items: center; gap: .5rem; font-size: .82rem; font-weight: 600; color: rgba(255,255,255,.7); padding: .5rem .9rem; border: 1px solid rgba(255,255,255,.15); border-radius: 6px; transition: all .2s; }
    .contact-link:hover { background: rgba(255,255,255,.08); color: white; }
    .contact-link svg { width: 14px; height: 14px; flex-shrink: 0; }
    .footer { background: var(--ink); border-top: 1px solid rgba(255,255,255,.08); padding: 1rem 2rem; font-size: .72rem; color: rgba(255,255,255,.3); }
    .footer a { color: var(--accent); }
    @media (max-width: 640px) { .hero { grid-template-columns: 1fr; } .hero-right { flex-direction: row; flex-wrap: wrap; } .hero-photo, .hero-initials { width: 100px; height: 100px; font-size: 2.5rem; } .contact { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero-left">
      <p class="hero-eyebrow">Portafolio Profesional</p>
      <h1 class="hero-name">${displayName.split(' ').join('<br>')}</h1>
      ${displayTitle ? `<p class="hero-title">${displayTitle}</p>` : ''}
      ${displaySummary ? `<p class="hero-summary">${displaySummary}</p>` : ''}
    </div>
    <div class="hero-right">
      ${photoSrc ? `<img src="${photoSrc}" alt="${displayName}" class="hero-photo" />` : `<div class="hero-initials">${initials}</div>`}
      <div class="hero-links">
        ${contactItems.slice(0,4).map(c => c.href ? `<a href="${c.href}" class="hero-link" target="${c.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer">${c.icon}<span>${c.label}</span></a>` : `<div class="hero-link">${c.icon}<span>${c.label}</span></div>`).join('')}
      </div>
    </div>
  </header>
  ${experience.length > 0 ? `
  <section id="experience" class="ns ns-odd">
    <div class="ns-num"><span>01</span></div>
    <div class="ns-body">
      <h2 class="ns-heading">EXPERIENCIA</h2>
      <div class="entry-list">${experience.map(exp => `<div class="entry"><p class="e-title">${esc(exp.title || '')}</p>${exp.company ? `<p class="e-sub">${esc(exp.company)}${exp.location ? ` · ${esc(exp.location)}` : ''}</p>` : ''}${(exp.startDate || exp.endDate) ? `<span class="e-date">${dateRange(exp.startDate, exp.endDate)}</span>` : ''}${exp.description ? `<p class="e-desc">${esc(exp.description)}</p>` : ''}</div>`).join('')}</div>
    </div>
  </section>` : ''}
  ${education.length > 0 ? `
  <section id="education" class="ns ns-even">
    <div class="ns-num"><span>02</span></div>
    <div class="ns-body">
      <h2 class="ns-heading">EDUCACIÓN</h2>
      <div class="entry-list">${education.map(edu => `<div class="entry"><p class="e-title">${esc(edu.degree || edu.title || '')}</p>${edu.institution ? `<p class="e-sub">${esc(edu.institution)}</p>` : ''}${(edu.startDate || edu.endDate) ? `<span class="e-date">${dateRange(edu.startDate, edu.endDate)}</span>` : ''}${edu.description ? `<p class="e-desc">${esc(edu.description)}</p>` : ''}</div>`).join('')}</div>
    </div>
  </section>` : ''}
  ${(techSkills.length > 0 || softSkills.length > 0) ? `
  <div class="skills-band">
    <span class="skills-band-label">SKILLS —</span>
    ${[...techSkills, ...softSkills].map(s => `<span class="skill-chip">${esc(s)}</span>`).join('')}
  </div>` : ''}
  ${projects.length > 0 ? `
  <section id="projects" class="ns ns-odd">
    <div class="ns-num"><span>03</span></div>
    <div class="ns-body">
      <h2 class="ns-heading">PROYECTOS</h2>
      <div class="entry-list">${projects.map(p => `<div class="entry"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:.5rem"><p class="e-title">${esc(p.title || p.name || '')}</p>${p.url ? `<a href="${safeUrl(p.url)}" style="font-size:.72rem;font-weight:700;color:var(--accent)" target="_blank" rel="noopener noreferrer">Ver →</a>` : ''}</div>${p.description ? `<p class="e-desc">${esc(p.description)}</p>` : ''}${Array.isArray(p.technologies) && p.technologies.length > 0 ? `<div class="e-tags">${p.technologies.map(t => `<span class="e-tag">${esc(t)}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>
    </div>
  </section>` : ''}
  ${validLangs.length > 0 ? `
  <section id="languages" class="ns ns-even">
    <div class="ns-num"><span>0${projects.length > 0 ? 4 : 3}</span></div>
    <div class="ns-body">
      <h2 class="ns-heading">IDIOMAS</h2>
      <div class="entry-list">${validLangs.map(l => { const n = typeof l === 'string' ? l : (l.language || ''); const lv = typeof l === 'object' ? (l.level || '') : ''; return `<div class="entry"><p class="e-title">${esc(n)}</p>${lv ? `<span class="e-date">${esc(lv)}</span>` : ''}</div>`; }).join('')}</div>
    </div>
  </section>` : ''}
  <footer id="contact" class="contact">
    <div class="contact-cta">HABLEMOS<br><span>.</span></div>
    <div class="contact-links">
      ${contactItems.map(c => c.href ? `<a href="${c.href}" class="contact-link" target="${c.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer">${c.icon}${c.label}</a>` : `<div class="contact-link">${c.icon}${c.label}</div>`).join('')}
    </div>
  </footer>
  <div class="footer">Portfolio generado con <a href="https://next-col.online" target="_blank" rel="noopener noreferrer">NEXT</a> &mdash; ${new Date().getFullYear()}</div>
</body>
</html>`;

// ── Anti-repeat per-user template tracking ────────────────────────────────────
const _lastUsedTemplate = new Map(); // userId → last templateId
const _TEMPLATE_IDS = ['classic-blue', 'emerald-split', 'midnight-dark', 'sidebar', 'magazine', 'numbered-story'];

// ── Main HTML generator ───────────────────────────────────────────────────────
const generatePortfolioHtml = (user, cvData, profilePicture, templateId) => {
    const {
        personalInfo = {},
        summary = '',
        experience: rawExp = [],
        education: rawEdu = [],
        skills = {},
        languages = [],
        projects: rawProjects = [],
        certifications = [],
    } = cvData;

    const techSkills = Array.isArray(skills?.technical) ? skills.technical : [];
    const softSkills = Array.isArray(skills?.soft) ? skills.soft : [];
    const hasSkills = techSkills.length > 0 || softSkills.length > 0;

    const displayName = esc(personalInfo?.name || user.name || 'Portfolio');
    const displayTitle = esc(personalInfo?.title || '');
    const displaySummary = esc(summary || '');

    // [SECURITY FIX #10] Validar el tipo MIME completo de imágenes base64.
    // data:image/svg+xml puede contener JS (onload, script tags) y ejecutarse
    // cuando el browser abre el archivo HTML descargado. Solo se permiten
    // tipos raster que no tienen capacidad de ejecución de scripts.
    const ALLOWED_IMAGE_MIMES = [
        'data:image/png;',
        'data:image/jpeg;',
        'data:image/jpg;',
        'data:image/webp;',
        'data:image/gif;',
    ];
    const photoSrc = (() => {
        const pic = profilePicture || personalInfo?.photo;
        if (!pic) return null;
        const str = String(pic);
        // Validar MIME completo — rechazar SVG y cualquier tipo que pueda ejecutar JS
        if (ALLOWED_IMAGE_MIMES.some(mime => str.startsWith(mime))) return str;
        if (/^https?:\/\//i.test(str)) return esc(str);
        return null; // Descartar todo lo demás, incluyendo data:image/svg+xml
    })();

    const initials = displayName
        .split(' ')
        .slice(0, 2)
        .map(w => w[0])
        .join('')
        .toUpperCase() || 'NX';

    // Contact links
    const contactItems = [
        personalInfo.email && {
            icon: ICONS.email,
            label: esc(personalInfo.email),
            href: `mailto:${safeUrl(personalInfo.email) !== '#' ? esc(personalInfo.email) : ''}`,
        },
        personalInfo.phone && {
            icon: ICONS.phone,
            label: esc(personalInfo.phone),
            href: `tel:${esc(personalInfo.phone.replace(/\s/g, ''))}`,
        },
        personalInfo.address && {
            icon: ICONS.location,
            label: esc(personalInfo.address),
            href: null,
        },
        personalInfo.linkedin && {
            icon: ICONS.linkedin,
            label: 'LinkedIn',
            href: safeUrl(personalInfo.linkedin),
        },
        personalInfo.github && {
            icon: ICONS.github,
            label: 'GitHub',
            href: safeUrl(personalInfo.github),
        },
        personalInfo.portfolio && {
            icon: ICONS.portfolio,
            label: 'Portfolio',
            href: safeUrl(personalInfo.portfolio),
        },
    ].filter(Boolean);

    // [SECURITY FIX #13] Límite en arrays para prevenir DoS por iteración masiva.
    // Un cvText con 10.000 entradas de experiencia bloquearía el event loop de Node.
    const MAX_ENTRIES = 50;

    // Experience entries (sorted newest first, max 50)
    const experience = [...rawExp].slice(0, MAX_ENTRIES).sort((a, b) => {
        const dateA = a.endDate === 'Presente' ? '9999' : (a.endDate || a.startDate || '');
        const dateB = b.endDate === 'Presente' ? '9999' : (b.endDate || b.startDate || '');
        return dateB.localeCompare(dateA);
    });

    const education = [...rawEdu].slice(0, MAX_ENTRIES).sort((a, b) => {
        const dateA = a.endDate === 'Presente' ? '9999' : (a.endDate || a.startDate || '');
        const dateB = b.endDate === 'Presente' ? '9999' : (b.endDate || b.startDate || '');
        return dateB.localeCompare(dateA);
    });

    const projects = Array.isArray(cvData.projects) ? cvData.projects.slice(0, MAX_ENTRIES) : [];

    const validLangs = Array.isArray(languages)
        ? languages.slice(0, 20).filter(l => l && (l.language || typeof l === 'string'))
        : [];

    // ── Section builders ─────────────────────────────────────────────────────

    const experienceSection = experience.length === 0 ? '' : `
    <section id="experience" class="section">
      <div class="section-inner">
        <div class="section-header">
          <span class="section-icon">${ICONS.work}</span>
          <h2>Experiencia</h2>
        </div>
        <div class="timeline">
          ${experience.map((exp, i) => `
          <div class="timeline-item" style="--i:${i}">
            <div class="timeline-dot"></div>
            <div class="timeline-content card">
              <div class="entry-head">
                <div>
                  <h3 class="entry-title">${esc(exp.title || '')}</h3>
                  ${exp.company ? `<p class="entry-sub">${esc(exp.company)}${exp.location ? ` &middot; ${esc(exp.location)}` : ''}</p>` : ''}
                </div>
                ${(exp.startDate || exp.endDate) ? `<span class="entry-date">${dateRange(exp.startDate, exp.endDate)}</span>` : ''}
              </div>
              ${exp.description ? `<p class="entry-desc">${esc(exp.description)}</p>` : ''}
            </div>
          </div>`).join('')}
        </div>
      </div>
    </section>`;

    const educationSection = education.length === 0 ? '' : `
    <section id="education" class="section section-alt">
      <div class="section-inner">
        <div class="section-header">
          <span class="section-icon">${ICONS.edu}</span>
          <h2>Educación</h2>
        </div>
        <div class="cards-grid">
          ${education.map((edu, i) => `
          <div class="card edu-card" style="--i:${i}">
            <h3 class="entry-title">${esc(edu.degree || edu.title || '')}</h3>
            ${edu.institution ? `<p class="entry-sub">${esc(edu.institution)}</p>` : ''}
            ${(edu.startDate || edu.endDate) ? `<span class="entry-date">${dateRange(edu.startDate, edu.endDate)}</span>` : ''}
            ${edu.description ? `<p class="entry-desc">${esc(edu.description)}</p>` : ''}
          </div>`).join('')}
        </div>
      </div>
    </section>`;

    const projectsSection = projects.length === 0 ? '' : `
    <section id="projects" class="section">
      <div class="section-inner">
        <div class="section-header">
          <span class="section-icon">${ICONS.project}</span>
          <h2>Proyectos</h2>
        </div>
        <div class="cards-grid">
          ${projects.map((p, i) => `
          <div class="card project-card" style="--i:${i}">
            <div class="project-head">
              <h3 class="entry-title">${esc(p.title || p.name || '')}</h3>
              ${p.url ? `<a href="${safeUrl(p.url)}" class="project-link" target="_blank" rel="noopener noreferrer">Ver →</a>` : ''}
            </div>
            ${p.description ? `<p class="entry-desc">${esc(p.description)}</p>` : ''}
            ${Array.isArray(p.technologies) && p.technologies.length > 0 ? `
            <div class="badge-row">${p.technologies.map(t => badge(t, 'badge-tech')).join('')}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>
    </section>`;

    const skillsSection = !hasSkills ? '' : `
    <section id="skills" class="section section-alt">
      <div class="section-inner">
        <div class="section-header">
          <span class="section-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
          <h2>Habilidades</h2>
        </div>
        ${techSkills.length > 0 ? `
        <div class="skills-group">
          <p class="skills-label">Técnicas</p>
          <div class="badge-row">${techSkills.map(s => badge(s, 'badge-tech')).join('')}</div>
        </div>` : ''}
        ${softSkills.length > 0 ? `
        <div class="skills-group">
          <p class="skills-label">Blandas</p>
          <div class="badge-row">${softSkills.map(s => badge(s, 'badge-soft')).join('')}</div>
        </div>` : ''}
      </div>
    </section>`;

    const languagesSection = validLangs.length === 0 ? '' : `
    <section id="languages" class="section${projects.length === 0 ? ' section-alt' : ''}">
      <div class="section-inner">
        <div class="section-header">
          <span class="section-icon">${ICONS.lang}</span>
          <h2>Idiomas</h2>
        </div>
        <div class="lang-grid">
          ${validLangs.map(l => {
              const name = typeof l === 'string' ? l : (l.language || '');
              const level = typeof l === 'object' ? (l.level || '') : '';
              return `<div class="lang-card card">
                <span class="lang-name">${esc(name)}</span>
                ${level ? `<span class="lang-level">${esc(level)}</span>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>
    </section>`;

    const contactSection = contactItems.length === 0 ? '' : `
    <section id="contact" class="section contact-section">
      <div class="section-inner">
        <h2 class="contact-title">¿Hablamos?</h2>
        <p class="contact-sub">Estoy disponible para nuevas oportunidades</p>
        <div class="contact-grid">
          ${contactItems.map(c => c.href ? `
          <a href="${c.href}" class="contact-item" target="${c.href.startsWith('http') ? '_blank' : '_self'}" rel="noopener noreferrer">
            <span class="contact-icon">${c.icon}</span>
            <span>${c.label}</span>
          </a>` : `
          <div class="contact-item">
            <span class="contact-icon">${c.icon}</span>
            <span>${c.label}</span>
          </div>`).join('')}
        </div>
      </div>
    </section>`;

    const navLinks = [
        experience.length > 0 && `<a href="#experience">Experiencia</a>`,
        education.length > 0 && `<a href="#education">Educación</a>`,
        hasSkills && `<a href="#skills">Habilidades</a>`,
        projects.length > 0 && `<a href="#projects">Proyectos</a>`,
        contactItems.length > 0 && `<a href="#contact">Contacto</a>`,
    ].filter(Boolean).join('');

    // ── Template dispatch (explicit selection + anti-repeat random fallback) ────
    const _rawData = { experience, education, techSkills, softSkills, projects, validLangs, contactItems };
    const _tplData = { displayName, displayTitle, displaySummary, initials, photoSrc, personalInfo, navLinks, experienceSection, educationSection, skillsSection, projectsSection, languagesSection, contactSection, ..._rawData };
    const _tplFns = {
        'emerald-split':    _tplEmeraldSplit,
        'midnight-dark':    _tplMidnightDark,
        'sidebar':          _tplSidebar,
        'magazine':         _tplMagazine,
        'numbered-story':   _tplNumberedStory,
    };

    let _chosenId = (templateId && _TEMPLATE_IDS.includes(templateId)) ? templateId : null;
    if (!_chosenId) {
        // Anti-repeat: pick randomly but avoid repeating the last used template
        const _userId = user.id || user.name || 'guest';
        const _last = _lastUsedTemplate.get(_userId);
        const _available = _TEMPLATE_IDS.filter(id => id !== _last);
        _chosenId = _available[Math.floor(Math.random() * _available.length)];
        _setLastTemplate(_userId, _chosenId); // [FIX #12] usar helper LRU
    }

    if (_tplFns[_chosenId]) return _tplFns[_chosenId](_tplData);
    // 'classic-blue' falls through to the inline return below

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Portfolio profesional de ${displayName}" />
  <title>Portfolio — ${displayName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    /* ─── Reset & Variables ──────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --blue:    #2563EB;
      --blue-dk: #1D4ED8;
      --blue-lt: #EFF6FF;
      --navy:    #0F172A;
      --dark:    #1E293B;
      --gray:    #64748B;
      --light:   #F8FAFC;
      --white:   #FFFFFF;
      --border:  #E2E8F0;
      --radius:  14px;
      --shadow:  0 4px 24px rgba(15,23,42,.08);
      --font:    'Inter', system-ui, -apple-system, sans-serif;
    }
    html { scroll-behavior: smooth; font-size: 16px; }
    body { font-family: var(--font); color: var(--dark); background: var(--light); -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    img { max-width: 100%; display: block; }
    svg { display: inline-block; }

    /* ─── Navbar ─────────────────────────────────────────────── */
    .navbar {
      position: sticky; top: 0; z-index: 100;
      background: rgba(255,255,255,.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0 clamp(1rem, 5vw, 3rem);
      display: flex; align-items: center; justify-content: space-between;
      height: 60px;
    }
    .navbar-brand { font-weight: 800; font-size: 1.1rem; color: var(--navy); letter-spacing: -.3px; }
    .navbar-brand span { color: var(--blue); }
    .navbar-links { display: flex; gap: 1.75rem; }
    .navbar-links a { font-size: .875rem; font-weight: 500; color: var(--gray); transition: color .2s; }
    .navbar-links a:hover { color: var(--blue); }
    @media (max-width: 640px) { .navbar-links { display: none; } }

    /* ─── Hero ───────────────────────────────────────────────── */
    .hero {
      min-height: 100svh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, var(--navy) 0%, #1E3A5F 50%, #0F172A 100%);
      position: relative; overflow: hidden; padding: clamp(4rem,10vw,8rem) clamp(1rem,5vw,3rem);
      text-align: center;
    }
    .hero::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(37,99,235,.35) 0%, transparent 70%);
    }
    .hero-blob {
      position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none;
    }
    .hero-blob-1 { width: 500px; height: 500px; background: rgba(37,99,235,.18); top: -100px; right: -100px; }
    .hero-blob-2 { width: 400px; height: 400px; background: rgba(99,102,241,.12); bottom: -80px; left: -80px; }
    .hero-content { position: relative; z-index: 1; max-width: 700px; margin: 0 auto; }
    .hero-avatar {
      width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 1.75rem;
      border: 3px solid rgba(255,255,255,.2);
      object-fit: cover; box-shadow: 0 8px 40px rgba(0,0,0,.4);
    }
    .hero-initials {
      width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 1.75rem;
      background: linear-gradient(135deg, var(--blue) 0%, #6366F1 100%);
      display: flex; align-items: center; justify-content: center;
      font-size: 2.5rem; font-weight: 800; color: white;
      border: 3px solid rgba(255,255,255,.2); box-shadow: 0 8px 40px rgba(0,0,0,.4);
    }
    .hero-name {
      font-size: clamp(2.2rem, 6vw, 3.5rem); font-weight: 900; color: white;
      line-height: 1.05; letter-spacing: -.5px; margin-bottom: .75rem;
    }
    .hero-title {
      font-size: clamp(1rem, 2.5vw, 1.25rem); color: rgba(255,255,255,.75);
      font-weight: 500; margin-bottom: 1.5rem;
    }
    .hero-summary {
      font-size: clamp(.9rem, 2vw, 1.05rem); color: rgba(255,255,255,.6);
      line-height: 1.8; max-width: 560px; margin: 0 auto 2.5rem;
    }
    .hero-cta { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .btn { 
      display: inline-flex; align-items: center; gap: .5rem;
      padding: .75rem 1.75rem; border-radius: 999px;
      font-size: .9rem; font-weight: 600; transition: all .2s; cursor: pointer;
    }
    .btn-primary { background: var(--blue); color: white; }
    .btn-primary:hover { background: var(--blue-dk); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,.4); }
    .btn-outline { border: 1.5px solid rgba(255,255,255,.3); color: white; }
    .btn-outline:hover { border-color: rgba(255,255,255,.7); background: rgba(255,255,255,.08); transform: translateY(-1px); }

    /* ─── Sections ───────────────────────────────────────────── */
    .section { padding: clamp(3.5rem, 8vw, 6rem) clamp(1rem, 5vw, 3rem); }
    .section-alt { background: var(--white); }
    .section-inner { max-width: 860px; margin: 0 auto; }
    .section-header { display: flex; align-items: center; gap: .75rem; margin-bottom: 2.5rem; }
    .section-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--blue-lt); color: var(--blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .section-icon svg { width: 20px; height: 20px; }
    .section-header h2 { font-size: clamp(1.4rem, 4vw, 1.9rem); font-weight: 800; color: var(--navy); letter-spacing: -.3px; }

    /* ─── Cards ──────────────────────────────────────────────── */
    .card {
      background: var(--white); border-radius: var(--radius);
      border: 1px solid var(--border); padding: 1.5rem;
      box-shadow: var(--shadow);
      animation: fadeUp .5s ease both;
      animation-delay: calc(var(--i, 0) * .08s);
    }
    .section-alt .card { background: var(--light); }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; }

    /* ─── Timeline ───────────────────────────────────────────── */
    .timeline { display: flex; flex-direction: column; gap: 0; }
    .timeline-item {
      display: grid; grid-template-columns: 20px 1fr; gap: 0 1.25rem;
      padding-bottom: 1.75rem; position: relative;
      animation: fadeUp .5s ease both;
      animation-delay: calc(var(--i, 0) * .1s);
    }
    .timeline-item:last-child { padding-bottom: 0; }
    .timeline-item:last-child::before { display: none; }
    .timeline-item::before {
      content: ''; position: absolute; left: 9px; top: 20px; bottom: 0;
      width: 2px; background: var(--border);
    }
    .timeline-dot {
      width: 20px; height: 20px; border-radius: 50%;
      background: var(--blue); border: 3px solid var(--blue-lt);
      margin-top: 14px; flex-shrink: 0; z-index: 1;
    }
    .timeline-content { flex: 1; }

    /* ─── Entry typography ───────────────────────────────────── */
    .entry-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; margin-bottom: .5rem; }
    .entry-title { font-size: 1rem; font-weight: 700; color: var(--navy); }
    .entry-sub { font-size: .875rem; color: var(--gray); margin-top: .2rem; }
    .entry-date { font-size: .8rem; font-weight: 500; color: var(--blue); background: var(--blue-lt); padding: .25rem .75rem; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
    .entry-desc { font-size: .875rem; color: var(--gray); line-height: 1.75; margin-top: .75rem; }
    .edu-card .entry-date { display: inline-block; margin-top: .5rem; }

    /* ─── Skills ─────────────────────────────────────────────── */
    .skills-group { margin-bottom: 1.5rem; }
    .skills-label { font-size: .75rem; font-weight: 700; color: var(--gray); text-transform: uppercase; letter-spacing: 1px; margin-bottom: .75rem; }
    .badge-row { display: flex; flex-wrap: wrap; gap: .5rem; }
    .badge { padding: .35rem .9rem; border-radius: 999px; font-size: .8rem; font-weight: 600; }
    .badge-tech { background: var(--blue-lt); color: var(--blue); }
    .badge-soft { background: #F0FDF4; color: #16A34A; }

    /* ─── Projects ───────────────────────────────────────────── */
    .project-head { display: flex; align-items: flex-start; justify-content: space-between; gap: .5rem; margin-bottom: .5rem; }
    .project-link { font-size: .8rem; font-weight: 600; color: var(--blue); white-space: nowrap; flex-shrink: 0; }
    .project-link:hover { text-decoration: underline; }

    /* ─── Languages ──────────────────────────────────────────── */
    .lang-grid { display: flex; flex-wrap: wrap; gap: 1rem; }
    .lang-card { display: flex; flex-direction: column; gap: .25rem; min-width: 140px; padding: 1rem 1.25rem; }
    .lang-name { font-size: .95rem; font-weight: 700; color: var(--navy); }
    .lang-level { font-size: .8rem; color: var(--gray); }

    /* ─── Contact ─────────────────────────────────────────────── */
    .contact-section {
      background: linear-gradient(135deg, var(--navy) 0%, #1E3A5F 100%);
      text-align: center;
    }
    .contact-title { font-size: clamp(1.75rem, 5vw, 2.5rem); font-weight: 900; color: white; margin-bottom: .75rem; }
    .contact-sub { color: rgba(255,255,255,.6); margin-bottom: 2.5rem; font-size: 1rem; }
    .contact-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
    .contact-item {
      display: inline-flex; align-items: center; gap: .625rem;
      background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.15);
      color: rgba(255,255,255,.9); border-radius: 999px; padding: .65rem 1.4rem;
      font-size: .875rem; font-weight: 500; transition: all .2s;
    }
    a.contact-item:hover { background: rgba(255,255,255,.15); transform: translateY(-2px); }
    .contact-icon { width: 16px; height: 16px; display: flex; flex-shrink: 0; }
    .contact-icon svg { width: 16px; height: 16px; }

    /* ─── Footer ─────────────────────────────────────────────── */
    .footer {
      text-align: center; padding: 1.75rem 1rem;
      border-top: 1px solid var(--border);
      font-size: .78rem; color: var(--gray);
      background: var(--white);
    }
    .footer a { color: var(--blue); }

    /* ─── Animations ─────────────────────────────────────────── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .hero-content { animation: fadeUp .7s ease both; }

    /* ─── Responsive ─────────────────────────────────────────── */
    @media (max-width: 480px) {
      .hero-cta { flex-direction: column; align-items: center; }
      .cards-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- ── Navbar ──────────────────────────────────────────── -->
  <nav class="navbar">
    <span class="navbar-brand">${displayName.split(' ')[0] || 'Portfolio'}<span>.</span></span>
    <div class="navbar-links">${navLinks}</div>
  </nav>

  <!-- ── Hero ────────────────────────────────────────────── -->
  <section class="hero">
    <div class="hero-blob hero-blob-1"></div>
    <div class="hero-blob hero-blob-2"></div>
    <div class="hero-content">
      ${photoSrc
        ? `<img src="${photoSrc}" alt="Foto de ${displayName}" class="hero-avatar" />`
        : `<div class="hero-initials">${initials}</div>`
      }
      <h1 class="hero-name">${displayName}</h1>
      ${displayTitle ? `<p class="hero-title">${displayTitle}</p>` : ''}
      ${displaySummary ? `<p class="hero-summary">${displaySummary}</p>` : ''}
      <div class="hero-cta">
        ${personalInfo.email ? `<a href="mailto:${esc(personalInfo.email)}" class="btn btn-primary">Contactar</a>` : ''}
        ${personalInfo.linkedin
            ? `<a href="${safeUrl(personalInfo.linkedin)}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">LinkedIn</a>`
            : ''
        }
        ${personalInfo.github
            ? `<a href="${safeUrl(personalInfo.github)}" class="btn btn-outline" target="_blank" rel="noopener noreferrer">GitHub</a>`
            : ''
        }
      </div>
    </div>
  </section>

  ${experienceSection}
  ${educationSection}
  ${skillsSection}
  ${projectsSection}
  ${languagesSection}
  ${contactSection}

  <!-- ── Footer ──────────────────────────────────────────── -->
  <footer class="footer">
    <p>Portfolio generado con <a href="https://next-col.online" target="_blank" rel="noopener noreferrer">NEXT</a> &mdash; ${new Date().getFullYear()}</p>
  </footer>

</body>
</html>`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/portfolio/generate
// ─────────────────────────────────────────────────────────────────────────────
export const generatePortfolio = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        if (!userId) return res.status(401).json({ error: 'No autorizado.' });

        const user = await User.findByPk(userId, {
            attributes: ['name', 'area', 'skills', 'experienceLevel', 'profilePicture', 'cvText'],
        });

        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        let cvData = {};
        if (user.cvText) {
            try {
                cvData = typeof user.cvText === 'string' ? JSON.parse(user.cvText) : user.cvText;
            } catch {
                // cvText might be plain text, not JSON — generate minimal portfolio
            }
        }

        const templateId = req.query.template || null;
        const html = generatePortfolioHtml(
            { name: user.name, area: user.area, id: userId },
            cvData,
            user.profilePicture,
            templateId,
        );

        const safeName = (cvData?.personalInfo?.name || user.name || 'Portfolio')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .trim()
            .replace(/\s+/g, '_') || 'Portfolio';

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="Portfolio_${safeName}.html"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.send(html);
    } catch (error) {
        console.error('[portfolioController] Error generando portfolio:', error.message);
        res.status(500).json({ error: 'No se pudo generar el portfolio. Intenta de nuevo.' });
    }
};
