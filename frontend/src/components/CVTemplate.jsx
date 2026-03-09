import { useRef, useState, useEffect } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ── Sub-components (inline styles para que html2canvas los capture fielmente) ──

// 210mm at 96 dpi ≈ 794 px — the canonical A4 width we render at
const A4_PX_W = 794;

const SectionHeading = ({ children }) => (
    <div style={{ borderBottom: '1.5px solid #111', marginTop: '22px', marginBottom: '8px', paddingBottom: '3px' }}>
        <span style={{ fontSize: '8.5pt', fontWeight: '700', letterSpacing: '2px', color: '#111' }}>
            {children}
        </span>
    </div>
);

const EntryBlock = ({ title, subtitle, dates, description, isProject }) => (
    <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '9.5pt', fontWeight: '700', color: '#111', flex: 1 }}>
                {title}
                {isProject && (
                    <span style={{
                        display: 'inline-block',
                        fontSize: '6.9pt',
                        lineHeight: 1.1,
                        marginLeft: '7px',
                        color: '#2563EB',
                        fontWeight: '600',
                        verticalAlign: 'middle',
                        position: 'relative',
                        top: '-1px',
                    }}>
                        Proyecto
                    </span>
                )}
            </span>
            {dates && (
                <span style={{ fontSize: '8pt', color: '#666', flexShrink: 0 }}>{dates}</span>
            )}
        </div>
        {subtitle && (
            <p style={{ fontSize: '8.5pt', color: '#555', fontStyle: 'italic', margin: '3px 0 4px' }}>{subtitle}</p>
        )}
        {description && (
            <p style={{ fontSize: '8.5pt', color: '#444', lineHeight: '1.65', margin: 0 }}>{description}</p>
        )}
    </div>
);

// ── Main Component ──────────────────────────────────────────────────────────

