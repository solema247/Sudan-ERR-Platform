import React, { ReactNode, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  Layers,
  BarChart3,
  WifiOff,
  Monitor,
  Smartphone,
  LogOut,
} from 'lucide-react';
import { useLayoutPreference } from '../../hooks/useLayoutPreference';
import OfflineStatusIndicator from './OfflineStatusIndicator';
import UpdateBanner from './UpdateBanner';
import { newSupabase } from '../../services/newSupabaseClient';

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
    match: (p) =>
      p.startsWith('/f-system') || p.startsWith('/projects') || p.startsWith('/reporting'),
  },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
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

  const handleLogout = useCallback(async () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('isUnlocked');
      sessionStorage.removeItem('fromInternalPage');
    }
    try {
      await newSupabase.auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
    router.push('/login');
  }, [router]);

  if (bare) {
    return <>{children}</>;
  }

  return (
    <div className={`min-h-screen app-page-bg flex ${isDesktop ? 'flex-row' : 'flex-col'}`}>
      {isDesktop && (
        <aside className="w-64 shrink-0 bg-[#152238]/95 backdrop-blur-sm border-r border-white/10 flex flex-col sticky top-0 h-screen">
          <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
            <div className="h-10 w-10 rounded-2xl bg-white flex items-center justify-center overflow-hidden">
              <img src={LogoImage} alt="ERR" className="h-8 w-8 object-contain" />
            </div>
            <div>
              <p className="font-bold text-white text-sm leading-tight">ERR App</p>
              <p className="text-[11px] text-[#8a97ab]">Workspaces & reports</p>
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
                        ? 'bg-brand-orange text-[#152238] shadow-soft'
                        : active && isFSystem
                          ? 'bg-white/10 text-brand-orange'
                          : 'text-[#a8b6cc] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-90" />
                    {item.label}
                  </Link>
                  {isFSystem && (
                    <div className="ms-4 mt-0.5 mb-1 space-y-0.5 border-s border-white/10 ps-2">
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
                                ? 'bg-brand-orange text-[#152238]'
                                : 'text-[#8a97ab] hover:bg-white/5 hover:text-white'
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
          <div className="p-3 border-t border-white/10 space-y-1">
            <button
              type="button"
              onClick={() => setLayout('mobile')}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#a8b6cc] hover:bg-white/5"
            >
              <Smartphone className="h-4 w-4" />
              Mobile layout
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[#a8b6cc] hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <OfflineStatusIndicator />

        <header className="sticky top-0 z-40 bg-[#152238]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {!isDesktop && (
              <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                <img src={LogoImage} alt="" className="h-7 w-7 object-contain" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-white truncate text-base sm:text-lg leading-tight">
                {title || 'ERR App'}
              </h1>
              {!isDesktop && (
                <p className="text-[11px] text-[#8a97ab] truncate">ERR workspace</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 rounded-xl bg-white/10 p-0.5">
            <button
              type="button"
              title="Mobile layout"
              onClick={() => setLayout('mobile')}
              className={`p-2 rounded-lg transition-colors ${
                !isDesktop
                  ? 'bg-brand-orange text-[#152238] shadow-soft'
                  : 'text-[#8a97ab] hover:text-white'
              }`}
            >
              <Smartphone className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Desktop layout"
              onClick={() => setLayout('desktop')}
              className={`p-2 rounded-lg transition-colors ${
                isDesktop
                  ? 'bg-brand-orange text-[#152238] shadow-soft'
                  : 'text-[#8a97ab] hover:text-white'
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
          <nav className="fixed bottom-0 inset-x-0 z-40 bg-[#152238]/95 backdrop-blur-md border-t border-white/10 flex px-0.5 pb-[env(safe-area-inset-bottom)]">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item, router.pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold ${
                    active ? 'text-brand-orange' : 'text-[#8a97ab]'
                  }`}
                >
                  <span
                    className={`rounded-xl p-1.5 ${
                      active ? 'bg-brand-orange text-[#152238] shadow-soft' : ''
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? 'text-[#152238]' : ''}`} />
                  </span>
                  <span className="truncate max-w-full px-0.5">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={handleLogout}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-[10px] font-semibold text-[#8a97ab]"
            >
              <span className="rounded-xl p-1.5">
                <LogOut className="h-5 w-5" />
              </span>
              <span>Log out</span>
            </button>
          </nav>
        )}
      </div>

      <UpdateBanner />
    </div>
  );
};

export default AppShell;
