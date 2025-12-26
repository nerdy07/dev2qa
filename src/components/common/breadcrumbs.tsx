import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

export function Breadcrumbs() {
    const pathname = usePathname();

    // Don't show breadcrumbs on home or root dashboard
    if (pathname === '/' || pathname === '/dashboard') {
        return null;
    }

    // Parse pathname into breadcrumb segments
    const segments = pathname.split('/').filter(Boolean);

    // Generate breadcrumb items
    const breadcrumbItems = segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const label = segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const isLast = index === segments.length - 1;

        return {
            href,
            label,
            isLast,
        };
    });

    return (
        <Breadcrumb className="mb-4">
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href="/dashboard" className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            <span className="sr-only">Dashboard</span>
                        </Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {breadcrumbItems.map((item, index) => (
                    <Fragment key={item.href}>
                        <BreadcrumbSeparator>
                            <ChevronRight className="h-4 w-4" />
                        </BreadcrumbSeparator>
                        <BreadcrumbItem>
                            {item.isLast ? (
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link href={item.href}>{item.label}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
