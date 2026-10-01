// Dashboard: basic analysis of funding, projects, budgets and people reached,
// limited to what the signed-in user may see. Prints / saves to PDF with colours kept.
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { newSupabase } from '../services/newSupabaseClient';

// Chart colours: ERR blue and orange, deepened to pass colour-blind and contrast checks on white
const C = { blue: '#3B68B8', orange: '#D46A2C', track: '#E4EAF4', ink: '#1F2937', muted: '#6B7280', line: '#E5E7EB' };
const STATUS_ORDER = ['pending', 'feedback', 'approved', 'active', 'completed', 'rejected'];
// F-System pipeline colours. Orange = waiting on review or changes; ERR blue light -> deep as funding moves to completion.
// Checked with the dataviz palette validator: colour-blind and normal-vision separation pass. The two light steps are
// under 3:1 on white, so every stage also shows its name and count as text (never colour alone).
const STAGE: Record<string, { color: string; form: string }> = {
    draft: { color: '#C3C9D3', form: 'F-1' },
    pending: { color: '#F9A778', form: 'F-2' },
    feedback: { color: '#D46A2C', form: 'F-2' },
    approved: { color: '#9BB0D4', form: 'F-3' },
    active: { color: '#5D7EB3', form: 'F-4' },
    completed: { color: '#33496D', form: 'F-5' },
    rejected: { color: '#9CA3AF', form: 'F-2' },
};
// Bars per state are stacked from done to waiting, so the most advanced work sits at the start of the bar
const STACK_ORDER = ['completed', 'active', 'approved', 'feedback', 'pending', 'rejected'];
const STATES_SHOWN = 8;

interface Pool { state: string; allocated: number; committed: number; pending: number; remaining: number; is_own_state: boolean }
interface NamedAmount { id: string; en: string; ar: string | null; amount: number }
interface Budget { currency: string; total: number; byActivity: NamedAmount[]; byExpense: NamedAmount[] }
interface DashboardData {
    scope: 'all' | 'states' | 'room';
    states: string[];
    funding: Pool[];
    projects: { total: number; drafts?: number; byStatus: Record<string, number>; byState: { state: string; total: number; counts: Record<string, number> }[] };
    budgets: Budget[];
    people: { individuals: number; households: number; male: number; female: number; under18_male: number; under18_female: number; reports: number; projects_reported: number };
    generated_at: string;
    state_labels_ar?: Record<string, string>;
}

const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0);
const money = (n: number, cur: string) => cur === 'USD' ? `$${fmt(n)}` : `${fmt(n)} ${cur}`;

/** Horizontal bar: grows from the start edge, 4px rounded data-end, value at the tip. */
function BarRow({ label, value, max, display, color = C.blue }: { label: string; value: number; max: number; display: string; color?: string }) {
    const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
    return (
        <div className="py-1" title={`${label}: ${display}`}>
            <div className="text-sm text-gray-700 mb-1 truncate">{label}</div>
            <div className="flex items-center gap-2">
                <div className="flex-1 h-4">
                    <div className="h-4 rounded-e" style={{ width: `${pct}%`, minWidth: value > 0 ? 3 : 0, background: color }} />
                </div>
                <div className="text-sm font-semibold text-gray-900 w-28 text-end shrink-0" dir="ltr">{display}</div>
            </div>
        </div>
    );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-gray-200 p-4 mb-4 break-inside-avoid">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <span aria-hidden="true" className="block w-10 h-1 rounded-full bg-brand-orange mt-1 mb-2" />
            {subtitle && <p className="text-xs text-gray-500 mb-3">{subtitle}</p>}
            {children}
        </section>
    );
}

function Tile({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-3">
            <div className="text-xs text-gray-600">{label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1"><bdi>{value}</bdi></div>
        </div>
    );
}

function Legend({ items }: { items: { label: string; color: string; border?: boolean }[] }) {
    return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-gray-700">
            {items.map(i => (
                <span key={i.label} className="inline-flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: i.color, border: i.border ? `1px solid ${C.line}` : 'none' }} />
                    {i.label}
                </span>
            ))}
        </div>
    );
}

