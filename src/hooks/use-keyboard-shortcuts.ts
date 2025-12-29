'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

type KeyboardShortcut = {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    action: () => void;
    description: string;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
    const router = useRouter();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if key is undefined (can happen with some special keys)
            if (!e.key) return;
            
            for (const shortcut of shortcuts) {
                const ctrlMatch = shortcut.ctrlKey === undefined || shortcut.ctrlKey === (e.ctrlKey || e.metaKey);
                const shiftMatch = shortcut.shiftKey === undefined || shortcut.shiftKey === e.shiftKey;
                const altMatch = shortcut.altKey === undefined || shortcut.altKey === e.altKey;
                const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

                if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                    e.preventDefault();
                    shortcut.action();
                    break;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts, router]);
}

// Common keyboard shortcuts for the application
export const commonShortcuts = {
    newRequest: {
        key: 'n',
        ctrlKey: true,
        description: 'Create new request',
    },
    dashboard: {
        key: 'd',
        ctrlKey: true,
        description: 'Go to dashboard',
    },
    myWork: {
        key: 'w',
        ctrlKey: true,
        description: 'Go to my work',
    },
    profile: {
        key: 'p',
        ctrlKey: true,
        description: 'Go to profile',
    },
    leaderboards: {
        key: 'l',
        ctrlKey: true,
        description: 'Go to leaderboards',
    },
    search: {
        key: 'k',
        ctrlKey: true,
        description: 'Open command palette',
    },
    help: {
        key: '?',
        shiftKey: true,
        description: 'Show keyboard shortcuts',
    },
};
