import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
}

export function PageHeader({ title, description, children, className, ...props }: PageHeaderProps) {
    return (
        <div suppressHydrationWarning className={cn("flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 sm:mb-8", className)} {...props}>
            <div className="grid gap-1" suppressHydrationWarning>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>
            {children && <div className="flex items-center gap-2 w-full sm:w-auto" suppressHydrationWarning>{children}</div>}
        </div>
    );
}
