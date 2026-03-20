'use client';

import { AppShell } from '../components/ui/AppShell';

export default function MppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
