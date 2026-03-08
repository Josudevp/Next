import {
    AlignmentType,
    BorderStyle,
    Document,
    ImageRun,
    Packer,
    PageOrientation,
    Paragraph,
    Table,
    TableCell,
    TableRow,
    TextRun,
    WidthType,
    VerticalAlign,
} from 'docx';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import User from '../models/User.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE_IMAGE_RENDER = 324; // 108 px × 3 for hi-res

// ─────────────────────────────────────────────────────────────────────────────
//  Profile image helpers
// ─────────────────────────────────────────────────────────────────────────────
const resolveProfileImageAsset = (profilePicture) => {
    if (!profilePicture) return null;

    if (profilePicture.startsWith('data:image/')) {
        const [meta, base64Payload] = profilePicture.split(',');
        const mimeType = meta.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/)?.[1] || 'image/png';
        return base64Payload ? { buffer: Buffer.from(base64Payload, 'base64'), mimeType } : null;
    }

    const candidates = [
        profilePicture,
        path.resolve(process.cwd(), profilePicture),
        path.resolve(process.cwd(), '..', profilePicture),
    ];
    for (const candidate of candidates) {
        if (candidate && fs.existsSync(candidate)) {
            const ext = path.extname(candidate).toLowerCase();
            const mimeType =
                ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
              : ext === '.svg'                    ? 'image/svg+xml'
              :                                    'image/png';
            return { buffer: fs.readFileSync(candidate), mimeType };
        }
    }
    return null;
};

