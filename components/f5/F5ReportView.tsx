import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

type Props = {
  reportId: string | number;
  token: string;
  onBack: () => void;
};

const NARRATIVE_FIELDS: Array<[string, string]> = [
  ['positive_changes', 'Positive changes'],
  ['negative_results', 'Negative results'],
  ['unexpected_results', 'Unexpected results'],
  ['lessons_learned', 'Lessons learned'],
  ['suggestions', 'Suggestions'],
];

function count(v: unknown) {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

export default function F5ReportView({ reportId, token, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [report, setReport] = useState<any>(null);
  const [reach, setReach] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/f5/report/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load report');
        if (!cancelled) {
          setReport(data.report);
          setReach(data.reach || []);
          setFiles(data.files || []);
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

  const date = report?.report_date ? String(report.report_date).slice(0, 10) : '—';
  const narratives = NARRATIVE_FIELDS.filter(([k]) => report?.[k]);

  return (
    <div className="space-y-4">
      <div>
        <p className="app-section-label mb-1">F5 · Report</p>
        <h3 className="text-lg font-bold text-white mb-1">
          Program report
          {date !== '—' ? ` · ${date}` : ''}
        </h3>
        <p className="text-sm text-[#a8b6cc] mb-0">
          Activities: {reach.length}
          {report?.reporting_person ? ` · ${report.reporting_person}` : ''}
        </p>
      </div>

      {files.some((f) => f.signed_url) && (
        <div className="flex flex-wrap gap-2">
          {files
            .filter((f) => f.signed_url)
            .map((f) => (
              <a
                key={f.id}
                href={f.signed_url}
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
          Activities ({reach.length})
        </p>
        {reach.length === 0 ? (
          <p className="text-sm text-[#a8b6cc]">No activities.</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {reach.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-white/10 bg-[#152238] px-3 py-2.5"
              >
                <p className="text-sm font-semibold text-white mb-0.5">
                  {r.activity_name || 'Activity'}
                </p>
                <p className="text-xs text-[#8a97ab] mb-0">
                  Individuals: {count(r.individual_count)} · Families: {count(r.household_count)}
                  {r.location ? ` · ${r.location}` : ''}
                  {r.start_date ? ` · ${String(r.start_date).slice(0, 10)}` : ''}
                </p>
                {(r.male_count != null || r.female_count != null) && (
                  <p className="text-xs text-[#8a97ab] mb-0">
                    Male: {count(r.male_count)} · Female: {count(r.female_count)} · Under 18:{' '}
                    {count(r.under18_male)}/{count(r.under18_female)} · Disabilities:{' '}
                    {count(r.people_with_disabilities)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {narratives.length > 0 && (
        <div className="space-y-3">
          {narratives.map(([key, label]) => (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8a97ab] mb-1">
                {label}
              </p>
              <p className="text-sm text-[#a8b6cc] whitespace-pre-wrap mb-0">{report[key]}</p>
            </div>
          ))}
        </div>
      )}

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
