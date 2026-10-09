import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../components/layout/AppShell';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { FolderKanban, FileText, BarChart3, MessageSquare, WifiOff } from 'lucide-react';

const tiles = [
  {
    href: '/projects',
    labelKey: 'projects',
    fallback: 'Projects',
    icon: FolderKanban,
    accent: 'bg-brand-orangeSoft text-brand-darker',
  },
  {
    href: '/reporting',
    labelKey: 'reporting',
    fallback: 'Reporting',
    icon: FileText,
    accent: 'bg-surface-muted text-brand-deep',
  },
  {
    href: '/dashboard',
    labelKey: 'dashboard',
    fallback: 'Dashboard',
    icon: BarChart3,
    accent: 'bg-surface-muted text-brand-deep',
  },
  {
    href: '/feedback',
    labelKey: 'feedback',
    fallback: 'Feedback',
    icon: MessageSquare,
    accent: 'bg-surface-muted text-brand-deep',
  },
  {
    href: '/offline-mode',
    labelKey: 'offline',
    fallback: 'Offline',
    icon: WifiOff,
    accent: 'bg-surface-warm text-brand-darker',
  },
];

export default function HomePage() {
  const { ready } = useRequireAuth();
  const { t } = useTranslation('menu');

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
          Apply for projects, submit reports, check your dashboard, or work offline.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const isWide = tile.href === '/offline-mode';
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className={`group app-panel flex flex-col items-center justify-center text-center gap-3 p-5 min-h-[7.5rem] hover:shadow-lift hover:border-brand-blue/40 active:scale-[0.98] transition-all duration-150 ${
                isWide ? 'col-span-2 flex-row justify-start text-start px-5 py-4 min-h-0' : ''
              }`}
            >
              <span className={`rounded-2xl p-3 ${tile.accent}`}>
                <Icon className="h-6 w-6" />
              </span>
              <span className="font-bold text-ink text-sm leading-tight">
                {t(tile.labelKey, tile.fallback)}
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
