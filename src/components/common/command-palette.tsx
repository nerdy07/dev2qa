'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command';
import {
    LayoutDashboard,
    FileText,
    FilePlus2,
    Users,
    FolderKanban,
    Trophy,
    User,
    Settings,
    LogOut,
    Search,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

type CommandItem = {
    icon: React.ElementType;
    label: string;
    shortcut?: string;
    action: () => void;
    keywords?: string[];
};

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const router = useRouter();
    const { logout } = useAuth();

    // Toggle command palette with Ctrl+K or Cmd+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    const navigate = useCallback((path: string) => {
        setOpen(false);
        router.push(path);
    }, [router]);

    const handleLogout = useCallback(() => {
        setOpen(false);
        logout();
    }, [logout]);

    const commands: { group: string; items: CommandItem[] }[] = [
        {
            group: 'Navigation',
            items: [
                {
                    icon: LayoutDashboard,
                    label: 'Dashboard',
                    shortcut: 'Alt+H',
                    action: () => navigate('/dashboard'),
                    keywords: ['home', 'main'],
                },
                {
                    icon: FileText,
                    label: 'My Work',
                    shortcut: 'Alt+W',
                    action: () => navigate('/dashboard/my-work'),
                    keywords: ['requests', 'tasks'],
                },
                {
                    icon: Trophy,
                    label: 'Leaderboards',
                    shortcut: 'Alt+L',
                    action: () => navigate('/dashboard/leaderboards'),
                    keywords: ['rankings', 'scores'],
                },
                {
                    icon: User,
                    label: 'My Profile',
                    shortcut: 'Alt+M',
                    action: () => navigate('/dashboard/profile'),
                    keywords: ['account', 'settings'],
                },
            ],
        },
        {
            group: 'Actions',
            items: [
                {
                    icon: FilePlus2,
                    label: 'New Request',
                    shortcut: 'Alt+N',
                    action: () => navigate('/dashboard/requests/new'),
                    keywords: ['create', 'add'],
                },
            ],
        },
        {
            group: 'Management',
            items: [
                {
                    icon: Users,
                    label: 'Users',
                    action: () => navigate('/dashboard/admin/users'),
                    keywords: ['team', 'members'],
                },
                {
                    icon: FolderKanban,
                    label: 'Projects',
                    action: () => navigate('/dashboard/admin/projects'),
                    keywords: ['work', 'tasks'],
                },
            ],
        },
        {
            group: 'System',
            items: [
                {
                    icon: LogOut,
                    label: 'Sign Out',
                    action: handleLogout,
                    keywords: ['logout', 'exit'],
                },
            ],
        },
    ];

    return (
        <>
            {/* Keyboard shortcut hint */}
            <button
                onClick={() => setOpen(true)}
                className="hidden md:flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
                <Search className="h-4 w-4" />
                <span>Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {commands.map((group, index) => (
                        <div key={group.group}>
                            {index > 0 && <CommandSeparator />}
                            <CommandGroup heading={group.group}>
                                {group.items.map((item) => (
                                    <CommandItem
                                        key={item.label}
                                        onSelect={item.action}
                                        keywords={item.keywords}
                                    >
                                        <item.icon className="mr-2 h-4 w-4" />
                                        <span>{item.label}</span>
                                        {item.shortcut && (
                                            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                                {item.shortcut}
                                            </kbd>
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </div>
                    ))}
                </CommandList>
            </CommandDialog>
        </>
    );
}
