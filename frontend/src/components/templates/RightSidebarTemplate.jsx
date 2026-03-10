import { useRef, useState, useEffect } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import { downloadCvPdf, sortByDateDesc, normalizeReferenceGroups, formatReferenceLine } from '../../utils/pdfUtils';

const LETTER_PX_W = 816;
const LETTER_PX_H  = 1056;
const SIDEBAR_BG   = '#1E293B';   // slate-800
const SIDEBAR_W    = 268;
const ACCENT       = '#94A3B8';   // slate-400 for sidebar headings
const BODY_ACCENT  = '#334155';   // slate-700 for main headings
const BODY_FONT    = '"Inter","Segoe UI",system-ui,sans-serif';

// ── Sub-components ────────────────────────────────────────────────────────────
const SideHead = ({ children }) => (
    <p style={{ fontSize: '7pt', fontWeight: '700', letterSpacing: '2px', color: ACCENT, textTransform: 'uppercase', margin: '18px 0 6px', borderBottom: '1px solid rgba(148,163,184,0.3)', paddingBottom: '4px' }}>
        {children}
    </p>
);

const MainHead = ({ children }) => (
    <p style={{ fontSize: '7.5pt', fontWeight: '700', letterSpacing: '2px', color: BODY_ACCENT, textTransform: 'uppercase', margin: '22px 0 10px', borderBottom: `1.5px solid ${BODY_ACCENT}`, paddingBottom: '4px' }}>
        {children}
    </p>
);

