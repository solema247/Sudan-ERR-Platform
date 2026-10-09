import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  FolderKanban,
  FileText,
  BarChart3,
  MessageSquare,
  WifiOff,
  Monitor,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { useLayoutPreference } from '../../hooks/useLayoutPreference';
import OfflineStatusIndicator from './OfflineStatusIndicator';
import UpdateBanner from './UpdateBanner';

const LogoImage = '/brand/err-logo.png';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
};

const NAV: NavItem[] = [
  { href: '/home', label: 'Home', icon: Home },
  {
    href: '/projects',
    label: 'Projects',
    icon: FolderKanban,
    match: (p) => p.startsWith('/projects'),
  },
  {
    href: '/reporting',
    label: 'Reporting',
    icon: FileText,
    match: (p) => p.startsWith('/reporting'),
  },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/offline-mode', label: 'Offline', icon: WifiOff },
];

function isActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  return pathname === item.href;
}

type AppShellProps = {
  children: ReactNode;
  title?: string;
  /** Hide chrome for calculator PIN / login-like pages */
  bare?: boolean;
};

const AppShell: React.FC<AppShellProps> = ({ children, title, bare }) => {
  const router = useRouter();
  const { layout, setLayout, ready } = useLayoutPreference();
  const isDesktop = ready && layout === 'desktop';

  if (bare) {
    return <>{children}</>;
  }

  const navLinkClass = (active: boolean, desktop: boolean) =>
    desktop
      ? `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active ? 'bg-brand-deep text-white' : 'text-gray-700 hover:bg-green-50'
        }`
      : `flex flex-col items-center justify-center gap-0.5 flex-1 py-2 text-[10px] sm:text-xs ${
          active ? 'text-brand-deep' : 'text-gray-500'
        }`;

  return (
    <div className={`min-h-screen bg-green-50 flex ${isDesktop ? 'flex-row' : 'flex-col'}`}>
      {/* Desktop sidebar */}
      {isDesktop && (
        <aside className="w-60 shrink-0 bg-white border-r border-green-100 flex flex-col sticky top-0 h-screen">
          <div className="flex items-center gap-2 px-4 py-4 border-b border-green-100">
            <img src={LogoImage} alt="ERR" className="h-9 w-9 object-contain" />
            <div>
              <p className="font-bold text-brand-deep text-sm leading-tight">ERR App</p>
              <p className="text-[11px] text-gray-500">Emergency Response Rooms</p>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item, router.pathname);
              return (
                <Link key={item.href} href={item.href} className={navLinkClass(active, true)}>
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-green-100 space-y-2">
            <button
              type="button"
              onClick={() => setLayout('mobile')}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-green-50"
            >
              <Smartphone className="h-4 w-4" />
              Mobile layout
            </button>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-green-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Link>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <OfflineStatusIndicator />

        {/* Mobile / shared top bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-green-100 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {!isDesktop && (
              <img src={LogoImage} alt="" className="h-8 w-8 object-contain shrink-0" />
            )}
            <h1 className="font-semibold text-brand-deep truncate text-base sm:text-lg">
              {title || 'ERR App'}
            </h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title="Mobile layout"
              onClick={() => setLayout('mobile')}
              className={`p-2 rounded-lg ${!isDesktop ? 'bg-green-100 text-brand-deep' : 'text-gray-400 hover:bg-green-50'}`}
            >
              <Smartphone className="h-5 w-5" />
            </button>
            <button
              type="button"
              title="Desktop layout"
              onClick={() => setLayout('desktop')}
              className={`p-2 rounded-lg ${isDesktop ? 'bg-green-100 text-brand-deep' : 'text-gray-400 hover:bg-green-50'}`}
            >
              <Monitor className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main
          className={`flex-1 w-full mx-auto ${
            isDesktop ? 'max-w-6xl px-6 py-6' : 'max-w-lg px-4 py-4 pb-24'
          }`}
        >
          {children}
        </main>

        {/* Mobile bottom nav */}
        {!isDesktop && (
          <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-green-100 flex safe-area-pb">
            {NAV.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = isActive(item, router.pathname);
              return (
                <Link key={item.href} href={item.href} className={navLinkClass(active, false)}>
                  <Icon className={`h-5 w-5 ${active ? 'text-brand-deep' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <UpdateBanner />
    </div>
  );
};

export default AppShell;