const buildCircularImageBuffer = async (imageAsset) => {
    if (!imageAsset?.buffer) return null;
    const size   = PROFILE_IMAGE_RENDER;
    const radius = size / 2;
    const mask   = Buffer.from(
        `<svg viewBox="0 0 ${size} ${size}"><circle cx="${radius}" cy="${radius}" r="${radius}"/></svg>`
    );
    try {
        return await sharp(imageAsset.buffer)
            .resize(size, size, { fit: 'cover', position: 'center' })
            .composite([{ input: mask, blend: 'dest-in' }])
            .png({ compressionLevel: 6 })
            .toBuffer();
    } catch (err) {
        console.warn('[cvController] Error recortando imagen circular:', err.message);
        return null;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Shared docx helpers
// ─────────────────────────────────────────────────────────────────────────────
const normalizeSkillList = (value) => {
    if (Array.isArray(value)) return value.map(i => String(i || '').trim()).filter(Boolean);
    if (typeof value === 'string')
        return value.split(/,|\n|·|\||;/).map(i => i.trim()).filter(Boolean);
    return [];
};

const normalizeLink = (value, regex, replacement) => {
    if (!value) return null;
    return value.replace(regex, replacement);
};

/** Invisible borders for any layout table */
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'auto' };
const noTableBorders = () => ({
    top:     NO_BORDER,
    bottom:  NO_BORDER,
    left:    NO_BORDER,
    right:   NO_BORDER,
    insideH: NO_BORDER,
    insideV: NO_BORDER,
});
const noCellBorders = () => ({
    top:    NO_BORDER,
    bottom: NO_BORDER,
    left:   NO_BORDER,
    right:  NO_BORDER,
});

const txt = (text, opts = {}) => new TextRun({
    text:    text || '',
    bold:    opts.bold    ?? false,
    italics: opts.italics ?? false,
    color:   opts.color   ?? '000000',
    size:    opts.size    ?? 20,
    font:    opts.font    ?? 'Arial',
});

const para = (children, opts = {}) => new Paragraph({
    alignment: opts.alignment ?? AlignmentType.LEFT,
    spacing:   opts.spacing   ?? { after: opts.after ?? 120, line: opts.line ?? 320 },
    children,
});

const hrLine = () => new Paragraph({
    spacing: { after: 100 },
    border: {
        bottom: { color: '000000', size: 6, space: 1, style: BorderStyle.SINGLE },
    },
    children: [],
});

const sectionHeading = (title) => new Paragraph({
    spacing: { before: 240, after: 100 },
    border: {
        bottom: { color: '000000', size: 8, space: 2, style: BorderStyle.SINGLE },
    },
    children: [txt(title.toUpperCase(), { bold: true, color: '000000', size: 22 })],
});

const entryBlock = (title, subtitle, dates, description) => {
    const paragraphs = [
        para([txt(title || '', { bold: true, color: '000000', size: 20 })], { after: 40 }),
    ];
    const meta = [subtitle, dates].filter(Boolean);
    if (meta.length) {
        paragraphs.push(para([txt(meta.join('  |  '), { color: '444444', size: 18, italics: true })], { after: 60 }));
    }
    if (description) {
        paragraphs.push(para([txt(description, { color: '333333', size: 19 })], { after: 160 }));
    }
    return paragraphs;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Harvard Classic — single layout, always in Spanish, Arial, black text
// ─────────────────────────────────────────────────────────────────────────────
const buildHarvardDocument = ({ personalInfo, summary, education, experience, skills, circularBuf, languages }) => {
    const children = [];

    // ── NAME + optional circular photo ───────────────────────────────────────
    const nameCells = [
        new TableCell({
            width: { size: circularBuf ? 75 : 100, type: WidthType.PERCENTAGE },
            borders: noCellBorders(),
            verticalAlign: VerticalAlign.BOTTOM,
            margins: { top: 0, bottom: 0, left: 0, right: 200 },
            children: [
                new Paragraph({
                    spacing: { after: 40 },
                    children: [txt((personalInfo.name || 'SIN NOMBRE').toUpperCase(), {
                        bold: true, color: '000000', size: 48, font: 'Arial',
                    })],
                }),
                para([txt(personalInfo.title || '', { color: '444444', size: 20, italics: true })], { after: 0 }),
            ],
        }),
    ];

    if (circularBuf) {
        nameCells.push(new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            borders: noCellBorders(),
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 0, bottom: 0, left: 200, right: 0 },
            children: [new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 0 },
                children: [new ImageRun({
                    data: circularBuf,
                    transformation: { width: 108, height: 108 },
                })],
            })],
        }));
    }

    children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noTableBorders(),
        rows: [new TableRow({ children: nameCells })],
    }));

    children.push(hrLine());

    // ── CONTACT LINE ─────────────────────────────────────────────────────────
    const contactParts = [
        personalInfo.phone,
        personalInfo.email,
        normalizeLink(personalInfo.linkedin, /https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/'),
        normalizeLink(personalInfo.github,   /https?:\/\/(www\.)?github\.com\//i,   'github.com/'),
        personalInfo.portfolio,
        personalInfo.address,
    ].filter(Boolean);

    if (contactParts.length) {
        children.push(para(
            [txt(contactParts.join('   ·   '), { color: '333333', size: 18 })],
            { after: 160 }
        ));
    }

    // ── PERFIL PROFESIONAL ───────────────────────────────────────────────────
    if (summary) {
        children.push(sectionHeading('Perfil Profesional'));
        children.push(para([txt(summary, { color: '333333', size: 19 })], { after: 200 }));
    }

    // ── EXPERIENCIA LABORAL ──────────────────────────────────────────────────
    if (experience?.length) {
        children.push(sectionHeading('Experiencia Laboral'));
        experience.forEach(ex => {
            children.push(...entryBlock(
                ex.position || ex.title,
                ex.company,
                ex.dates,
                ex.description
            ));
        });
    }

    // ── EDUCACIÓN ────────────────────────────────────────────────────────────
    if (education?.length) {
        children.push(sectionHeading('Educación'));
        education.forEach(ed => {
            children.push(...entryBlock(ed.degree, ed.institution, ed.dates, ed.description));
        });
    }

    // ── HABILIDADES ──────────────────────────────────────────────────────────
    const techSkills = normalizeSkillList(skills?.technical);
    const softSkills = normalizeSkillList(skills?.soft);
    const allSkills  = normalizeSkillList(skills?.all);
    const allArr     = [...new Set([...techSkills, ...softSkills, ...allSkills])];

    if (allArr.length) {
        children.push(sectionHeading('Habilidades'));
        children.push(para([txt(allArr.join('  ·  '), { color: '333333', size: 19 })], { after: 200 }));
    }

    // ── IDIOMAS ──────────────────────────────────────────────────────────────
    const langs = languages || personalInfo.languages;
    if (langs) {
        const langList = Array.isArray(langs)
            ? langs.map(l => typeof l === 'string' ? l : [l.language, l.level].filter(Boolean).join(' — '))
            : langs.split(/,|;|\n/).map(l => l.trim());
        const filtered = langList.filter(Boolean);
        if (filtered.length) {
            children.push(sectionHeading('Idiomas'));
            children.push(para([txt(filtered.join('   ·   '), { color: '333333', size: 19 })], { after: 200 }));
        }
    }

    return new Document({
        styles: {
            default: {
                document: {
                    run:       { font: 'Arial', color: '000000', size: 20 },
                    paragraph: { spacing: { line: 320 } },
                },
                title: {
                    run:       { font: 'Arial', color: '000000', bold: true, size: 48 },
                    paragraph: { alignment: AlignmentType.LEFT, spacing: { after: 120 } },
                },
                heading1: {
                    run:       { font: 'Arial', color: '000000', bold: true, size: 22 },
                    paragraph: { spacing: { before: 240, after: 100 } },
                },
            },
        },
        sections: [{
            properties: {
                page: {
                    margin: { top: 900, right: 900, bottom: 900, left: 900 },
                    size: { orientation: PageOrientation.PORTRAIT },
                },
            },
            children,
        }],
    });
};

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/cv/generate
// ─────────────────────────────────────────────────────────────────────────────
export const generateCvDocument = async (req, res) => {
    try {
        const cvData = req.body;
        if (!cvData || !cvData.personalInfo) {
            return res.status(400).json({ error: 'Datos de CV inválidos o incompletos.' });
        }

        const { personalInfo, includePhoto, summary, education, experience, skills, languages } = cvData;
        const userId = req.user?.userId || req.user?.id;

        // ── Profile photo (optional) ─────────────────────────────────────────
        let circularBuf = null;
        if (includePhoto && userId) {
            try {
                const user = await User.findByPk(userId, { attributes: ['profilePicture'] });
                const imageAsset = resolveProfileImageAsset(user?.profilePicture || '');
                if (imageAsset) {
                    circularBuf = await buildCircularImageBuffer(imageAsset);
                }
            } catch (imageError) {
                console.warn('[cvController] No se pudo adjuntar la foto de perfil:', imageError.message);
            }
        }

        // ── Build + stream document ──────────────────────────────────────────
        const doc = buildHarvardDocument({
            personalInfo,
            summary,
            education,
            experience,
            skills,
            circularBuf,
            languages,
        });

        const buffer = await Packer.toBuffer(doc);
        const safeName = (personalInfo.name || 'MiCV')
            .replace(/[^a-zA-Z0-9\s_-]/g, '')
            .replace(/\s+/g, '_');

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="CV_${safeName}.docx"`);
        return res.send(buffer);

    } catch (error) {
        console.error('[cvController] Error generando DOCX:', error.message);
        return res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
    }
};
