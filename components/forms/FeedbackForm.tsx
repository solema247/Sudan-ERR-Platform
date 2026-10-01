import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import { newSupabase } from '../../services/newSupabaseClient';

/**
 * Feedback & support tickets (Arabic / English, RTL / LTR).
 * Tickets are saved in the database, then sent to the team's private GitHub repo by /api/feedback-tickets.
 */

interface FeedbackFormProps {
    onReturnToMenu: () => void;
}

type TicketType = 'bug' | 'feedback' | 'support';
const TYPES: TicketType[] = ['bug', 'feedback', 'support'];
const SUBJECT_MAX = 150;
const DESCRIPTION_MAX = 4000;

const FeedbackForm = ({ onReturnToMenu }: FeedbackFormProps) => {
    const { t, i18n } = useTranslation('feedback');
    const [ticketType, setTicketType] = useState<TicketType | null>(null);
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [rating, setRating] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ reference: string; delivered: boolean } | null>(null);

    const valid = ticketType !== null && subject.trim().length >= 3 && description.trim().length >= 5;

    const reset = () => {
        setTicketType(null); setSubject(''); setDescription(''); setRating(null); setError(''); setResult(null);
    };

    const handleSubmit = async () => {
        if (!valid) {
            setError(t('tickets.errors.required'));
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const { data: { session } } = await newSupabase.auth.getSession();
            if (!session) {
                setError(t('tickets.errors.session'));
                return;
            }
            const response = await fetch('/api/feedback-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({
                    ticket_type: ticketType,
                    subject: subject.trim(),
                    description: description.trim(),
                    rating: ticketType === 'feedback' ? rating : null,
                    language: i18n.language,
                    page: 'menu/feedback',
                }),
            });
            if (response.status === 401) {
                setError(t('tickets.errors.session'));
                return;
            }
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'failed');
            setResult({ reference: data.reference, delivered: data.delivered });
        } catch (e) {
            console.error('Ticket submission failed:', e);
            setError(t('tickets.errors.failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (result) {
        return (
            <div className="space-y-4 p-4 bg-white rounded-lg text-start" role="status">
                <div className="p-4 rounded-lg bg-green-50 border-s-4 border-brand-blue">
                    <p className="font-bold text-lg mb-1">{t('tickets.success.title')}</p>
                    <p className="text-gray-700">{t('tickets.success.reference', { ref: result.reference })}</p>
                    <p className="text-gray-700 mt-1">
                        {result.delivered ? t('tickets.success.delivered') : t('tickets.success.queued')}
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    <Button text={t('tickets.buttons.another')} onClick={reset} className="w-full" />
                    <Button text={t('buttons.returnToMenu')} onClick={onReturnToMenu} className="w-full" />
                </div>
            </div>
        );
    }

    return (
        <form
            className="space-y-5 p-4 bg-white rounded-lg text-start"
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            noValidate
        >
            <div>
                <h2 className="text-xl font-bold mb-1">{t('tickets.title')}</h2>
                <p className="text-gray-600 text-sm">{t('tickets.intro')}</p>
            </div>

            {/* Ticket type */}
            <fieldset>
                <legend className="font-semibold mb-2">{t('tickets.typeLabel')}</legend>
                <div className="grid grid-cols-1 gap-2">
                    {TYPES.map((type) => {
                        const selected = ticketType === type;
                        return (
                            <button
                                key={type}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setTicketType(type)}
                                className={`w-full text-start rounded-lg border-2 px-4 py-3 transition-colors ${
                                    selected ? 'border-brand-blue bg-brand-orangeSoft' : 'border-gray-200 bg-white hover:border-green-300'
                                }`}
                            >
                                <span className="block font-semibold">{t(`tickets.types.${type}`)}</span>
                                <span className="block text-sm text-gray-600">{t(`tickets.typeHints.${type}`)}</span>
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {/* Subject */}
            <div>
                <label htmlFor="ticket-subject" className="font-semibold block mb-1">{t('tickets.subject.label')}</label>
                <input
                    id="ticket-subject"
                    type="text"
                    value={subject}
                    maxLength={SUBJECT_MAX}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('tickets.subject.placeholder')}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                />
            </div>

            {/* Details */}
            <div>
                <label htmlFor="ticket-description" className="font-semibold block mb-1">{t('tickets.description.label')}</label>
                <textarea
                    id="ticket-description"
                    rows={5}
                    value={description}
                    maxLength={DESCRIPTION_MAX}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t(`tickets.description.placeholder.${ticketType || 'feedback'}`)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300"
                />
                <div className="text-xs text-gray-500 text-end" dir="ltr">{description.length} / {DESCRIPTION_MAX}</div>
            </div>

            {/* Optional ease-of-use rating (app feedback only) */}
            {ticketType === 'feedback' && (
                <fieldset>
                    <legend className="font-semibold mb-2">{t('tickets.rating.label')}</legend>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <button
                                key={n}
                                type="button"
                                aria-pressed={rating === n}
                                aria-label={t('tickets.rating.star', { n })}
                                onClick={() => setRating(rating === n ? null : n)}
                                className={`w-11 h-11 rounded-full border-2 font-bold ${
                                    rating !== null && n <= rating ? 'bg-brand-orange border-brand-orange text-gray-900' : 'bg-white border-gray-300 text-gray-500'
                                }`}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}

            {/* Privacy note */}
            <p className="text-sm bg-brand-orangeSoft border-s-4 border-brand-orange p-3 rounded">
                {t('tickets.privacy')}
            </p>

            {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}

            <div className="flex flex-col gap-2">
                <Button
                    type="submit"
                    text={isSubmitting ? t('tickets.buttons.submitting') : t('tickets.buttons.submit')}
                    disabled={isSubmitting || !valid}
                    className="w-full"
                />
                <Button text={t('buttons.returnToMenu')} onClick={onReturnToMenu} className="w-full" />
            </div>
        </form>
    );
};

export default FeedbackForm;
