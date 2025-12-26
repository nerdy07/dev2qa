'use client';

import type { ReactNode } from 'react';
import { Sidebar, MobileSidebar } from '@/components/common/sidebar';
import { useAuth } from '@/providers/auth-provider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { CommandPalette } from '@/components/common/command-palette';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { MobileBottomNav } from '@/components/common/mobile-bottom-nav';
import { KeyboardShortcutsDialog } from '@/components/common/keyboard-shortcuts-dialog';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Global keyboard shortcuts (using Alt to avoid Windows conflicts)
  useKeyboardShortcuts([
    {
      key: 'n',
      altKey: true,
      action: () => router.push('/dashboard/requests/new'),
      description: 'Create new request',
    },
    {
      key: 'h',
      altKey: true,
      action: () => router.push('/dashboard'),
      description: 'Go to dashboard (Home)',
    },
    {
      key: 'w',
      altKey: true,
      action: () => router.push('/dashboard/my-work'),
      description: 'Go to my work',
    },
    {
      key: 'm',
      altKey: true,
      action: () => router.push('/dashboard/profile'),
      description: 'Go to my profile',
    },
    {
      key: 'l',
      altKey: true,
      action: () => router.push('/dashboard/leaderboards'),
      description: 'Go to leaderboards',
    },
  ]);

  return (
    <div className="min-h-screen w-full bg-background" suppressHydrationWarning>
      <div className="flex w-full flex-col md:flex-row" suppressHydrationWarning>
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col md:ml-64" suppressHydrationWarning>
          <header
            className="sticky top-0 z-30 flex min-h-[3.5rem] items-center justify-between border-b bg-surface px-sm sm:px-md"
            suppressHydrationWarning
          >
            <div className="flex items-center gap-sm" suppressHydrationWarning>
              <MobileSidebar />
              <Link
                href="/dashboard"
                className="flex items-center gap-xs font-semibold text-primary md:hidden"
                suppressHydrationWarning
              >
                <Image src="/logo.jpg" alt="Dev2QA Logo" width={24} height={24} />
                <span>Dev2QA</span>
              </Link>
            </div>

            <div className="flex items-center gap-sm" suppressHydrationWarning>
              <CommandPalette />
              <KeyboardShortcutsDialog />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-auto p-1.5" aria-label="Open account menu">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user?.photoURL || ''} alt={user?.name || ''} />
                      <AvatarFallback>{user?.name?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 pb-lg pt-sm sm:pb-xl sm:pt-md" suppressHydrationWarning>
            <div className="mx-auto w-full max-w-7xl px-sm sm:px-md lg:px-lg">
              <Breadcrumbs />
              {children}
            </div>
          </main>

          <footer className="mt-auto border-t bg-surface-muted py-sm text-center text-sm text-muted-foreground sm:py-md" suppressHydrationWarning>
            <p>© 2025 Dev2QA. All rights reserved. Powered by echobitstech.</p>
          </footer>
        </div>
        <MobileBottomNav />
      </div>
    </div>
  );
}
