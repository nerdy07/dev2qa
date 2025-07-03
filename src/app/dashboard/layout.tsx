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

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <MobileSidebar />
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary md:hidden">
              <Image src="/logo.jpg" alt="Dev2QA Logo" width={24} height={24} />
              <span>Dev2QA</span>
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-auto p-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL} alt={user?.name} />
                  <AvatarFallback>{user?.name?.[0].toUpperCase()}</AvatarFallback>
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
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        
        <footer className="border-t bg-card py-4 px-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} echobitstech. All rights reserved. Powered by Dev2QA.</p>
        </footer>
      </div>
    </div>
  );
}
