'use client';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart,
  BookUser,
  CalendarCheck,
  DollarSign,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  Shield,
  ShieldX,
  Sparkles,
  Stethoscope,
  Trophy,
  Users,
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';

type NavItem = { href: string; icon: LucideIcon; label: string };
type NavSeparator = { type: 'separator' };
type NavItemOrSeparator = NavItem | NavSeparator;

const navItems: { [key in User['role']]: NavItemOrSeparator[] } = {
    admin: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/leaderboards', icon: Trophy, label: 'Leaderboards' },
      { href: '/dashboard/admin/project-insights', icon: BarChart, label: 'Project Insights' },
      { href: '/dashboard/admin/diagnostics', icon: Stethoscope, label: 'AI Diagnostics' },
      { type: 'separator' },
      { href: '/dashboard/admin/users', icon: Users, label: 'Users' },
      { href: '/dashboard/admin/teams', icon: Shield, label: 'Teams' },
      { href: '/dashboard/admin/projects', icon: FolderKanban, label: 'Projects' },
      { type: 'separator' },
      { href: '/dashboard/admin/infractions', icon: ShieldX, label: 'Infractions' },
      { href: '/dashboard/admin/bonuses', icon: Sparkles, label: 'Bonuses' },
      { href: '/dashboard/admin/payroll', icon: DollarSign, label: 'Payroll' },
      { href: '/dashboard/admin/leave', icon: CalendarCheck, label: 'Leave Management' },
    ],
    requester: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'My Requests' },
      { href: '/dashboard/requests/new', icon: FilePlus2, label: 'New Request' },
      { type: 'separator' },
      { href: '/dashboard/leaderboards', icon: Trophy, label: 'Leaderboards' },
      { type: 'separator' },
      { href: '/dashboard/my-records', icon: BookUser, label: 'My Records' },
      { href: '/dashboard/leave', icon: CalendarCheck, label: 'My Leave' },
    ],
    qa_tester: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Pending Requests' },
        { href: '/dashboard/leaderboards', icon: Trophy, label: 'Leaderboards' },
        { type: 'separator' },
        { href: '/dashboard/my-records', icon: BookUser, label: 'My Records' },
        { href: '/dashboard/leave', icon: CalendarCheck, label: 'My Leave' },
    ],
  };

const NavLinks = () => {
    const pathname = usePathname();
    const { user } = useAuth();

    const getRoleNavItems = () => {
        if (!user) return [];
        return navItems[user.role] || [];
    };
    
    return (
        <nav className="grid items-start gap-1 px-4 text-sm font-medium">
            {getRoleNavItems().map((item, index) =>
                'type' in item ? (
                <Separator key={`sep-${index}`} className="my-1" />
                ) : (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary',
                    pathname === item.href && 'bg-secondary text-primary'
                    )}
                >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                </Link>
                )
            )}
        </nav>
    );
}


export function Sidebar() {
  return (
    <aside className="hidden h-full w-64 flex-col border-r bg-card shadow-sm md:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
          <Image src="/logo.jpg" alt="Dev2QA Logo" width={24} height={24} />
          <span>Dev2QA</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <NavLinks />
      </div>
    </aside>
  );
}


export function MobileSidebar() {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-64">
                <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                    <SheetDescription>
                        A list of links to navigate the application.
                    </SheetDescription>
                </SheetHeader>
                <div className="flex h-16 shrink-0 items-center border-b px-6">
                    <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
                        <Image src="/logo.jpg" alt="Dev2QA Logo" width={24} height={24} />
                        <span>Dev2QA</span>
                    </Link>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <NavLinks />
                </div>
            </SheetContent>
        </Sheet>
    )
}
