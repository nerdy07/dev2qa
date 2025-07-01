'use client';
import {
  Award,
  ChevronDown,
  FilePlus2,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = {
    admin: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/dashboard/admin/users', icon: Users, label: 'Users' },
      { href: '/dashboard/admin/teams', icon: Shield, label: 'Teams' },
      { href: '/dashboard/admin/projects', icon: FolderKanban, label: 'Projects' },
    ],
    requester: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'My Requests' },
      { href: '/dashboard/requests/new', icon: FilePlus2, label: 'New Request' },
    ],
    qa_tester: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Pending Requests' },
    ],
  };

  const getRoleNavItems = () => {
    if (!user) return [];
    return navItems[user.role] || [];
  };

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-card shadow-sm md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
          <Award className="h-6 w-6" />
          <span>CertiTrack Pro</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start gap-1 px-4 py-4 text-sm font-medium">
          {getRoleNavItems().map((item) => (
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
          ))}
        </nav>
      </div>
      <div className="mt-auto border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-auto w-full items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL} alt={user?.name} />
                  <AvatarFallback>{user?.name?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid gap-0.5 text-left">
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{user?.role.replace('_', ' ')}</div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
    </aside>
  );
}
