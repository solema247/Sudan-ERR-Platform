/**
 * F5 guided extraction: parse user-highlighted snippet images (activities / demographics / questions).
 * Multipart: kind, project_id, files[].
 * Auth: staging session (Bearer) + project access check.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import mammoth from 'mammoth';
import { validateSession } from '../../../services/auth';
import {
  createProdSupabaseAdmin,
  isProdSupabaseConfigured,
} from '../../../services/prodSupabaseAdmin';
import { assertProdProjectAccess } from '../../../services/prodProjectAccess';
import { sanitizeModelJsonOutput } from '../../../lib/ocr/geminiStructureOcrText';
import { createGeminiParseSnipsResilient } from '../../../lib/ocr/geminiParseSnipsResilient';

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

/** Set GEMINI_F5_PARSE_SNIPS_MODEL=gemini-2.5-flash to force the full model. */
const F5_PARSE_SNIPS_MODEL =
  process.env.GEMINI_F5_PARSE_SNIPS_MODEL?.trim() || 'gemini-2.5-flash-lite';
const F5_PARSE_SNIPS_FALLBACK_MODEL = 'gemini-2.5-flash';

/** Narrative answers + Arabic text can exceed 8k output tokens; truncation breaks JSON.parse */
const F5_QUESTIONS_MAX_OUTPUT = 32_768;
const F5_GRID_MAX_OUTPUT = 12_288;
const F5_JSON_REPAIR_MAX_OUTPUT = 32_768;

const { generateContentResilient } = createGeminiParseSnipsResilient({
  logPrefix: '[F5 parse-snips]',
  primaryModelId: F5_PARSE_SNIPS_MODEL,
  fallbackModelId: F5_PARSE_SNIPS_FALLBACK_MODEL,
  temperatureDefault: 0,
});

type SnipKind = 'activities' | 'demographics' | 'questions';

type SnipFile = { name: string; mime: string; buffer: Buffer };

type InlinePart = { inlineData?: { mimeType: string; data: string }; text?: string };

function parseForm(
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: 20 * 1024 * 1024,
    maxTotalFileSize: 60 * 1024 * 1024,
    multiples: true,
    keepExtensions: true,
  });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

function firstField(fields: formidable.Fields, key: string): string | undefined {
  const v = fields[key];
  if (Array.isArray(v)) return v[0];
  return v as string | undefined;
}

