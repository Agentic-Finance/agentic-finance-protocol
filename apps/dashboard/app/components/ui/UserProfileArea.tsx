'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, Copy, Check, Shield, Key, Sun, Moon, Home as HomeIcon } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

interface UserProfileAreaProps {
  walletAddress?: string;
  isAdmin?: boolean;
  onDisconnect?: () => void;
}

function getHueFromAddress(address: string): number {
  if (!address || address.length < 8) return 220;
  const hex = address.slice(2, 8);
  const num = parseInt(hex, 16);
  return num % 360;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function UserProfileArea({ walletAddress: walletProp, isAdmin, onDisconnect }: UserProfileAreaProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { exportWallet, logout, authenticated, user } = usePrivy();
  const { wallets } = require('@privy-io/react-auth').useWallets();

  // Get wallet from Privy if not passed as prop
  const walletAddress = walletProp || wallets?.[0]?.address || user?.wallet?.address;
  const displayName = user?.google?.name || user?.discord?.username || user?.email?.address || null;

  // Use Privy logout if no onDisconnect prop
  const handleDisconnect = onDisconnect || logout;
  const [isDark, setIsDark] = useState(true);

  // Sync theme state
  useEffect(() => {
    setIsDark(!document.documentElement.classList.contains('light'));
  }, []);

  const toggleTheme = () => {
    const isLight = document.documentElement.classList.toggle('light');
    setIsDark(!isLight);
    localStorage.setItem('theme-preference', isLight ? 'light' : 'dark');
  };

  const handleExportKey = async () => {
    try {
      await exportWallet();
    } catch (e) {
      console.error('Export wallet failed:', e);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [open]);

  if (!walletAddress && !authenticated) return null;

  const hue = walletAddress ? getHueFromAddress(walletAddress) : 220;
  const initials = displayName ? displayName.charAt(0).toUpperCase() : (walletAddress ? walletAddress.slice(2, 4).toUpperCase() : '?');
  // GitHub-style identicon URL
  const identiconUrl = walletAddress ? `https://api.dicebear.com/9.x/identicon/svg?seed=${walletAddress}&backgroundColor=transparent&scale=80` : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/[0.04] transition-colors"
        aria-label="User profile menu"
        aria-expanded={open}
      >
        {/* Avatar — GitHub-style identicon */}
        {identiconUrl ? (
          <img src={identiconUrl} alt="" className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: `hsl(${hue}, 40%, 20%)` }} />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
            style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 60) % 360}, 70%, 40%))` }}>
            {initials}
          </div>
        )}

        {/* Name or Address + Admin badge */}
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-[11px] font-medium" style={{ color: 'var(--pp-text-primary)' }}>
            {displayName || (walletAddress ? truncateAddress(walletAddress) : 'Unknown')}
          </span>
          {isAdmin && (
            <span className="text-[8px] font-bold bg-[#FF2D87]/15 text-[#FF2D87] px-1.5 py-0.5 rounded border border-[#FF2D87]/25 uppercase tracking-wider">
              Admin
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="
            absolute right-0 top-full mt-2 w-56
            bg-[rgba(17,17,24,0.95)] backdrop-blur-xl
            rounded-xl border border-white/[0.08]
            shadow-2xl z-50 overflow-hidden
          "
        >
          {/* Address header */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 60) % 360}, 70%, 40%))`,
                }}
              >
                {initials}
              </div>
              <span className="text-[11px] text-slate-300 font-mono truncate">
                {walletAddress}
              </span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1 mt-2">
                <Shield className="w-3 h-3 text-[#FF2D87]" />
                <span className="text-[10px] text-[#FF2D87] font-semibold">Administrator</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{copied ? 'Copied!' : 'Copy Address'}</span>
            </button>

            <button
              onClick={handleExportKey}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <Key className="w-4 h-4" />
              <span>Export Private Key</span>
            </button>

            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>

            <a
              href="/"
              onClick={() => {
                setOpen(false);
                sessionStorage.removeItem('agtfi_session_active');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home Page</span>
            </a>

            <div className="border-t border-white/[0.06] my-1" />

            <button
              onClick={() => {
                setOpen(false);
                handleDisconnect();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/[0.06] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfileArea;
