
'use client';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart,
  BookUser,
  CalendarCheck,
  DollarSign,
  FilePlus2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Paintbrush,
  Shield,
  ShieldCheck,
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { ALL_PERMISSIONS } from '@/lib/roles';
import { usePermissions } from '@/hooks/use-permissions';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  permission: string;
};
type NavSection = {
  label?: string;
  items: NavItem[];
};
type NavSeparator = { type: 'separator' };
type NavItemOrSeparator = NavSection | NavSeparator;


const navConfig: NavItemOrSeparator[] = [
    {
        items: [
            { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard:read' },
            { href: '/dashboard/leaderboards', icon: Trophy, label: 'Leaderboards', permission: ALL_PERMISSIONS.LEADERBOARDS.READ },
        ]
    },
    { type: 'separator' },
    {
        label: "My Work",
        items: [
            { href: '/dashboard/requests/new', icon: FilePlus2, label: 'New Request', permission: ALL_PERMISSIONS.REQUESTS.CREATE },
            { href: '/dashboard/designs/new', icon: Paintbrush, label: 'New Design', permission: ALL_PERMISSIONS.DESIGNS.CREATE },
            { href: '/dashboard/my-records', icon: BookUser, label: 'My Records', permission: ALL_PERMISSIONS.RECORDS.READ_OWN },
            { href: '/dashboard/leave', icon: CalendarCheck, label: 'My Leave', permission: ALL_PERMISSIONS.LEAVE.REQUEST },
        ]
    },
    { type: 'separator' },
    {
        label: "Management",
        items: [
            { href: '/dashboard/admin/users', icon: Users, label: 'Users', permission: ALL_PERMISSIONS.USERS.READ },
            { href: '/dashboard/teams', icon: Shield, label: 'Teams', permission: ALL_PERMISSIONS.TEAMS.READ },
            { href: '/dashboard/admin/projects', icon: FolderKanban, label: 'Projects', permission: ALL_PERMISSIONS.PROJECTS.READ },
            { href: '/dashboard/analytics', icon: BarChart, label: 'Analytics', permission: ALL_PERMISSIONS.PROJECT_INSIGHTS.READ },
        ]
    },
    { type: 'separator' },
    {
        label: "HR & Admin",
        items: [
            { href: '/dashboard/admin/infractions', icon: ShieldX, label: 'Infractions', permission: ALL_PERMISSIONS.INFRACTIONS.MANAGE },
            { href: '/dashboard/admin/bonuses', icon: Sparkles, label: 'Bonuses', permission: ALL_PERMISSIONS.BONUSES.MANAGE },
            { href: '/dashboard/admin/payroll', icon: DollarSign, label: 'Payroll', permission: ALL_PERMISSIONS.PAYROLL.READ },
            { href: '/dashboard/admin/leave', icon: CalendarCheck, label: 'Leave Management', permission: ALL_PERMISSIONS.LEAVE_MANAGEMENT.MANAGE },
        ]
    },
    { type: 'separator' },
    {
        label: "Quality & Design",
        items: [
            { href: '/dashboard/admin/design-approvals', icon: ShieldCheck, label: 'Design Approvals', permission: ALL_PERMISSIONS.DESIGNS.APPROVE },
            { href: '/dashboard/admin/diagnostics', icon: Stethoscope, label: 'AI Diagnostics', permission: ALL_PERMISSIONS.PROJECT_DIAGNOSTICS.RUN },
        ]
    }
];


const NavLinks = () => {
    const pathname = usePathname();
    const { hasPermission } = usePermissions();

    const getFilteredNav = () => {
        return navConfig.map(section => {
            if ('type' in section) return section;

            const filteredItems = section.items.filter(item => {
                // A bit of custom logic for the dashboard link
                if (item.href === '/dashboard') {
                    // Show dashboard if user is an admin, a QA tester, or a requester who can create requests/designs
                    return hasPermission(ALL_PERMISSIONS.ADMIN_SECTION.READ) ||
                           hasPermission(ALL_PERMISSIONS.REQUESTS.READ_ALL) || 
                           hasPermission(ALL_PERMISSIONS.REQUESTS.CREATE) || 
                           hasPermission(ALL_PERMISSIONS.DESIGNS.CREATE);
                }
                return hasPermission(item.permission)
            });
            
            if (filteredItems.length === 0) return null;

            return { ...section, items: filteredItems };
        }).filter(Boolean);
    }
    
    return (
        <nav className="grid items-start gap-1 px-4 text-sm font-medium">
            {getFilteredNav().map((section, index) => {
                if (!section) return null;
                if ('type' in section) return <Separator key={`sep-${index}`} className="my-1" />;
                
                return (
                    <div key={section.label || `section-${index}`} className="space-y-1">
                        {section.label && <p className="px-3 text-xs font-semibold text-muted-foreground tracking-wider uppercase">{section.label}</p>}
                        {section.items.map(item => {
                           let itemLabel = item.label;
                           // Customize dashboard label based on role
                           if (item.href === '/dashboard') {
                               if (hasPermission(ALL_PERMISSIONS.ADMIN_SECTION.READ)) {
                                    itemLabel = "Admin Dashboard";
                               } else if (hasPermission(ALL_PERMISSIONS.REQUESTS.READ_ALL)) {
                                   itemLabel = 'QA Dashboard';
                               } else if (hasPermission(ALL_PERMISSIONS.REQUESTS.CREATE)) {
                                   itemLabel = 'My QA Requests';
                               } else if (hasPermission(ALL_PERMISSIONS.PROJECTS.READ)) {
                                   itemLabel = 'Developer Dashboard';
                               } else if (hasPermission(ALL_PERMISSIONS.TEAMS.READ)) {
                                   itemLabel = 'Manager Dashboard';
                               } else if (hasPermission(ALL_PERMISSIONS.USERS.READ)) {
                                   itemLabel = 'HR Dashboard';
                               } else if (hasPermission(ALL_PERMISSIONS.PROJECTS.CREATE)) {
                                   itemLabel = 'Project Manager Dashboard';
                               } else if (hasPermission(ALL_PERMISSIONS.REQUESTS.APPROVE)) {
                                   itemLabel = 'Senior QA Dashboard';
                               }
                           }
                            
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary',
                                        pathname.startsWith(item.href) && item.href !== '/dashboard' ? 'bg-secondary text-primary' : '',
                                        pathname === item.href && 'bg-secondary text-primary'
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {itemLabel}
                                </Link>
                            )
                        })}
                    </div>
                )
            })}
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
