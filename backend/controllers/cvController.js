import {
    AlignmentType,
    BorderStyle,
    Document,
    HeadingLevel,
    ImageRun,
    Packer,
    PageOrientation,
    Paragraph,
    TextRun,
} from 'docx';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import User from '../models/User.js';

const COLORS = {
    primary: '000000',
    body: '000000',
    muted: '000000',
    line: 'D1D5DB',
};

// Tamaño de visualización en el DOCX (puntos Word)
const PROFILE_IMAGE_SIZE = { width: 108, height: 108 };
// Resolución de procesamiento: 3× para alta calidad sin pixelado
const PROFILE_IMAGE_RENDER_SIZE = PROFILE_IMAGE_SIZE.width * 3; // 324px

const normalizeLink = (value, regex, replacement) => {
    if (!value) return null;
    return value.replace(regex, replacement);
};

const resolveProfileImageAsset = (profilePicture) => {
    if (!profilePicture) return null;

    if (profilePicture.startsWith('data:image/')) {
        const [meta, base64Payload] = profilePicture.split(',');
        const mimeType = meta.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/)?.[1] || 'image/png';
        return base64Payload
            ? { buffer: Buffer.from(base64Payload, 'base64'), mimeType }
            : null;
    }

    const candidatePaths = [
        profilePicture,
        path.resolve(process.cwd(), profilePicture),
        path.resolve(process.cwd(), '..', profilePicture),
    ];

    for (const candidate of candidatePaths) {
        if (candidate && fs.existsSync(candidate)) {
            const extension = path.extname(candidate).toLowerCase();
            const mimeType = extension === '.jpg' || extension === '.jpeg'
                ? 'image/jpeg'
                : extension === '.svg'
                    ? 'image/svg+xml'
                    : 'image/png';

            return {
                buffer: fs.readFileSync(candidate),
                mimeType,
            };
        }
    }

    return null;
};

const buildCircularImageBuffer = async (imageAsset) => {
    if (!imageAsset?.buffer) return null;

    const size = PROFILE_IMAGE_RENDER_SIZE; // 324px — 3× para alta resolución
    const radius = size / 2;

    // SVG circle mask — sharp applies it as a raster alpha channel and outputs PNG
    const mask = Buffer.from(
        `<svg viewBox="0 0 ${size} ${size}"><circle cx="${radius}" cy="${radius}" r="${radius}"/></svg>`
    );

    try {
        return await sharp(imageAsset.buffer)
            .resize(size, size, { fit: 'cover', position: 'center' })
            .composite([{ input: mask, blend: 'dest-in' }])
            .png({ compressionLevel: 6 })
            .toBuffer();
    } catch (err) {
        console.warn('[cvController] Error al recortar imagen circular:', err.message);
        return null;
    }
};

const buildSectionTitle = (title) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 180 },
    border: {
        bottom: {
            color: COLORS.line,
            size: 6,
            space: 1,
            style: BorderStyle.SINGLE,
        },
    },
    children: [
        new TextRun({
            text: title.toUpperCase(),
            bold: true,
            color: COLORS.primary,
            size: 19,
        }),
    ],
});

const buildBodyParagraph = (text, options = {}) => new Paragraph({
    spacing: { after: options.after ?? 170, line: options.line ?? 340 },
    alignment: options.alignment ?? AlignmentType.LEFT,
    children: [
        new TextRun({
            text: text || '',
            color: options.color ?? COLORS.body,
            size: options.size ?? 20,
            italics: options.italics ?? false,
            bold: options.bold ?? false,
        }),
    ],
});

const buildEntry = ({ title, subtitle, dates, description, accent }) => {
    const paragraphs = [
        buildBodyParagraph(title || '', { bold: true, after: 90, line: 320 }),
    ];

    const metaParts = [subtitle, dates].filter(Boolean);
    if (metaParts.length > 0) {
        paragraphs.push(buildBodyParagraph(metaParts.join('  |  '), {
            size: 18,
            color: COLORS.muted,
            italics: Boolean(accent),
            after: 80,
            line: 300,
        }));
    }

    if (accent) {
        paragraphs.push(buildBodyParagraph(accent, {
            size: 18,
            color: COLORS.muted,
            italics: true,
            after: 90,
            line: 300,
        }));
    }

    if (description) {
        paragraphs.push(buildBodyParagraph(description, { size: 19, after: 180, line: 340 }));
    }

    return paragraphs;
};

