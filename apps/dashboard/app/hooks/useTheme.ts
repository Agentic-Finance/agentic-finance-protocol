'use client';

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'agtfi_theme';

function getSystemTheme(): 'dark' | 'light' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
    if (typeof document === 'undefined') return;
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(resolved);
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>('dark');

    // Load saved theme
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
        const initial = saved || 'dark';
        setThemeState(initial);
        applyTheme(initial);
    }, []);

    // Listen for system theme changes when using 'system'
    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: light)');
        const handler = () => applyTheme('system');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(STORAGE_KEY, newTheme);
        applyTheme(newTheme);
    }, []);

    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

    return { theme, setTheme, resolvedTheme };
}
