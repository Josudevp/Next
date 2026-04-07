import { useRef, useState, useEffect } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import { downloadCvPdf, sortByDateDesc, normalizeReferenceGroups, formatReferenceLine } from '../../utils/pdfUtils';

const LETTER_PX_W = 816;
const LETTER_PX_H = 1056;
const ACCENT  = '#1E5F5F';
const SERIF   = '"Georgia","Times New Roman",serif';

// ── Sub-components ────────────────────────────────────────────────────────────
const SectionHead = ({ children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '24px 0 12px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: ACCENT, opacity: 0.35 }} />
        <span style={{ fontFamily: SERIF, fontSize: '8.5pt', fontWeight: '700', color: ACCENT, letterSpacing: '3px', textTransform: 'uppercase' }}>
            {children}
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: ACCENT, opacity: 0.35 }} />
    </div>
);

const EntryBlock = ({ title, subtitle, dates, description }) => (
    <div className="cv-print-entry" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontFamily: SERIF, fontSize: '10.5pt', fontWeight: '700', color: '#1a1a1a', flex: 1 }}>{title}</span>
            {dates && <span style={{ fontFamily: SERIF, fontSize: '8.5pt', color: '#888', flexShrink: 0, fontStyle: 'italic' }}>{dates}</span>}
        </div>
        {subtitle    && <p style={{ fontFamily: SERIF, fontSize: '9.5pt', color: ACCENT, fontStyle: 'italic', margin: '2px 0 5px' }}>{subtitle}</p>}
        {description && <p style={{ fontFamily: SERIF, fontSize: '9.5pt', color: '#555', lineHeight: '1.75', margin: 0 }}>{description}</p>}
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ExecutiveTemplate = ({ cvData = {}, profilePicture = null, onFirstExport }) => {
    const cvRef     = useRef(null);
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

    const contactLine = [
        personalInfo.phone,
        personalInfo.email,
        [personalInfo.documentType, personalInfo.documentNumber].filter(Boolean).join(' '), personalInfo.linkedin?.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/'),
        personalInfo.github?.replace(/https?:\/\/(www\.)?github\.com\//i, 'github.com/'),
        personalInfo.portfolio,
        personalInfo.address,
    ].filter(Boolean).join('  ·  ');

    const handleDownloadPDF = async () => {
        if (!hasData) return;
        setIsDownloading(true);
        try {
            await downloadCvPdf(cvData, 'jordi', profilePicture, personalInfo?.name);
            onFirstExport?.();
        } catch (err) {
            console.error('[ExecutiveTemplate] PDF error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="cv-print-shell flex h-full min-h-0 flex-col bg-white">
            {/* ── Header bar ── */}
            <div className="cv-print-toolbar flex items-center justify-between px-4 py-2.5 border-b border-gray-100 shrink-0">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Vista Previa · Executive</p>
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
                                backgroundColor: '#FAFAF7',
                                boxShadow: '0 2px 20px rgba(0,0,0,0.14)',
                                fontFamily: SERIF, color: '#1a1a1a',
                                transformOrigin: 'top left', transform: `scale(${scale})`,
                            }}
                        >
                            {/* Top teal accent bar */}
                            <div style={{ height: '5px', backgroundColor: ACCENT }} />

                            <div style={{ padding: '36px 80px 48px' }}>
                                {/* ── Centered header ── */}
                                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                    {includePhoto && profilePicture ? (
                                        <img src={profilePicture} alt="Foto" crossOrigin="anonymous"
                                            style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${ACCENT}`, display: 'inline-block', marginBottom: '14px' }} />
                                    ) : includePhoto ? (
                                        <div style={{ width: '120px', height: '120px', borderRadius: '50%', backgroundColor: '#E5E7EB', border: `2px solid ${ACCENT}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                                            <svg width="36" height="36" fill="#9CA3AF" viewBox="0 0 24 24"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                                        </div>
                                    ) : null}
                                    <h1 style={{ fontFamily: SERIF, fontSize: '28pt', fontWeight: '400', color: '#111', margin: 0, letterSpacing: '4px', textTransform: 'uppercase', lineHeight: 1.1 }}>
                                        {personalInfo.name || ' '}
                                    </h1>
                                    {personalInfo.title && (
                                        <p style={{ fontFamily: SERIF, fontSize: '10.5pt', color: ACCENT, margin: '8px 0 0', fontStyle: 'italic', letterSpacing: '1.5px' }}>
                                            {personalInfo.title}
                                        </p>
                                    )}
                                    {contactLine && (
                                        <p style={{ fontSize: '7.5pt', color: '#777', margin: '10px 0 0', letterSpacing: '0.5px', lineHeight: 1.8 }}>
                                            {contactLine}
                                        </p>
                                    )}
                                </div>

                                {/* Double-line divider */}
                                <div style={{ borderTop: `2px solid ${ACCENT}`, paddingTop: '4px' }}>
                                    <div style={{ height: '1px', backgroundColor: ACCENT, opacity: 0.3 }} />
                                </div>

                                {/* ── Summary ── */}
                                {summary && (
                                    <>
                                        <SectionHead>Perfil Profesional</SectionHead>
                                        <p style={{ fontFamily: SERIF, fontSize: '9.5pt', color: '#444', lineHeight: '1.8', textAlign: 'justify' }}>{summary}</p>
                                    </>
                                )}

                                {/* ── Experience ── */}
                                {experience.length > 0 && (
                                    <>
                                        <SectionHead>Experiencia Laboral</SectionHead>
                                        {experience.map((ex, i) => (
                                            <EntryBlock key={i}
                                                title={ex.position || ex.title || ''}
                                                subtitle={ex.company}
                                                dates={ex.dates}
                                                description={ex.description}
                                            />
                                        ))}
                                    </>
                                )}

                                {/* ── Education ── */}
                                {education.length > 0 && (
                                    <>
                                        <SectionHead>Educación</SectionHead>
                                        {education.map((ed, i) => (
                                            <EntryBlock key={i}
                                                title={ed.degree || ''}
                                                subtitle={ed.institution}
                                                dates={ed.dates}
                                                description={ed.description}
                                            />
                                        ))}
                                    </>
                                )}

                                {/* ── Skills ── */}
                                {allSkills.length > 0 && (
                                    <>
                                        <SectionHead>Competencias</SectionHead>
                                        <p style={{ fontFamily: SERIF, fontSize: '9.5pt', color: '#444', lineHeight: '1.8', textAlign: 'center' }}>
                                            {allSkills.join('   ·   ')}
                                        </p>
                                    </>
                                )}

                                {/* ── Languages ── */}
                                {validLangs.length > 0 && (
                                    <>
                                        <SectionHead>Idiomas</SectionHead>
                                        <p style={{ fontFamily: SERIF, fontSize: '9.5pt', color: '#444', lineHeight: '1.8', textAlign: 'center' }}>
                                            {validLangs.map(l => typeof l === 'string' ? l : [l.language, l.level].filter(Boolean).join(' — ')).join('   ·   ')}
                                        </p>
                                    </>
                                )}

                                {workReferences.length > 0 && (
                                    <>
                                        <SectionHead>Referencias Laborales</SectionHead>
                                        {workReferences.map((reference, i) => (
                                            <p className="cv-print-entry" key={`work-${i}`} style={{ fontFamily: SERIF, fontSize: '9.3pt', color: '#444', lineHeight: '1.8', textAlign: 'center', margin: '0 0 6px' }}>
                                                {formatReferenceLine(reference)}
                                            </p>
                                        ))}
                                    </>
                                )}

                                {personalReferences.length > 0 && (
                                    <>
                                        <SectionHead>Referencias Personales</SectionHead>
                                        {personalReferences.map((reference, i) => (
                                            <p className="cv-print-entry" key={`personal-${i}`} style={{ fontFamily: SERIF, fontSize: '9.3pt', color: '#444', lineHeight: '1.8', textAlign: 'center', margin: '0 0 6px' }}>
                                                {formatReferenceLine(reference)}
                                            </p>
                                        ))}
                                    </>
                                )}

                                {familyReferences.length > 0 && (
                                    <>
                                        <SectionHead>Referencias Familiares</SectionHead>
                                        {familyReferences.map((reference, i) => (
                                            <p className="cv-print-entry" key={`family-${i}`} style={{ fontFamily: SERIF, fontSize: '9.3pt', color: '#444', lineHeight: '1.8', textAlign: 'center', margin: '0 0 6px' }}>
                                                {formatReferenceLine(reference)}
                                            </p>
                                        ))}
                                    </>
                                )}

                                {/* Bottom accent line */}
                                <div style={{ height: '3px', backgroundColor: ACCENT, opacity: 0.4, marginTop: '36px' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExecutiveTemplate;
