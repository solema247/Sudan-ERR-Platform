import React from 'react';
import Link from 'next/link';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../components/layout/AppShell';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { Layers, BarChart3, MessageSquare, WifiOff } from 'lucide-react';

const tiles = [
  {
    href: '/f-system',
    label: 'F-System',
    icon: Layers,
    accent: 'bg-brand-orangeSoft text-brand-darker',
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: BarChart3,
    accent: 'bg-surface-muted text-brand-deep',
  },
  {
    href: '/feedback',
    label: 'Feedback',
    icon: MessageSquare,
    accent: 'bg-surface-muted text-brand-deep',
  },
  {
    href: '/offline-mode',
    label: 'Offline',
    icon: WifiOff,
    accent: 'bg-surface-warm text-brand-darker',
  },
];

export default function HomePage() {
  const { ready } = useRequireAuth();

  if (!ready) {
    return (
      <AppShell title="Home">
        <p className="text-ink-muted text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Home">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-ink leading-snug mb-1">
          What do you want to work on?
        </h2>
        <p className="text-sm text-ink-muted mb-0">
          Open F-System for work plans and reports, or use dashboard, feedback, and offline tools.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="group app-panel flex flex-col items-center justify-center text-center gap-3 p-5 min-h-[7.5rem] hover:shadow-lift hover:border-brand-blue/40 active:scale-[0.98] transition-all duration-150"
            >
              <span className={`rounded-2xl p-3 ${tile.accent}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="font-bold text-ink text-sm leading-tight">{tile.label}</span>
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
