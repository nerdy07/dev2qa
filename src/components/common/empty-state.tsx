import { FileText, Users, FolderKanban } from 'lucide-react';

type EmptyStateProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: React.ReactNode;
    tips?: string[];
};

export function EmptyState({ icon, title, description, action, tips }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-8 text-center">
            <div className="mb-4 text-muted-foreground">{icon}</div>
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            <p className="mb-4 text-sm text-muted-foreground max-w-md">{description}</p>
            {action && <div className="mb-4">{action}</div>}
            {tips && tips.length > 0 && (
                <div className="mt-4 space-y-2 text-left">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Quick Tips
                    </p>
                    <ul className="space-y-1">
                        {tips.map((tip, index) => (
                            <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                <span>{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
