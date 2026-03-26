'use client';
import React from 'react';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import { UserProfileArea } from './UserProfileArea';
import { GlobalSearch, GlobalSearchTrigger } from './GlobalSearch';
import { ConnectButton } from './ConnectButton';
import { NotificationBell } from './NotificationBell';
import { MobileNav } from './MobileNav';
import { Menu } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  walletAddress?: string;
  isAdmin?: boolean;
  onDisconnect?: () => void;
}

function ThemeToggleButton() {
  const [isDark, setIsDark] = React.useState(true);
  React.useEffect(() => { setIsDark(!document.documentElement.classList.contains('light')); }, []);
  return (
    <button
      onClick={() => {
        const isLight = document.documentElement.classList.toggle('light');
        setIsDark(!isLight);
        localStorage.setItem('theme-preference', isLight ? 'light' : 'dark');
      }}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
      style={{ color: 'var(--pp-text-muted)', background: 'var(--pp-surface-1)' }}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {isDark ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
      )}
    </button>
  );
}

function AppShellInner({ children, walletAddress, isAdmin, onDisconnect }: AppShellProps) {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-[var(--pp-bg-primary,#0A0A0F)]">
      <Sidebar />
      <GlobalSearch />

      {/* Main content area */}
      <div
        className={`
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}
        `}
      >
        {/* Top header bar */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-[var(--pp-border)] sticky top-0 z-30 header-bg backdrop-blur-xl">
          {/* Left: hamburger (mobile) + breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.06] transition-colors text-slate-400 hover:text-white"
              aria-label="Open navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <Breadcrumbs />
          </div>

          {/* Center: search trigger — expanded */}
          <div className="flex-1 flex justify-center px-4 sm:px-8">
            <GlobalSearchTrigger />
          </div>

          {/* Right: theme + notifications + wallet + profile */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <ThemeToggleButton />
            <NotificationBell />
            <ConnectButton />
            <UserProfileArea
              walletAddress={walletAddress}
              isAdmin={isAdmin}
              onDisconnect={onDisconnect}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 pb-20 lg:pb-6 max-w-[1440px] mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellInner {...props} />
    </SidebarProvider>
  );
}

export default AppShell;