const MainEntry = ({ title, subtitle, dates, description }) => (
    <div className="cv-print-entry" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '10.5pt', fontWeight: '700', color: '#111', flex: 1 }}>{title}</span>
            {dates && <span style={{ fontSize: '8pt', color: '#888', flexShrink: 0 }}>{dates}</span>}
        </div>
        {subtitle    && <p style={{ fontSize: '9pt', color: BODY_ACCENT, fontWeight: '600', margin: '2px 0 4px' }}>{subtitle}</p>}
        {description && <p style={{ fontSize: '9.5pt', color: '#555', lineHeight: '1.65', margin: 0 }}>{description}</p>}
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const RightSidebarTemplate = ({ cvData = {}, profilePicture = null, onFirstExport }) => {
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

    const { personalInfo = {}, summary, education: rawEdu = [], experience: rawExp = [],
            skills = {}, languages = [], includePhoto } = cvData;
    const experience = sortByDateDesc(rawExp);
    const education  = sortByDateDesc(rawEdu);

    const techSkills = Array.isArray(skills?.technical) ? skills.technical : [];
    const softSkills = Array.isArray(skills?.soft)      ? skills.soft      : [];
    const allSkills  = [...new Set([...techSkills, ...softSkills])].filter(Boolean);
    const { workReferences, personalReferences, familyReferences } = normalizeReferenceGroups(cvData);
    const validLangs = Array.isArray(languages)
        ? languages.filter(l => l && (l.language || typeof l === 'string')) : [];
    const hasData = !!(personalInfo.name || summary || education.length || experience.length);

    const contactItems = [
        { label: personalInfo.phone },
        { label: personalInfo.email },
        { label: personalInfo.linkedin?.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/') },
        { label: personalInfo.github?.replace(/https?:\/\/(www\.)?github\.com\//i, 'github.com/') },
        { label: personalInfo.portfolio },
        { label: personalInfo.address },
    ].filter(c => c.label);

    const handleDownloadPDF = async () => {
        if (!hasData) return;
        setIsDownloading(true);
        try {
            await downloadCvPdf(cvData, 'carlos', profilePicture, personalInfo?.name);
            onFirstExport?.();
        } catch (err) {
            console.error('[RightSidebarTemplate] PDF error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="cv-print-shell flex h-full min-h-0 flex-col bg-white">
            {/* ── Header bar ── */}
            <div className="cv-print-toolbar flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Vista Previa · Corporate</p>
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
            <div ref={scrollRef} className="cv-print-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-gray-100 p-4 flex flex-col items-center">
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
                    <div className="cv-print-scale-box" style={{ width: `${LETTER_PX_W * scale}px`, height: `${cvNaturalH * scale}px`, margin: 'auto', overflow: 'hidden' }}>
                        <div
                            className="cv-print-document"
                            ref={cvRef}
                            style={{
                                width: `${LETTER_PX_W}px`, minHeight: `${LETTER_PX_H}px`,
                                display: 'flex',
                                background: `linear-gradient(to left, ${SIDEBAR_BG} ${SIDEBAR_W}px, #ffffff ${SIDEBAR_W}px)`,
                                boxShadow: '0 2px 20px rgba(0,0,0,0.14)',
                                fontFamily: BODY_FONT, color: '#1a1a1a',
                                transformOrigin: 'top left', transform: `scale(${scale})`,
                            }}
                        >
                            {/* ── Main body (left) ── */}
                            <div style={{ flex: 1, padding: '36px 36px 48px 40px', minWidth: 0 }}>
                                {/* Name + Title */}
                                <h1 style={{ fontSize: '28pt', fontWeight: '800', color: '#111', margin: '0 0 10px 0', lineHeight: 1.05, letterSpacing: '-0.5px' }}>
                                    {personalInfo.name || ' '}
                                </h1>
                                {personalInfo.title && (
                                    <p style={{ fontSize: '11pt', color: BODY_ACCENT, margin: '6px 0 0', fontWeight: '500', letterSpacing: '0.3px' }}>
                                        {personalInfo.title}
                                    </p>
                                )}
                                <div style={{ height: '2px', backgroundColor: BODY_ACCENT, marginTop: '20px' }} />

                                {/* Summary */}
                                {summary && (
                                    <>
                                        <MainHead>Perfil Profesional</MainHead>
                                        <p style={{ fontSize: '9.5pt', color: '#444', lineHeight: '1.75' }}>{summary}</p>
                                    </>
                                )}

                                {/* Experience */}
                                {experience.length > 0 && (
                                    <>
                                        <MainHead>Experiencia Laboral</MainHead>
                                        {experience.map((ex, i) => (
                                            <MainEntry key={i}
                                                title={ex.position || ex.title || ''}
                                                subtitle={ex.company}
                                                dates={ex.dates}
                                                description={ex.description}
                                            />
                                        ))}
                                    </>
                                )}

                                {/* Education */}
                                {education.length > 0 && (
                                    <>
                                        <MainHead>Educación</MainHead>
                                        {education.map((ed, i) => (
                                            <MainEntry key={i}
                                                title={ed.degree || ''}
                                                subtitle={ed.institution}
                                                dates={ed.dates}
                                                description={ed.description}
                                            />
                                        ))}
                                    </>
                                )}

                                {workReferences.length > 0 && (
                                    <>
                                        <MainHead>Referencias Laborales</MainHead>
                                        {workReferences.map((reference, i) => (
                                            <p className="cv-print-entry" key={`work-${i}`} style={{ fontSize: '8.9pt', color: '#555', lineHeight: '1.65', margin: '0 0 10px' }}>
                                                {formatReferenceLine(reference)}
                                            </p>
                                        ))}
                                    </>
                                )}

                                {personalReferences.length > 0 && (
                                    <>
                                        <MainHead>Referencias Personales</MainHead>
                                        {personalReferences.map((reference, i) => (
                                            <p className="cv-print-entry" key={`personal-${i}`} style={{ fontSize: '8.9pt', color: '#555', lineHeight: '1.65', margin: '0 0 10px' }}>
                                                {formatReferenceLine(reference)}
                                            </p>
                                        ))}
                                    </>
                                )}

                                {familyReferences.length > 0 && (
                                    <>
                                        <MainHead>Referencias Familiares</MainHead>
                                        {familyReferences.map((reference, i) => (
                                            <p className="cv-print-entry" key={`family-${i}`} style={{ fontSize: '8.9pt', color: '#555', lineHeight: '1.65', margin: '0 0 10px' }}>
                                                {formatReferenceLine(reference)}
                                            </p>
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* ── Right sidebar ── */}
                            <div style={{ width: `${SIDEBAR_W}px`, flexShrink: 0, padding: '32px 22px 48px', color: '#E2E8F0' }}>
                                {/* Photo */}
                                {includePhoto && profilePicture ? (
                                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                        <img src={profilePicture} alt="Foto" crossOrigin="anonymous"
                                            style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.25)', display: 'inline-block' }} />
                                    </div>
                                ) : includePhoto ? (
                                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                        <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)', border: '3px solid rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="40" height="40" fill="rgba(255,255,255,0.35)" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Contact */}
                                {contactItems.length > 0 && (
                                    <>
                                        <SideHead>Contacto</SideHead>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {contactItems.map((c, i) => (
                                                <p key={i} style={{ fontSize: '8pt', color: '#CBD5E1', lineHeight: 1.5, margin: 0, wordBreak: 'break-all' }}>{c.label}</p>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Skills */}
                                {allSkills.length > 0 && (
                                    <>
                                        <SideHead>Habilidades</SideHead>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {allSkills.map((sk, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: ACCENT, flexShrink: 0 }} />
                                                    <span style={{ fontSize: '8.5pt', color: '#CBD5E1' }}>{sk}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Languages */}
                                {validLangs.length > 0 && (
                                    <>
                                        <SideHead>Idiomas</SideHead>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {validLangs.map((l, i) => (
                                                <p key={i} style={{ fontSize: '8.5pt', color: '#CBD5E1', margin: 0, lineHeight: 1.5 }}>
                                                    {typeof l === 'string' ? l : [l.language, l.level].filter(Boolean).join(' — ')}
                                                </p>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RightSidebarTemplate;