function collectSnipFiles(files: formidable.Files): SnipFile[] {
  const entry = (files as any).files;
  const list: formidable.File[] = Array.isArray(entry) ? entry : entry ? [entry] : [];
  const out: SnipFile[] = [];
  for (const f of list) {
    if (!f?.filepath) continue;
    try {
      const buffer = fs.readFileSync(f.filepath);
      out.push({
        name: f.originalFilename || 'snippet.png',
        mime: f.mimetype || 'application/octet-stream',
        buffer,
      });
    } finally {
      try {
        fs.unlinkSync(f.filepath);
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

async function toInlineParts(files: SnipFile[]): Promise<InlinePart[]> {
  const parts: InlinePart[] = [];
  for (const file of files) {
    const lowerName = String(file.name || '').toLowerCase();
    const isDocx =
      file.mime ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerName.endsWith('.docx');
    if (isDocx) {
      const extracted = await mammoth.extractRawText({ buffer: file.buffer });
      parts.push({ text: extracted.value || '' });
      continue;
    }
    parts.push({
      inlineData: { mimeType: file.mime, data: file.buffer.toString('base64') },
    });
  }
  return parts;
}

async function parseJsonWithRepair(rawText: string) {
  const safeParse = (text: string) => {
    try {
      return JSON.parse(text);
    } catch {
      const escaped = text.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
      return JSON.parse(escaped);
    }
  };
  const sanitized = sanitizeModelJsonOutput(rawText);
  try {
    return safeParse(sanitized);
  } catch (firstErr) {
    console.warn('[F5 parse-snips] JSON_PARSE_RETRY', {
      sanitizedChars: sanitized.length,
      firstError: firstErr instanceof Error ? firstErr.message : String(firstErr),
      tail200: sanitized.slice(-200),
    });
    const repairResult = await generateContentResilient(
      'You will receive malformed JSON. Return STRICT valid JSON only, no markdown. Keep key names; only repair escapes, quotes, commas, and brackets. If the input was truncated mid-string, complete missing closing quotes/braces and use null for fields you cannot recover.',
      F5_JSON_REPAIR_MAX_OUTPUT,
      undefined,
      [
        { text: 'Repair this JSON and return valid JSON only:' },
        { text: sanitized },
      ] as any
    );
    const repaired = sanitizeModelJsonOutput(repairResult.response.text());
    try {
      return safeParse(repaired);
    } catch (repairErr) {
      console.error('[F5 parse-snips] JSON_PARSE_REPAIR_FAILED', {
        repairedChars: repaired.length,
        repairError: repairErr instanceof Error ? repairErr.message : String(repairErr),
        tail200: repaired.slice(-200),
      });
      throw repairErr;
    }
  }
}

function toFiniteInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.floor(n);
}

function normalizeActivities(parsed: Record<string, unknown>) {
  const rows = Array.isArray(parsed.reach) ? parsed.reach : [];
  return rows.map((row: any) => ({
    activity_name: row?.activity_name != null ? String(row.activity_name) : '',
    activity_goal: row?.activity_goal != null ? String(row.activity_goal) : '',
    location: row?.location != null ? String(row.location) : '',
    start_date: row?.start_date != null ? String(row.start_date) : '',
    end_date: row?.end_date != null ? String(row.end_date) : '',
    individual_count: toFiniteInt(row?.individual_count),
    household_count: toFiniteInt(row?.household_count),
  }));
}

function normalizeDemographics(parsed: Record<string, unknown>) {
  const rows = Array.isArray(parsed.reach) ? parsed.reach : [];
  return rows.map((row: any) => ({
    activity_name: row?.activity_name != null ? String(row.activity_name) : '',
    male_count: toFiniteInt(row?.male_count),
    female_count: toFiniteInt(row?.female_count),
    under18_male: toFiniteInt(row?.under18_male),
    under18_female: toFiniteInt(row?.under18_female),
    people_with_disabilities: toFiniteInt(row?.people_with_disabilities),
  }));
}

const ACTIVITIES_INSTRUCTION = `You read screenshot snippets from an F5 program report.
Extract ONLY the activities rows that contain table cells for activities + individuals/families counts.
Return STRICT JSON:
{
  "reach": Array<{
    "activity_name": string,
    "activity_goal": string | null,
    "location": string | null,
    "start_date": string | null,
    "end_date": string | null,
    "individual_count": number | null,
    "household_count": number | null
  }>
}
Rules:
- Include all visible rows that are actual activity rows.
- Keep row order as shown.
- Use null when a value is truly missing.
- Return JSON only.`;

const DEMOGRAPHICS_INSTRUCTION = `You read screenshot snippets from an F5 program report.
Extract ONLY demographics breakdown rows.
Return STRICT JSON:
{
  "reach": Array<{
    "activity_name": string | null,
    "male_count": number | null,
    "female_count": number | null,
    "under18_male": number | null,
    "under18_female": number | null,
    "people_with_disabilities": number | null
  }>
}
Rules:
- Include all visible rows that represent activity demographics.
- Keep row order as shown.
- Return null for values not visible.
- Return JSON only.`;

const QUESTIONS_INSTRUCTION = `You read screenshot snippets from an F5 program report.
Extract ONLY narrative/question answers.
Return STRICT JSON:
{
  "positive_changes": string | null,
  "negative_results": string | null,
  "unexpected_results": string | null,
  "lessons_learned": string | null,
  "suggestions": string | null,
  "reporting_person": string | null
}
Rules:
- Return answer text only, never question text.
- Keep original language.
- Use null only when no answer is visible.
- Return JSON only.`;

async function parseWithGemini(kind: SnipKind, files: SnipFile[]) {
  const parts = await toInlineParts(files);
  const instruction =
    kind === 'activities'
      ? ACTIVITIES_INSTRUCTION
      : kind === 'demographics'
        ? DEMOGRAPHICS_INSTRUCTION
        : QUESTIONS_INSTRUCTION;
  const maxOut = kind === 'questions' ? F5_QUESTIONS_MAX_OUTPUT : F5_GRID_MAX_OUTPUT;
  const result = await generateContentResilient(instruction, maxOut, undefined, parts as any);
  return (await parseJsonWithRepair(result.response.text())) as Record<string, unknown>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const accessToken = authHeader.replace('Bearer ', '');
  const user = await validateSession(accessToken);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Extraction service is not configured' });
  }
  if (!isProdSupabaseConfigured()) {
    return res.status(500).json({ error: 'Prod Supabase not configured' });
  }

  try {
    const { fields, files: formFiles } = await parseForm(req);
    const kindRaw = String(firstField(fields, 'kind') || '').toLowerCase();
    if (!['activities', 'demographics', 'questions'].includes(kindRaw)) {
      return res.status(400).json({ error: 'kind must be activities|demographics|questions' });
    }
    const kind = kindRaw as SnipKind;

    const projectId = String(firstField(fields, 'project_id') || '').trim();
    if (!projectId) {
      return res.status(400).json({ error: 'project_id is required' });
    }
    const prod = createProdSupabaseAdmin();
    const access = await assertProdProjectAccess({
      accessToken,
      userId: user.id,
      prod,
      projectId,
    });
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const files = collectSnipFiles(formFiles);
    if (!files.length) {
      return res.status(400).json({ error: 'No snippet files provided' });
    }

    console.log('[F5 parse-snips] START', {
      kind,
      model: F5_PARSE_SNIPS_MODEL,
      fileCount: files.length,
      ts: new Date().toISOString(),
    });

    const parsed = await parseWithGemini(kind, files);

    if (kind === 'activities') return res.status(200).json({ reach: normalizeActivities(parsed) });
    if (kind === 'demographics') {
      return res.status(200).json({ reach: normalizeDemographics(parsed) });
    }
    return res.status(200).json({
      positive_changes: parsed.positive_changes ?? null,
      negative_results: parsed.negative_results ?? null,
      unexpected_results: parsed.unexpected_results ?? null,
      lessons_learned: parsed.lessons_learned ?? null,
      suggestions: parsed.suggestions ?? null,
      reporting_person: parsed.reporting_person ?? null,
    });
  } catch (e: any) {
    console.error('[F5 parse-snips] error', e?.message || e);
    return res.status(500).json({ error: 'Failed to read the selected regions' });
  }
}
