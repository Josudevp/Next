const SKILL_LIBRARY = {
  javascript: {
    aliases: ['javascript', 'js', 'ecmascript'],
    resource: { title: 'JavaScript.info', url: 'https://javascript.info/' },
  },
  typescript: {
    aliases: ['typescript', 'ts'],
    resource: { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html' },
  },
  react: {
    aliases: ['react', 'reactjs', 'react.js'],
    resource: { title: 'React Docs', url: 'https://react.dev/learn' },
  },
  'next.js': {
    aliases: ['next.js', 'nextjs', 'next js'],
    resource: { title: 'Next.js Learn', url: 'https://nextjs.org/learn' },
  },
  node: {
    aliases: ['node', 'nodejs', 'node.js'],
    resource: { title: 'Node.js Learn', url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs' },
  },
  express: {
    aliases: ['express', 'expressjs', 'express.js'],
    resource: { title: 'Express Guide', url: 'https://expressjs.com/en/starter/installing.html' },
  },
  html: {
    aliases: ['html', 'html5'],
    resource: { title: 'MDN HTML', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content' },
  },
  css: {
    aliases: ['css', 'css3'],
    resource: { title: 'MDN CSS', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics' },
  },
  tailwind: {
    aliases: ['tailwind', 'tailwindcss', 'tailwind css'],
    resource: { title: 'Tailwind CSS Docs', url: 'https://tailwindcss.com/docs/installation/using-vite' },
  },
  sql: {
    aliases: ['sql', 'mysql', 'postgres', 'postgresql', 'sqlite'],
    resource: { title: 'SQLBolt', url: 'https://sqlbolt.com/' },
  },
  mongodb: {
    aliases: ['mongodb', 'mongo db', 'mongo'],
    resource: { title: 'MongoDB University', url: 'https://learn.mongodb.com/' },
  },
  python: {
    aliases: ['python', 'python3'],
    resource: { title: 'Python Tutorial', url: 'https://docs.python.org/3/tutorial/' },
  },
  java: {
    aliases: ['java'],
    resource: { title: 'Dev.java Learn', url: 'https://dev.java/learn/' },
  },
  'c#': {
    aliases: ['c#', 'c sharp', 'csharp', '.net', 'dotnet'],
    resource: { title: '.NET Learn', url: 'https://learn.microsoft.com/en-us/dotnet/' },
  },
  aws: {
    aliases: ['aws', 'amazon web services'],
    resource: { title: 'AWS Skill Builder', url: 'https://explore.skillbuilder.aws/learn' },
  },
  docker: {
    aliases: ['docker', 'containers', 'containerization'],
    resource: { title: 'Docker Docs', url: 'https://docs.docker.com/get-started/' },
  },
  git: {
    aliases: ['git', 'github', 'gitlab', 'bitbucket'],
    resource: { title: 'Git Handbook', url: 'https://www.atlassian.com/git/tutorials/what-is-version-control' },
  },
  'react-native': {
    // Skill separado: React Native ≠ React (mobile vs web)
    aliases: ['react native', 'react-native'],
    resource: { title: 'React Native Docs', url: 'https://reactnative.dev/docs/getting-started' },
  },
  flutter: {
    aliases: ['flutter', 'dart'],
    resource: { title: 'Flutter Docs', url: 'https://docs.flutter.dev/get-started/codelab' },
  },
  kotlin: {
    aliases: ['kotlin', 'android'],
    resource: { title: 'Kotlin Docs', url: 'https://kotlinlang.org/docs/getting-started.html' },
  },
  swift: {
    aliases: ['swift', 'ios', 'swiftui'],
    resource: { title: 'Swift Tour', url: 'https://docs.swift.org/swift-book/documentation/the-swift-programming-language/guidedtour/' },
  },
  testing: {
    aliases: ['testing', 'unit testing', 'integration testing', 'jest', 'cypress', 'qa', 'quality assurance'],
    resource: { title: 'Testing JavaScript', url: 'https://testingjavascript.com/' },
  },
  figma: {
    aliases: ['figma', 'wireframing', 'prototyping'],
    resource: { title: 'Figma Learn', url: 'https://help.figma.com/hc/en-us/categories/360002051613-Get-started' },
  },
  'ui/ux': {
    aliases: ['ui/ux', 'ux', 'user experience', 'user interface', 'product design'],
    resource: { title: 'Google UX Design Course', url: 'https://www.coursera.org/professional-certificates/google-ux-design' },
  },
  excel: {
    aliases: ['excel', 'microsoft excel', 'spreadsheets'],
    resource: { title: 'Excel Training', url: 'https://support.microsoft.com/en-us/excel' },
  },
  'power bi': {
    aliases: ['power bi', 'powerbi', 'business intelligence'],
    resource: { title: 'Microsoft Learn Power BI', url: 'https://learn.microsoft.com/en-us/training/powerplatform/power-bi/' },
  },
  communication: {
    tier: 'soft',
    aliases: ['communication', 'comunicación', 'presentation', 'stakeholder management'],
    resource: { title: 'Improving Communication Skills', url: 'https://www.coursera.org/learn/wharton-communication-skills' },
  },
  leadership: {
    tier: 'soft',
    aliases: ['leadership', 'liderazgo', 'team leadership', 'mentoring'],
    resource: { title: 'Leadership Foundations', url: 'https://www.linkedin.com/learning/leadership-foundations' },
  },
  agile: {
    tier: 'soft',
    aliases: ['agile', 'scrum', 'kanban'],
    resource: { title: 'Scrum Guide', url: 'https://scrumguides.org/' },
  },
  api: {
    aliases: ['api', 'rest', 'restful', 'graphql', 'web services'],
    resource: { title: 'REST API Tutorial', url: 'https://restfulapi.net/' },
  },
};

const AREA_KEYWORDS = {
  tech: ['developer', 'software', 'frontend', 'backend', 'full stack', 'web', 'mobile', 'data', 'qa', 'devops'],
  engineering: ['engineer', 'engineering', 'architect', 'systems'],
  design: ['designer', 'ux', 'ui', 'product design', 'graphic'],
  marketing: ['marketing', 'seo', 'content', 'social media', 'growth'],
  business: ['business', 'operations', 'sales', 'account manager', 'customer success'],
  finance: ['finance', 'financial', 'accounting', 'analyst'],
  health: ['health', 'clinical', 'medical'],
  education: ['teacher', 'education', 'pedagogical', 'instructional'],
};

const EXPERIENCE_LEVEL_TO_YEARS = {
  'Sin experiencia': 0,
  'Menos de 1 año': 1,
  '1-3 años': 3,
  '3-5 años': 5,
  'Más de 5 años': 7,
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeText = (value = '') => value
  .toString()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9+#]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const unique = (values) => [...new Set(values.filter(Boolean))];

const toReadableSkill = (skill) => {
  if (skill === 'next.js') return 'Next.js';
  if (skill === 'c#') return 'C#';
  if (skill === 'ui/ux') return 'UI/UX';
  if (skill === 'power bi') return 'Power BI';
  return skill.charAt(0).toUpperCase() + skill.slice(1);
};

const getAliasPattern = (alias) => {
  const normalizedAlias = normalizeText(alias);
  return new RegExp(`(^|[^a-z0-9+#])${escapeRegex(normalizedAlias)}($|[^a-z0-9+#])`, 'i');
};

const extractKnownSkillsFromText = (text) => {
  const normalized = normalizeText(text);
  const matched = Object.entries(SKILL_LIBRARY)
    .filter(([, config]) => config.aliases.some((alias) => getAliasPattern(alias).test(normalized)))
    .map(([skill]) => skill);

  // Deduplicación compuesta: si la vacante pide "React Native", "React" suelto
  // NO se acredita por separado (son tecnologías distintas).
  // Lo mismo aplica a pares como flutter/kotlin que contienen marcas genéricas.
  const COMPOSITE_OVERRIDES = {
    'react-native': ['react'],
    'flutter':      [],
    'kotlin':       [],
  };
  let result = matched;
  for (const [composed, toRemove] of Object.entries(COMPOSITE_OVERRIDES)) {
    if (result.includes(composed)) {
      result = result.filter((s) => !toRemove.includes(s));
    }
  }
  return result;
};

const parseCvPayload = (cvText) => {
  if (!cvText) return { data: null, rawText: '' };

  if (typeof cvText === 'object' && cvText !== null) {
    return { data: cvText, rawText: JSON.stringify(cvText) };
  }

  if (typeof cvText !== 'string') {
    return { data: null, rawText: '' };
  }

  try {
    const parsed = JSON.parse(cvText);
    return { data: parsed, rawText: JSON.stringify(parsed) };
  } catch {
    return { data: null, rawText: cvText };
  }
};

const flattenCvData = (cvData) => {
  if (!cvData || typeof cvData !== 'object') return '';

  const chunks = [];
  chunks.push(cvData.summary || '');

  if (cvData.personalInfo && typeof cvData.personalInfo === 'object') {
    chunks.push(Object.values(cvData.personalInfo).join(' '));
  }

  if (Array.isArray(cvData.education)) {
    cvData.education.forEach((item) => {
      chunks.push([item.institution, item.degree, item.description, item.dates].filter(Boolean).join(' '));
    });
  }

  if (Array.isArray(cvData.experience)) {
    cvData.experience.forEach((item) => {
      chunks.push([item.company, item.position, item.description, item.dates].filter(Boolean).join(' '));
    });
  }

  if (cvData.skills && typeof cvData.skills === 'object') {
    chunks.push([...(cvData.skills.technical || []), ...(cvData.skills.soft || [])].join(' '));
  }

  if (Array.isArray(cvData.languages)) {
    cvData.languages.forEach((item) => chunks.push([item.language, item.level].filter(Boolean).join(' ')));
  }

  return chunks.filter(Boolean).join(' ');
};

const normalizeSkillList = (skills = []) => unique(
  skills
    .flatMap((skill) => {
      const normalizedSkill = normalizeText(skill);
      const canonical = Object.entries(SKILL_LIBRARY).find(([, config]) =>
        config.aliases.some((alias) => normalizeText(alias) === normalizedSkill)
      )?.[0];
      return canonical || normalizedSkill;
    })
    .filter(Boolean)
);

const extractRoleSignals = ({ area, rawText, cvData }) => {
  const areaKeywords = AREA_KEYWORDS[area] || [];
  const experienceTitles = Array.isArray(cvData?.experience)
    ? cvData.experience.map((item) => item.position).filter(Boolean)
    : [];
  return unique([...areaKeywords, ...experienceTitles.map(normalizeText), ...extractKnownSkillsFromText(rawText)]);
};

const getCandidateProfile = (user = {}) => {
  const { data: cvData, rawText } = parseCvPayload(user.cvText);
  const flattenedCv = [rawText, flattenCvData(cvData)].filter(Boolean).join(' ');
  const profileSkills = Array.isArray(user.skills) ? user.skills : [];
  const cvStructuredSkills = [
    ...(cvData?.skills?.technical || []),
    ...(cvData?.skills?.soft || []),
    ...(Array.isArray(cvData?.languages) ? cvData.languages.map((item) => item.language) : []),
  ];

  const knownSkills = extractKnownSkillsFromText([flattenedCv, profileSkills.join(' ')].join(' '));
  const allSkills = normalizeSkillList([...profileSkills, ...cvStructuredSkills, ...knownSkills]);
  const hasStructuredCv = !!(cvData && typeof cvData === 'object' && cvData.personalInfo);
  const profileStrength = Math.min(100, [
    hasStructuredCv ? 45 : 0,
    allSkills.length > 0 ? 25 : 0,
    Array.isArray(cvData?.experience) && cvData.experience.length > 0 ? 20 : 0,
    cvData?.summary ? 10 : 0,
  ].reduce((sum, value) => sum + value, 0));

  return {
    skills: allSkills,
    roleSignals: extractRoleSignals({ area: user.area, rawText: flattenedCv, cvData }),
    rawText: flattenedCv,
    hasStructuredCv,
    profileStrength,
    experienceYears: EXPERIENCE_LEVEL_TO_YEARS[user.experienceLevel] ?? 0,
    experienceLevel: user.experienceLevel || 'Sin experiencia',
    languages: normalizeSkillList(Array.isArray(cvData?.languages) ? cvData.languages.map((item) => item.language) : []),
  };
};

const extractJobText = (job = {}) => {
  const highlights = typeof job.job_highlights === 'object' && job.job_highlights !== null
    ? Object.values(job.job_highlights).flat().join(' ')
    : '';

  return [
    job.job_title,
    job.job_description,
    job.employer_name,
    job.job_employment_type,
    highlights,
    job.job_required_experience,
  ].filter(Boolean).join(' ');
};

const extractRequiredYears = (jobText) => {
  const matches = [...jobText.matchAll(/\b(\d{1,2})\s*\+?\s*(?:years?|anos?)\b/gi)];
  if (matches.length === 0) return 0;
  return Math.max(...matches.map((match) => Number(match[1]) || 0));
};

// Devuelve { score, maxCap }.
// maxCap es el techo duro que se aplica al finalScore cuando la brecha
// de experiencia hace inviable la candidatura (filtro excluyente).
const computeExperienceBlock = (candidateYears, jobTitle, jobText) => {
  const requiredYears = extractRequiredYears(jobText);
  const normalizedTitle = normalizeText(jobTitle);
  const isSeniorRole = /\b(senior|sr\.?|lead|principal|staff|architect|arquitecto)\b/.test(normalizedTitle);

  // Sin requisito explícito de años
  if (!requiredYears) {
    if (/\b(intern|junior|trainee|entry.?level|aprendiz)\b/.test(normalizedTitle)) {
      return candidateYears <= 3 ? { score: 95, maxCap: 98 } : { score: 88, maxCap: 98 };
    }
    if (isSeniorRole) {
      if (candidateYears >= 5) return { score: 90, maxCap: 98 };
      if (candidateYears >= 3) return { score: 60, maxCap: 76 };
      // 0–2 años vs título Senior/Lead → filtro excluyente
      return { score: 20, maxCap: 48 };
    }
    return { score: 75, maxCap: 98 };
  }

  // Requisito explícito de años
  if (candidateYears >= requiredYears) return { score: 100, maxCap: 98 };

  // Penalización cuadrática: score = max(0, 1 - diff² / 16)
  // diff=1 → 93.75 | diff=2 → 75 | diff=3 → 43.75 | diff≥4 → 0
  const diff  = requiredYears - candidateYears;
  const score = Math.round(Math.max(0, 1 - (diff ** 2) / 16) * 100);

  // maxCap: techo duro proporcional a la brecha (filtro excluyente en UI)
  const maxCap = diff <= 1 ? 98
    : diff <= 2 ? 86
    : diff <= 3 ? 70
    : 50;

  return { score, maxCap };
};

const computeWeightedSkillScore = (requiredSkills, candidateSkills, jobTitle) => {
  const hardSkills = requiredSkills.filter(s => SKILL_LIBRARY[s]?.tier !== 'soft');

  if (hardSkills.length === 0) {
    const candidateHardSkills = candidateSkills.filter(s => SKILL_LIBRARY[s]?.tier !== 'soft');
    return candidateHardSkills.length > 0 ? 58 : 42;
  }

  const normalizedTitle = normalizeText(jobTitle);
  let totalWeight = 0;
  let matchedWeight = 0;

  hardSkills.forEach((skill) => {
    const entry = SKILL_LIBRARY[skill];
    const aliases = entry?.aliases || [];
    const isCoreForRole = aliases.some((alias) => normalizedTitle.includes(normalizeText(alias)));

    const weight = isCoreForRole ? 3.0 : 1.0;

    totalWeight += weight;
    if (candidateSkills.includes(skill)) matchedWeight += weight;
  });

  return Math.round((matchedWeight / totalWeight) * 100);
};

const computeTitleAlignment = (roleSignals, jobTitle, jobText, area) => {
  const normalizedTitle = normalizeText(jobTitle);
  const normalizedText = normalizeText(jobText);
  const signals = unique([...(AREA_KEYWORDS[area] || []), ...roleSignals]);

  if (signals.length === 0) return 55;

  const matches = signals.filter((signal) => {
    const normalizedSignal = normalizeText(signal);
    return normalizedTitle.includes(normalizedSignal) || normalizedText.includes(normalizedSignal);
  });

  if (matches.length === 0) return 40;
  return Math.min(100, 45 + matches.length * 18);
};

const scoreBand = (score) => {
  if (score >= 80) return 'alto';
  if (score >= 60) return 'medio';
  return 'bajo';
};

const formatSkillList = (skills = []) => skills.map(toReadableSkill);

const buildFeedback = ({ matchedSkills, missingSkills, hasStructuredCv, experienceCapped }) => {
  const topMissing = formatSkillList(missingSkills.slice(0, 3));
  const topMatched = formatSkillList(matchedSkills.slice(0, 3));

  // Filtro excluyente de experiencia — tiene prioridad sobre el resto
  if (experienceCapped) {
    const techGap = topMissing.length > 0
      ? ` Además, te falta cubrir: ${topMissing.join(', ')}.`
      : '';
    return `Esta vacante requiere más años de experiencia de los que tienes actualmente. Aplícala más adelante en tu carrera o busca roles junior similares.${techGap}`;
  }

  if (topMissing.length > 0) {
    const intro = topMatched.length > 0
      ? `Ya tienes base en ${topMatched.join(', ')}`
      : 'Tu perfil todavía no cubre lo esencial de esta vacante';
    return `${intro}. Te falta reforzar ${topMissing.join(', ')} para subir tu probabilidad de entrevista.`;
  }

  if (!hasStructuredCv) {
    return 'Tu perfil se ve competitivo, pero el score puede mejorar si guardas tu CV en formato estructurado dentro de NEXT.';
  }

  return topMatched.length > 0
    ? `Buen encaje. Tu perfil ya conversa bien con ${topMatched.join(', ')}.`
    : 'Buen encaje general según el rol y la experiencia detectada.';
};

export const enrichJobsWithMatchData = (jobs = [], user = {}) => {
  const candidate = getCandidateProfile(user);

  return jobs.map((job) => {
    const jobText = extractJobText(job);
    const requiredSkillsAll = extractKnownSkillsFromText(jobText);
    
    // Filtramos habilidades blandas del análisis: no cuentan para el match ni aparecen en la UI de Match
    const requiredSkills = requiredSkillsAll.filter(s => SKILL_LIBRARY[s]?.tier !== 'soft');
    const matchedSkills = requiredSkills.filter((skill) => candidate.skills.includes(skill));
    const missingSkills = requiredSkills.filter((skill) => !candidate.skills.includes(skill));

    const skillScore    = computeWeightedSkillScore(requiredSkills, candidate.skills, job.job_title || '');
    const expBlock      = computeExperienceBlock(candidate.experienceYears, job.job_title || '', jobText);
    const titleAlignment = computeTitleAlignment(candidate.roleSignals, job.job_title || '', jobText, user.area);

    const rawScore = Math.round(
      (skillScore       * 0.60) +
      (titleAlignment   * 0.15) +
      (expBlock.score   * 0.15) +
      (candidate.profileStrength * 0.10)
    );
    // expBlock.maxCap es el techo duro cuando la brecha de experiencia es excluyente
    const finalScore = Math.max(18, Math.min(expBlock.maxCap, rawScore));
    const experienceCapped = expBlock.maxCap < 75;

    const resources = missingSkills
      .slice(0, 3)
      .map((skill) => ({
        skill: toReadableSkill(skill),
        title: SKILL_LIBRARY[skill]?.resource?.title || `Aprender ${toReadableSkill(skill)}`,
        url: SKILL_LIBRARY[skill]?.resource?.url || 'https://roadmap.sh/',
      }));

    // Al haber filtrado arriba, aquí ya solo hay hard skills
    const orderedMatched = matchedSkills;

    return {
      ...job,
      matchAnalysis: {
        score: finalScore,
        band: scoreBand(finalScore),
        experienceCapped,
        profileSource: candidate.hasStructuredCv ? 'cv_json' : (candidate.rawText ? 'cv_text' : 'profile_only'),
        strengths: formatSkillList(orderedMatched.slice(0, 4)),
        missingSkills: formatSkillList(missingSkills.slice(0, 4)),
        resources,
        summary: buildFeedback({
          matchedSkills,
          missingSkills,
          hasStructuredCv: candidate.hasStructuredCv,
          experienceCapped,
        }),
      },
    };
  });
};