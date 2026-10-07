// Server-only: creates GitHub issues for feedback tickets.
// The token is read from server environment variables and never reaches the browser.
//
//   GITHUB_FEEDBACK_TOKEN   fine-grained token with "Issues: Read and write" on the one repo
//   GITHUB_FEEDBACK_REPO    owner/repo, e.g. mhmdelobaid/Sudan-ERR-Platform
//   GITHUB_FEEDBACK_ALLOW_PUBLIC   leave unset; "true" allows a public repo (not recommended)
//   GITHUB_API_URL          optional, for testing against a stand-in server

export type TicketType = 'bug' | 'feedback' | 'support';
export type SyncStatus = 'synced' | 'failed' | 'not_configured' | 'blocked_public_repo';

export interface TicketForGitHub {
    id: string;
    created_at: string;
    ticket_type: TicketType;
    subject: string;
    description: string;
    rating?: number | null;
    language?: string | null;
    page?: string | null;
    room_code?: string | null;
}

export interface SyncResult {
    status: SyncStatus;
    issueNumber?: number;
    issueUrl?: string;
    error?: string;
}

const TYPE_LABELS: Record<TicketType, { title: string; label: string }> = {
    bug: { title: 'Bug Report', label: 'bug' },
    feedback: { title: 'App Feedback', label: 'feedback' },
    support: { title: 'General Support', label: 'support' },
};

const LANGUAGE_NAMES: Record<string, string> = { ar: 'Arabic (ar)', en: 'English (en)', es: 'Spanish (es)' };

const apiBase = () => (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');

const headers = (token: string) => ({
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sudan-err-platform',
    'Content-Type': 'application/json',
});

/** Stop user text from pinging GitHub users (@name) or teams. */
function neutralise(text: string): string {
    return text.replace(/@/g, '@​');
}

export function buildIssue(ticket: TicketForGitHub): { title: string; body: string; labels: string[] } {
    const type = TYPE_LABELS[ticket.ticket_type];
    const sender = ticket.room_code || 'anonymous';
    const title = `[${type.title}] Feedback submission from ${sender}: ${neutralise(ticket.subject)}`.slice(0, 200);
    const lines = [
        '## 📝 User Feedback & Ticket Submission',
        '',
        `**Ticket Type:** ${type.title}`,
        `**Submission Timestamp:** ${new Date(ticket.created_at).toISOString()}`,
        `**Language:** ${LANGUAGE_NAMES[ticket.language || ''] || ticket.language || 'unknown'}`,
        `**Room:** ${sender}`,
    ];
    if (ticket.page) lines.push(`**App area:** ${neutralise(ticket.page)}`);
    if (ticket.rating) lines.push(`**Ease-of-use rating:** ${ticket.rating} / 5`);
    lines.push(
        '',
        '### Subject',
        neutralise(ticket.subject),
        '',
        '### Details',
        neutralise(ticket.description),
        '',
        '---',
        `Ticket ID: \`${ticket.id}\` (in the app database). Sent automatically by the ERR app.`,
    );
    return { title, body: lines.join('\n'), labels: [type.label, 'source:app-feedback'] };
}

let privacyCache: { repo: string; isPrivate: boolean; checkedAt: number } | null = null;

async function repoIsPrivate(repo: string, token: string): Promise<boolean> {
    if (privacyCache && privacyCache.repo === repo && Date.now() - privacyCache.checkedAt < 10 * 60 * 1000) {
        return privacyCache.isPrivate;
    }
    const res = await fetch(`${apiBase()}/repos/${repo}`, { headers: headers(token) });
    if (!res.ok) throw new Error(`GitHub repo check failed: HTTP ${res.status}`);
    const data = await res.json();
    privacyCache = { repo, isPrivate: data.private === true, checkedAt: Date.now() };
    return privacyCache.isPrivate;
}

/** Create the GitHub issue for a ticket. Never throws: problems come back as a status. */
export async function syncTicketToGitHub(ticket: TicketForGitHub): Promise<SyncResult> {
    const token = process.env.GITHUB_FEEDBACK_TOKEN;
    const repo = process.env.GITHUB_FEEDBACK_REPO;
    if (!token || !repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
        return { status: 'not_configured', error: 'GITHUB_FEEDBACK_TOKEN / GITHUB_FEEDBACK_REPO not set' };
    }
    try {
        if (process.env.GITHUB_FEEDBACK_ALLOW_PUBLIC !== 'true' && !(await repoIsPrivate(repo, token))) {
            return { status: 'blocked_public_repo', error: `${repo} is public; tickets are kept in the database until it is private` };
        }
        const res = await fetch(`${apiBase()}/repos/${repo}/issues`, {
            method: 'POST',
            headers: headers(token),
            body: JSON.stringify(buildIssue(ticket)),
        });
        if (!res.ok) {
            const text = await res.text();
            return { status: 'failed', error: `GitHub HTTP ${res.status}: ${text.slice(0, 300)}` };
        }
        const issue = await res.json();
        return { status: 'synced', issueNumber: issue.number, issueUrl: issue.html_url };
    } catch (e: any) {
        return { status: 'failed', error: String(e?.message || e).slice(0, 300) };
    }
}
