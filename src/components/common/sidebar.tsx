
'use client';
import type { LucideIcon } from 'lucide-react';
import {
  BarChart,
  BookUser,
  Building2,
  CalendarCheck,
  DollarSign,
  FileText,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  Paintbrush,
  Receipt,
  Shield,
  ShieldCheck,
  ShieldX,
  Sparkles,
  Stethoscope,
  Trophy,
  Users,
  Menu,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  User,
  Mail,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useState, useMemo, useCallback } from 'react';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  permission: string;
  isParent?: boolean;
  parent?: string;
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
            { href: '/dashboard/my-work', icon: FileText, label: 'My Work', permission: ALL_PERMISSIONS.REQUESTS.CREATE },
        ]
    },
    { type: 'separator' },
    {
        label: "My Account",
        items: [
            { href: '/dashboard/profile', icon: User, label: 'My Profile', permission: 'profile:read' },
            { href: '/dashboard/my-records', icon: BookUser, label: 'My Records', permission: ALL_PERMISSIONS.RECORDS.READ_OWN },
            { href: '/dashboard/leave', icon: CalendarCheck, label: 'My Leave', permission: ALL_PERMISSIONS.LEAVE.REQUEST },
            { href: '/dashboard/requisitions', icon: ShoppingCart, label: 'My Requisitions', permission: ALL_PERMISSIONS.REQUISITIONS.READ_OWN },
            { href: '/dashboard/leaderboards', icon: Trophy, label: 'Leaderboards', permission: ALL_PERMISSIONS.LEADERBOARDS.READ },
            { href: '/dashboard/requests/new', icon: FilePlus2, label: 'New Request', permission: ALL_PERMISSIONS.REQUESTS.CREATE },
            { href: '/dashboard/designs/new', icon: Paintbrush, label: 'New Design', permission: ALL_PERMISSIONS.DESIGNS.CREATE },
        ]
    },
    { type: 'separator' },
    {
        label: "Management",
        items: [
            { href: '/dashboard/admin/users', icon: Users, label: 'Users', permission: ALL_PERMISSIONS.USERS.READ },
            { href: '/dashboard/teams', icon: Shield, label: 'Teams', permission: ALL_PERMISSIONS.TEAMS.READ },
            { href: '/dashboard/admin/projects', icon: FolderKanban, label: 'Projects', permission: ALL_PERMISSIONS.PROJECTS.READ },
            { href: '/dashboard/admin/invoices', icon: Receipt, label: 'Invoices', permission: ALL_PERMISSIONS.INVOICES.MANAGE },
            { href: '/dashboard/admin/clients', icon: Building2, label: 'Clients', permission: ALL_PERMISSIONS.CLIENTS.READ },
            { href: '/dashboard/analytics', icon: BarChart, label: 'Analytics', permission: ALL_PERMISSIONS.PROJECT_INSIGHTS.READ },
            { href: '/dashboard/files', icon: FileText, label: 'Company Files', permission: ALL_PERMISSIONS.FILES.READ_STAFF },
        ]
    },
    { type: 'separator' },
    {
        label: "HR & Admin",
        items: [
            { href: '/dashboard/admin/payroll', icon: DollarSign, label: 'Payroll', permission: ALL_PERMISSIONS.PAYROLL.READ },
            { href: '/dashboard/admin/expenses', icon: Receipt, label: 'Expenses & Income', permission: ALL_PERMISSIONS.EXPENSES.READ },
            { href: '/dashboard/admin/leave', icon: CalendarCheck, label: 'Leave Management', permission: ALL_PERMISSIONS.LEAVE_MANAGEMENT.MANAGE },
            { href: '/dashboard/admin/requisitions', icon: ShoppingCart, label: 'Requisitions', permission: ALL_PERMISSIONS.REQUISITIONS.READ_ALL },
            { href: '/dashboard/admin/infractions', icon: ShieldX, label: 'Infractions', permission: ALL_PERMISSIONS.INFRACTIONS.MANAGE, isParent: true },
            { href: '/dashboard/admin/infraction-types', icon: ShieldX, label: 'Infraction Types', permission: ALL_PERMISSIONS.INFRACTIONS.MANAGE, parent: '/dashboard/admin/infractions' },
            { href: '/dashboard/admin/bonuses', icon: Sparkles, label: 'Bonuses', permission: ALL_PERMISSIONS.BONUSES.MANAGE, isParent: true },
            { href: '/dashboard/admin/bonus-types', icon: Sparkles, label: 'Bonus Types', permission: ALL_PERMISSIONS.BONUSES.MANAGE, parent: '/dashboard/admin/bonuses' },
            { href: '/dashboard/admin/email-groups', icon: Mail, label: 'Email Groups', permission: ALL_PERMISSIONS.ADMIN_SECTION.READ },
            { href: '/dashboard/admin/settings', icon: Building2, label: 'Company Settings', permission: ALL_PERMISSIONS.INVOICES.MANAGE },
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
    const { hasPermission, rolesLoading, user } = useAuth();
    const [openCollapsibles, setOpenCollapsibles] = useState<Record<string, boolean>>({
        infractions: false,
        bonuses: false,
    });
    // Track which sections are collapsed (default: all sections expanded)
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

    const getFilteredNav = useMemo(() => {
        // If user is not loaded yet, show nothing
        if (!user) {
            return [];
        }
        
        // If roles are still loading, show all items (optimistic rendering)
        // This prevents the flash of empty sidebar
        if (rolesLoading) {
            return navConfig;
        }
        
        // Once roles are loaded, filter based on permissions
        return navConfig.map(section => {
            if ('type' in section) return section;

            const filteredItems = section.items.filter(item => {
                // A bit of custom logic for the dashboard link
                if (item.href === '/dashboard') {
                    // Show dashboard if user is an admin, a QA tester, or a requester who can create requests/designs
                    return hasPermission(ALL_PERMISSIONS.ADMIN_SECTION.READ) ||
                           hasPermission(ALL_PERMISSIONS.REQUESTS.READ_ALL) || 
                           hasPermission(ALL_PERMISSIONS.REQUESTS.CREATE) || 
                           hasPermission(ALL_PERMISSIONS.REQUESTS.READ_OWN) ||
                           hasPermission(ALL_PERMISSIONS.DESIGNS.CREATE);
                }
                // For My Work, check if user can read their own requests or create requests
                if (item.href === '/dashboard/my-work') {
                    return hasPermission(ALL_PERMISSIONS.REQUESTS.CREATE) || 
                           hasPermission(ALL_PERMISSIONS.REQUESTS.READ_OWN) ||
                           hasPermission(ALL_PERMISSIONS.DESIGNS.CREATE) ||
                           hasPermission(ALL_PERMISSIONS.DESIGNS.READ_OWN);
                }
                // Profile page is accessible to all authenticated users (has profile:read by default)
                if (item.href === '/dashboard/profile') {
                    return hasPermission('profile:read');
                }
                return hasPermission(item.permission)
            });
            
            if (filteredItems.length === 0) return null;

            return { ...section, items: filteredItems };
        }).filter(Boolean);
    }, [hasPermission, rolesLoading, user]);

    const renderNavItem = useCallback((item: NavItem, itemLabel: string) => {
        if (!item.icon) {
            console.error('Missing icon for nav item:', item.href, item.label);
            return null;
        }
        
        const isActive = pathname.startsWith(item.href) && item.href !== '/dashboard' || pathname === item.href;
        
        if (item.isParent) {
            const childItems = getFilteredNav
                .flatMap((s: any) => ('type' in s ? [] : s.items))
                .filter((i: NavItem) => i.parent === item.href);
            
            if (childItems.length === 0) {
                // No children, render as regular link
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary whitespace-nowrap',
                            isActive && 'bg-secondary text-primary'
                        )}
                    >
                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                        <span className="truncate">{itemLabel}</span>
                    </Link>
                );
            }

            const collapsibleKey = item.href.split('/').pop() || '';
            const isOpen = openCollapsibles[collapsibleKey] || pathname.startsWith(item.href);

            return (
                <Collapsible
                    key={item.href}
                    open={isOpen}
                    onOpenChange={(open) => setOpenCollapsibles(prev => ({ ...prev, [collapsibleKey]: open }))}
                >
                    <div className="flex items-center gap-1">
                        <Link
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary whitespace-nowrap flex-1',
                                isActive && 'bg-secondary text-primary'
                            )}
                        >
                            {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                            <span className="truncate">{itemLabel}</span>
                        </Link>
                        <CollapsibleTrigger asChild>
                            <button
                                type="button"
                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                                aria-label={isOpen ? "Collapse" : "Expand"}
                            >
                                {isOpen ? (
                                    <ChevronDown className="h-4 w-4 shrink-0" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 shrink-0" />
                                )}
                            </button>
                        </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="pl-4 space-y-1">
                        {childItems.map(child => {
                            if (!child.icon) {
                                console.error('Missing icon for child nav item:', child.href, child.label);
                                return null;
                            }
                            const childIsActive = pathname === child.href || pathname.startsWith(child.href + '/');
                            const ChildIconComponent = child.icon;
                            return (
                                <Link
                                    key={child.href}
                                    href={child.href}
                                    className={cn(
                                        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary whitespace-nowrap text-sm',
                                        childIsActive && 'bg-secondary text-primary'
                                    )}
                                >
                                    <ChildIconComponent className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{child.label}</span>
                                </Link>
                            );
                        })}
                    </CollapsibleContent>
                </Collapsible>
            );
        }

        return (
            <Link
                key={item.href}
                href={item.href}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary whitespace-nowrap',
                    isActive && 'bg-secondary text-primary'
                )}
            >
                {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                <span className="truncate">{itemLabel}</span>
            </Link>
        );
    }, [pathname, openCollapsibles, setOpenCollapsibles, getFilteredNav]);
    
    return (
        <nav className="grid items-start gap-1 px-4 text-sm font-medium">
            {getFilteredNav.map((section, index) => {
                if (!section) return null;
                if ('type' in section) return <Separator key={`sep-${index}`} className="my-1" />;
                
                // Separate parent items from child items
                const parentItems = section.items.filter(item => !item.parent);
                const childItemsMap = new Map<string, NavItem[]>();
                
                section.items.forEach(item => {
                    if (item.parent) {
                        if (!childItemsMap.has(item.parent)) {
                            childItemsMap.set(item.parent, []);
                        }
                        childItemsMap.get(item.parent)!.push(item);
                    }
                });
                
                // Check if section should be collapsible (has label and more than 3 items)
                const isCollapsible = section.label && parentItems.length > 3;
                const sectionKey = section.label?.toLowerCase().replace(/\s+/g, '-') || `section-${index}`;
                const isSectionCollapsed = collapsedSections[sectionKey] ?? false;
                
                return (
                    <div key={section.label || `section-${index}`} className="space-y-1">
                        {section.label && (
                            <div className="flex items-center justify-between px-3">
                                {isCollapsible ? (
                                    <Collapsible
                                        open={!isSectionCollapsed}
                                        onOpenChange={(open) => setCollapsedSections(prev => ({ ...prev, [sectionKey]: !open }))}
                                    >
                                        <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs font-semibold text-muted-foreground tracking-wider uppercase whitespace-nowrap hover:text-foreground transition-colors">
                                            <span>{section.label}</span>
                                            {isSectionCollapsed ? (
                                                <ChevronRight className="h-3 w-3" />
                                            ) : (
                                                <ChevronDown className="h-3 w-3" />
                                            )}
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="space-y-1 mt-1">
                                            {parentItems.map(item => {
                           let itemLabel = item.label;
                           // Customize dashboard label based on role
                           if (item.href === '/dashboard') {
                               if (hasPermission(ALL_PERMISSIONS.ADMIN_SECTION.READ)) {
                                    itemLabel = "Admin Dashboard";
                               } else if (hasPermission(ALL_PERMISSIONS.REQUESTS.READ_ALL)) {
                                   itemLabel = 'QA Dashboard';
                               } else if (hasPermission(ALL_PERMISSIONS.REQUESTS.CREATE)) {
                                   itemLabel = 'My Dashboard';
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
                           
                           // Get child items for this parent
                           const childItems = childItemsMap.get(item.href) || [];
                           
                           // If this item is a parent with children, render as collapsible
                           if (item.isParent && childItems.length > 0) {
                               const collapsibleKey = item.href.split('/').pop() || '';
                               const isOpen = openCollapsibles[collapsibleKey] || pathname.startsWith(item.href);
                               const isActive = pathname.startsWith(item.href) && item.href !== '/dashboard' || pathname === item.href;
                               
                               return (
                                   <Collapsible
                                       key={item.href}
                                       open={isOpen}
                                       onOpenChange={(open) => setOpenCollapsibles(prev => ({ ...prev, [collapsibleKey]: open }))}
                                   >
                                       <div className="flex items-center gap-1">
                                           <Link
                                               href={item.href}
                                               className={cn(
                                                   'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary whitespace-nowrap flex-1',
                                                   isActive && 'bg-secondary text-primary'
                                               )}
                                           >
                                               {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                               <span className="truncate">{itemLabel}</span>
                                           </Link>
                                           <CollapsibleTrigger asChild>
                                               <button
                                                   type="button"
                                                   className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                                                   aria-label={isOpen ? "Collapse" : "Expand"}
                                               >
                                                   {isOpen ? (
                                                       <ChevronDown className="h-4 w-4 shrink-0" />
                                                   ) : (
                                                       <ChevronRight className="h-4 w-4 shrink-0" />
                                                   )}
                                               </button>
                                           </CollapsibleTrigger>
                                       </div>
                                       <CollapsibleContent className="pl-4 space-y-1">
                                           {childItems.map(child => {
                                               if (!child.icon) {
                                                   console.error('Missing icon for child nav item:', child.href, child.label);
                                                   return null;
                                               }
                                               const childIsActive = pathname === child.href || pathname.startsWith(child.href + '/');
                                               const IconComponent = child.icon;
                                               return (
                                                   <Link
                                                       key={child.href}
                                                       href={child.href}
                                                       className={cn(
                                                           'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary whitespace-nowrap text-sm',
                                                           childIsActive && 'bg-secondary text-primary'
                                                       )}
                                                   >
                                                       <IconComponent className="h-3 w-3 shrink-0" />
                                                       <span className="truncate">{child.label}</span>
                                                   </Link>
                                               );
                                           })}
                                       </CollapsibleContent>
                                   </Collapsible>
                               );
                           }
                           
                           // Otherwise render as regular link
                           return renderNavItem(item, itemLabel);
                        })}
                                        </CollapsibleContent>
                                    </Collapsible>
                                ) : (
                                    <p className="px-3 text-xs font-semibold text-muted-foreground tracking-wider uppercase whitespace-nowrap">{section.label}</p>
                                )}
                            </div>
                        )}
                        {!isCollapsible && (
                            <>
                                {parentItems.map(item => {
                                    let itemLabel = item.label;
                                    // Customize dashboard label based on role
                                    if (item.href === '/dashboard') {
                                        if (hasPermission(ALL_PERMISSIONS.ADMIN_SECTION.READ)) {
                                            itemLabel = "Admin Dashboard";
                                        } else if (hasPermission(ALL_PERMISSIONS.REQUESTS.READ_ALL)) {
                                            itemLabel = 'QA Dashboard';
                                        } else if (hasPermission(ALL_PERMISSIONS.REQUESTS.CREATE)) {
                                            itemLabel = 'My Dashboard';
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
                                    
                                    // Get child items for this parent
                                    const childItems = childItemsMap.get(item.href) || [];
                                    
                                    // If this item is a parent with children, render as collapsible
                                    if (item.isParent && childItems.length > 0) {
                                        const collapsibleKey = item.href.split('/').pop() || '';
                                        const isOpen = openCollapsibles[collapsibleKey] || pathname.startsWith(item.href);
                                        const isActive = pathname.startsWith(item.href) && item.href !== '/dashboard' || pathname === item.href;
                                        
                                        return (
                                            <Collapsible
                                                key={item.href}
                                                open={isOpen}
                                                onOpenChange={(open) => setOpenCollapsibles(prev => ({ ...prev, [collapsibleKey]: open }))}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <Link
                                                        href={item.href}
                                                        className={cn(
                                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary whitespace-nowrap flex-1',
                                                            isActive && 'bg-secondary text-primary'
                                                        )}
                                                    >
                                                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                                        <span className="truncate">{itemLabel}</span>
                                                    </Link>
                                                    <CollapsibleTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded"
                                                            aria-label={isOpen ? "Collapse" : "Expand"}
                                                        >
                                                            {isOpen ? (
                                                                <ChevronDown className="h-4 w-4 shrink-0" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4 shrink-0" />
                                                            )}
                                                        </button>
                                                    </CollapsibleTrigger>
                                                </div>
                                                <CollapsibleContent className="pl-4 space-y-1">
                                                    {childItems.map(child => {
                                                        if (!child.icon) {
                                                            console.error('Missing icon for child nav item:', child.href, child.label);
                                                            return null;
                                                        }
                                                        const childIsActive = pathname === child.href || pathname.startsWith(child.href + '/');
                                                        const IconComponent = child.icon;
                                                        return (
                                                            <Link
                                                                key={child.href}
                                                                href={child.href}
                                                                className={cn(
                                                                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-secondary whitespace-nowrap text-sm',
                                                                    childIsActive && 'bg-secondary text-primary'
                                                                )}
                                                            >
                                                                <IconComponent className="h-3 w-3 shrink-0" />
                                                                <span className="truncate">{child.label}</span>
                                                            </Link>
                                                        );
                                                    })}
                                                </CollapsibleContent>
                                            </Collapsible>
                                        );
                                    }
                                    
                                    // Otherwise render as regular link
                                    return renderNavItem(item, itemLabel);
                                })}
                            </>
                        )}
                    </div>
                )
            })}
        </nav>
    );
}


export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r bg-card shadow-sm md:flex" suppressHydrationWarning>
      <div className="flex h-16 shrink-0 items-center border-b px-6" suppressHydrationWarning>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
          <Image src="/logo.jpg" alt="Dev2QA Logo" width={24} height={24} />
          <span>Dev2QA</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-4" suppressHydrationWarning>
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


