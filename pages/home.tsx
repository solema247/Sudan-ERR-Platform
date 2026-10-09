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
    desc: 'Apply for funding and check project status',
    icon: FolderKanban,
  },
  {
    href: '/reporting',
    labelKey: 'reporting',
    fallback: 'Reporting',
    desc: 'Fill, scan, or draft financial and program reports',
    icon: FileText,
  },
  {
    href: '/dashboard',
    labelKey: 'dashboard',
    fallback: 'Dashboard',
    desc: 'View analytics for your room',
    icon: BarChart3,
  },
  {
    href: '/feedback',
    labelKey: 'feedback',
    fallback: 'Feedback',
    desc: 'Send feedback or open a support ticket',
    icon: MessageSquare,
  },
  {
    href: '/offline-mode',
    labelKey: 'offline',
    fallback: 'Offline / Queue',
    desc: 'Fill forms offline and sync when connected',
    icon: WifiOff,
  },
];

export default function HomePage() {
  const { ready } = useRequireAuth();
  const { t } = useTranslation('menu');

  if (!ready) {
    return (
      <AppShell title="Home">
        <p className="text-gray-500 text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('chooseMainMenu', 'Home')}>
      <p className="text-gray-600 text-sm mb-6">
        {t('introMessage', 'Welcome. Choose what you want to work on.')}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className="rounded-xl bg-white border border-green-100 p-4 shadow-sm hover:border-brand-blue hover:shadow transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="rounded-lg bg-green-50 p-2 text-brand-deep">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold text-gray-900">
                    {t(tile.labelKey, tile.fallback)}
                  </span>
                  <span className="block text-xs text-gray-500 mt-1">{tile.desc}</span>
                </span>
              </div>
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
