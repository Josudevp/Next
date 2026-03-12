import User from '../models/User.js';
import { searchJobsForUser } from '../controllers/jobController.js';
import { sendEmail } from './emailService.js';

const DEFAULT_FRONTEND_URL = 'https://next-col.online';
const MAX_JOBS_PER_DIGEST = 5;
const MIN_MATCH_SCORE = 60;
const MAX_STORED_JOB_IDS = 120;
const DIGEST_SEARCH_LIMIT = 30;

const normalizeFrontendUrl = (value) => {
  if (!value) return DEFAULT_FRONTEND_URL;
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const normalizeSeenJobIds = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  return [];
};

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const buildDigestHtml = ({ user, jobs, frontendUrl }) => {
  const jobsMarkup = jobs.map((job) => {
    const matchScore = job.matchAnalysis?.score ?? 0;
    const company = escapeHtml(job.employer_name || 'Empresa no especificada');
    const scope = job._scope === 'colombia' ? 'Colombia' : 'Remoto / internacional';
    const summary = escapeHtml(job.matchAnalysis?.summary || 'Vacante detectada por Hunter Notifications.');
    const title = escapeHtml(job.job_title || 'Vacante sin título');
    const safeApplyLink = escapeHtml(job.job_apply_link || frontendUrl);

    return `
      <tr>
        <td style="padding: 0 0 18px 0;">
          <div style="border: 1px solid #E5E7EB; border-radius: 14px; padding: 18px; background: #FFFFFF;">
            <div style="font-size: 12px; font-weight: 700; color: #2563EB; margin-bottom: 6px;">Match ${matchScore}% · ${scope}</div>
            <div style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 14px; color: #4B5563; margin-bottom: 10px;">${company}</div>
            <div style="font-size: 14px; color: #374151; line-height: 1.55; margin-bottom: 14px;">${summary}</div>
            <a href="${safeApplyLink}" style="display: inline-block; background: #111827; color: #FFFFFF; text-decoration: none; padding: 10px 14px; border-radius: 10px; font-size: 14px; font-weight: 700; margin-right: 8px;">
              Ver vacante
            </a>
            <a href="${frontendUrl}/job-hunter" style="display: inline-block; color: #2563EB; text-decoration: none; font-size: 14px; font-weight: 700;">
              Abrir Job Hunter
            </a>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; background: #F9FAFB; padding: 24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px; margin: 0 auto; background: #F9FAFB;">
        <tr>
          <td style="padding: 0 0 18px 0;">
            <div style="background: linear-gradient(135deg, #1D4ED8 0%, #0F172A 100%); border-radius: 18px; padding: 28px; color: #FFFFFF;">
              <div style="font-size: 13px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8; margin-bottom: 10px;">NEXT Hunter Notifications</div>
              <div style="font-size: 28px; font-weight: 700; line-height: 1.15; margin-bottom: 10px;">Buenos días, ${escapeHtml(user.name || 'Hunter')}.</div>
              <div style="font-size: 15px; line-height: 1.6; max-width: 520px; opacity: 0.92;">Encontramos ${jobs.length} vacante${jobs.length === 1 ? '' : 's'} nueva${jobs.length === 1 ? '' : 's'} que encajan con tu perfil y tu nivel de experiencia.</div>
            </div>
          </td>
        </tr>
        ${jobsMarkup}
        <tr>
          <td style="padding-top: 8px; color: #6B7280; font-size: 13px; line-height: 1.6;">
            Recibes este resumen porque activaste las notificaciones diarias de Job Hunter en NEXT. Si quieres pausarlas, actualiza tu perfil desde la plataforma.
          </td>
        </tr>
      </table>
    </div>
  `;
};

const selectFreshJobs = (jobs, seenJobIds) => jobs
  .filter((job) => job.job_id && !seenJobIds.has(job.job_id))
  .filter((job) => (job.matchAnalysis?.score ?? 0) >= MIN_MATCH_SCORE)
  .slice(0, MAX_JOBS_PER_DIGEST);

export const runHunterDigest = async () => {
  const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL);
  const requestMeta = {
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'NEXT Hunter Notifications Cron',
    },
  };

  const users = await User.findAll({
    where: { hunterNotificationsEnabled: true },
    attributes: [
      'id',
      'name',
      'email',
      'area',
      'skills',
      'cvText',
      'experienceLevel',
      'hunterSeenJobIds',
      'hunterLastNotifiedAt',
    ],
  });

  const summary = {
    processedUsers: users.length,
    emailedUsers: 0,
    skippedUsers: 0,
    failedUsers: 0,
  };

  for (const user of users) {
    if (!user.email || !user.area) {
      summary.skippedUsers += 1;
      continue;
    }

    try {
      const { jobs } = await searchJobsForUser({
        userId: user.id,
        query: user.area,
        requestMeta,
        userOverride: user,
        resultLimit: DIGEST_SEARCH_LIMIT,
      });

      const seenJobIds = new Set(normalizeSeenJobIds(user.hunterSeenJobIds));
      const freshJobs = selectFreshJobs(jobs, seenJobIds);

      if (freshJobs.length === 0) {
        summary.skippedUsers += 1;
        continue;
      }

      await sendEmail({
        to: user.email,
        subject: `Hunter Notifications: ${freshJobs.length} nueva${freshJobs.length === 1 ? '' : 's'} vacante${freshJobs.length === 1 ? '' : 's'} para ti`,
        html: buildDigestHtml({ user, jobs: freshJobs, frontendUrl }),
      });

      const updatedSeenJobIds = [
        ...freshJobs.map((job) => job.job_id),
        ...normalizeSeenJobIds(user.hunterSeenJobIds),
      ].filter(Boolean).slice(0, MAX_STORED_JOB_IDS);

      user.hunterSeenJobIds = [...new Set(updatedSeenJobIds)];
      user.hunterLastNotifiedAt = new Date();
      await user.save();

      summary.emailedUsers += 1;
    } catch (error) {
      summary.failedUsers += 1;
      console.error(`[HunterDigest] Error con usuario ${user.id}:`, error.message);
    }
  }

  console.log('[HunterDigest] Resumen:', summary);
  return summary;
};