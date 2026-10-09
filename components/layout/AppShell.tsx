import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  Layers,
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
    href: '/f-system',
    label: 'F-System',
    icon: Layers,
    match: (p) => p.startsWith('/f-system') || p.startsWith('/projects') || p.startsWith('/reporting'),
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
  bare?: boolean;
};

const AppShell: React.FC<AppShellProps> = ({ children, title, bare }) => {
  const router = useRouter();
  const { layout, setLayout, ready } = useLayoutPreference();
  const isDesktop = ready && layout === 'desktop';

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen app-page-bg flex ${isDesktop ? 'flex-row' : 'flex-col'}`}>
      {isDesktop && (
        <aside className="w-64 shrink-0 bg-white/90 backdrop-blur-sm border-r border-green-100/80 flex flex-col sticky top-0 h-screen shadow-soft">
          <div className="flex items-center gap-3 px-5 py-5 border-b border-green-100/80">
            <div className="h-10 w-10 rounded-2xl bg-surface-muted flex items-center justify-center overflow-hidden">
              <img src={LogoImage} alt="ERR" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-brand-deep text-sm leading-tight">ERR App</p>
              <p className="text-[11px] text-ink-faint">Workspaces & reports</p>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <p className="app-section-label px-3 mb-2 mt-1">Navigate</p>
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item, router.pathname);
              const isFSystem = item.href === '/f-system';
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                      active && !isFSystem
                        ? 'bg-brand-deep text-white shadow-soft'
                        : active && isFSystem
                          ? 'bg-surface-muted text-brand-deep'
                          : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-90" />
                    {item.label}
                  </Link>
                  {isFSystem && (
                    <div className="ms-4 mt-0.5 mb-1 space-y-0.5 border-s border-green-100 ps-2">
                      {[
                        { href: '/f-system/f1', label: 'F1 Work Plans' },
                        { href: '/f-system/f4-f5', label: 'F4 & F5 Reporting' },
                      ].map((sub) => {
                        const subActive = router.pathname.startsWith(sub.href);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`block rounded-lg px-3 py-2 text-xs font-semibold ${
                              subActive
                                ? 'bg-brand-deep text-white'
                                : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          <div className="p-3 border-t border-green-100/80 space-y-1">
            <button
              type="button"
              onClick={() => setLayout('mobile')}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-muted"
            >
              <Smartphone className="h-4 w-4" />
              Mobile layout
            </button>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface-muted"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Link>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <OfflineStatusIndicator />

        <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-green-100/80 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {!isDesktop && (
              <div className="h-9 w-9 rounded-xl bg-surface-muted flex items-center justify-center shrink-0">
                <img src={LogoImage} alt="" className="h-7 w-7 object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-ink truncate text-base sm:text-lg leading-tight">
                {title || 'ERR App'}
              </h1>
              {!isDesktop && (
                <p className="text-[11px] text-ink-faint truncate">ERR workspace</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 rounded-xl bg-surface-muted/80 p-0.5">
            <button
              type="button"
              title="Mobile layout"
              onClick={() => setLayout('mobile')}
              className={`p-2 rounded-lg transition-colors ${
                !isDesktop ? 'bg-white text-brand-deep shadow-soft' : 'text-ink-faint hover:text-ink'
              }`}
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Desktop layout"
              onClick={() => setLayout('desktop')}
              className={`p-2 rounded-lg transition-colors ${
                isDesktop ? 'bg-white text-brand-deep shadow-soft' : 'text-ink-faint hover:text-ink'
              }`}
            >
              <Monitor className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main
          className={`flex-1 w-full mx-auto animate-fade-up ${
            isDesktop ? 'max-w-6xl px-6 py-6' : 'max-w-lg px-4 py-5 pb-28'
          }`}
        >
          {children}
        </main>

        {!isDesktop && (
          <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-green-100/80 flex px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(74,103,152,0.06)]">
            {NAV.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = isActive(item, router.pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] sm:text-xs font-semibold ${
                    active ? 'text-brand-deep' : 'text-ink-faint'
                  }`}
                >
                  <span
                    className={`rounded-xl p-1.5 ${
                      active ? 'bg-brand-orangeSoft text-brand-deep' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
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
