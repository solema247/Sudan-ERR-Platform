import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

type Props = {
  reportId: string | number;
  token: string;
  onBack: () => void;
};

export default function F4ReportView({ reportId, token, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/f4/report/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load report');
        if (!cancelled) {
          setSummary(data.summary);
          setExpenses(data.expenses || []);
          setAttachments(data.attachments || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId, token]);

  if (loading) {
    return <p className="text-sm text-[#a8b6cc]">Loading report…</p>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
          {error}
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-[#8a97ab] hover:text-white"
        >
          Back
        </button>
      </div>
    );
  }

  const date = summary?.report_date
    ? String(summary.report_date).slice(0, 10)
    : '—';

  return (
    <div className="space-y-4">
      <div>
        <p className="app-section-label mb-1">F4 · Report</p>
        <h3 className="text-lg font-bold text-white mb-1">
          Report #{summary?.id}
          {date !== '—' ? ` · ${date}` : ''}
        </h3>
        <p className="text-sm text-[#a8b6cc] mb-0">
          Expenses:{' '}
          {Number.isFinite(Number(summary?.total_expenses))
            ? `$${Number(summary.total_expenses).toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })}`
            : '—'}
          {summary?.review_status ? ` · ${summary.review_status}` : ''}
        </p>
      </div>

      {attachments.some((a) => a.signed_url) && (
        <div className="flex flex-wrap gap-2">
          {attachments
            .filter((a) => a.signed_url)
            .map((a) => (
              <a
                key={a.id}
                href={a.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#1c2d48] px-3 py-2 text-sm font-semibold text-white hover:border-brand-orange/40"
              >
                Open attachment
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ))}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8a97ab] mb-2">
          Expenses ({expenses.length})
        </p>
        {expenses.length === 0 ? (
          <p className="text-sm text-[#a8b6cc]">No expense lines.</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {expenses.map((e) => (
              <li
                key={e.expense_id}
                className="rounded-xl border border-white/10 bg-[#152238] px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-white mb-0.5">
                  {e.expense_activity || e.expense_description || 'Expense'}
                </p>
                <p className="text-xs text-[#8a97ab] mb-0">
                  {Number.isFinite(Number(e.expense_amount))
                    ? `$${Number(e.expense_amount).toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}`
                    : '—'}
                  {e.payment_date ? ` · ${String(e.payment_date).slice(0, 10)}` : ''}
                  {e.seller ? ` · ${e.seller}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="w-full rounded-xl border border-white/15 text-white text-sm font-semibold py-2.5 hover:border-brand-orange/40"
      >
        Back
      </button>
    </div>
  );
}