export const generateCvDocument = async (req, res) => {
    try {
        const cvData = req.body;
        if (!cvData || !cvData.personalInfo) {
            return res.status(400).json({ error: 'Datos de CV inválidos o incompletos.' });
        }

        const { personalInfo, includePhoto, summary, education, experience, projects, skills, hasExperience } = cvData;
        const userId = req.user?.userId || req.user?.id;

        let imageParagraph = null;
        if (includePhoto && userId) {
            try {
                const user = await User.findByPk(userId, { attributes: ['profilePicture'] });
                const imageAsset = resolveProfileImageAsset(user?.profilePicture || '');
                const circularImageBuffer = await buildCircularImageBuffer(imageAsset);

                if (circularImageBuffer) {
                    imageParagraph = new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 220 },
                        children: [
                            new ImageRun({
                                data: circularImageBuffer,
                                transformation: PROFILE_IMAGE_SIZE,
                            }),
                        ],
                    });
                }
            } catch (imageError) {
                console.warn('[cvController] No se pudo adjuntar la foto de perfil:', imageError.message);
            }
        }

        const contactParts = [
            personalInfo.phone,
            personalInfo.email,
            normalizeLink(personalInfo.linkedin, /https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/'),
            normalizeLink(personalInfo.github, /https?:\/\/(www\.)?github\.com\//i, 'github.com/'),
            personalInfo.portfolio,
        ].filter(Boolean);

        const children = [
            new Paragraph({
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 160 },
                children: [
                    new TextRun({
                        text: personalInfo.name || 'Nombre Completo',
                        bold: true,
                        color: COLORS.primary,
                        size: 48,
                    }),
                ],
            }),
        ];

        if (imageParagraph) {
            children.push(imageParagraph);
        }

        children.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 230, line: 300 },
                children: [
                    new TextRun({
                        text: contactParts.join('   ·   '),
                        color: COLORS.muted,
                        size: 18,
                    }),
                ],
            }));

        if (summary) {
            children.push(buildSectionTitle('Perfil Profesional'));
            children.push(buildBodyParagraph(summary, { alignment: AlignmentType.JUSTIFIED }));
        }

        if (education?.length > 0) {
            children.push(buildSectionTitle('Educación'));
            education.forEach((edu) => {
                children.push(...buildEntry({
                    title: edu.degree || 'Título',
                    subtitle: edu.institution || '',
                    dates: edu.dates || '',
                    description: edu.description || '',
                }));
            });
        }

        if (!hasExperience && projects?.length > 0) {
            children.push(buildSectionTitle('Proyectos Destacados'));
            projects.forEach((project) => {
                children.push(...buildEntry({
                    title: project.name || 'Proyecto',
                    subtitle: '',
                    dates: project.dates || '',
                    description: project.description || '',
                    accent: project.tech || '',
                }));
            });
        } else if (hasExperience && experience?.length > 0) {
            children.push(buildSectionTitle('Experiencia Laboral'));
            experience.forEach((item) => {
                children.push(...buildEntry({
                    title: item.position || 'Cargo',
                    subtitle: item.company || '',
                    dates: item.dates || '',
                    description: item.description || '',
                }));
            });
        }

        const skillLines = [];
        if (skills?.technical?.length > 0) {
            skillLines.push(`Técnicas: ${skills.technical.join(', ')}`);
        }
        if (skills?.soft?.length > 0) {
            skillLines.push(`Blandas: ${skills.soft.join(', ')}`);
        }
        if (skills?.all?.length > 0) {
            skillLines.push(skills.all.join(' · '));
        }

        if (skillLines.length > 0) {
            children.push(buildSectionTitle('Habilidades'));
            skillLines.forEach((line) => {
                children.push(buildBodyParagraph(line, { after: 120, line: 320 }));
            });
        }

        const doc = new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: 'Arial',
                            color: '000000',
                            size: 20,
                        },
                        paragraph: {
                            spacing: {
                                line: 340,
                            },
                        },
                    },
                    title: {
                        run: {
                            font: 'Arial',
                            color: '000000',
                            bold: true,
                            size: 48,
                        },
                        paragraph: {
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 160 },
                        },
                    },
                    heading1: {
                        run: {
                            font: 'Arial',
                            color: '000000',
                            bold: true,
                            size: 22,
                        },
                        paragraph: {
                            spacing: { before: 320, after: 180 },
                        },
                    },
                    heading2: {
                        run: {
                            font: 'Arial',
                            color: '000000',
                            bold: true,
                            size: 20,
                        },
                    },
                },
            },
            sections: [{
                properties: {
                    page: {
                        margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
                        size: { orientation: PageOrientation.PORTRAIT },
                    },
                },
                children,
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename="CV_Next.docx"');
        return res.send(buffer);
    } catch (error) {
        console.error('[cvController] Error generando DOCX:', error.message);
        return res.status(500).json({ error: 'No se pudo generar el documento Word.' });
    }
};