const CVTemplate = ({ cvData = {}, profilePicture = null }) => {
    const cvRef = useRef(null);
    const scrollRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // ── Auto-scale A4 sheet to fit the panel width ──────────────────────────
    const [scale, setScale] = useState(1);
    const [cvNaturalH, setCvNaturalH] = useState(1123); // fallback: 297mm @ 96dpi

    useEffect(() => {
        if (!scrollRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            const available = entry.contentRect.width - 32; // 16px padding × 2
            setScale(Math.min(1, available / A4_PX_W));
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
    }, []);  // re-runs whenever cvRef changes

    const {
        personalInfo = {},
        summary,
        education = [],
        experience = [],
        skills = {},
        languages = [],
        includePhoto,
    } = cvData;

    const techSkills = Array.isArray(skills?.technical) ? skills.technical : [];
    const softSkills = Array.isArray(skills?.soft) ? skills.soft : [];
    const allSkills = [...new Set([...techSkills, ...softSkills])].filter(Boolean);

    const validLangs = Array.isArray(languages)
        ? languages.filter(l => l && (l.language || typeof l === 'string'))
        : [];

    const hasData = !!(personalInfo.name || summary || education.length || experience.length);

    const contactLine = [
        personalInfo.phone,
        personalInfo.email,
        personalInfo.linkedin?.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/'),
        personalInfo.github?.replace(/https?:\/\/(www\.)?github\.com\//i, 'github.com/'),
        personalInfo.portfolio,
        personalInfo.address,
    ].filter(Boolean).join('   ·   ');

    const handleDownloadPDF = async () => {
        if (!cvRef.current || !hasData) return;
        setIsDownloading(true);
        let exportHost = null;
        try {
            const el = cvRef.current;

            // Render from an offscreen clone so the exported PDF never depends
            // on the scaled preview state used by the split-screen UI.
            exportHost = document.createElement('div');
            exportHost.style.position = 'fixed';
            exportHost.style.left = '-10000px';
            exportHost.style.top = '0';
            exportHost.style.width = `${A4_PX_W}px`;
            exportHost.style.background = '#ffffff';
            exportHost.style.padding = '0';
            exportHost.style.margin = '0';
            exportHost.style.overflow = 'visible';
            exportHost.style.zIndex = '-1';

            const clone = el.cloneNode(true);
            clone.style.transform = 'none';
            clone.style.transformOrigin = 'top left';
            clone.style.width = `${A4_PX_W}px`;
            clone.style.margin = '0';
            clone.style.boxShadow = 'none';

            exportHost.appendChild(clone);
            document.body.appendChild(exportHost);

            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: A4_PX_W,
                windowWidth: A4_PX_W,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
            });

            document.body.removeChild(exportHost);
            exportHost = null;

            if (!canvas.width || !canvas.height) {
                throw new Error('Canvas exportado sin dimensiones válidas.');
            }

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfW = pdf.internal.pageSize.getWidth();
            const pdfH = pdf.internal.pageSize.getHeight();
            const imgData = canvas.toDataURL('image/png');
            const marginMm = 10;
            const maxW = pdfW - marginMm * 2;
            const maxH = pdfH - marginMm * 2;
            const aspect = canvas.width / canvas.height;

            if (!Number.isFinite(aspect) || aspect <= 0) {
                throw new Error('Dimensiones inválidas del canvas para el PDF.');
            }

            let renderW = maxW;
            let renderH = renderW / aspect;
            if (renderH > maxH) {
                renderH = maxH;
                renderW = renderH * aspect;
            }

            if (!Number.isFinite(renderW) || !Number.isFinite(renderH) || renderW <= 0 || renderH <= 0) {
                throw new Error('Dimensiones inválidas al ajustar el PDF a A4.');
            }

            const offsetX = (pdfW - renderW) / 2;
            const offsetY = marginMm;
            pdf.addImage(imgData, 'PNG', offsetX, offsetY, renderW, renderH, undefined, 'FAST');

            const safeName = (personalInfo.name || 'MiCV')
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9\s]/g, '').trim()
                .replace(/\s+/g, '_');
            pdf.save(`CV_${safeName}.pdf`);
        } catch (err) {
            console.error('[CVTemplate] Error generando PDF:', err);
        } finally {
            if (exportHost?.parentNode) {
                exportHost.parentNode.removeChild(exportHost);
            }
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* ── Header con botón de descarga ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 flex-shrink-0">
                <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Vista Previa · Harvard</p>
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

            {/* ── Área de scroll con la hoja A4 ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100 p-4">
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
                    /* ── Wrapper que reserva el espacio correcto al aplicar scale ── */
                    <div style={{
                        width: `${A4_PX_W * scale}px`,
                        height: `${cvNaturalH * scale}px`,
                        margin: '0 auto',
                        overflow: 'hidden',
                    }}>
                    {/* ── Hoja A4 (capturada por html2canvas a tamaño natural) ── */}
                    <div
                        ref={cvRef}
                        id="cv-a4-preview"
                        style={{
                            width: `${A4_PX_W}px`,
                            padding: '5mm 20mm 20mm',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 2px 20px rgba(0,0,0,0.14)',
                            fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
                            color: '#1a1a1a',
                            transformOrigin: 'top left',
                            transform: `scale(${scale})`,
                        }}
                    >
                        {/* ── ENCABEZADO: Nombre + Foto ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <h1 style={{
                                    fontSize: '26pt', fontWeight: '800', letterSpacing: '-0.3px',
                                    lineHeight: 1.05, margin: '0 0 8px 0', color: '#0a0a0a', textTransform: 'uppercase',
                                }}>
                                    {personalInfo.name || ' '}
                                </h1>
                                {personalInfo.title && (
                                    <p style={{ fontSize: '11pt', color: '#555', margin: '2px 0 0', fontStyle: 'italic', letterSpacing: '0.2px' }}>
                                        {personalInfo.title}
                                    </p>
                                )}
                            </div>

                            {/* Foto de perfil */}
                            {includePhoto && profilePicture ? (
                                <img
                                    src={profilePicture}
                                    alt="Foto de perfil"
                                    crossOrigin="anonymous"
                                    style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                                />
                            ) : includePhoto ? (
                                <div style={{
                                    width: '90px', height: '90px', borderRadius: '50%',
                                    background: '#E5E7EB', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <svg width="40" height="40" fill="#9CA3AF" viewBox="0 0 24 24">
                                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                                    </svg>
                                </div>
                            ) : null}
                        </div>

                        {/* Línea divisora principal */}
                        <hr style={{ border: 'none', borderTop: '2px solid #111', margin: '16px 0 8px' }} />

                        {/* ── LÍNEA DE CONTACTO ── */}
                        {contactLine && (
                            <p style={{ fontSize: '8pt', color: '#444', margin: '6px 0 0', letterSpacing: '0.3px', lineHeight: 1.7 }}>
                                {contactLine}
                            </p>
                        )}

                        {/* ── PERFIL PROFESIONAL ── */}
                        {summary && (
                            <>
                                <SectionHeading>PERFIL PROFESIONAL</SectionHeading>
                                <p style={{ fontSize: '9.5pt', color: '#333', lineHeight: '1.7', margin: '8px 0 0' }}>{summary}</p>
                            </>
                        )}

                        {/* ── EXPERIENCIA LABORAL ── */}
                        {experience.length > 0 && (
                            <>
                                <SectionHeading>EXPERIENCIA LABORAL</SectionHeading>
                                <div style={{ marginTop: '8px' }}>
                                    {experience.map((ex, i) => (
                                        <EntryBlock
                                            key={i}
                                            title={ex.position || ex.title || ''}
                                            subtitle={ex.company}
                                            dates={ex.dates}
                                            description={ex.description}
                                            isProject={ex.projectLabel}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── EDUCACIÓN ── */}
                        {education.length > 0 && (
                            <>
                                <SectionHeading>EDUCACIÓN</SectionHeading>
                                <div style={{ marginTop: '8px' }}>
                                    {education.map((ed, i) => (
                                        <EntryBlock
                                            key={i}
                                            title={ed.degree || ''}
                                            subtitle={ed.institution}
                                            dates={ed.dates}
                                            description={ed.description}
                                        />
                                    ))}
                                </div>
                            </>
                        )}

                        {/* ── HABILIDADES ── */}
                        {allSkills.length > 0 && (
                            <>
                                <SectionHeading>HABILIDADES</SectionHeading>
                                <p style={{ fontSize: '9.5pt', color: '#333', lineHeight: '1.7', margin: '8px 0 0' }}>
                                    {allSkills.join('  ·  ')}
                                </p>
                            </>
                        )}

                        {/* ── IDIOMAS ── */}
                        {validLangs.length > 0 && (
                            <>
                                <SectionHeading>IDIOMAS</SectionHeading>
                                <p style={{ fontSize: '9.5pt', color: '#333', lineHeight: '1.7', margin: '8px 0 0' }}>
                                    {validLangs
                                        .map(l => typeof l === 'string' ? l : [l.language, l.level].filter(Boolean).join(' — '))
                                        .join('   ·   ')}
                                </p>
                            </>
                        )}
                    </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CVTemplate;
