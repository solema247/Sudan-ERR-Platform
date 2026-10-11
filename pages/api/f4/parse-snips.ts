/**
 * F4 guided extraction: parse user-highlighted snippet images (table / questions / receipts).
 * Multipart: kind, project_id, files[], expense_amounts_sdg (receipts).
 * Auth: staging session (Bearer). Sector lookup: prod.
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
import { sanitizeModelJsonOutput } from '../../../lib/ocr/geminiStructureOcrText';
import { createGeminiParseSnipsResilient } from '../../../lib/ocr/geminiParseSnipsResilient';
import { getF4ExpenseTableSnipInstruction } from '../../../lib/ocr/formStructurePrompts';
import {
  fetchF4SectorsForMatch,
  matchRawActivityToSectorNameEn,
} from '../../../lib/f4/f4ExpenseSectors';

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
};

const F4_PARSE_SNIPS_MODEL =
  process.env.GEMINI_F4_PARSE_SNIPS_MODEL?.trim() || 'gemini-2.5-flash-lite';
const F4_PARSE_SNIPS_FALLBACK_MODEL = 'gemini-2.5-flash';

const { generateContentResilient } = createGeminiParseSnipsResilient({
  logPrefix: '[F4 parse-snips]',
  primaryModelId: F4_PARSE_SNIPS_MODEL,
  fallbackModelId: F4_PARSE_SNIPS_FALLBACK_MODEL,
  temperatureDefault: 0.1,
});

type SnipKind = 'table' | 'questions' | 'receipts';

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

async function parseJsonWithRepair(kind: SnipKind, rawText: string) {
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
    console.warn('[F4 parse-snips] JSON_PARSE_RETRY', {
      kind,
      firstError: firstErr instanceof Error ? firstErr.message : String(firstErr),
    });
    const repairResult = await generateContentResilient(
      `You will receive malformed JSON output for F4 ${kind} extraction.
Return STRICT valid JSON only, no markdown, no explanation.
Do not change key names; only repair escaping/quoting/commas/brackets.
If a value is unknown, keep it null.`,
      8192,
      undefined,
      [
        { text: 'Repair this JSON and return valid JSON only:' },
        { text: sanitized },
      ] as any
    );
    const repaired = sanitizeModelJsonOutput(repairResult.response.text());
    return safeParse(repaired);
  }
}

const TABLE_AMOUNT_SCAN_INSTRUCTION = `You read screenshot(s) of an Arabic F4 expense report TABLE.

Return STRICT JSON only:
{
  "data_amounts_sdg": number[],
  "total_expenses_text": string | null,
  "total_grant_text": string | null,
  "total_other_sources_text": string | null,
  "remainder_text": string | null
}

data_amounts_sdg — CRITICAL:
- Consider ONLY the ruled DATA grid ABOVE the summary block (rows labeled A إجمالي النفقات, B المنحة, C مصادر أخرى when present).
- Go row by row from TOP of that grid to BOTTOM. For each horizontal rule line that has ONE expense amount in column "قيمة المصروفات" / Expense value (last column on the left in RTL layouts), append that amount once as an integer (728000 not "728,000").
- One visible grid row with one amount ⇒ exactly ONE array element. Never collapse several rows into one number.
- Do NOT append numbers from rows A/B/C. Do NOT skip rows because column النشاط is empty.
- Real tables often have 10–14 body rows in one image. Outputting only ~7 numbers when more ruled rows with amounts exist is an ERROR.

Footer strings:
- If rows A/B/C show totals, copy the numeric text beside each into total_expenses_text, total_grant_text, total_other_sources_text as printed (strings). remainder_text if a D line exists; else null.

Return JSON only.`;

function mergeFooterTotals(
  full: Record<string, unknown>,
  scan: Record<string, unknown>
): Record<string, unknown> {
  const keys = [
    'total_expenses_text',
    'total_grant_text',
    'total_other_sources_text',
    'remainder_text',
  ] as const;
  const out = { ...full };
  for (const k of keys) {
    const cur = out[k];
    const add = scan[k];
    if ((cur == null || cur === '') && add != null && add !== '') out[k] = add;
  }
  return out;
}

function alignExpensesToAmounts(
  parsed: Record<string, unknown>,
  amounts: number[]
): Record<string, unknown> {
  const prev = Array.isArray(parsed.expenses)
    ? (parsed.expenses as Record<string, unknown>[])
    : [];
  const expenses = amounts.map((amt, i) => {
    const row = prev[i] || {};
    const cur = row.currency === 'USD' ? 'USD' : 'SDG';
    return {
      activity:
        row.activity != null && String(row.activity).trim() !== ''
          ? String(row.activity)
          : '',
      amount_value: amt,
      currency: cur,
      description: row.description != null ? String(row.description) : null,
      payment_date: row.payment_date != null ? String(row.payment_date) : null,
      payment_method: row.payment_method != null ? String(row.payment_method) : null,
      receipt_no: row.receipt_no != null ? String(row.receipt_no) : null,
      seller: row.seller != null ? String(row.seller) : null,
    };
  });
  return { ...parsed, expenses };
}

async function parseTableSnippets(files: SnipFile[]): Promise<Record<string, unknown>> {
  const parts = await toInlineParts(files);

  const scanResult = await generateContentResilient(
    TABLE_AMOUNT_SCAN_INSTRUCTION,
    8192,
    { temperature: 0 },
    [
      {
        text:
          'Task: list every body-row amount from column قيمة المصروفات top-to-bottom, and footer A/B/C text. JSON only.',
      },
      ...parts,
    ] as any
  );
  const scanRaw = scanResult.response.text();
  let scanParsed: Record<string, unknown> = {};
  try {
    scanParsed = (await parseJsonWithRepair('table', scanRaw)) as Record<string, unknown>;
  } catch {
    console.warn('[F4 parse-snips] TABLE_PASS1_PARSE_FAILED');
  }
  const rawArr = scanParsed.data_amounts_sdg;
  const amounts = Array.isArray(rawArr)
    ? rawArr.map((x: unknown) => Number(x)).filter((n: number) => Number.isFinite(n) && n > 0)
    : [];

  const tableInstruction = getF4ExpenseTableSnipInstruction();
  const detailHint =
    amounts.length > 0
      ? `This expense grid has EXACTLY ${amounts.length} data rows (confirmed from column قيمة المصروفات).

The amounts in order from TOP to BOTTOM are:
${amounts.map((a, i) => `${i + 1}. ${a}`).join('\n')}

You MUST return "expenses" as an array of length ${amounts.length}.
For each index i, set expenses[i].amount_value to the i-th number above (exact match).
Fill activity from النشاط; if blank use the first line of وصف موجز للمصروفات. Put full brief description in "description".
Map تاريخ الدفع, البائع, نوع الدفع, رقم الإيصال from their columns.
Extract footer A/B/C into total_expenses_text, total_grant_text, total_other_sources_text when visible.

Return JSON only.`
      : `Extract the full expense table (every body row with description columns). Return JSON only.`;

  const detailResult = await generateContentResilient(
    tableInstruction,
    16384,
    { temperature: 0 },
    [{ text: detailHint }, ...parts] as any
  );
  const detailRaw = detailResult.response.text();

  let parsed = (await parseJsonWithRepair('table', detailRaw)) as Record<string, unknown>;
  parsed = mergeFooterTotals(parsed, scanParsed);
  if (amounts.length > 0) {
    parsed = alignExpensesToAmounts(parsed, amounts);
  }
  return parsed;
}

async function parseSnips(
  kind: SnipKind,
  files: SnipFile[],
  expectedAmounts: number[]
): Promise<any> {
  if (kind === 'table') return parseTableSnippets(files);

  if (kind === 'receipts') {
    const expectedHint = expectedAmounts.length
      ? `Expected expense totals to validate against (SDG): [${expectedAmounts.join(', ')}].`
      : 'No expected totals provided.';
    const receiptInstruction = `You are extracting ONE receipt snippet.
Return STRICT JSON:
{
  "amount_value": number | null,
  "currency": "SDG" | "USD" | null,
  "reference": string | null
}
Rules:
- Extract ONLY the final total paid/transaction amount for this receipt (NOT phone/account/reference/operation IDs).
- If multiple numbers exist, choose the amount that represents the total transfer/payment value.
- Prefer values associated with terms like: مبلغ, القيمة, الإجمالي, total, amount, تحويل.
- ${expectedHint}
- If the detected amount is clearly not a payment total or not reasonably close to any expected total, return amount_value as null.
- Keep amount numeric without separators.
- If truly unclear, return amount_value as null.`;

    const receipts: Array<{
      amount_value: number | null;
      currency: 'SDG' | 'USD' | null;
      reference: string | null;
    }> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const parts = await toInlineParts([file]);
      const result = await generateContentResilient(receiptInstruction, 8192, undefined, [
        { text: `Process receipt snippet ${i + 1}/${files.length}. Return JSON only.` },
        ...parts,
      ] as any);
      const parsed = await parseJsonWithRepair(kind, result.response.text());
      const obj = parsed && typeof parsed === 'object' ? parsed : {};
      const amount = (obj as any).amount_value != null ? Number((obj as any).amount_value) : null;
      const currency =
        (obj as any)?.currency === 'USD'
          ? 'USD'
          : (obj as any)?.currency === 'SDG'
            ? 'SDG'
            : null;
      const reference = (obj as any)?.reference != null ? String((obj as any).reference) : file.name;
      receipts.push({
        amount_value: Number.isFinite(amount as number) ? amount : null,
        currency,
        reference,
      });
    }
    return { receipts };
  }

  const questionInstruction = `Extract only F4 additional-question answers from provided snippet images/PDFs.
Return STRICT JSON:
{
  "excess_expenses": string | null,
  "surplus_use": string | null,
  "lessons": string | null,
  "training": string | null
}
Mapping by meaning (numbering varies):
- excess_expenses: answer to "if expenses were greater than grant, how paid extra?"
- surplus_use: answer to "if expenses were less than grant, how spend surplus?"
- lessons: answer to "what did you learn about budgeting / what would you do differently?"
- training: answer to "additional training/capacity needs in budgeting/financial management?"
Rules:
- Return answer text only, never question text.
- Ignore clarification-only text (e.g. "يجب الحصول على الموافقة...") unless it is the actual answer.
- If no answer is present, return null.
- If answer appears in later continuation bullet/line, include it.`;

  const parts = await toInlineParts(files);
  const result = await generateContentResilient(questionInstruction, 8192, { temperature: 0 }, [
    ...parts,
    {
      text:
        'Using the image(s) above: map answers under (4)(5)(6)(7) to excess_expenses, surplus_use, lessons, training (see system rules). Copy نعم/لا verbatim when that is the whole answer. Return JSON only.',
    },
  ] as any);
  return parseJsonWithRepair(kind, result.response.text());
}

function toFiniteAmount(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const user = await validateSession(authHeader.replace('Bearer ', ''));
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Extraction service is not configured' });
  }

  try {
    const { fields, files: formFiles } = await parseForm(req);
    const kindRaw = String(firstField(fields, 'kind') || '').toLowerCase();
    if (!['table', 'questions', 'receipts'].includes(kindRaw)) {
      return res.status(400).json({ error: 'kind must be table|questions|receipts' });
    }
    const kind = kindRaw as SnipKind;

    const files = collectSnipFiles(formFiles);
    if (!files.length) {
      return res.status(400).json({ error: 'No snippet files provided' });
    }

    let expected: number[] = [];
    if (kind === 'receipts') {
      try {
        expected = (JSON.parse(firstField(fields, 'expense_amounts_sdg') || '[]') as unknown[])
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v) && v > 0);
      } catch {
        /* ignore */
      }
    }

    const parsed = await parseSnips(kind, files, expected);

    if (kind === 'receipts') {
      const normalizedReceipts = Array.isArray(parsed?.receipts)
        ? parsed.receipts.map((r: any) => ({ ...r, amount_value: toFiniteAmount(r?.amount_value) }))
        : [];
      const found = normalizedReceipts.map((r: any) => toFiniteAmount(r?.amount_value));
      const receiptsTotalSdg = found.reduce(
        (sum: number, v: number | null) => sum + (v || 0),
        0
      );
      const detectedCount = found.filter((v: number | null) => v != null).length;
      const expectedTotalSdg = expected.reduce((sum, v) => sum + v, 0);
      return res.status(200).json({
        receipts: normalizedReceipts,
        receipts_total_sdg: receiptsTotalSdg,
        receipts_detected_count: detectedCount,
        expected_count: expected.length,
        expected_total_sdg: expectedTotalSdg,
      });
    }

    if (kind === 'table' && parsed && typeof parsed === 'object' && isProdSupabaseConfigured()) {
      try {
        const prod = createProdSupabaseAdmin();
        const sectors = await fetchF4SectorsForMatch(prod);
        const body = parsed as Record<string, unknown>;
        if (Array.isArray(body.expenses) && sectors.length) {
          body.expenses = body.expenses.map((row: Record<string, unknown>) => ({
            ...row,
            activity: matchRawActivityToSectorNameEn(
              row.activity as string | null | undefined,
              sectors
            ),
          }));
        }
      } catch (e) {
        console.warn('[F4 parse-snips] sector match skipped', e);
      }
    }

    return res.status(200).json(parsed || {});
  } catch (e: any) {
    console.error('[F4 parse-snips] error', e?.message || e);
    return res.status(500).json({ error: 'Failed to read the selected regions' });
  }
}
