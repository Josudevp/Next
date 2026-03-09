import { useRef, useState, useEffect } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const LETTER_PX_W = 816;
const LETTER_PX_H  = 1056;
const BANNER_BG    = '#FFEDD5';
const ACCENT       = '#C2410C';
const BODY_FONT    = '"Inter","Segoe UI",system-ui,sans-serif';

// ── Sub-components ────────────────────────────────────────────────────────────
const ColHead = ({ children }) => (
    <div style={{
        fontSize: '7.5pt', fontWeight: '700', letterSpacing: '2.5px',
        color: ACCENT, textTransform: 'uppercase',
        borderBottom: `2px solid ${ACCENT}`, paddingBottom: '4px',
        marginBottom: '10px', marginTop: '0',
    }}>
        {children}
    </div>
);

const ExpEntry = ({ title, subtitle, dates, description }) => (
    <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '9.5pt', fontWeight: '700', color: '#111', flex: 1 }}>{title}</span>
            {dates && <span style={{ fontSize: '7.5pt', color: '#888', flexShrink: 0 }}>{dates}</span>}
        </div>
        {subtitle    && <p style={{ fontSize: '8.5pt', color: ACCENT, fontWeight: '600', margin: '2px 0 3px' }}>{subtitle}</p>}
        {description && <p style={{ fontSize: '8.5pt', color: '#555', lineHeight: '1.65', margin: 0 }}>{description}</p>}
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const CreativeTemplate = ({ cvData = {}, profilePicture = null }) => {
    const cvRef     = useRef(null);
    const scrollRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [scale, setScale]           = useState(1);
    const [cvNaturalH, setCvNaturalH] = useState(LETTER_PX_H);

    useEffect(() => {
        if (!scrollRef.current) return;
        const ro = new ResizeObserver(([e]) =>
            setScale(Math.min(1, (e.contentRect.width - 32) / LETTER_PX_W)));
        ro.observe(scrollRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!cvRef.current) return;
        const ro = new ResizeObserver(([e]) => setCvNaturalH(e.contentRect.height));
        ro.observe(cvRef.current);
        return () => ro.disconnect();
    }, []);

    const { personalInfo = {}, summary, education = [], experience = [],
            skills = {}, languages = [], includePhoto } = cvData;

    const techSkills = Array.isArray(skills?.technical) ? skills.technical : [];
    const softSkills = Array.isArray(skills?.soft)      ? skills.soft      : [];
    const allSkills  = [...new Set([...techSkills, ...softSkills])].filter(Boolean);
    const validLangs = Array.isArray(languages)
        ? languages.filter(l => l && (l.language || typeof l === 'string')) : [];
    const hasData = !!(personalInfo.name || summary || education.length || experience.length);

    const contactLine = [
        personalInfo.phone,
        personalInfo.email,
        personalInfo.linkedin?.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/'),
        personalInfo.github?.replace(/https?:\/\/(www\.)?github\.com\//i, 'github.com/'),
        personalInfo.portfolio,
        personalInfo.address,
    ].filter(Boolean).join('  ·  ');

    // ── PDF Export ────────────────────────────────────────────────────────────
    const handleDownloadPDF = async () => {
        if (!cvRef.current || !hasData) return;
        setIsDownloading(true);
        let exportHost = null;
        try {
            exportHost = document.createElement('div');
            exportHost.style.cssText = `position:fixed;left:-10000px;top:0;width:${LETTER_PX_W}px;background:#fff;padding:0;margin:0;overflow:visible;z-index:-1`;
            const clone = cvRef.current.cloneNode(true);
            clone.style.transform = 'none';
            clone.style.width     = `${LETTER_PX_W}px`;
            clone.style.margin    = '0';
            clone.style.boxShadow = 'none';
            exportHost.appendChild(clone);
            document.body.appendChild(exportHost);
            if (document.fonts?.ready) await document.fonts.ready;
            const canvas = await html2canvas(clone, {
                scale: 2, useCORS: true, allowTaint: true,
                backgroundColor: '#ffffff', logging: false,
                width: LETTER_PX_W, windowWidth: LETTER_PX_W,
                scrollX: 0, scrollY: 0, x: 0, y: 0,
            });
            document.body.removeChild(exportHost);
            exportHost = null;
            if (!canvas.width || !canvas.height) throw new Error('Canvas vacío');
            const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const asp  = canvas.width / canvas.height;
            let rW = pdfW, rH = rW / asp;
            if (rH > pdfH) { rH = pdfH; rW = rH * asp; }
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pdfW - rW) / 2, 0, rW, rH, undefined, 'FAST');
            const safe = (personalInfo.name || 'MiCV')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_');
            pdf.save(`CV_${safe}.pdf`);
        } catch (err) {
            console.error('[CreativeTemplate] PDF error:', err);
        } finally {
            if (exportHost?.parentNode) exportHost.parentNode.removeChild(exportHost);
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* ── Header bar ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Vista Previa · Creative</p>
                    {hasData && personalInfo.name && (
                        <p className="text-xs font-semibold text-gray-700 mt-0.5 leading-none">{personalInfo.name}</p>
                    )}
                </div>
                <button
                    onClick={handleDownloadPDF}
                    disabled={!hasData || isDownloading}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow cursor-pointer"
                >
                    {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                    Descargar PDF
                </button>
            </div>

            {/* ── Scroll area ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 p-4 flex flex-col items-center">
                {!hasData ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
                        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                            <FileText size={24} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-400">Tu CV aparecerá aquí</p>
                        <p className="text-xs text-gray-400 max-w-[165px] leading-relaxed">
                            Responde las preguntas y tu CV se irá construyendo en tiempo real
                        </p>
                    </div>
                ) : (
                    <div style={{ width: `${LETTER_PX_W * scale}px`, height: `${cvNaturalH * scale}px`, margin: 'auto', overflow: 'hidden' }}>
                        <div
                            ref={cvRef}
                            style={{
                                width: `${LETTER_PX_W}px`, minHeight: `${LETTER_PX_H}px`,
                                backgroundColor: '#ffffff',
                                boxShadow: '0 2px 20px rgba(0,0,0,0.14)',
                                fontFamily: BODY_FONT, color: '#1a1a1a',
                                transformOrigin: 'top left', transform: `scale(${scale})`,
                            }}
                        >
                            {/* ── Yellow pastel banner ── */}
                            <div style={{ backgroundColor: BANNER_BG, padding: '26px 36px', display: 'flex', alignItems: 'center', gap: '24px' }}>
                                {includePhoto && profilePicture ? (
                                    <img src={profilePicture} alt="Foto" crossOrigin="anonymous"
                                        style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${ACCENT}`, flexShrink: 0 }} />
                                ) : includePhoto ? (
                                    <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.06)', border: `3px solid ${ACCENT}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="36" height="36" fill={ACCENT} opacity="0.5" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                                    </div>
                                ) : null}
                                <div style={{ flex: 1 }}>
                                    <h1 style={{ fontSize: '26pt', fontWeight: '800', color: '#1a1a1a', margin: 0, lineHeight: 1.1, letterSpacing: '-0.3px' }}>
                                        {personalInfo.name || ' '}
                                    </h1>
                                    {personalInfo.title && (
                                        <p style={{ fontSize: '10.5pt', color: ACCENT, margin: '5px 0 0', fontWeight: '600', letterSpacing: '0.5px' }}>
                                            {personalInfo.title}
                                        </p>
                                    )}
                                    {contactLine && (
                                        <p style={{ fontSize: '7.5pt', color: '#555', margin: '8px 0 0', lineHeight: 1.7 }}>
                                            {contactLine}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* ── Two-column body ── */}
                            <div style={{ display: 'flex', padding: '24px 60px 36px', gap: '28px' }}>

                                {/* Left column — 58% — Experience + Education */}
                                <div style={{ flex: '0 0 57%' }}>
                                    {experience.length > 0 && (
                                        <div style={{ marginBottom: '22px' }}>
                                            <ColHead>Experiencia</ColHead>
                                            {experience.map((ex, i) => (
                                                <ExpEntry key={i}
                                                    title={ex.position || ex.title || ''}
                                                    subtitle={ex.company}
                                                    dates={ex.dates}
                                                    description={ex.description}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    {education.length > 0 && (
                                        <div>
                                            <ColHead>Educación</ColHead>
                                            {education.map((ed, i) => (
                                                <ExpEntry key={i}
                                                    title={ed.degree || ''}
                                                    subtitle={ed.institution}
                                                    dates={ed.dates}
                                                    description={ed.description}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right column — 42% — Profile, Skills, Languages */}
                                <div style={{ flex: 1 }}>
                                    {summary && (
                                        <div style={{ marginBottom: '22px' }}>
                                            <ColHead>Perfil</ColHead>
                                            <p style={{ fontSize: '8.5pt', color: '#444', lineHeight: '1.7' }}>{summary}</p>
                                        </div>
                                    )}
                                    {allSkills.length > 0 && (
                                        <div style={{ marginBottom: '22px' }}>
                                            <ColHead>Habilidades</ColHead>
                                            <p style={{ fontSize: '8.5pt', color: '#555', lineHeight: '1.7', margin: 0 }}>
                                                {allSkills.join(' · ')}
                                            </p>
                                        </div>
                                    )}
                                    {validLangs.length > 0 && (
                                        <div>
                                            <ColHead>Idiomas</ColHead>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {validLangs.map((l, i) => (
                                                    <p key={i} style={{ fontSize: '8.5pt', color: '#444', margin: 0, lineHeight: 1.6 }}>
                                                        {typeof l === 'string' ? l : [l.language, l.level].filter(Boolean).join(' — ')}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreativeTemplate;
