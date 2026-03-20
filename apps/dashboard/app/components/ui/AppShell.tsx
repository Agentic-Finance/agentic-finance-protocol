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

          {/* Right: wallet connect + notifications + user profile */}
          <div className="flex-shrink-0 flex items-center gap-2">
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
