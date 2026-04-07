import { useRef, useState, useEffect } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import { downloadCvPdf, sortByDateDesc, normalizeReferenceGroups, formatReferenceLine } from '../../utils/pdfUtils';

const LETTER_PX_W = 816;
const LETTER_PX_H = 1056;
const ACCENT = '#16A34A';
const MONO = '"Fira Code","JetBrains Mono","Courier New",monospace';
const SANS = '"Inter","Segoe UI",system-ui,sans-serif';

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionHead = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '22px 0 10px' }}>
        <span style={{ fontFamily: MONO, fontSize: '10pt', color: ACCENT, fontWeight: '700', lineHeight: 1 }}>{'>'}</span>
        <span style={{ fontFamily: MONO, fontSize: '7.5pt', fontWeight: '700', color: '#111', letterSpacing: '2.5px', textTransform: 'uppercase' }}>{children}</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#BBF7D0' }} />
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const TechTemplate = ({ cvData = {}, profilePicture = null, onFirstExport }) => {
    const cvRef    = useRef(null);
    const scrollRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [scale, setScale]       = useState(1);
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

    const contactParts = [
        personalInfo.phone,
        personalInfo.email,
        [personalInfo.documentType, personalInfo.documentNumber].filter(Boolean).join(' '), personalInfo.linkedin?.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/'),
        personalInfo.github?.replace(/https?:\/\/(www\.)?github\.com\//i, 'github.com/'),
        personalInfo.portfolio,
        personalInfo.address,
    ].filter(Boolean);

    const handleDownloadPDF = async () => {
        if (!hasData) return;
        setIsDownloading(true);
        try {
            await downloadCvPdf(cvData, 'murad', profilePicture, personalInfo?.name);
            onFirstExport?.();
        } catch (err) {
            console.error('[TechTemplate] PDF error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="cv-print-shell flex h-full min-h-0 flex-col bg-white">
            {/* ── Header bar ── */}
            <div className="cv-print-toolbar flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Vista Previa · Tech Dev</p>
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
                                display: 'flex', background: `linear-gradient(to right, ${ACCENT} 5px, #ffffff 5px)`,
                                boxShadow: '0 2px 20px rgba(0,0,0,0.14)',
                                fontFamily: SANS, color: '#1a1a1a',
                                transformOrigin: 'top left', transform: `scale(${scale})`,
                            }}
                        >
                            {/* Left green accent bar */}
                            <div style={{ width: '5px', flexShrink: 0 }} />

                            {/* Content */}
                            <div style={{ flex: 1, padding: '32px 80px 44px 62px' }}
                            >

                                {/* ── Header ── */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                                    <div style={{ flex: 1 }}>
                                        <h1 style={{ fontFamily: MONO, fontSize: '27pt', fontWeight: '700', color: '#0a0a0a', margin: 0, lineHeight: 1.05, letterSpacing: '-0.5px' }}>
                                            {personalInfo.name || ' '}
                                        </h1>
                                        {personalInfo.title && (
                                            <p style={{ fontFamily: MONO, fontSize: '10.5pt', color: ACCENT, margin: '5px 0 0', fontWeight: '500' }}>
                                                {'// '}{personalInfo.title}
                                            </p>
                                        )}
                                        {contactParts.length > 0 && (
                                            <p style={{ fontSize: '8.5pt', color: '#666', margin: '10px 0 0', lineHeight: 1.7 }}>
                                                {contactParts.join(' · ')}
                                            </p>
                                        )}
                                    </div>
                                    {/* Profile photo */}
                                    {includePhoto && profilePicture ? (
                                        <img src={profilePicture} alt="Foto" crossOrigin="anonymous"
                                            style={{ width: '110px', height: '110px', borderRadius: '8px', objectFit: 'cover', border: `2px solid ${ACCENT}`, flexShrink: 0, marginRight: '8px' }} />
                                    ) : includePhoto ? (
                                        <div style={{ width: '110px', height: '110px', borderRadius: '8px', background: '#D1FAE5', border: `2px solid ${ACCENT}`, flexShrink: 0, marginRight: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="40" height="40" fill={ACCENT} opacity="0.5" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                                        </div>
                                    ) : null}
                                </div>

                                <div style={{ height: '1.5px', backgroundColor: '#D1FAE5', margin: '18px 0' }} />

                                {/* ── Perfil ── */}
                                {summary && (
                                    <>
                                        <SectionHead>Perfil Profesional</SectionHead>
                                        <p style={{ fontSize: '9.5pt', color: '#444', lineHeight: '1.7' }}>{summary}</p>
                                    </>
                                )}

                                {/* ── Skills ── */}
                                {allSkills.length > 0 && (
                                    <>
                                        <SectionHead>Stack & Habilidades</SectionHead>
                                        <p style={{ fontSize: '9.5pt', color: '#444', lineHeight: '1.7', fontFamily: MONO }}>
                                            {allSkills.join(' · ')}
                                        </p>
                                    </>
                                )}

                                {/* ── Experience ── */}
                                {experience.length > 0 && (
                                    <>
                                        <SectionHead>Experiencia Laboral</SectionHead>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {experience.map((ex, i) => (
                                                <div className="cv-print-entry" key={i} style={{ paddingLeft: '14px', borderLeft: '2px solid #D1FAE5' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                                        <span style={{ fontSize: '10.5pt', fontWeight: '700', color: '#111', flex: 1 }}>
                                                            {ex.position || ex.title || ''}
                                                            {ex.projectLabel && (
                                                                <span style={{ fontFamily: MONO, fontSize: '7pt', marginLeft: '7px', color: ACCENT }}>proyecto</span>
                                                            )}
                                                        </span>
                                                        {ex.dates && <span style={{ fontFamily: MONO, fontSize: '8pt', color: '#888', flexShrink: 0 }}>{ex.dates}</span>}
                                                    </div>
                                                    {ex.company && <p style={{ fontFamily: MONO, fontSize: '9pt', color: ACCENT, fontWeight: '500', margin: '2px 0 4px' }}>@ {ex.company}</p>}
                                                    {ex.description && <p style={{ fontSize: '9.5pt', color: '#555', lineHeight: '1.65', margin: 0 }}>{ex.description}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* ── Education ── */}
                                {education.length > 0 && (
                                    <>
                                        <SectionHead>Educación</SectionHead>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            {education.map((ed, i) => (
                                                <div className="cv-print-entry" key={i} style={{ paddingLeft: '14px', borderLeft: '2px solid #D1FAE5' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                                        <span style={{ fontSize: '10.5pt', fontWeight: '700', color: '#111', flex: 1 }}>{ed.degree || ''}</span>
                                                        {ed.dates && <span style={{ fontFamily: MONO, fontSize: '8pt', color: '#888', flexShrink: 0 }}>{ed.dates}</span>}
                                                    </div>
                                                    {ed.institution && <p style={{ fontFamily: MONO, fontSize: '9pt', color: ACCENT, fontWeight: '500', margin: '2px 0' }}>@ {ed.institution}</p>}
                                                    {ed.description && <p style={{ fontSize: '9.5pt', color: '#555', lineHeight: '1.65', margin: 0 }}>{ed.description}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* ── Languages ── */}
                                {validLangs.length > 0 && (
                                    <>
                                        <SectionHead>Idiomas</SectionHead>
                                        <p style={{ fontSize: '9.5pt', color: '#444', lineHeight: 1.7 }}>
                                            {validLangs.map(l => typeof l === 'string' ? l : [l.language, l.level].filter(Boolean).join(' — ')).join('   ·   ')}
                                        </p>
                                    </>
                                )}

                                {workReferences.length > 0 && (
                                    <>
                                        <SectionHead>Referencias Laborales</SectionHead>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {workReferences.map((reference, i) => (
                                                <p className="cv-print-entry" key={`work-${i}`} style={{ fontSize: '9pt', color: '#444', lineHeight: 1.7, margin: 0, fontFamily: MONO }}>
                                                    {formatReferenceLine(reference)}
                                                </p>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {personalReferences.length > 0 && (
                                    <>
                                        <SectionHead>Referencias Personales</SectionHead>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {personalReferences.map((reference, i) => (
                                                <p className="cv-print-entry" key={`personal-${i}`} style={{ fontSize: '9pt', color: '#444', lineHeight: 1.7, margin: 0, fontFamily: MONO }}>
                                                    {formatReferenceLine(reference)}
                                                </p>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {familyReferences.length > 0 && (
                                    <>
                                        <SectionHead>Referencias Familiares</SectionHead>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {familyReferences.map((reference, i) => (
                                                <p className="cv-print-entry" key={`family-${i}`} style={{ fontSize: '9pt', color: '#444', lineHeight: 1.7, margin: 0, fontFamily: MONO }}>
                                                    {formatReferenceLine(reference)}
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

export default TechTemplate;
