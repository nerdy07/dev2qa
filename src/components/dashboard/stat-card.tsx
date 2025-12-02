import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
    title: string;
    value: string;
    icon: LucideIcon;
    description?: string;
    className?: string;
}

export const StatCard = React.memo(function StatCard({ title, value, icon: Icon, description, className }: StatCardProps) {
    return (
        <Card className={cn("border-border/70 bg-surface shadow-soft transition hover:shadow-lifted", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-xs">
                <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
                <Icon className="h-5 w-5 text-info" aria-hidden="true" />
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-foreground break-words overflow-wrap-anywhere">{value}</div>
                {description && <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>}
            </CardContent>
        </Card>
    )
});
