// Feedback & support tickets.
//   POST /api/feedback-tickets                 file a ticket: saved to the database first, then sent to GitHub Issues
//   POST /api/feedback-tickets?action=retry    admins: resend tickets that haven't reached GitHub yet
import { NextApiRequest, NextApiResponse } from 'next';
import { validateSession } from '../../services/auth';
import { createAuthenticatedClient } from '../../services/createAuthenticatedClient';
import { syncTicketToGitHub, TicketType } from '../../services/githubIssues';

const TYPES: TicketType[] = ['bug', 'feedback', 'support'];
const LANGUAGES = ['ar', 'en', 'es'];
const RETRY_LIMIT = 20;

type Db = ReturnType<typeof createAuthenticatedClient>;

async function syncAndRecord(db: Db, ticket: any) {
    const result = await syncTicketToGitHub(ticket);
    const { error } = await db.rpc('feedback_ticket_record_sync', {
        p_ticket_id: ticket.id,
        p_status: result.status,
        p_issue_number: result.issueNumber ?? null,
        p_issue_url: result.issueUrl ?? null,
        p_error: result.error ?? null,
    });
    if (error) console.error('feedback-tickets: could not record sync result', error.message);
    if (result.status !== 'synced') console.warn(`feedback-tickets: ticket ${ticket.id} ${result.status}: ${result.error}`);
    return result;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, message: 'No authorization header' });
    const accessToken = authHeader.replace('Bearer ', '');
    const user = await validateSession(accessToken);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const db = createAuthenticatedClient(accessToken);

    // Admin retry of tickets that didn't reach GitHub
    if (req.query.action === 'retry') {
        if (!['admin', 'superadmin'].includes(user.role)) {
            return res.status(403).json({ success: false, message: 'Admins only' });
        }
        const { data: tickets, error } = await db
            .from('feedback_tickets')
            .select('*')
            .neq('sync_status', 'synced')
            .order('created_at', { ascending: true })
            .limit(RETRY_LIMIT);
        if (error) return res.status(500).json({ success: false, message: error.message });
        const results = [];
        for (const t of tickets || []) {
            const r = await syncAndRecord(db, t);
            results.push({ id: t.id, status: r.status });
        }
        return res.status(200).json({
            success: true,
            retried: results.length,
            synced: results.filter(r => r.status === 'synced').length,
            results,
        });
    }

    // Validate the ticket
    const body = req.body || {};
    const ticketType = String(body.ticket_type || '');
    const subject = String(body.subject || '').trim();
    const description = String(body.description || '').trim();
    const language = LANGUAGES.includes(body.language) ? body.language : null;
    const page = body.page ? String(body.page).slice(0, 100) : null;
    const rating = body.rating == null || body.rating === '' ? null : Number(body.rating);

    if (!TYPES.includes(ticketType as TicketType)) return res.status(400).json({ success: false, message: 'invalid_type' });
    if (subject.length < 3 || subject.length > 150) return res.status(400).json({ success: false, message: 'invalid_subject' });
    if (description.length < 5 || description.length > 4000) return res.status(400).json({ success: false, message: 'invalid_description' });
    if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
        return res.status(400).json({ success: false, message: 'invalid_rating' });
    }

    // Room code only: this is what identifies the sender on GitHub
    const { data: me } = await db.from('users').select('emergency_rooms ( err_code )').eq('id', user.id).single();
    const roomCode = (me as any)?.emergency_rooms?.err_code || null;

    // 1) Save first, so nothing is lost if GitHub is unreachable
    const { data: ticket, error: insertError } = await db
        .from('feedback_tickets')
        .insert([{
            user_id: user.id,
            room_code: roomCode,
            ticket_type: ticketType,
            subject,
            description,
            rating: ticketType === 'feedback' ? rating : null,
            language,
            page,
        }])
        .select()
        .single();
    if (insertError || !ticket) {
        console.error('feedback-tickets: insert failed', insertError?.message);
        return res.status(500).json({ success: false, message: 'save_failed' });
    }

    // 2) Then send it to GitHub
    const result = await syncAndRecord(db, ticket);

    return res.status(200).json({
        success: true,
        ticket_id: ticket.id,
        reference: String(ticket.id).slice(0, 8).toUpperCase(),
        delivered: result.status === 'synced',
    });
}
