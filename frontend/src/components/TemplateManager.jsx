import { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import HarvardTemplate        from './templates/HarvardTemplate';
import ModernBlueTemplate     from './templates/ModernBlueTemplate';
import TechTemplate           from './templates/TechTemplate';
import ExecutiveTemplate      from './templates/ExecutiveTemplate';
import CreativeTemplate       from './templates/CreativeTemplate';
import RightSidebarTemplate   from './templates/RightSidebarTemplate';

// ── Template registry ────────────────────────────────────────────────────────
const TEMPLATE_REGISTRY = {
    francisco: { Component: HarvardTemplate },
    daniel:    { Component: ModernBlueTemplate },
    murad:     { Component: TechTemplate },
    jordi:     { Component: ExecutiveTemplate },
    andrea:    { Component: CreativeTemplate },
    carlos:    { Component: RightSidebarTemplate },
};

const DEFAULT_TEMPLATE = 'francisco';

// ── Config del carrusel (todas las plantillas del hub) ───────────────────────
const TEMPLATES_CONFIG = [
    { id: 'francisco', name: 'Harvard Classic', accent: '#000000', ready: true },
    { id: 'daniel',    name: 'Modern Blue',    accent: '#436696', ready: true },
    { id: 'murad',     name: 'Tech Dev',       accent: '#16A34A', ready: true },
    { id: 'jordi',     name: 'Executive',      accent: '#1E5F5F', ready: true },
    { id: 'andrea',    name: 'Creative',       accent: '#2596BE', ready: true },
    { id: 'carlos',    name: 'Corporate',      accent: '#1E293B', ready: true },
];

// ── SVG Thumbnails ───────────────────────────────────────────────────────────
const THUMBNAILS = {
    francisco: (
        <svg viewBox="0 0 60 80" className="w-full h-full">
            <rect width="60" height="80" fill="#FFF" />
            <rect x="4" y="4" width="36" height="8" rx="1" fill="#111" />
            <circle cx="50" cy="12" r="7" fill="#E5E7EB" />
            <rect x="4" y="17" width="52" height="1" fill="#111" />
            <rect x="4" y="21" width="24" height="2" rx="0.5" fill="#111" />
            <rect x="4" y="25" width="48" height="1" rx="0.5" fill="#999" />
            <rect x="4" y="28" width="44" height="1" rx="0.5" fill="#999" />
            <rect x="4" y="31" width="46" height="1" rx="0.5" fill="#999" />
            <rect x="4" y="36" width="24" height="2" rx="0.5" fill="#111" />
            <rect x="4" y="40" width="48" height="1" rx="0.5" fill="#999" />
            <rect x="4" y="43" width="44" height="1" rx="0.5" fill="#999" />
            <rect x="4" y="48" width="24" height="2" rx="0.5" fill="#111" />
            <rect x="4" y="52" width="48" height="1" rx="0.5" fill="#999" />
            <rect x="4" y="55" width="40" height="1" rx="0.5" fill="#999" />
            <rect x="4" y="60" width="24" height="2" rx="0.5" fill="#111" />
            <rect x="4" y="64" width="42" height="1" rx="0.5" fill="#999" />
        </svg>
    ),
    daniel: (
        <svg viewBox="0 0 60 80" className="w-full h-full">
            <rect width="60" height="80" fill="#F7F9FC" />
            <rect width="20" height="80" fill="#436696" />
            <circle cx="10" cy="14" r="6" fill="#1A3E6E" stroke="#FFF" strokeWidth="1" />
            <rect x="3" y="24" width="14" height="1.5" rx="0.5" fill="#FFF" opacity="0.8" />
            <rect x="3" y="28" width="12" height="0.8" rx="0.5" fill="#FFF" opacity="0.5" />
            <rect x="3" y="30" width="11" height="0.8" rx="0.5" fill="#FFF" opacity="0.4" />
            <rect x="3" y="32" width="13" height="0.8" rx="0.5" fill="#FFF" opacity="0.4" />
            <rect x="3" y="38" width="14" height="1.5" rx="0.5" fill="#FFF" opacity="0.8" />
            <rect x="3" y="42" width="10" height="0.8" rx="0.5" fill="#FFF" opacity="0.4" />
            <rect x="3" y="44" width="12" height="0.8" rx="0.5" fill="#FFF" opacity="0.4" />
            <rect x="24" y="6" width="30" height="5" rx="0.5" fill="#436696" />
            <rect x="24" y="13" width="20" height="1.5" rx="0.5" fill="#3B82F6" />
            <rect x="24" y="18" width="30" height="1.5" rx="0.5" fill="#436696" opacity="0.8" />
            <rect x="24" y="22" width="28" height="0.8" rx="0.5" fill="#999" />
            <rect x="24" y="25" width="26" height="0.8" rx="0.5" fill="#999" />
            <rect x="24" y="30" width="30" height="1.5" rx="0.5" fill="#436696" opacity="0.8" />
            <rect x="24" y="34" width="28" height="0.8" rx="0.5" fill="#999" />
            <rect x="24" y="37" width="24" height="0.8" rx="0.5" fill="#999" />
            <rect x="24" y="42" width="30" height="1.5" rx="0.5" fill="#436696" opacity="0.8" />
            <rect x="24" y="46" width="26" height="0.8" rx="0.5" fill="#999" />
        </svg>
    ),
    andrea: (
        <svg viewBox="0 0 60 80" className="w-full h-full">
            <rect width="60" height="80" fill="#FFF" />
            {/* Blue banner */}
            <rect width="60" height="26" fill="#E9F6FB" />
            <circle cx="11" cy="13" r="7" fill="#BFE7F3" stroke="#2596BE" strokeWidth="1.5" />
            <rect x="22" y="7" width="32" height="4" rx="0.5" fill="#FFF" />
            <rect x="22" y="14" width="24" height="1.5" rx="0.5" fill="rgba(255,255,255,0.7)" />
            <rect x="22" y="18" width="20" height="1" rx="0.5" fill="rgba(255,255,255,0.5)" />
            {/* Two-column body */}
            <rect x="4" y="30" width="30" height="1.5" rx="0.5" fill="#2596BE" />
            <rect x="4" y="35" width="28" height="0.8" rx="0.5" fill="#555" />
            <rect x="4" y="38" width="26" height="0.8" rx="0.5" fill="#999" />
            <rect x="4" y="41" width="28" height="0.8" rx="0.5" fill="#999" />
            <rect x="4" y="48" width="30" height="1.5" rx="0.5" fill="#2596BE" />
            <rect x="4" y="53" width="26" height="0.8" rx="0.5" fill="#555" />
            <rect x="4" y="56" width="24" height="0.8" rx="0.5" fill="#999" />
            <rect x="37" y="30" width="19" height="1.5" rx="0.5" fill="#2596BE" />
            <rect x="37" y="35" width="17" height="0.8" rx="0.5" fill="#555" />
            <rect x="37" y="38" width="15" height="0.8" rx="0.5" fill="#999" />
            <rect x="37" y="48" width="19" height="1.5" rx="0.5" fill="#2596BE" />
            <rect x="37" y="53" width="16" height="0.8" rx="0.5" fill="#999" />
        </svg>
    ),


    jordi: (
        <svg viewBox="0 0 60 80" className="w-full h-full">
            <rect width="60" height="80" fill="#FAFAF7" />
            {/* Top teal accent bar */}
            <rect width="60" height="4" fill="#1E5F5F" />
            {/* Centered header */}
            <circle cx="30" cy="16" r="7" fill="#E5E7EB" stroke="#1E5F5F" strokeWidth="0.8" />
            <rect x="14" y="27" width="32" height="4" rx="0.5" fill="#111" />
            <rect x="18" y="33" width="24" height="1.5" rx="0.5" fill="#1E5F5F" />
            <rect x="16" y="37" width="28" height="0.8" rx="0.5" fill="#999" />
            {/* Centered ornamental dividers */}
            <line x1="4" y1="42" x2="22" y2="42" stroke="#1E5F5F" strokeWidth="0.5" opacity="0.4" />
            <rect x="22" y="40" width="16" height="3.5" rx="0" fill="#FAFAF7" />
            <rect x="23" y="41" width="14" height="1.5" rx="0.5" fill="#1E5F5F" />
            <line x1="38" y1="42" x2="56" y2="42" stroke="#1E5F5F" strokeWidth="0.5" opacity="0.4" />
            <rect x="8" y="46" width="30" height="1.5" rx="0.5" fill="#111" />
            <rect x="8" y="50" width="22" height="1" rx="0.5" fill="#1E5F5F" opacity="0.7" />
            <rect x="8" y="54" width="44" height="0.8" rx="0.5" fill="#999" />
            <rect x="8" y="57" width="40" height="0.8" rx="0.5" fill="#999" />
            <line x1="4" y1="63" x2="22" y2="63" stroke="#1E5F5F" strokeWidth="0.5" opacity="0.4" />
            <rect x="22" y="61" width="16" height="3.5" rx="0" fill="#FAFAF7" />
            <rect x="23" y="62" width="14" height="1.5" rx="0.5" fill="#1E5F5F" />
            <line x1="38" y1="63" x2="56" y2="63" stroke="#1E5F5F" strokeWidth="0.5" opacity="0.4" />
            <rect x="8" y="67" width="26" height="1.5" rx="0.5" fill="#111" />
            <rect x="8" y="71" width="18" height="1" rx="0.5" fill="#1E5F5F" opacity="0.7" />
        </svg>
    ),
    carlos: (
        <svg viewBox="0 0 60 80" className="w-full h-full">
            <rect width="60" height="80" fill="#FFF" />
            {/* Right sidebar */}
            <rect x="38" y="0" width="22" height="80" fill="#1E293B" />
            {/* Main body */}
            <rect x="4" y="6" width="28" height="5" rx="0.5" fill="#111" />
            <rect x="4" y="13" width="20" height="2" rx="0.5" fill="#334155" />
            <rect x="4" y="18" width="28" height="1.5" rx="0.5" fill="#334155" />
            <rect x="4" y="23" width="28" height="1" rx="0.5" fill="#E2E8F0" />
            <rect x="4" y="28" width="20" height="1.5" rx="0.5" fill="#334155" />
            <rect x="4" y="32" width="26" height="0.8" rx="0.5" fill="#555" />
            <rect x="4" y="35" width="24" height="0.8" rx="0.5" fill="#999" />
            <rect x="4" y="38" width="26" height="0.8" rx="0.5" fill="#999" />
            <rect x="4" y="44" width="20" height="1.5" rx="0.5" fill="#334155" />
            <rect x="4" y="48" width="26" height="0.8" rx="0.5" fill="#555" />
            <rect x="4" y="51" width="22" height="0.8" rx="0.5" fill="#999" />
            {/* Sidebar content */}
            <circle cx="49" cy="12" r="7" fill="#334155" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <rect x="41" y="24" width="15" height="1" rx="0.5" fill="#94A3B8" />
            <rect x="41" y="28" width="13" height="0.7" rx="0.5" fill="#CBD5E1" opacity="0.7" />
            <rect x="41" y="31" width="14" height="0.7" rx="0.5" fill="#CBD5E1" opacity="0.5" />
            <rect x="41" y="38" width="15" height="1" rx="0.5" fill="#94A3B8" />
            <rect x="41" y="42" width="13" height="0.7" rx="0.5" fill="#CBD5E1" opacity="0.5" />
            <rect x="41" y="45" width="14" height="0.7" rx="0.5" fill="#CBD5E1" opacity="0.5" />
            <rect x="41" y="48" width="11" height="0.7" rx="0.5" fill="#CBD5E1" opacity="0.5" />
        </svg>
    ),
    murad: (
        <svg viewBox="0 0 60 80" className="w-full h-full">
            <rect width="60" height="80" fill="#FFF" />
            {/* Left green accent bar */}
            <rect x="0" y="0" width="4" height="80" fill="#16A34A" />
            {/* Name in mono style */}
            <rect x="8" y="6" width="36" height="5" rx="0.5" fill="#0a0a0a" />
            <rect x="8" y="14" width="22" height="1.5" rx="0.5" fill="#16A34A" />
            <rect x="8" y="18" width="44" height="0.8" rx="0.5" fill="#BBF7D0" />
            {/* Section: > STACK */}
            <rect x="8" y="23" width="3" height="3" rx="0.3" fill="#16A34A" />
            <rect x="13" y="24" width="14" height="1.5" rx="0.5" fill="#111" />
            <rect x="29" y="23.5" width="27" height="0.8" fill="#BBF7D0" />
            {/* Skill badges */}
            <rect x="8" y="28" width="11" height="3" rx="1" fill="#F0FDF4" stroke="#16A34A" strokeWidth="0.5" />
            <rect x="21" y="28" width="13" height="3" rx="1" fill="#F0FDF4" stroke="#16A34A" strokeWidth="0.5" />
            <rect x="36" y="28" width="10" height="3" rx="1" fill="#F0FDF4" stroke="#16A34A" strokeWidth="0.5" />
            <rect x="48" y="28" width="8" height="3" rx="1" fill="#F0FDF4" stroke="#16A34A" strokeWidth="0.5" />
            {/* Section: > EXPERIENCE */}
            <rect x="8" y="36" width="3" height="3" rx="0.3" fill="#16A34A" />
            <rect x="13" y="37" width="20" height="1.5" rx="0.5" fill="#111" />
            <rect x="35" y="37.5" width="21" height="0.8" fill="#BBF7D0" />
            {/* Entry with left border */}
            <rect x="8" y="42" width="1.5" height="22" rx="0.5" fill="#D1FAE5" />
            <rect x="12" y="42" width="26" height="1.5" rx="0.5" fill="#111" />
            <rect x="12" y="46" width="18" height="1" rx="0.5" fill="#16A34A" />
            <rect x="12" y="50" width="40" height="0.8" rx="0.5" fill="#999" />
            <rect x="12" y="53" width="36" height="0.8" rx="0.5" fill="#999" />
            <rect x="12" y="57" width="26" height="1.5" rx="0.5" fill="#111" />
            <rect x="12" y="61" width="18" height="1" rx="0.5" fill="#16A34A" />
        </svg>
    ),

};

// ══════════════════════════════════════════════════════════════════════════════
// TemplateCarousel
// ══════════════════════════════════════════════════════════════════════════════
const TemplateCarousel = ({ selectedId, onSelect }) => {
    const trackRef = useRef(null);
    const [hovered, setHovered] = useState(false);

    const scroll = useCallback((dir) => {
        if (!trackRef.current) return;
        trackRef.current.scrollBy({ left: dir * 120, behavior: 'smooth' });
    }, []);

    return (
        <div
            className="cv-template-carousel relative flex-shrink-0 bg-white border-b border-gray-100"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Label */}
            <div className="px-4 pt-2.5 pb-1">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                    Elige tu plantilla
                </p>
            </div>

            {/* Track */}
            <div className="relative">
                {/* Arrows — solo visibles en hover */}
                <button
                    onClick={() => scroll(-1)}
                    className={`absolute left-0 top-0 bottom-0 z-20 w-7 flex items-center justify-center
                        bg-gradient-to-r from-white via-white/90 to-transparent
                        transition-opacity duration-200 cursor-pointer
                        ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    aria-label="Anterior"
                >
                    <ChevronLeft size={14} className="text-gray-500" />
                </button>
                <button
                    onClick={() => scroll(1)}
                    className={`absolute right-0 top-0 bottom-0 z-20 w-7 flex items-center justify-center
                        bg-gradient-to-l from-white via-white/90 to-transparent
                        transition-opacity duration-200 cursor-pointer
                        ${hovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    aria-label="Siguiente"
                >
                    <ChevronRight size={14} className="text-gray-500" />
                </button>

                {/* Scrollable thumbnails */}
                <div
                    ref={trackRef}
                    className="flex justify-center gap-2.5 overflow-x-auto px-4 pb-3 pt-1 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {TEMPLATES_CONFIG.map((tpl) => {
                        const isActive = tpl.id === selectedId;
                        const isReady = tpl.ready;
                        return (
                            <button
                                key={tpl.id}
                                onClick={() => isReady && onSelect(tpl.id)}
                                disabled={!isReady}
                                className={`relative flex-shrink-0 snap-start group transition-all duration-200 cursor-pointer
                                    ${isReady ? 'hover:scale-105' : 'opacity-50 cursor-not-allowed grayscale'}`}
                                title={isReady ? tpl.name : `${tpl.name} — Próximamente`}
                            >
                                {/* Thumbnail */}
                                <div className={`w-[52px] h-[68px] rounded-lg overflow-hidden border-2 transition-all duration-200 shadow-sm
                                    ${isActive
                                        ? 'border-blue-500 shadow-blue-500/25 shadow-md ring-1 ring-blue-500/30'
                                        : isReady
                                            ? 'border-gray-200 group-hover:border-gray-300 group-hover:shadow-md'
                                            : 'border-gray-200'
                                    }`}>
                                    {THUMBNAILS[tpl.id] || <div className="w-full h-full bg-gray-100" />}
                                </div>

                                {/* Check badge */}
                                {isActive && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                        <Check size={10} strokeWidth={3} className="text-white" />
                                    </div>
                                )}

                                {/* "Pronto" badge for non-ready */}
                                {!isReady && (
                                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-gray-500 text-white text-[6px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap leading-none">
                                        Pronto
                                    </div>
                                )}

                                {/* Name */}
                                <p className={`text-[8px] text-center mt-1 leading-tight max-w-[52px] truncate
                                    ${isActive ? 'text-blue-600 font-bold' : 'text-gray-500 font-medium'}`}>
                                    {tpl.name}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// TemplateManager
// ══════════════════════════════════════════════════════════════════════════════
const TemplateManager = ({ templateId, cvData, profilePicture, onChangeTemplate, onFirstExport }) => {
    const currentId = TEMPLATE_REGISTRY[templateId] ? templateId : DEFAULT_TEMPLATE;
    const { Component } = TEMPLATE_REGISTRY[currentId];

    return (
        <div className="cv-print-tm flex h-full min-h-0 flex-col">
            {/* Carrusel de plantillas */}
            <TemplateCarousel selectedId={currentId} onSelect={onChangeTemplate} />

            {/* Renderizado de la plantilla activa */}
            <div className="cv-print-content flex-1 min-h-0 overflow-hidden">
                <Component cvData={cvData} profilePicture={profilePicture} onFirstExport={onFirstExport} />
            </div>
        </div>
    );
};

export default TemplateManager;
