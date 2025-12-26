'use client';

import { Home, FileText, Plus, User, Trophy } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type NavItem = {
    icon: React.ElementType;
    label: string;
    href: string;
};

const navItems: NavItem[] = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: FileText, label: 'Requests', href: '/dashboard/my-work' },
    { icon: Plus, label: 'New', href: '/dashboard/requests/new' },
    { icon: Trophy, label: 'Leaderboards', href: '/dashboard/leaderboards' },
    { icon: User, label: 'Profile', href: '/dashboard/profile' },
];

export function MobileBottomNav() {
    const pathname = usePathname();

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg">
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                                isActive
                                    ? 'text-primary bg-primary/10'
                                    : 'text-muted-foreground hover:text-primary hover:bg-accent'
                            )}
                        >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
