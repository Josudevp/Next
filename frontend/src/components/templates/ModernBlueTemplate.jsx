import { useRef, useState, useEffect } from 'react';
import { Download, Loader2, FileText, Phone, Mail, Linkedin, Github, Globe, MapPin } from 'lucide-react';
import { downloadCvPdf, sortByDateDesc, normalizeReferenceGroups, formatReferenceLine } from '../../utils/pdfUtils';

// Letter (8.5 × 11 in) at 96 dpi ≈ 816 × 1056 px
const LETTER_PX_W = 816;
const LETTER_PX_H = 1056;
const SIDEBAR_W = 272; // ~1/3 del ancho Letter

const ModernBlueTemplate = ({ cvData = {}, profilePicture = null, onFirstExport }) => {
    const cvRef = useRef(null);
    const scrollRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [scale, setScale] = useState(1);
    const [cvNaturalH, setCvNaturalH] = useState(LETTER_PX_H);

    useEffect(() => {
        if (!scrollRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            const available = entry.contentRect.width - 32;
            setScale(Math.min(1, available / LETTER_PX_W));
        });
        ro.observe(scrollRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!cvRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            setCvNaturalH(entry.contentRect.height);
        });
        ro.observe(cvRef.current);
        return () => ro.disconnect();
    }, []);

    const {
        personalInfo = {},
        summary,
        education: rawEdu = [],
        experience: rawExp = [],
        skills = {},
        languages = [],
        includePhoto,
    } = cvData;
    const experience = sortByDateDesc(rawExp);
    const education  = sortByDateDesc(rawEdu);

    const techSkills = Array.isArray(skills?.technical) ? skills.technical : [];
    const softSkills = Array.isArray(skills?.soft) ? skills.soft : [];
    const allSkills = [...new Set([...techSkills, ...softSkills])].filter(Boolean);
    const { workReferences, personalReferences } = normalizeReferenceGroups(cvData);

    const validLangs = Array.isArray(languages)
        ? languages.filter(l => l && (l.language || typeof l === 'string'))
        : [];

    const hasData = !!(personalInfo.name || summary || education.length || experience.length);

    // ── Contacto items con iconos ──
    const contactItems = [
        { icon: Phone, value: personalInfo.phone },
        { icon: Mail, value: personalInfo.email },
        { icon: Linkedin, value: personalInfo.linkedin?.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/') },
        { icon: Github, value: personalInfo.github?.replace(/https?:\/\/(www\.)?github\.com\//i, 'github.com/') },
        { icon: Globe, value: personalInfo.portfolio },
        { icon: MapPin, value: personalInfo.address },
    ].filter(item => item.value);

    const handleDownloadPDF = async () => {
        if (!hasData) return;
        setIsDownloading(true);
        try {
            await downloadCvPdf(cvData, 'daniel', profilePicture, personalInfo?.name);
            onFirstExport?.();
        } catch (err) {
            console.error('[ModernBlueTemplate] PDF error:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    // ── Sidebar section heading ──
    const SidebarHeading = ({ children }) => (
        <div style={{ marginTop: '20px', marginBottom: '10px', paddingBottom: '4px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
            <span style={{ fontSize: '8.5pt', fontWeight: '700', letterSpacing: '2.5px', color: '#ffffff', textTransform: 'uppercase' }}>
                {children}
            </span>
        </div>
    );

    // ── Main body section heading ──
    const BodyHeading = ({ children }) => (
        <div style={{ marginTop: '22px', marginBottom: '10px', paddingBottom: '4px', borderBottom: '2px solid #436696' }}>
            <span style={{ fontSize: '9.5pt', fontWeight: '700', letterSpacing: '2px', color: '#436696', textTransform: 'uppercase' }}>
                {children}
            </span>
        </div>
    );

    return (
        <div className="cv-print-shell flex h-full min-h-0 flex-col bg-white">
            {/* Header */}
            <div className="cv-print-toolbar flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Vista Previa · Modern Blue</p>
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

            {/* Scroll area */}
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
                    <div className="cv-print-scale-box" style={{
                        width: `${LETTER_PX_W * scale}px`,
                        height: `${cvNaturalH * scale}px`,
                        margin: 'auto',
                        overflow: 'hidden',
                    }}>
                        {/* ── A4 Sheet ── */}
                        <div
                            className="cv-print-document"
                            ref={cvRef}
                            id="cv-a4-preview"
                            style={{
                                width: `${LETTER_PX_W}px`,
                                display: 'flex',
                                background: `linear-gradient(to right, #436696 ${SIDEBAR_W}px, #ffffff ${SIDEBAR_W}px)`,
                                boxShadow: '0 2px 20px rgba(0,0,0,0.14)',
                                fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                                color: '#1a1a1a',
                                transformOrigin: 'top left',
                                transform: `scale(${scale})`,
                                minHeight: `${LETTER_PX_H}px`,
                            }}
                        >
                            {/* ════════════ SIDEBAR ════════════ */}
                            <div style={{
                                width: `${SIDEBAR_W}px`,
                                flexShrink: 0,
                                color: '#ffffff',
                                padding: '28px 22px 28px 22px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}>
                                {/* Foto */}
                                {includePhoto && profilePicture ? (
                                    <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                                        <img
                                            src={profilePicture}
                                            alt="Foto"
                                            crossOrigin="anonymous"
                                            style={{
                                                width: '128px', height: '128px', borderRadius: '50%',
                                                objectFit: 'cover', border: '3px solid #ffffff',
                                                display: 'inline-block',
                                            }}
                                        />
                                    </div>
                                ) : includePhoto ? (
                                    <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                                        <div style={{
                                            width: '128px', height: '128px', borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.15)', border: '3px solid #ffffff',
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <svg width="44" height="44" fill="rgba(255,255,255,0.5)" viewBox="0 0 24 24">
                                                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                            </svg>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Contacto */}
                                {contactItems.length > 0 && (
                                    <>
                                        <SidebarHeading>Contacto</SidebarHeading>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {contactItems.map((item, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                    <item.icon size={12} style={{ marginTop: '2px', flexShrink: 0, opacity: 0.7 }} />
                                                    <span style={{ fontSize: '9pt', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                                        {item.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Habilidades */}
                                {allSkills.length > 0 && (
                                    <>
                                        <SidebarHeading>Habilidades</SidebarHeading>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {allSkills.map((skill, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{
                                                        width: '5px', height: '5px', borderRadius: '50%',
                                                        backgroundColor: '#3B82F6', flexShrink: 0,
                                                    }} />
                                                    <span style={{ fontSize: '9pt', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                                                        {skill}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Idiomas */}
                                {validLangs.length > 0 && (
                                    <>
                                        <SidebarHeading>Idiomas</SidebarHeading>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {validLangs.map((l, i) => {
                                                const text = typeof l === 'string' ? l : [l.language, l.level].filter(Boolean).join(' — ');
                                                return (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{
                                                            width: '5px', height: '5px', borderRadius: '50%',
                                                            backgroundColor: '#60A5FA', flexShrink: 0,
                                                        }} />
                                                        <span style={{ fontSize: '9pt', color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>
                                                            {text}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}

                            </div>

                            {/* ════════════ MAIN BODY ════════════ */}
                            <div style={{
                                flex: 1,
                                padding: '28px 28px 28px 28px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}>
                                {/* Nombre + Título */}
                                <div>
                                    <h1 style={{
                                        fontSize: '24pt', fontWeight: '800', color: '#436696',
                                        margin: 0, lineHeight: 1.1, letterSpacing: '-0.3px',
                                    }}>
                                        {personalInfo.name || ' '}
                                    </h1>
                                    {personalInfo.title && (
                                        <p style={{ fontSize: '10.5pt', color: '#3B82F6', margin: '6px 0 0', fontWeight: '500', letterSpacing: '0.3px' }}>
                                            {personalInfo.title}
                                        </p>
                                    )}
                                </div>

                                {/* Perfil Profesional */}
                                {summary && (
                                    <>
                                        <BodyHeading>Perfil Profesional</BodyHeading>
                                        <p style={{ fontSize: '10.5pt', color: '#444', lineHeight: '1.7', margin: '0' }}>
                                            {summary}
                                        </p>
                                    </>
                                )}

                                {/* Experiencia */}
                                {experience.length > 0 && (
                                    <>
                                        <BodyHeading>Experiencia Laboral</BodyHeading>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            {experience.map((ex, i) => (
                                                <div className="cv-print-entry" key={i}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                                        <span style={{ fontSize: '9.5pt', fontWeight: '700', color: '#111', flex: 1 }}>
                                                            {ex.position || ex.title || ''}
                                                            {ex.projectLabel && (
                                                                <span style={{
                                                                    fontSize: '6.9pt', marginLeft: '6px',
                                                                    color: '#3B82F6', fontWeight: '600',
                                                                }}>
                                                                    Proyecto
                                                                </span>
                                                            )}
                                                        </span>
                                                        {ex.dates && (
                                                            <span style={{ fontSize: '8.5pt', color: '#888', flexShrink: 0 }}>{ex.dates}</span>
                                                        )}
                                                    </div>
                                                    {ex.company && (
                                                        <p style={{ fontSize: '9.5pt', color: '#436696', fontWeight: '500', margin: '2px 0 4px' }}>
                                                            {ex.company}
                                                        </p>
                                                    )}
                                                    {ex.description && (
                                                        <p style={{ fontSize: '9.5pt', color: '#555', lineHeight: '1.65', margin: 0 }}>
                                                            {ex.description}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Educación */}
                                {education.length > 0 && (
                                    <>
                                        <BodyHeading>Educación</BodyHeading>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                            {education.map((ed, i) => (
                                                <div className="cv-print-entry" key={i}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                                        <span style={{ fontSize: '10.5pt', fontWeight: '700', color: '#111', flex: 1 }}>
                                                            {ed.degree || ''}
                                                        </span>
                                                        {ed.dates && (
                                                            <span style={{ fontSize: '8.5pt', color: '#888', flexShrink: 0 }}>{ed.dates}</span>
                                                        )}
                                                    </div>
                                                    {ed.institution && (
                                                        <p style={{ fontSize: '9.5pt', color: '#436696', fontWeight: '500', margin: '2px 0 4px' }}>
                                                            {ed.institution}
                                                        </p>
                                                    )}
                                                    {ed.description && (
                                                        <p style={{ fontSize: '9.5pt', color: '#555', lineHeight: '1.65', margin: 0 }}>
                                                            {ed.description}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {workReferences.length > 0 && (
                                    <>
                                        <BodyHeading>Referencias Laborales</BodyHeading>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {workReferences.map((reference, i) => (
                                                <p className="cv-print-entry" key={`work-${i}`} style={{ fontSize: '9.3pt', color: '#555', lineHeight: '1.65', margin: 0 }}>
                                                    {formatReferenceLine(reference)}
                                                </p>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {personalReferences.length > 0 && (
                                    <>
                                        <BodyHeading>Referencias Personales</BodyHeading>
                                        <div className="cv-print-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {personalReferences.map((reference, i) => (
                                                <p className="cv-print-entry" key={`personal-${i}`} style={{ fontSize: '9.3pt', color: '#555', lineHeight: '1.65', margin: 0 }}>
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

export default ModernBlueTemplate;
