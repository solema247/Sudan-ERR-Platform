import React from 'react';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../../components/layout/AppShell';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { MessageSquare, WifiOff } from 'lucide-react';

const items = [
  {
    href: '/feedback',
    title: 'Feedback',
    desc: 'Send feedback or open a support ticket',
    icon: MessageSquare,
    accent: 'bg-surface-muted text-brand-deep',
  },
  {
    href: '/offline-mode',
    title: 'Offline',
    desc: 'Fill forms offline and sync when connected',
    icon: WifiOff,
    accent: 'bg-surface-warm text-brand-darker',
  },
];

export default function UtilitiesPage() {
  const { ready } = useRequireAuth();

  if (!ready) {
    return (
      <AppShell title="Utilities">
        <p className="text-ink-muted text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Utilities">
      <div className="mb-5">
        <p className="app-section-label mb-1">Utilities</p>
        <h2 className="text-lg font-bold text-ink leading-snug mb-1">Tools</h2>
        <p className="text-sm text-ink-muted mb-0">Feedback and offline queue.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="app-panel flex flex-col items-center justify-center gap-3 p-5 min-h-[8rem] text-center hover:shadow-lift hover:border-brand-blue/40 transition-all"
            >
              <span className={`rounded-2xl p-3 ${item.accent}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-bold text-ink text-sm">{item.title}</span>
                <span className="block text-[11px] text-ink-muted mt-1">{item.desc}</span>
              </span>
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
