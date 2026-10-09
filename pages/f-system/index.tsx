import React from 'react';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../../components/layout/AppShell';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { FileText, ClipboardList, CheckSquare, FileSignature } from 'lucide-react';

const items = [
  {
    href: '/f-system/f1',
    code: 'F1',
    title: 'Work Plans',
    desc: 'Apply for projects and review status',
    icon: ClipboardList,
    available: true,
    accent: 'bg-brand-orangeSoft text-brand-darker',
  },
  {
    href: '#',
    code: 'F2',
    title: 'Approvals',
    desc: 'Coming soon',
    icon: CheckSquare,
    available: false,
    accent: 'bg-surface-muted text-ink-faint',
  },
  {
    href: '#',
    code: 'F3',
    title: 'MOUs',
    desc: 'Coming soon',
    icon: FileSignature,
    available: false,
    accent: 'bg-surface-muted text-ink-faint',
  },
  {
    href: '/f-system/f4-f5',
    code: 'F4 & F5',
    title: 'Reporting',
    desc: 'Financial (F4) and program (F5) reports',
    icon: FileText,
    available: true,
    accent: 'bg-surface-muted text-brand-deep',
  },
];

export default function FSystemHubPage() {
  const { ready } = useRequireAuth();

  if (!ready) {
    return (
      <AppShell title="F-System">
        <p className="text-ink-muted text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="F-System">
      <div className="mb-5">
        <p className="app-section-label mb-1">F-System</p>
        <h2 className="text-lg font-bold text-ink leading-snug mb-1">Choose a form</h2>
        <p className="text-sm text-ink-muted mb-0">
          Start with F1 work plans or F4 & F5 reporting.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          const body = (
            <>
              <div className="flex items-center justify-between w-full gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg ${
                    item.available
                      ? 'bg-brand-deep/10 text-brand-deep'
                      : 'bg-surface-muted text-ink-faint'
                  }`}
                >
                  {item.code}
                </span>
                {!item.available && (
                  <span className="text-[10px] font-semibold text-ink-faint">Soon</span>
                )}
              </div>
              <span className={`rounded-2xl p-3 ${item.accent}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-center">
                <span className="block font-bold text-ink text-sm leading-tight">{item.title}</span>
                <span className="block text-[11px] text-ink-muted mt-1 leading-snug">{item.desc}</span>
              </span>
            </>
          );

          if (!item.available) {
            return (
              <div
                key={item.code}
                className="app-panel flex flex-col items-center justify-center gap-2.5 p-4 min-h-[9rem] opacity-60 cursor-not-allowed"
                aria-disabled
              >
                {body}
              </div>
            );
          }

          return (
            <Link
              key={item.code}
              href={item.href}
              className="app-panel flex flex-col items-center justify-center gap-2.5 p-4 min-h-[9rem] hover:shadow-lift hover:border-brand-blue/40 active:scale-[0.98] transition-all duration-150"
            >
              {body}
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'ar', ['menu'])),
    },
  };
}