/** F-System pipeline: one card per stage, in workflow order, with its count, share and form step. */
function Pipeline({ statuses, counts, drafts, total, label, stepLabel, isAr }: {
    statuses: string[]; counts: Record<string, number>; drafts: number; total: number;
    label: (s: string) => string; stepLabel: (s: string) => string; isAr: boolean;
}) {
    // F-1 drafts lead the flow; they are not submitted yet, so they have no share of the total
    const flow = ['draft', ...statuses.filter(s => s !== 'rejected' && s !== 'draft')];
    const countOf = (s: string) => (s === 'draft' ? drafts : counts[s] || 0);
    return (
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4" aria-label={label('pipeline')}>
            {flow.map((s, i) => {
                const n = countOf(s);
                const isDraft = s === 'draft';
                const share = total > 0 ? Math.round((n / total) * 100) : 0;
                const arrow = i < flow.length - 1 && i % 3 !== 2;   // arrows inside each row of three (wide screens)
                return (
                    <li key={s} className="relative min-w-0">
                        <div className={`h-full min-w-0 rounded-lg border overflow-hidden flex md:flex-col ${isDraft ? 'bg-gray-50 border-dashed border-gray-300' : 'bg-white border-gray-200'}`}
                             title={isDraft ? `${label(s)}: ${n}` : `${label(s)}: ${n} (${share}%)`}>
                            <div className="w-1.5 md:w-auto md:h-1.5 shrink-0" style={{ background: STAGE[s]?.color || C.muted }} />
                            <div className="flex-1 flex md:flex-col items-center md:items-start justify-between gap-2 px-3 py-2 min-w-0">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 leading-tight">{label(s)}</div>
                                    <div className="text-xs text-gray-500"><bdi>{stepLabel(s)}</bdi></div>
                                </div>
                                <div className="text-end md:text-start shrink-0">
                                    <span className="text-2xl font-bold text-gray-900 leading-none"><bdi>{fmt(n)}</bdi></span>
                                    {!isDraft && <span className="text-xs text-gray-500 ms-1"><bdi>{share}%</bdi></span>}
                                </div>
                            </div>
                        </div>
                        {arrow && (
                            <span aria-hidden="true" className="hidden md:block absolute top-1/2 -translate-y-1/2 -end-[14px] text-brand-orange font-bold leading-none">{isAr ? '←' : '→'}</span>
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

/** One line per state: name, a bar split by stage (2px white gaps), and the total. */
function StateStack({ label, counts, total, max, statusLabel }: {
    label: string; counts: Record<string, number>; total: number; max: number; statusLabel: (s: string) => string;
}) {
    const parts = [...STACK_ORDER, ...Object.keys(counts).filter(k => !STACK_ORDER.includes(k))].filter(k => counts[k] > 0);
    const breakdown = parts.map(k => `${statusLabel(k)} ${counts[k]}`).join(' · ');
    return (
        <div className="grid items-center gap-2 py-1" style={{ gridTemplateColumns: 'minmax(6.5rem, 9rem) 1fr 2.5rem' }}
             title={`${label}: ${total} — ${breakdown}`} aria-label={`${label}: ${total}. ${breakdown}`}>
            <div className="text-sm text-gray-800 truncate">{label}</div>
            <div className="h-4">
                <div className="flex h-4 rounded-e overflow-hidden gap-[2px]" style={{ width: `${max > 0 ? (total / max) * 100 : 0}%` }}>
                    {parts.map(k => <div key={k} style={{ flex: counts[k], background: STAGE[k]?.color || C.muted }} />)}
                </div>
            </div>
            <div className="text-sm font-semibold text-gray-900 text-end" dir="ltr">{fmt(total)}</div>
        </div>
    );
}

export default function Dashboard() {
    const { t, i18n } = useTranslation('dashboard');
    const { t: tPA } = useTranslation('projectApplication');
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);
    const [error, setError] = useState('');
    const [allStates, setAllStates] = useState(false);
    const isAr = i18n.language === 'ar';

    useEffect(() => {
        document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', i18n.language);
    }, [isAr, i18n.language]);

    useEffect(() => {
        (async () => {
            try {
                const { data: { session } } = await newSupabase.auth.getSession();
                if (!session) { router.push('/login'); return; }
                const res = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${session.access_token}` } });
                if (res.status === 401) { router.push('/login'); return; }
                const json = await res.json();
                if (!res.ok || !json.success) throw new Error(json.message || 'failed');
                setData(json);
            } catch (e) {
                console.error('Dashboard load failed:', e);
                setError(t('error'));
            }
        })();
    }, [router, t]);

    const name = (n: NamedAmount) => (n.id === 'other' ? t('budgets.other') : (isAr && n.ar) || tPA(n.en, { defaultValue: n.en }));
    const statusLabel = (s: string) => t(`status.${s}`, { defaultValue: s });
    const stateName = (s: string) => (isAr && data?.state_labels_ar?.[s]) || s;

    const statuses = data ? [...STATUS_ORDER.filter(s => data.projects.byStatus[s]), ...Object.keys(data.projects.byStatus).filter(s => !STATUS_ORDER.includes(s))] : [];
    const remainingUsd = data ? data.funding.reduce((s, f) => s + f.remaining, 0) : 0;
    const scopeLabel = data ? (data.scope === 'all' ? t('scope.all') : data.scope === 'states' ? `${t('scope.states')}: ${data.states.map(stateName).join(isAr ? '، ' : ', ')}` : `${t('scope.room')}${data.states[0] ? ` · ${stateName(data.states[0])}` : ''}`) : '';

    return (
        <div className="min-h-screen bg-gray-50 dashboard-page">
            <Head><title>Calculator</title></Head>
            <style jsx global>{`
                .dashboard-page, .dashboard-page * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @media print {
                    .no-print { display: none !important; }
                    .dashboard-page { background: #fff !important; }
                    section { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>

            <header className="bg-brand-blue text-white px-4 py-3 flex items-center gap-3 border-b-4 border-brand-orange">
                <div className="bg-white rounded-full p-1 flex items-center justify-center shrink-0" style={{ width: 44, height: 44 }}>
                    <Image src="/brand/err-logo.png" alt="ERR" width={36} height={36} />
                </div>
                <div className="min-w-0">
                    <h1 className="font-bold text-lg leading-tight">{t('title')}</h1>
                    {data && <div className="text-xs opacity-90 truncate">{scopeLabel}</div>}
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4">
                <div className="no-print flex flex-wrap gap-2 mb-4">
                    <button onClick={() => window.print()} disabled={!data}
                        className="px-4 py-2 rounded-lg bg-brand-blue text-white font-semibold disabled:opacity-50">{t('print')}</button>
                    <button onClick={() => router.push('/menu')}
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold">{t('back')}</button>
                </div>

                {!data && !error && <p className="text-gray-600">{t('loading')}</p>}
                {error && <p className="text-red-600" role="alert">{error}</p>}

                {data && (
                    <>
                        <p className="text-xs text-gray-500 mb-3">{t('updated')}: <bdi>{new Date(data.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</bdi></p>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <Tile label={t('tiles.projects')} value={fmt(data.projects.total)} />
                            <Tile label={t('tiles.active')} value={fmt(data.projects.byStatus.active || 0)} />
                            <Tile label={t('tiles.people')} value={fmt(data.people.individuals)} />
                            <Tile label={t('tiles.remaining')} value={money(remainingUsd, 'USD')} />
                        </div>

                        <Section title={t('funding.title')} subtitle={t('funding.subtitle')}>
                            {data.funding.length === 0 ? <p className="text-sm text-gray-500">{t('empty')}</p> : (
                                <>
                                    <Legend items={[
                                        { label: t('funding.committed'), color: C.blue },
                                        { label: t('funding.pending'), color: C.orange },
                                        { label: t('funding.remaining'), color: C.track, border: true },
                                    ]} />
                                    {data.funding.map(f => {
                                        const base = Math.max(f.allocated, f.committed + f.pending, 1);
                                        const cPct = (f.committed / base) * 100, pPct = (f.pending / base) * 100;
                                        return (
                                            <div key={f.state} className="py-2 border-b last:border-b-0 border-gray-100">
                                                <div className="flex justify-between items-baseline mb-1">
                                                    <span className="font-semibold text-gray-900">{stateName(f.state)}</span>
                                                    <span className="text-sm text-gray-700">{t('funding.allocated')}: <b dir="ltr">{money(f.allocated, 'USD')}</b></span>
                                                </div>
                                                <div className="flex h-5 rounded-e overflow-hidden" style={{ background: C.track }}
                                                     title={`${t('funding.committed')} ${money(f.committed, 'USD')} · ${t('funding.pending')} ${money(f.pending, 'USD')} · ${t('funding.remaining')} ${money(f.remaining, 'USD')}`}>
                                                    {cPct > 0 && <div style={{ width: `${cPct}%`, background: C.blue }} />}
                                                    {cPct > 0 && pPct > 0 && <div style={{ width: 2, background: '#fff' }} />}
                                                    {pPct > 0 && <div style={{ width: `${pPct}%`, background: C.orange }} />}
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 mt-1 text-xs text-gray-700">
                                                    <span>{t('funding.committed')}: <b dir="ltr">{money(f.committed, 'USD')}</b></span>
                                                    <span>{t('funding.pending')}: <b dir="ltr">{money(f.pending, 'USD')}</b></span>
                                                    <span>{f.remaining < 0
                                                        ? <span className="text-red-700">{t('funding.over')} <b dir="ltr">{money(-f.remaining, 'USD')}</b></span>
                                                        : <>{t('funding.remaining')}: <b dir="ltr">{money(f.remaining, 'USD')}</b></>}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </Section>

                        <Section title={t('projects.title')} subtitle={t('projects.subtitle')}>
                            {data.projects.total === 0 ? <p className="text-sm text-gray-500">{t('empty')}</p> : (
                                <>
                                    <Pipeline statuses={statuses} counts={data.projects.byStatus} drafts={data.projects.drafts || 0} total={data.projects.total} isAr={isAr}
                                        label={s => s === 'pipeline' ? t('projects.title') : statusLabel(s)}
                                        stepLabel={s => t(`stage.${s}`, { defaultValue: STAGE[s]?.form || '' })} />
                                    {(data.projects.byStatus.rejected || 0) > 0 && (
                                        <p className="text-xs text-gray-600 mt-2">{statusLabel('rejected')}: <b dir="ltr">{fmt(data.projects.byStatus.rejected)}</b></p>
                                    )}

                                    {data.projects.byState.length > 1 && (() => {
                                        const rows = data.projects.byState;
                                        const max = Math.max(...rows.map(r => r.total), 1);
                                        const present = STACK_ORDER.filter(k => rows.some(r => (r.counts[k] || 0) > 0));
                                        return (
                                            <div className="mt-5">
                                                <h3 className="font-semibold text-gray-900">{t('projects.byState')}</h3>
                                                <Legend items={present.map(k => ({ label: statusLabel(k), color: STAGE[k].color }))} />
                                                {rows.map((r, i) => (
                                                    <div key={r.state} className={!allStates && i >= STATES_SHOWN ? 'hidden print:block' : ''}>
                                                        <StateStack label={stateName(r.state)} counts={r.counts} total={r.total} max={max} statusLabel={statusLabel} />
                                                    </div>
                                                ))}
                                                {rows.length > STATES_SHOWN && (
                                                    <button onClick={() => setAllStates(v => !v)}
                                                        className="no-print mt-2 text-sm font-semibold text-brand-deep underline underline-offset-2">
                                                        {allStates ? t('projects.showFewer') : t('projects.showAll', { count: rows.length })}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </>
                            )}
                        </Section>

                        <Section title={t('budgets.title')} subtitle={t('budgets.subtitle')}>
                            {data.budgets.length === 0 ? <p className="text-sm text-gray-500">{t('budgets.none')}</p> : data.budgets.map(b => (
                                <div key={b.currency} className="mb-4 last:mb-0">
                                    <div className="flex justify-between items-baseline border-b border-gray-200 pb-1 mb-2">
                                        <span className="font-bold text-gray-900">{b.currency}</span>
                                        <span className="text-sm text-gray-700">{t('budgets.total')}: <b dir="ltr">{money(b.total, b.currency)}</b></span>
                                    </div>
                                    {b.byActivity.length > 0 && (
                                        <>
                                            <h3 className="text-sm font-semibold text-gray-800">{t('budgets.byActivity')}</h3>
                                            {b.byActivity.slice(0, 8).map(r => (
                                                <BarRow key={r.id} label={name(r)} value={r.amount} max={b.byActivity[0].amount} display={money(r.amount, b.currency)} />
                                            ))}
                                        </>
                                    )}
                                    {b.byExpense.length > 0 && (
                                        <>
                                            <h3 className="text-sm font-semibold text-gray-800 mt-3">{t('budgets.byExpense')}</h3>
                                            {b.byExpense.slice(0, 8).map(r => (
                                                <BarRow key={r.id} label={name(r)} value={r.amount} max={b.byExpense[0].amount} display={money(r.amount, b.currency)} color={C.orange} />
                                            ))}
                                        </>
                                    )}
                                </div>
                            ))}
                        </Section>

                        <Section title={t('people.title')} subtitle={t('people.subtitle')}>
                            {data.people.reports === 0 ? <p className="text-sm text-gray-500">{t('people.none')}</p> : (
                                <>
                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                        <Tile label={t('people.individuals')} value={fmt(data.people.individuals)} />
                                        <Tile label={t('people.households')} value={fmt(data.people.households)} />
                                        <Tile label={t('people.reports')} value={fmt(data.people.reports)} />
                                    </div>
                                    {(data.people.female + data.people.male) > 0 && (() => {
                                        const tot = data.people.female + data.people.male;
                                        const fPct = (data.people.female / tot) * 100;
                                        return (
                                            <>
                                                <Legend items={[{ label: t('people.female'), color: C.orange }, { label: t('people.male'), color: C.blue }]} />
                                                <div className="flex h-5 rounded-e overflow-hidden" title={`${t('people.female')} ${fmt(data.people.female)} · ${t('people.male')} ${fmt(data.people.male)}`}>
                                                    <div style={{ width: `${fPct}%`, background: C.orange }} />
                                                    <div style={{ width: 2, background: '#fff' }} />
                                                    <div style={{ flex: 1, background: C.blue }} />
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-700 mt-1">
                                                    <span>{t('people.female')}: <b dir="ltr">{fmt(data.people.female)}</b> ({Math.round(fPct)}%)</span>
                                                    <span>{t('people.male')}: <b dir="ltr">{fmt(data.people.male)}</b> ({100 - Math.round(fPct)}%)</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <Tile label={t('people.girls')} value={fmt(data.people.under18_female)} />
                                        <Tile label={t('people.boys')} value={fmt(data.people.under18_male)} />
                                    </div>
                                </>
                            )}
                        </Section>
                    </>
                )}
            </main>
        </div>
    );
}
