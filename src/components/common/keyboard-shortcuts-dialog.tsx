'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { commonShortcuts } from '@/hooks/use-keyboard-shortcuts';

type ShortcutGroup = {
    title: string;
    shortcuts: Array<{
        keys: string[];
        description: string;
    }>;
};

const shortcutGroups: ShortcutGroup[] = [
    {
        title: 'Navigation',
        shortcuts: [
            { keys: ['Ctrl', 'K'], description: 'Open command palette' },
            { keys: ['Alt', 'H'], description: 'Go to dashboard (Home)' },
            { keys: ['Alt', 'W'], description: 'Go to my work' },
            { keys: ['Alt', 'M'], description: 'Go to my profile' },
            { keys: ['Alt', 'L'], description: 'Go to leaderboards' },
        ],
    },
    {
        title: 'Actions',
        shortcuts: [
            { keys: ['Alt', 'N'], description: 'Create new request' },
            { keys: ['Esc'], description: 'Close dialog/modal' },
        ],
    },
    {
        title: 'General',
        shortcuts: [
            { keys: ['?'], description: 'Show keyboard shortcuts' },
            { keys: ['Tab'], description: 'Navigate between fields' },
            { keys: ['Enter'], description: 'Submit form' },
        ],
    },
];

export function KeyboardShortcutsDialog() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(true)}
                className="gap-2"
            >
                <Keyboard className="h-4 w-4" />
                <span className="hidden md:inline">Shortcuts</span>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Keyboard className="h-5 w-5" />
                            Keyboard Shortcuts
                        </DialogTitle>
                        <DialogDescription>
                            Use these keyboard shortcuts to navigate faster
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 mt-4">
                        {shortcutGroups.map((group) => (
                            <div key={group.title}>
                                <h3 className="text-sm font-semibold text-foreground mb-3">
                                    {group.title}
                                </h3>
                                <div className="space-y-2">
                                    {group.shortcuts.map((shortcut, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <span className="text-sm text-muted-foreground">
                                                {shortcut.description}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, keyIndex) => (
                                                    <kbd
                                                        key={keyIndex}
                                                        className="inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded border border-border bg-muted font-mono text-xs font-medium"
                                                    >
                                                        {key}
                                                    </kbd>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground">
                            <strong>Tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono text-xs">?</kbd> at any time to view this dialog
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
