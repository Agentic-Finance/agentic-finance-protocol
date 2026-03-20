'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface SidebarState {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarState>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

const STORAGE_KEY = 'sidebar-collapsed';

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsedState(stored === 'true');
      }
    } catch {
      // localStorage unavailable
    }
    setHydrated(true);
  }, []);

  const setCollapsed = useCallback((v: boolean) => {
    setCollapsedState(v);
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Prevent flash of incorrect state before hydration
  if (!hydrated) {
    return (
      <SidebarContext.Provider
        value={{ collapsed: false, setCollapsed, mobileOpen, setMobileOpen }}
      >
        {children}
      </SidebarContext.Provider>
    );
  }

  return (
    <SidebarContext.Provider
      value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarState {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export default SidebarContext;
